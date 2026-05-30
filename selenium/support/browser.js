const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const fsp = require("node:fs/promises");
const path = require("node:path");

class BrowserSession {
  constructor() {
    this.driver = null;
  }

  async start() {
    if (this.driver) {
      return this.driver;
    }

    const options = new chrome.Options();
    const headless = (process.env.HEADLESS || "true").toLowerCase() !== "false";

    if (headless) {
      options.addArguments("--headless=new");
    }

    const chromeBinaryPath = process.env.CHROME_BINARY_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    try {
      await fsp.access(chromeBinaryPath);
      options.setChromeBinaryPath(chromeBinaryPath);
    } catch (error) {
      // Fall back to the system default if Chrome is installed in a different location.
    }

    options.addArguments("--window-size=1440,1000");
    options.addArguments("--disable-dev-shm-usage");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-gpu");

    let service = null;
    const explicitDriverPath = process.env.CHROMEDRIVER_PATH || null;
    const bundledDriverPath = path.join(
      process.cwd(),
      "node_modules",
      "chromedriver",
      "lib",
      "chromedriver",
      process.platform === "win32" ? "chromedriver.exe" : "chromedriver"
    );

    const candidateDriverPath = explicitDriverPath || (await this.fileExists(bundledDriverPath) ? bundledDriverPath : null);

    if (candidateDriverPath) {
      service = new chrome.ServiceBuilder(candidateDriverPath)
        .setHostname("127.0.0.1")
        .setLoopback(true)
        .setPort(Number(process.env.CHROMEDRIVER_PORT || 9515));
    }

    const builder = new Builder()
      .forBrowser(process.env.BROWSER || "chrome")
      .setChromeOptions(options);

    if (service) {
      builder.setChromeService(service);
    }

    this.driver = await builder.build();
    return this.driver;
  }

  async fileExists(filePath) {
    try {
      await fsp.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async quit() {
    if (!this.driver) {
      return;
    }

    await this.driver.quit();
    this.driver = null;
  }

  async getDriver() {
    return this.start();
  }

  async sleep(ms) {
    const driver = await this.getDriver();
    await driver.sleep(ms);
  }

  async setViewport(width = 1440, height = 1000) {
    const driver = await this.getDriver();
    await driver.manage().window().setRect({ width, height });
  }

  async visit(url) {
    const driver = await this.getDriver();
    await driver.get(url);
  }

  async reload() {
    const driver = await this.getDriver();
    await driver.navigate().refresh();
  }

  async currentUrl() {
    const driver = await this.getDriver();
    return driver.getCurrentUrl();
  }

  async currentPath() {
    const url = await this.currentUrl();
    return new URL(url).pathname;
  }

  async clearState() {
    const driver = await this.getDriver();
    await driver.manage().deleteAllCookies();
    try {
      const url = await driver.getCurrentUrl();
      if (url.startsWith("http://") || url.startsWith("https://")) {
        await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
      }
    } catch (error) {
      // Chrome starts a fresh session on a data: URL where Web Storage is unavailable.
      // Cookie cleanup is still valid, and storage will be cleared after the first real navigation.
    }
  }

  async waitUntil(condition, timeout = 15000, message = "Condition not met in time") {
    const driver = await this.getDriver();
    return driver.wait(condition, timeout, message);
  }

  async waitForVisible(locator, timeout = 15000) {
    const driver = await this.getDriver();
    const element = await driver.wait(until.elementLocated(locator), timeout);
    await driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async findVisible(locator, timeout = 15000) {
    const driver = await this.getDriver();
    return driver.wait(async () => {
      const elements = await driver.findElements(locator);

      for (const element of elements) {
        try {
          if (await element.isDisplayed()) {
            return element;
          }
        } catch (error) {
          // The DOM can re-render while scanning candidates; keep waiting.
        }
      }

      return false;
    }, timeout, `No visible element found for locator ${locator}`);
  }

  async findAllVisible(locator) {
    const driver = await this.getDriver();
    const elements = await driver.findElements(locator);
    const visible = [];

    for (const element of elements) {
      if (await element.isDisplayed()) {
        visible.push(element);
      }
    }

    return visible;
  }

  async executeScript(script, ...args) {
    const driver = await this.getDriver();
    return driver.executeScript(script, ...args);
  }

  async findVisibleByText(selectors, text, { exact = false, timeout = 15000, root = null } = {}) {
    const driver = await this.getDriver();

    await driver.wait(async () => {
      const element = await this.executeScript(
        `
          const [root, selectors, text, exact] = arguments;
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
          const source = root || document;
          const needle = normalize(text);
          const candidates = Array.from(source.querySelectorAll(selectors));
          return candidates.find((el) => {
            const rendered = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
            if (!rendered) return false;
            const value = normalize(el.innerText || el.textContent);
            return exact ? value === needle : value.includes(needle);
          }) || null;
        `,
        root,
        selectors,
        text,
        exact
      );

      return Boolean(element);
    }, timeout);

    return this.executeScript(
      `
        const [root, selectors, text, exact] = arguments;
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
        const source = root || document;
        const needle = normalize(text);
        const candidates = Array.from(source.querySelectorAll(selectors));
        return candidates.find((el) => {
          const rendered = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          if (!rendered) return false;
          const value = normalize(el.innerText || el.textContent);
          return exact ? value === needle : value.includes(needle);
        }) || null;
      `,
      root,
      selectors,
      text,
      exact
    );
  }

  async hasVisibleText(selectors, text, { exact = false, root = null } = {}) {
    const element = await this.executeScript(
      `
        const [root, selectors, text, exact] = arguments;
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
        const source = root || document;
        const needle = normalize(text);
        const candidates = Array.from(source.querySelectorAll(selectors));
        return candidates.find((el) => {
          const rendered = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
          if (!rendered) return false;
          const value = normalize(el.innerText || el.textContent);
          return exact ? value === needle : value.includes(needle);
        }) || null;
      `,
      root,
      selectors,
      text,
      exact
    );

    return Boolean(element);
  }

  async clickElement(element) {
    const driver = await this.getDriver();
    await this.removeBlockingOverlays();
    await driver.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'center'});", element);
    try {
      await element.click();
    } catch (error) {
      await this.removeBlockingOverlays();
      await driver.executeScript("arguments[0].click();", element);
    }
  }

  async clickByText(selectors, text, options = {}) {
    const element = await this.findVisibleByText(selectors, text, options);
    await this.clickElement(element);
    return element;
  }

  async clearAndType(target, value) {
    const element = target.using ? await this.findVisible(target) : target;
    await this.clickElement(element);
    const selectAll = process.platform === "darwin" ? Key.chord(Key.COMMAND, "a") : Key.chord(Key.CONTROL, "a");

    try {
      await element.sendKeys(selectAll, Key.BACK_SPACE);
      await element.sendKeys(String(value));
      return;
    } catch (error) {
      await this.executeScript(
        `
          const [input, nextValue] = arguments;
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
            || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) {
            setter.call(input, String(nextValue));
          } else {
            input.value = String(nextValue);
          }
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        `,
        element,
        value
      );
    }
  }

  async activeElement() {
    const driver = await this.getDriver();
    return driver.switchTo().activeElement();
  }

  async removeBlockingOverlays() {
    await this.executeScript(`
      document.querySelectorAll('[class*="react-joyride"], [id*="react-joyride"]').forEach((element) => element.remove());
      document.querySelectorAll('svg path').forEach((path) => {
        if ((path.getAttribute('fill') || '').toLowerCase() === '#00000080') {
          const overlay = path.closest('svg') || path.parentElement;
          if (overlay) overlay.remove();
        }
      });
    `);
  }
}

const browserSession = new BrowserSession();

module.exports = {
  browserSession,
  By,
  Key,
  until,
};
