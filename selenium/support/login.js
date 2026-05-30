const fs = require("fs");
const path = require("path");
const { browserSession, By, Key } = require("./browser");

const userListPath = path.join(__dirname, "..", "fixtures", "credentials.json");
const LOGIN_URL = "https://main.ooti.co/account/login";

class LoginPage {
  constructor() {
    this.credentials = JSON.parse(fs.readFileSync(userListPath, "utf-8"));
  }

  async visit() {
    await browserSession.visit(LOGIN_URL);
    await this.getUsernameField();
  }

  async getUsernameField() {
    return browserSession.findVisible(By.css('input[name="email"], input[type="email"], input[placeholder="Email"]'), 30000);
  }

  async getPasswordField() {
    return browserSession.findVisible(By.css('input[name="password"], input[type="password"], input[placeholder="Mot de passe"]'), 30000);
  }

  async getLoginButton() {
    const driver = await browserSession.getDriver();
    await driver.wait(async () => {
      const candidates = await driver.findElements(By.css('button[type="submit"], form button'));
      for (const candidate of candidates) {
        if (await candidate.isDisplayed()) {
          const text = ((await candidate.getText()) || "").trim();
          const type = (await candidate.getAttribute("type")) || "";
          if (type === "submit" && (text === "S'IDENTIFIER" || text === "S’IDENTIFIER")) {
            return true;
          }
        }
      }
      return false;
    }, 30000);

    const buttons = await driver.findElements(By.css('button[type="submit"], form button'));
    for (const button of buttons) {
      if (await button.isDisplayed()) {
        const text = ((await button.getText()) || "").trim();
        const type = (await button.getAttribute("type")) || "";
        if (type === "submit" && (text === "S'IDENTIFIER" || text === "S’IDENTIFIER")) {
          return button;
        }
      }
    }

    throw new Error("Login button not found");
  }

  async submitLogin(email, password) {
    const username = await this.getUsernameField();
    const passwordField = await this.getPasswordField();
    const button = await this.getLoginButton();

    await username.clear();
    await username.sendKeys(email);
    await passwordField.clear();
    await passwordField.sendKeys(password);
    await browserSession.clickElement(button);
  }

  async isStillOnLoginPage() {
    const pathname = await browserSession.currentPath();
    return pathname.includes("/account/login");
  }

  async auth(account) {
    const selectedAccount = this.credentials[account];

    if (!selectedAccount) {
      throw new Error(`Account "${account}" not found in ${userListPath}`);
    }

    const { email, password } = selectedAccount;

    await browserSession.sleep(2000);
    await this.submitLogin(email, password);

    try {
      await browserSession.waitUntil(async () => !(await this.isStillOnLoginPage()), 45000);
      return;
    } catch (error) {
      if (!(await this.isStillOnLoginPage())) {
        return;
      }
    }

    await browserSession.reload();
    await this.getUsernameField();
    await this.submitLogin(email, password);
    await browserSession.waitUntil(async () => !(await this.isStillOnLoginPage()), 45000);
  }

  async dismissOnboardingOverlay() {
    const driver = await browserSession.getDriver();

    try {
      await browserSession.activeElement().then((element) => element.sendKeys(Key.ESCAPE));
      await browserSession.sleep(500);
    } catch (error) {
      // If nothing is focused yet, fall back to looking for a visible close button.
    }

    try {
      await browserSession.executeScript(`
        document.querySelectorAll('[class*="react-joyride"], [id*="react-joyride"]').forEach((element) => element.remove());
        document.querySelectorAll('svg path[fill="#00000080"]').forEach((path) => {
          const overlay = path.closest('svg') || path.parentElement;
          if (overlay) overlay.remove();
        });
      `);
      await browserSession.sleep(500);
    } catch (error) {
      // The onboarding overlay is optional; keep going if the page is between renders.
    }

    const closeButtons = await driver.findElements(
      By.xpath(
        "//button[normalize-space()='Fermer' or normalize-space()='FERMER' or normalize-space()='Close' or normalize-space()='CLOSE']"
      )
    );

    for (const closeButton of closeButtons) {
      if (await closeButton.isDisplayed()) {
        await browserSession.clickElement(closeButton);
        await browserSession.sleep(1000);
        return;
      }
    }
  }

  async changeLanguageToFrench() {
    await this.dismissOnboardingOverlay();

    const avatar = await browserSession.findVisible(By.css(".MuiAvatar-img"), 10000);
    await browserSession.clickElement(avatar);
    await browserSession.clickByText("button, li, div[role='menuitem'], span", "Français", { timeout: 10000 });
    await browserSession.sleep(1000);
  }
}

const loginPage = new LoginPage();

module.exports = {
  LoginPage,
  loginPage,
};
