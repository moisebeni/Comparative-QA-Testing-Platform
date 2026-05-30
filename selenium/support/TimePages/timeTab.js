const assert = require("assert");
const { browserSession, By, Key } = require("../browser");

class TimeTab {
  constructor() {
    this.timePageUrl = "https://main.ooti.co/times/time";
  }

  async selectTodayInCurrentMonth() {
    const today = String(new Date().getDate());
    const month = await browserSession.findVisible(By.css(".rdrMonth"), 30000);

    const day = await browserSession.executeScript(
      `
        const [month, today] = arguments;
        const candidates = Array.from(month.querySelectorAll(".rdrDay:not(.rdrDayPassive) .rdrDayNumber span, .rdrDay:not(.rdrDayPassive) .rdrDayNumber"));
        return candidates.find((candidate) => (candidate.innerText || candidate.textContent || "").trim() === today) || null;
      `,
      month,
      today
    );

    if (!day) {
      throw new Error(`Unable to find current day ${today} in date picker`);
    }

    await browserSession.clickElement(day);
  }

  async visitTime() {
    await browserSession.visit(this.timePageUrl);
    await browserSession.findVisible(By.css('div[aria-label="time_tabs"]'), 20000);
  }

  async changeTabTo(option) {
    if (await browserSession.hasVisibleText('div[aria-label="time_tabs"] div[role="tab"][aria-selected="true"], [role="tab"][aria-selected="true"]', option)) {
      return;
    }

    await browserSession.clickByText('div[aria-label="time_tabs"] div[role="tab"]', option, { timeout: 15000 });
    await browserSession.sleep(2000);
  }

  async changeTabToTimeEntryOrTeam(value) {
    await browserSession.clickByText("button", value, { exact: true, timeout: 15000 });
  }

  async selectListboxOption(selector, optionLabel) {
    const trigger = await browserSession.findVisible(By.css(selector), 10000);
    await browserSession.clickElement(trigger);
    let input = trigger;

    const findOption = () => browserSession.executeScript(
      `
        const [input, optionLabel] = arguments;
        const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
        const needle = normalize(optionLabel);
        const inputId = input && input.getAttribute ? input.getAttribute('id') : '';
        const scoped = inputId ? Array.from(document.querySelectorAll('#' + CSS.escape(inputId) + '-listbox')) : [];
        const listboxes = [...scoped, ...Array.from(document.querySelectorAll('[role="listbox"]'))].filter(visible);
        const seen = new Set();
        const options = [];
        for (const listbox of listboxes) {
          for (const option of Array.from(listbox.querySelectorAll('[role="option"], li'))) {
            if (!visible(option) || seen.has(option)) continue;
            seen.add(option);
            options.push(option);
          }
        }
        return options.find((option) => normalize(option.innerText || option.textContent).includes(needle)) || options[0] || null;
      `,
      input,
      optionLabel || ""
    );

    const shouldTypeFirst = selector !== "#type-label";
    let targetOption = shouldTypeFirst ? null : await findOption();

    if (!targetOption && optionLabel) {
      input = await browserSession.executeScript(
        `
          const trigger = arguments[0];
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          if (trigger && trigger.matches && trigger.matches('input, textarea') && visible(trigger)) return trigger;
          const root = trigger ? trigger.closest('.MuiAutocomplete-root, .MuiFormControl-root, [role="combobox"]') : null;
          const inputs = Array.from((root || document).querySelectorAll('input, textarea'));
          return inputs.find((input) => visible(input) && !input.disabled && input.type !== 'hidden') || document.activeElement;
        `,
        trigger
      );
      try {
        await input.sendKeys(Key.chord(Key.COMMAND, "a"), Key.BACK_SPACE);
        await input.sendKeys(optionLabel);
      } catch (error) {
        await browserSession.executeScript(
          `
            const [input, value] = arguments;
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            if (setter && input instanceof HTMLInputElement) {
              setter.call(input, value);
            } else {
              input.value = value;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.focus();
          `,
          input,
          optionLabel
        );
      }

      try {
        await browserSession.findVisible(By.css('[role="listbox"]'), 10000);
      } catch (error) {
        // Some MUI selects keep the option popup detached or close it quickly; arrow fallback below handles that.
      }
      if (shouldTypeFirst) {
        const focused = await browserSession.activeElement();
        await focused.sendKeys(Key.ARROW_DOWN, Key.ENTER);
        await browserSession.sleep(700);
        return;
      }
      targetOption = await findOption();
    }

    if (!targetOption) {
      const focused = await browserSession.activeElement();
      await focused.sendKeys(Key.ARROW_DOWN, Key.ENTER);
      return;
    }

    await browserSession.clickElement(targetOption);
    await browserSession.sleep(500);
  }

  async clickPrimaryButton(text) {
    await browserSession.clickByText("button.MuiButton-containedPrimary, button, [role='button']", text, { timeout: 30000 });
  }

  async clickVisibleControl(label, { exact = true, timeout = 15000 } = {}) {
    const driver = await browserSession.getDriver();
    const control = await driver.wait(async () => {
      const element = await browserSession.executeScript(
        `
          const [label, exact] = arguments;
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
          const needle = normalize(label);
          const candidates = Array.from(document.querySelectorAll('button, [role="button"], .MuiChip-root'))
            .filter((element) => visible(element));
          return candidates.find((element) => {
            const value = normalize(element.innerText || element.textContent);
            return exact ? value === needle : value.includes(needle);
          }) || null;
        `,
        label,
        exact
      );
      return element || false;
    }, timeout);

    await browserSession.clickElement(control);
  }

  async clickListOption(text) {
    await browserSession.clickByText('ul[role="listbox"] li, [role="listbox"] [role="option"]', text, { timeout: 10000 });
  }

  async fillHours(fields) {
    for (const [name, value] of Object.entries(fields)) {
      const input = await browserSession.findVisible(By.css(`input[name="${name}"]`), 10000);
      await browserSession.clearAndType(input, value);
    }
  }

  async saveByLabel(label = "Sauvegarder") {
    await browserSession.executeScript(`
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.dispatchEvent(new Event('change', { bubbles: true }));
        document.activeElement.blur();
      }
    `);
    await browserSession.sleep(500);

    const submitButton = await browserSession.executeScript(
      `
        const label = arguments[0].toLocaleLowerCase();
        const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        return Array.from(document.querySelectorAll('button[type="submit"], button'))
          .filter((button) => visible(button) && !button.disabled)
          .find((button) => ((button.innerText || button.textContent || '').trim().toLocaleLowerCase()).includes(label)) || null;
      `,
      label
    );

    if (!submitButton) {
      throw new Error(`Submit button "${label}" not found`);
    }

    await browserSession.clickElement(submitButton);
  }

  async logTimeOneDayAnnex(type, project, phase, annex, mondayH) {
    await this.clickPrimaryButton("Feuille de temps");
    await this.validateAddHoursLogModal();

    await this.selectListboxOption("#type-label", type);
    await browserSession.sleep(2000);

    await this.selectListboxOption("#project-label", project);
    await browserSession.sleep(3000);

    await this.selectListboxOption("#annex-label", annex);
    await this.fillHours({ monday: mondayH });
    await this.saveByLabel();
  }

  async logTimeOneDayPhase(type, project, phase, annex, mondayH) {
    await this.clickPrimaryButton("Feuille de temps");
    await this.validateAddHoursLogModal();

    await this.selectListboxOption("#type-label", type);
    await browserSession.sleep(2000);

    await this.selectListboxOption("#project-label", project);
    await browserSession.sleep(3000);

    await this.selectListboxOption("#phase-label", phase);
    await browserSession.sleep(2000);

    await this.fillHours({ monday: mondayH });
    await this.saveByLabel();
  }

  async logTimeMoreThan40(type, project, phase, annex, mondayH, tuesdayH, wednesdayH, thursdayH, fridayH) {
    await this.clickPrimaryButton("Feuille de temps");
    await this.validateAddHoursLogModal();

    await this.selectListboxOption("#type-label", type);
    await browserSession.sleep(2000);

    await this.selectListboxOption("#project-label", project);
    await browserSession.sleep(1000);

    await this.selectListboxOption("#phase-label", phase);
    await browserSession.sleep(2000);

    await this.fillHours({
      monday: mondayH,
      tuesday: tuesdayH,
      wednesday: wednesdayH,
      thursday: thursdayH,
      friday: fridayH,
    });

    await this.saveByLabel();
    const toast = await browserSession.findVisible(By.css(".Toastify__toast--warning"), 15000);
    const text = await toast.getText();
    assert.ok(text.includes("Vous avez dépassé la limite d'heures hebdomadaires"));

    const closeButton = await browserSession.findVisible(By.xpath("//button[.//*[contains(@data-testid,'CloseIcon')]]"), 10000);
    await browserSession.clickElement(closeButton);
  }

  async getFirstMoreButton() {
    return browserSession.findVisible(By.xpath("(//*[contains(@data-testid,'MoreVertIcon')]/ancestor::button[1])[1]"), 30000);
  }

  async getMoreButtonForRow(rowText) {
    const row = await this.getTableRowContainingText(rowText, 30000);
    const button = await browserSession.executeScript(
      `
        const row = arguments[0];
        const icon = row.querySelector('[data-testid="MoreVertIcon"]');
        return icon ? icon.closest('button') : null;
      `,
      row
    );

    if (!button) {
      throw new Error(`Unable to find more button for row containing "${rowText}"`);
    }

    return button;
  }

  async clickHoursCellByText(text, { tableSelector = "table tbody tr", lastTable = false } = {}) {
    const driver = await browserSession.getDriver();
    const cellContent = await driver.wait(async () => {
      const element = await browserSession.executeScript(
        `
          const [text, tableSelector, lastTable] = arguments;
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const tables = Array.from(document.querySelectorAll('table')).filter(visible);
          const root = lastTable && tables.length ? tables[tables.length - 1] : document;
          const cells = Array.from(root.querySelectorAll(tableSelector + ' td')).filter(visible);
          const cell = cells.find((td) => (td.innerText || td.textContent || '').includes(text));
          if (!cell) return null;
          const spans = Array.from(cell.querySelectorAll('span'))
            .filter((child) => visible(child) && (child.innerText || child.textContent || '').includes(text));
          const children = Array.from(cell.querySelectorAll('div'))
            .filter((child) => visible(child) && (child.innerText || child.textContent || '').includes(text));
          return spans[0] || children[0] || cell;
        `,
        text,
        tableSelector,
        lastTable
      );
      return element || false;
    }, 30000);

    await browserSession.removeBlockingOverlays();
    await browserSession.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'center'});", cellContent);
    await driver.actions({ bridge: true }).move({ origin: cellContent, x: 0, y: 0 }).click().perform();
  }

  async clickInlineValueInRow(rowText, valueText) {
    const driver = await browserSession.getDriver();
    const target = await driver.wait(async () => {
      const element = await browserSession.executeScript(
        `
          const [rowText, valueText] = arguments;
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(visible);
          const row = rows.find((candidate) => (candidate.innerText || candidate.textContent || '').includes(rowText));
          if (!row) return null;
          const cells = Array.from(row.querySelectorAll('td, [role="cell"], div, span'))
            .filter((child) => visible(child) && (child.innerText || child.textContent || '').includes(valueText));
          return cells[0] || null;
        `,
        rowText,
        valueText
      );
      return element || false;
    }, 30000);

    await browserSession.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'center'});", target);
    await driver.actions({ bridge: true }).move({ origin: target, x: 0, y: 0 }).click().perform();
  }

  async deleteEntry() {
    await browserSession.sleep(2000);
    await browserSession.clickElement(await this.getFirstMoreButton());
    await this.clickMenuAction("Supprimer");
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Êtes-vous sûr(e) de vouloir supprimer cette feuille de temps ?')]"), 10000);
    await browserSession.clickByText(".actions__block button, button", "OK", { timeout: 10000 });
    await browserSession.sleep(4000);
  }

  async deleteTimeOffEntry() {
    await browserSession.clickElement(await this.getMoreButtonForRow("Congés payés"));
    await this.clickMenuAction("Supprimer");
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Êtes-vous sûr(e) de vouloir supprimer cette demande de congés ?')]"), 10000);
    await browserSession.clickByText(".actions__block button, button", "OK", { timeout: 10000 });
    await browserSession.sleep(4000);
  }

  async clickMenuAction(label) {
    const driver = await browserSession.getDriver();
    const action = await driver.wait(async () => {
      const element = await browserSession.executeScript(
        `
          const label = arguments[0].toLocaleLowerCase();
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLocaleLowerCase();
          const candidates = Array.from(document.querySelectorAll('[role="button"], [role="menuitem"], button, p, span, div'))
            .filter((element) => visible(element) && normalize(element.innerText || element.textContent).includes(label));
          const exact = candidates.find((element) => normalize(element.innerText || element.textContent) === label) || candidates[0];
          return exact ? exact.closest('[role="button"], [role="menuitem"], button') || exact : null;
        `,
        label
      );
      return element || false;
    }, 10000);

    await browserSession.clickElement(action);
  }

  async goPreviousWeek(weeks) {
    for (let index = 0; index < weeks; index += 1) {
      const button = await browserSession.findVisible(By.xpath("(//*[contains(@data-testid,'ArrowBackIosNewIcon')]/ancestor::button[1])[1]"), 10000);
      await browserSession.clickElement(button);
      await browserSession.sleep(500);
    }
  }

  async goNextWeek(weeks) {
    for (let index = 0; index < weeks; index += 1) {
      const button = await browserSession.findVisible(By.xpath("(//*[contains(@data-testid,'ArrowForwardIosIcon')]/ancestor::button[1])[1]"), 10000);
      await browserSession.clickElement(button);
      await browserSession.sleep(500);
    }
  }

  getIsoWeek(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    return Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);
  }

  getIsoWeeksInYear(year) {
    return this.getIsoWeek(new Date(Date.UTC(year, 11, 31)));
  }

  async copyThePreviousWeek(sourceWeekLabel = null) {
    const now = new Date();
    let targetWeek = this.getIsoWeek(now) - 4;
    let targetYear = now.getFullYear();

    while (targetWeek <= 0) {
      targetYear -= 1;
      targetWeek += this.getIsoWeeksInYear(targetYear);
    }

    await browserSession.clickByText("[role='button'], button", "Copier une semaine antérieure", { timeout: 10000 });

    const sourceWeekInput = await browserSession.findVisible(By.css("#source_week-label"), 10000);
    const currentValue = (await sourceWeekInput.getAttribute("value")) || "";
    const candidateWeeks = [targetWeek, targetWeek - 1, targetWeek + 1].filter(Boolean);
    const alreadySelected = sourceWeekLabel
      ? currentValue.includes(sourceWeekLabel)
      : candidateWeeks.some((week) => currentValue.includes(`Semaine ${week}`));

    if (!alreadySelected) {
      const openButton = await browserSession.executeScript(
        `
          const input = arguments[0];
          const root = input.closest('.MuiAutocomplete-root');
          return root ? root.querySelector('button[aria-label="Open"]') : null;
        `,
        sourceWeekInput
      );

      if (openButton) {
        await browserSession.clickElement(openButton);
      }

      const options = await browserSession.findAllVisible(By.css('[role="listbox"] [role="option"]'));
      let selectedOption = null;

      for (const option of options) {
        const label = (await option.getText()).trim();
        if (sourceWeekLabel && label.includes(sourceWeekLabel)) {
          selectedOption = option;
          break;
        }

        if (!sourceWeekLabel && candidateWeeks.some((week) => label.startsWith(`Semaine ${week}`))) {
          selectedOption = option;
          break;
        }
      }

      if (!selectedOption && options.length > 0) {
        selectedOption = options[0];
      }

      if (!selectedOption) {
        throw new Error("Expected at least one source week option");
      }

      await browserSession.clickElement(selectedOption);
    }

    const validateButtons = await browserSession.findAllVisible(By.css('[data-testid*="validate"], .actions__block button, button'));
    for (const button of validateButtons) {
      const label = (await button.getText()).trim();
      const testId = (await button.getAttribute("data-testid")) || "";
      if (testId.includes("validate") || label === "OK") {
        await browserSession.clickElement(button);
        break;
      }
    }

    await browserSession.sleep(1000);
  }

  async validateAddHoursLogModal() {
    const title = await browserSession.findVisible(By.css(".MuiTypography-root.MuiDialogTitle-root"), 15000);
    const text = await title.getText();
    assert.ok(text.includes("Ajouter une feuille de temps"));
    await browserSession.sleep(3000);
  }

  async getTableRowContainingText(text, timeout = 15000) {
    const driver = await browserSession.getDriver();
    return driver.wait(async () => {
      const row = await browserSession.executeScript(
        `
          const text = arguments[0];
          const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
          const rows = Array.from(document.querySelectorAll('table tbody tr')).filter(visible);
          return rows.find((candidate) => (candidate.innerText || candidate.textContent || '').includes(text)) || null;
        `,
        text
      );
      return row || false;
    }, timeout);
  }

  async getTimeOffRowByStatus(status) {
    return this.getTableRowContainingText(status);
  }

  async clickTimeOffStatus(currentStatus) {
    const row = await this.getTimeOffRowByStatus(currentStatus);
    const cell = await browserSession.executeScript(
      `
        const [row, status] = arguments;
        const candidates = Array.from(row.querySelectorAll('td, [role="cell"], div, span'))
          .filter((candidate) => !!(candidate && (candidate.offsetWidth || candidate.offsetHeight || candidate.getClientRects().length)));
        return candidates.find((candidate) => (candidate.innerText || '').trim() === status) || null;
      `,
      row,
      currentStatus
    );

    if (!cell) {
      throw new Error(`Unable to find time off status cell ${currentStatus}`);
    }

    await browserSession.clickElement(cell);
  }

  async transitionMainRowStatus(currentStatus, nextStatus, menuActionLabel) {
    await this.clickTimeOffStatus(currentStatus);
    await browserSession.sleep(1000);

    const hasNextStatus = await browserSession.executeScript(
      `
        const nextStatus = arguments[0];
        return Array.from(document.querySelectorAll('table tbody tr')).some((row) => (row.innerText || '').includes(nextStatus));
      `,
      nextStatus
    );

    if (!hasNextStatus) {
      const row = await this.getTimeOffRowByStatus(currentStatus);
      const moreButton = await browserSession.executeScript(
        `
          const row = arguments[0];
          const icon = row.querySelector('[data-testid="MoreVertIcon"]');
          return icon ? icon.closest('button') : null;
        `,
        row
      );

      if (!moreButton) {
        throw new Error(`Unable to open row menu for status ${currentStatus}`);
      }

      await browserSession.clickElement(moreButton);
      await browserSession.clickByText("p, span, div, button, [role='button']", menuActionLabel, { timeout: 10000 });
    }

    await this.getTimeOffRowByStatus(nextStatus);
  }

  async directlySubmitEntry() {
    const hasNonRevise = await browserSession.executeScript(
      "return Array.from(document.querySelectorAll('table tbody tr')).some((row) => (row.innerText || '').includes('Non révisé'));"
    );

    if (hasNonRevise) {
      await this.getTimeOffRowByStatus("Non révisé");
      return;
    }

    await this.transitionMainRowStatus("Brouillon", "Non révisé", "Envoyer le brouillon");
  }

  async directlyBackToDraftEntry() {
    await this.transitionMainRowStatus("Non révisé", "Brouillon", "Convertir en brouillon");
  }

  async submitEntryKebabMenu() {
    const row = await this.getTimeOffRowByStatus("Brouillon");
    const button = await browserSession.executeScript(
      "const row = arguments[0]; const icon = row.querySelector('[data-testid=\"MoreVertIcon\"]'); return icon ? icon.closest('button') : null;",
      row
    );
    await browserSession.clickElement(button);
    await browserSession.clickByText("p, span, div, button, [role='button']", "Envoyer le brouillon", { timeout: 10000 });
    await this.getTimeOffRowByStatus("Non révisé");
  }

  async backToDraftEntryKebabMenu() {
    const row = await this.getTimeOffRowByStatus("Non révisé");
    const button = await browserSession.executeScript(
      "const row = arguments[0]; const icon = row.querySelector('[data-testid=\"MoreVertIcon\"]'); return icon ? icon.closest('button') : null;",
      row
    );
    await browserSession.clickElement(button);
    await browserSession.clickByText("p, span, div, button, [role='button']", "Convertir en brouillon", { timeout: 10000 });
    await this.getTimeOffRowByStatus("Brouillon");
  }

  async getWorklogsModal() {
    const modal = await browserSession.executeScript(
      `
        const titles = Array.from(document.querySelectorAll('div')).filter((element) => {
          const rendered = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
          const text = (element.innerText || '').trim();
          return rendered && /^Journaux de travail -/.test(text);
        });
        if (!titles.length) return null;
        return titles[0].closest('[role="dialog"], .MuiDialog-paper, .MuiModal-root');
      `
    );

    return modal;
  }

  async getWorklogRowByStatus(status) {
    const modal = await this.getWorklogsModal();
    if (!modal) {
      throw new Error("Worklogs modal not found");
    }

    const driver = await browserSession.getDriver();
    await driver.wait(async () => {
      const row = await browserSession.executeScript(
        `
          const [modal, status] = arguments;
          return Array.from(modal.querySelectorAll('table tbody tr')).find((row) => (row.innerText || '').includes(status)) || null;
        `,
        modal,
        status
      );
      return Boolean(row);
    }, 15000);

    return browserSession.executeScript(
      `
        const [modal, status] = arguments;
        return Array.from(modal.querySelectorAll('table tbody tr')).find((row) => (row.innerText || '').includes(status)) || null;
      `,
      modal,
      status
    );
  }

  async clickWorklogStatus(status) {
    const row = await this.getWorklogRowByStatus(status);
    const cell = await browserSession.executeScript(
      `
        const [row, status] = arguments;
        const items = Array.from(row.querySelectorAll('td, [role="cell"], button, [role="button"], div, span'));
        return items.find((item) => (item.innerText || '').trim() === status) || null;
      `,
      row,
      status
    );

    if (!cell) {
      throw new Error(`Worklog status ${status} was not found`);
    }

    await browserSession.clickElement(cell);
  }

  async submitEntryDirrectlyWorklogs() {
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await this.getWorklogsModal();
    await this.clickWorklogStatus("Brouillon");
    await browserSession.sleep(3000);
    await this.getWorklogRowByStatus("Non révisé");
  }

  async backToDraftsDirrectlyWorklogs() {
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await this.getWorklogsModal();
    await this.clickWorklogStatus("Non révisé");
    await browserSession.sleep(3000);
    await this.getWorklogRowByStatus("Brouillon");
  }

  async submitEntryKebabMenuWorklogs() {
    await browserSession.sleep(2000);
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    const row = await this.getWorklogRowByStatus("Brouillon");
    const button = await browserSession.executeScript(
      "const row = arguments[0]; const icons = row.querySelectorAll('[data-testid=\"MoreVertIcon\"]'); const icon = icons[icons.length - 1]; return icon ? icon.closest('button') : null;",
      row
    );
    await browserSession.clickElement(button);
    await browserSession.clickByText("p, span, div, button, [role='button']", "Envoyer le brouillon", { timeout: 10000 });
    await this.getWorklogRowByStatus("Non révisé");
    await browserSession.sleep(2000);
  }

  async backToDraftsEntryKebabMenuWorklogs() {
    await browserSession.sleep(2000);
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await browserSession.sleep(3000);
    const row = await this.getWorklogRowByStatus("Non révisé");
    const button = await browserSession.executeScript(
      "const row = arguments[0]; const icons = row.querySelectorAll('[data-testid=\"MoreVertIcon\"]'); const icon = icons[icons.length - 1]; return icon ? icon.closest('button') : null;",
      row
    );
    await browserSession.clickElement(button);
    await browserSession.clickByText("p, span, div, button, [role='button']", "Convertir en brouillon", { timeout: 10000 });
    await this.getWorklogRowByStatus("Brouillon");
    await browserSession.sleep(2000);
  }

  async submitEntryActionWorklogs() {
    await browserSession.sleep(2000);
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await this.getWorklogsModal();
    await browserSession.sleep(3000);

    const row = await this.getWorklogRowByStatus("Brouillon");
    const checkbox = await browserSession.executeScript(
      "const row = arguments[0]; return row.querySelector('input[type=\"checkbox\"]');",
      row
    );
    await browserSession.clickElement(checkbox);
    await browserSession.clickByText("button", "Actions", { timeout: 10000 });
    await browserSession.clickByText("div[role='button'], button, span", "Envoyer le brouillon", { timeout: 10000 });
    await browserSession.sleep(3000);
    await this.getWorklogRowByStatus("Non révisé");
  }

  async backToDraftsEntryActionWorklogs() {
    await browserSession.sleep(2000);
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await this.getWorklogsModal();
    await browserSession.sleep(3000);

    const row = await this.getWorklogRowByStatus("Non révisé");
    const checkbox = await browserSession.executeScript(
      "const row = arguments[0]; return row.querySelector('input[type=\"checkbox\"]');",
      row
    );
    await browserSession.clickElement(checkbox);
    await browserSession.clickByText("button", "Actions", { timeout: 10000 });
    await browserSession.clickByText("div[role='button'], button, span", "Convertir en brouillon", { timeout: 10000 });
    await browserSession.sleep(3000);
    await this.getWorklogRowByStatus("Brouillon");
  }

  async editAnEntry(newValue) {
    await this.clickHoursCellByText("0,00");
    await browserSession.clearAndType(By.css('[name="hours"]'), newValue);
    await browserSession.clickElement(await browserSession.findVisible(By.xpath("//button[.//*[contains(@data-testid,'CheckIcon')]]"), 10000));
    await browserSession.sleep(3000);

    await this.clickHoursCellByText("1,00");
    await browserSession.clearAndType(By.css('[name="hours"]'), "0");
    await browserSession.clickElement(await browserSession.findVisible(By.xpath("//button[.//*[contains(@data-testid,'CheckIcon')]]"), 10000));

    const updatedCell = await browserSession.findVisible(By.xpath(`//td[contains(., '${newValue}')]`), 10000);
    assert.ok(updatedCell);
    await browserSession.sleep(5000);
  }

  async validateTotalHoursLogged(value) {
    const footerRow = await browserSession.findVisible(By.css("tr.MuiTableRow-footer"), 30000);
    const numbers = await browserSession.executeScript(
      `
        const row = arguments[0];
        return Array.from(row.querySelectorAll('td'))
          .map((cell) => Number.parseFloat((cell.textContent || '').replace(',', '.')))
          .filter((number) => !Number.isNaN(number));
      `,
      footerRow
    );

    assert.strictEqual(numbers[numbers.length - 1], value);
  }

  async editEntryWorklogs(newValue) {
    await browserSession.clickElement(await this.getFirstMoreButton());
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await this.getWorklogsModal();
    await browserSession.sleep(3000);

    const driver = await browserSession.getDriver();
    const lastCell = await driver.findElement(By.xpath("(//table)[last()]//tbody/tr[last()]/td[5]"));
    const lastCellContent = await browserSession.executeScript(
      `
        const cell = arguments[0];
        const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        const children = Array.from(cell.querySelectorAll('span, div')).filter(visible);
        return children[children.length - 1] || cell;
      `,
      lastCell
    );
    await browserSession.executeScript("arguments[0].scrollIntoView({block: 'center', inline: 'center'});", lastCellContent);
    await driver.actions({ bridge: true }).move({ origin: lastCellContent, x: 0, y: 0 }).click().perform();
    await browserSession.sleep(2000);

    await browserSession.clearAndType(By.css('[name="hours"]'), newValue);
    await browserSession.clickElement(await browserSession.findVisible(By.css('[type="submit"]'), 10000));
    await browserSession.sleep(7000);
  }

  async changeToTab(tab) {
    await browserSession.clickByText("[role='tab'], .MuiTab-root, button, [role='button']", tab, { timeout: 15000 });
  }

  async createTimeOffRequest() {
    await this.clickPrimaryButton("Demande de congés");
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Ajouter une demande de congés')]"), 10000);

    const startDate = await browserSession.findVisible(By.css('input[name="start_date"]'), 10000);
    await browserSession.clickElement(startDate);

    await this.selectTodayInCurrentMonth();
    await this.selectTodayInCurrentMonth();
    await browserSession.executeScript("document.body.click();");
    await browserSession.sleep(1000);

    await browserSession.findVisible(By.css("input#type-label"), 10000).then((el) => browserSession.clickElement(el));
    await browserSession.clearAndType(By.css('input[name="unpaid_days"]'), "1");

    await this.saveByLabel();
    const alert = await browserSession.findVisible(By.css('div[role="alert"]'), 15000);
    const text = await alert.getText();
    assert.ok(text.includes("Demande de congés créée avec succès"));
  }

  async validateTimeOffCreated(jours, paye, sansSolde) {
    const row = await this.getTableRowContainingText("Congés payés", 15000);
    const summary = await browserSession.executeScript(
      `
        const row = arguments[0];
        const cells = Array.from(row.querySelectorAll('td'));
        return [4, 5, 6].map((index) => {
          const raw = ((cells[index] && cells[index].innerText) || '').trim().replace(/\\s/g, '').replace(',', '.');
          const parsed = Number.parseFloat(raw);
          return Number.isNaN(parsed) ? 0 : parsed;
        });
      `,
      row
    );

    assert.deepStrictEqual(summary, [jours, paye, sansSolde]);
  }

  async editPayeTimeOff(newValue, oldValue) {
    await this.clickInlineValueInRow("Congés payés", oldValue);
    await browserSession.findVisible(By.css('input[name="paid_days"]'), 10000);
    await browserSession.clearAndType(By.css('input[name="paid_days"]'), newValue);
    await browserSession.clickElement(await browserSession.findVisible(By.xpath("//button[.//*[contains(@data-testid,'CheckIcon')]]"), 10000));
    await browserSession.findVisible(By.xpath(`//tr[contains(., 'Congés payés')]//td[contains(., '${newValue}')]`), 10000);
    await browserSession.sleep(5000);
  }

  async editSansSoldeTimeOff(newValue, oldValue) {
    await this.clickInlineValueInRow("Congés payés", oldValue);
    await browserSession.findVisible(By.css('input[name="unpaid_days"]'), 10000);
    await browserSession.clearAndType(By.css('input[name="unpaid_days"]'), newValue);
    await browserSession.clickElement(await browserSession.findVisible(By.xpath("//button[.//*[contains(@data-testid,'CheckIcon')]]"), 10000));
    await browserSession.findVisible(By.xpath(`//tr[contains(., 'Congés payés')]//td[contains(., '${newValue}')]`), 10000);
    await browserSession.sleep(5000);
  }

  async submitTimeOffDirrectlyModifier() {
    await browserSession.clickElement(await this.getMoreButtonForRow("Congés payés"));
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Modifier la demande de congés -')]"), 10000);
    await browserSession.clickByText("button, [role='button']", "Envoyer le brouillon", { timeout: 10000 });
    await this.getTimeOffRowByStatus("Non révisé");
  }

  async backToDraftsTimeOffDirrectlyModifier() {
    await browserSession.clickElement(await this.getMoreButtonForRow("Congés payés"));
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Modifier la demande de congés -')]"), 10000);
    await browserSession.clickByText("button, [role='button']", "Convertir en brouillon", { timeout: 10000 });
    await browserSession.sleep(3000);
    await this.getTimeOffRowByStatus("Brouillon");
  }

  async ediTimeOffModifierModal() {
    await browserSession.clickElement(await this.getMoreButtonForRow("Congés payés"));
    await browserSession.clickByText("p, span, div, button, [role='button']", "Editer", { timeout: 10000 });
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Modifier la demande de congés -')]"), 10000);
    await browserSession.findVisible(By.css("#type-label"), 10000).then((el) => browserSession.clickElement(el));
    await browserSession.clickByText("ul#type-label-listbox li, ul#type-label-listbox [role='option']", "Maladie", { timeout: 10000 });
    await this.saveByLabel();
    await browserSession.findVisible(By.xpath("//tr[contains(., 'Maladie')]"), 15000);
  }

  async closeWeekTeamTab() {
    await this.clickVisibleControl("Clôturer la semaine", { timeout: 10000 });
    await browserSession.clickByText("button", "OK", { timeout: 10000 });
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Semaine mise à jour avec succès')]"), 10000);
  }

  async openWeekTeamTab() {
    await this.clickVisibleControl("Ouvrir la semaine", { timeout: 10000 });
    await browserSession.findVisible(By.xpath("//*[contains(text(), 'Semaine mise à jour avec succès')]"), 10000);
  }

  async editTimeEntryTEAMtab(option) {
    const manageButton = await browserSession.findVisible(By.css('[aria-label="Gérer la feuille de temps"] button'), 10000);
    await browserSession.clickElement(manageButton);
    await browserSession.findVisible(By.css('div[role="dialog"]'), 10000);
    const radioLabel = await browserSession.findVisible(By.xpath(`//label[contains(@class, 'MuiFormControlLabel-root')][contains(., "${option}")]`), 10000);
    await browserSession.clickElement(radioLabel);
    const closeButton = await browserSession.findVisible(By.xpath("(//button[.//*[contains(@data-testid,'CloseIcon')]])[last()]"), 10000);
    await browserSession.clickElement(closeButton);
  }

  async validateTheEdit(option) {
    await browserSession.findVisible(By.xpath(`//*[self::td or self::span or self::div][contains(., "${option}")]`), 20000);
  }

  async changeTabToValidesOrNot(value) {
    await browserSession.clickByText("button, [role='button'], [role='tab']", value, { timeout: 15000 });
  }
}

const timeTab = new TimeTab();

module.exports = {
  TimeTab,
  timeTab,
};
