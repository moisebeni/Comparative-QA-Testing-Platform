import dayjs from 'dayjs';

export class TimeTab {

  selectTodayInCurrentMonth() {
    const today = dayjs().date();

    cy.get('.rdrMonth', { timeout: 30000 }).first().within(() => {
      cy.contains('.rdrDay:not(.rdrDayPassive) .rdrDayNumber span, .rdrDay:not(.rdrDayPassive) .rdrDayNumber', new RegExp(`^${today}$`))
        .click({ force: true });
    });
  }

  visitTime() {
    // cy.visit('https://staging.ooti.co/times/time')
    cy.visit('https://main.ooti.co/times/time')
    cy.get('div[aria-label="time_tabs"]', { timeout: 20000 }).should('be.visible');
  }

  changeTabTo(option) {
    cy.get('div[aria-label="time_tabs"]', { timeout: 15000 })
      .find('div[role="tab"]')
      .contains(option)
      .click({ force: true });
    cy.wait(2000)
  }

  changeTabToTimeEntryOrTeam(value, path) {
    cy.contains('button', value).eq(0).should('be.visible')
    cy.contains('button', value).eq(0).click({ force: true });
  }


  selectListboxOption(selector, optionLabel) {
    cy.get(selector).click({ force: true });

    if (optionLabel) {
      cy.focused()
        .type('{selectall}{backspace}', { force: true })
        .type(optionLabel, { force: true });
    }

    cy.get('[role="listbox"]', { timeout: 10000 }).should('be.visible');

    cy.get('[role="listbox"] [role="option"], [role="listbox"] li', { timeout: 10000 })
      .then(($items) => {
        if (!$items.length) {
          cy.get(selector).click({ force: true });
          cy.focused().type('{selectall}{backspace}', { force: true });
          cy.wait(500);
          cy.get('[role="listbox"] [role="option"], [role="listbox"] li', { timeout: 10000 })
            .then(($retry) => {
              if (!$retry.length) {
                cy.focused().type('{downarrow}{enter}', { force: true });
              }
            })
            .should('exist');
        }
      })
      .then(() => {
        cy.get('[role="listbox"] [role="option"], [role="listbox"] li', { timeout: 10000 })
          .then(($options) => {
            let $target = optionLabel
              ? $options.filter((_, el) => el.innerText.trim().includes(optionLabel))
              : $options;

            if (!$target.length) {
              if ($options.length) {
                $target = $options.eq(0);
              } else {
                cy.focused().type('{downarrow}{enter}', { force: true });
                return;
              }
            }

            cy.wrap($target.eq(0)).scrollIntoView().click({ force: true });
          });
      });

    cy.wait(500);
  }


  logTimeOneDayAnnex(type, project, phase, annex, mondayH) {
    cy.get('button.MuiButton-containedPrimary').contains('Feuille de temps').click();
    this.validateAddHoursLogModal()

    //Choose type
    cy.get('#type-label').click({ force: true })
    cy.contains(type).click({ force: true })
    cy.wait(2000)
    //Choose Project
    // cy.get('#project-label').click()
    cy.get('#project-label').click({ force: true })
    cy.get('ul[role="listbox"] li', { timeout: 10000 })
      .contains(project)
      .click({ force: true });
    cy.wait(3000)
    //Choose Annex
    this.selectListboxOption('#annex-label', annex);

    cy.get('input[name="monday"]').clear().type(mondayH);
    cy.get('[type="submit"]').contains("Sauvegarder").click()

  }
  logTimeOneDayPhase(type, project, phase, annex, mondayH) {
    cy.get('button.MuiButton-containedPrimary').contains('Feuille de temps').click();
    this.validateAddHoursLogModal()

    //Choose type
    cy.get('#type-label').click({ force: true })
    cy.contains(type).click({ force: true })
    cy.wait(2000)
    //Choose Project
    cy.get('#project-label').click({ force: true })
    cy.get('ul[role="listbox"] li', { timeout: 10000 })
      .contains(project)
      .click({ force: true });
    cy.wait(3000)
    //Choose Phase
    cy.get('#phase-label').click({ force: true })
    cy.contains(phase).click()
    cy.wait(2000)

    cy.get('input[name="monday"]').clear().type(mondayH);
    cy.get('[type="submit"]').contains("Sauvegarder").click()

  }

  logTimeAnnex(type, project, phase, annex, mondayH, tuesdayH, wednesdayH, thursdayH, fridayH, mondayNotes, tuesdayNotes) {
    cy.get('button.MuiButton-containedPrimary').contains('Feuille de temps').click();
    this.validateAddHoursLogModal()

    //Choose type
    cy.get('#type-label').click({ force: true })
    cy.contains(type).click({ force: true })
    cy.wait(2000)
    //Choose Project
    cy.get('#project-label').click({ force: true })
    let proj = " | " + project
    cy.contains('li', proj, { timeout: 10000 }).click({ force: true })
    cy.wait(1000)
    //Choose Annex
    this.selectListboxOption('#annex-label', annex);

    cy.get('input[name="monday"]').clear().type(mondayH);
    cy.get('input[name="tuesday"]').clear().type(tuesdayH);
    cy.get('input[name="wednesday"]').clear().type(wednesdayH);
    cy.get('input[name="thursday"]').clear().type(thursdayH);
    cy.get('input[name="friday"]').clear().type(fridayH);

    //Weekly Notes
    cy.get('[name="monday_notes"]').clear().type(mondayNotes)
    cy.get('[name="tuesday_notes"]').clear().type(tuesdayNotes)
    cy.get('[type="submit"]').contains("Sauvegarder").click()
  }
  logTimePhase(type, project, phase, annex, mondayH, tuesdayH, wednesdayH, thursdayH, fridayH, mondayNotes, tuesdayNotes) {
    cy.get('button.MuiButton-containedPrimary').contains('Feuille de temps').click();
    this.validateAddHoursLogModal()

    //Choose type
    cy.get('#type-label').click({ force: true })
    cy.contains(type).click({ force: true })
    cy.wait(2000)
    //Choose Project
    cy.get('#project-label').click({ force: true })
    let proj = " | " + project
    cy.contains('li', proj, { timeout: 10000 }).click({ force: true })
    cy.wait(1000)
    //Choose Phase
    cy.get('#phase-label').click({ force: true })
    cy.contains('li', phase, { timeout: 10000 }).click({ force: true })
    cy.wait(1000)


    cy.get('input[name="monday"]').clear().type(mondayH);
    cy.get('input[name="tuesday"]').clear().type(tuesdayH);
    cy.get('input[name="wednesday"]').clear().type(wednesdayH);
    cy.get('input[name="thursday"]').clear().type(thursdayH);
    cy.get('input[name="friday"]').clear().type(fridayH);

    //Weekly Notes
    cy.get('[name="monday_notes"]').clear().type(mondayNotes)
    cy.get('[name="tuesday_notes"]').clear().type(tuesdayNotes)
    cy.get('[type="submit"]').contains("Sauvegarder").click()
  }





  logTimeMoreThan40(type, project, phase, annex, mondayH, tuesdayH, wednesdayH, thursdayH, fridayH) {
    cy.get('button.MuiButton-containedPrimary').contains('Feuille de temps').click();
    this.validateAddHoursLogModal()
    //Choose type
    cy.get('#type-label').click({ force: true })
    cy.contains(type).click({ force: true })
    cy.wait(2000)
    //Choose Project
    // cy.get('#project-label').click()
    cy.get('#project-label').click({ force: true })
    cy.get('ul[role="listbox"] li', { timeout: 10000 })
      .contains(project)
      .click({ force: true });
    cy.wait(1000)
    //Choose Phase
    cy.get('#phase-label').click({ force: true })
    cy.contains(phase).click()
    cy.wait(2000)

    //Choose Annex

    cy.get('input[name="monday"]').clear().type(mondayH);
    cy.get('input[name="tuesday"]').clear().type(tuesdayH);
    cy.get('input[name="wednesday"]').clear().type(wednesdayH);
    cy.get('input[name="thursday"]').clear().type(thursdayH);
    cy.get('input[name="friday"]').clear().type(fridayH);

    cy.get('[type="submit"]').contains("Sauvegarder").click()
    cy.get('.Toastify__toast--warning', { timeout: 15000 })
    .should('contain', "Vous avez dépassé la limite d'heures hebdomadaires")
    .and('be.visible')
    cy.contains("Ajouter une feuille de temps").parent().find('[data-testid="CloseIcon"]').closest('button').click({ force: true });

  }

  deleteEntry() {
    cy.wait(2000)
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.get('[data-testid="DeleteIcon"]').click({ force: true })
    cy.get('[data-testid="ErrorOutlineIcon"]').parent().contains(`Êtes-vous sûr(e) de vouloir supprimer cette feuille de temps ?`)
    cy.get('.actions__block').find('button').contains("OK").click({ force: true })
    cy.wait(4000)
  }

  goPreviousWeek(weeks) {
    while (weeks > 0) {
      weeks--;
      cy.get('[data-testid="ArrowBackIosNewIcon"]').click({ force: true });
    }
  }

  goNextWeek(weeks) {
    while (weeks > 0) {
      weeks--;
      cy.get('[data-testid="ArrowForwardIosIcon"]').click();
    }
  }

  copyThePreviousWeek(sourceWeekLabel = null) {
    const getIsoWeek = (date) => {
      const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = utcDate.getUTCDay() || 7;
      utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
      return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
    };

    const getIsoWeeksInYear = (year) => getIsoWeek(new Date(Date.UTC(year, 11, 31)));

    const now = new Date();
    let targetWeek = getIsoWeek(now) - 4;
    let targetYear = now.getFullYear();

    while (targetWeek <= 0) {
      targetYear--;
      targetWeek += getIsoWeeksInYear(targetYear);
    }

    cy.contains('[role="button"]', 'Copier une semaine antérieure', { timeout: 10000 })
      .scrollIntoView()
      .click({ force: true });

    const weekNumberRegex = /^Semaine\s+(\d+)\b/;
    const candidateWeekNumbers = [targetWeek, targetWeek - 1, targetWeek + 1];
    const candidateWeekRegex = new RegExp(`^Semaine\\s+(${candidateWeekNumbers.join("|")})\\b`);

    cy.get('#source_week-label', { timeout: 10000 })
      .should('be.visible')
      .then(($input) => {
        const currentValue = ($input.val() || "").toString();
        const isAlreadySelected = sourceWeekLabel
          ? currentValue.includes(sourceWeekLabel)
          : candidateWeekRegex.test(currentValue);

        if (!isAlreadySelected) {
          cy.wrap($input)
            .closest('.MuiAutocomplete-root')
            .find('button[aria-label="Open"]')
            .click({ force: true });

          cy.get('[role="listbox"] [role="option"]', { timeout: 10000 })
            .should('be.visible')
            .then(($options) => {
              const optionLabels = [...$options].map((option) => option.innerText.trim());

              let selectedLabel = sourceWeekLabel
                ? optionLabels.find((label) => label.includes(sourceWeekLabel))
                : candidateWeekNumbers
                  .map((candidateWeek) =>
                    optionLabels.find((label) => new RegExp(`^Semaine\\s+${candidateWeek}\\b`).test(label))
                  )
                  .find(Boolean);

              if (!selectedLabel) {
                selectedLabel = optionLabels.find((label) => weekNumberRegex.test(label));
              }

              expect(selectedLabel, "Expected at least one source week option").to.exist;
              cy.contains('[role="option"]', selectedLabel).click({ force: true });
            });
        }
      });

    cy.get("body").then(($body) => {
      if ($body.find('[data-testid*="validate"]').length > 0) {
        cy.get('[data-testid*="validate"]').click({ force: true });
      } else {
        cy.get('.actions__block').find('button').contains("OK").click({ force: true });
      }
    });
  }

  validateAddHoursLogModal() {
    cy.get('.MuiTypography-root.MuiDialogTitle-root').should('be.visible').and('contain.text', 'Ajouter une feuille de temps')
    //'Add hours log');
    cy.wait(3000)
  }

  getTimeOffRowByStatus(status) {
    return cy.contains('table tbody tr', status, { timeout: 15000 }).filter(':visible').first();
  }

  clickTimeOffStatus(currentStatus) {
    this.getTimeOffRowByStatus(currentStatus)
      .contains('td, [role="cell"], div, span', new RegExp(`^\\s*${Cypress._.escapeRegExp(currentStatus)}\\s*$`), { timeout: 10000 })
      .filter(':visible')
      .last()
      .closest('td, [role="cell"], button, [role="button"]')
      .click({ force: true });
  }

  transitionMainRowStatus(currentStatus, nextStatus, menuActionLabel) {
    this.clickTimeOffStatus(currentStatus);
    cy.wait(1000);

    cy.get('body').then(($body) => {
      if ($body.find(`table tbody tr:contains("${nextStatus}")`).length) {
        return;
      }

      this.getTimeOffRowByStatus(currentStatus).within(() => {
        cy.get('[data-testid="MoreVertIcon"]').first().closest('button').click({ force: true });
      });
      cy.contains('p, span, div', menuActionLabel, { timeout: 10000 })
        .closest('[role="button"], button')
        .click({ force: true });
    });

    this.getTimeOffRowByStatus(nextStatus).should('be.visible');
  }

  directlySubmitEntry() {
    cy.get('body', { timeout: 15000 }).then(($body) => {
      const hasNonRevise = $body.find('table tbody tr:contains("Non révisé")').length > 0;
      if (hasNonRevise) {
        this.getTimeOffRowByStatus("Non révisé").should('be.visible');
        return;
      }

      this.transitionMainRowStatus("Brouillon", "Non révisé", "Envoyer le brouillon");
    });
  }

  directlyBackToDraftEntry() {
    this.transitionMainRowStatus("Non révisé", "Brouillon", "Convertir en brouillon");
  }

  submitEntryKebabMenu() {
    this.getTimeOffRowByStatus("Brouillon").within(() => {
      cy.get('[data-testid="MoreVertIcon"]').first().closest('button').click({ force: true });
    });
    cy.contains('p', 'Envoyer le brouillon').closest('[role="button"]').click();
    this.getTimeOffRowByStatus("Non révisé").should('be.visible');

  }

  backToDraftEntryKebabMenu() {
    this.getTimeOffRowByStatus("Non révisé").within(() => {
      cy.get('[data-testid="MoreVertIcon"]').first().closest('button').click({ force: true });
    });
    cy.contains('p', 'Convertir en brouillon').closest('[role="button"]').click();
    this.getTimeOffRowByStatus("Brouillon").should('be.visible');
  }

  getWorklogsModal() {
    return cy.get('body').then(($body) => {
      const $visibleWorklogsTitle = $body.find('div:visible').filter((_, el) => {
        return /^Journaux de travail -/.test((el.textContent || '').trim());
      });

      if ($visibleWorklogsTitle.length) {
        return cy.wrap($visibleWorklogsTitle.first())
          .closest('[role="dialog"], .MuiDialog-paper, .MuiModal-root');
      }

      return cy.get('body');
    });
  }

  getWorklogRowByStatus(status) {
    return this.getWorklogsModal()
      .contains('table tbody tr', status, { timeout: 15000 })
      .filter(':visible')
      .first();
  }

  clickWorklogStatus(status) {
    this.getWorklogRowByStatus(status)
      .contains('td, [role="cell"], button, [role="button"], div, span', new RegExp(`^\\s*${Cypress._.escapeRegExp(status)}\\s*$`), { timeout: 10000 })
      .filter(':visible')
      .last()
      .closest('td, [role="cell"], button, [role="button"]')
      .click({ force: true });
  }


  submitEntryDirrectlyWorklogs() {
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click()
    cy.contains('p', 'Editer').closest('[role="button"]').click();
    this.getWorklogsModal();
    this.clickWorklogStatus("Brouillon");
    cy.wait(3000)
    this.getWorklogRowByStatus("Non révisé").should('be.visible');
  }

  backToDraftsDirrectlyWorklogs() {
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').closest('[role="button"]').click();
    this.getWorklogsModal();
    this.clickWorklogStatus("Non révisé");
    cy.wait(3000)
    this.getWorklogRowByStatus("Brouillon").should('be.visible');

  }

  submitEntryKebabMenuWorklogs() {
    cy.wait(2000)
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').closest('[role="button"]').click();
    this.getWorklogRowByStatus("Brouillon").within(() => {
      cy.get('[data-testid="MoreVertIcon"]').last().closest('button').click({ force: true });
    });
    cy.contains('p', 'Envoyer le brouillon').closest('[role="button"]').click();
    this.getWorklogRowByStatus("Non révisé").should('be.visible');
    cy.wait(2000)

  }

  backToDraftsEntryKebabMenuWorklogs() {
    cy.wait(2000)
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').closest('[role="button"]').click()
    cy.wait(3000)
    this.getWorklogRowByStatus("Non révisé").within(() => {
      cy.get('[data-testid="MoreVertIcon"]').last().closest('button').click({ force: true })
    })
    cy.contains('p', 'Convertir en brouillon').closest('[role="button"]').click()
    this.getWorklogRowByStatus("Brouillon").should('be.visible');
    cy.wait(2000)

  }

  submitEntryActionWorklogs() {
    cy.wait(2000)

    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').eq(0).closest('[role="button"]').click()
    this.getWorklogsModal()
    cy.wait(3000)
    this.getWorklogRowByStatus("Brouillon").find('input[type="checkbox"]').first().click({ force: true })
    cy.contains('button', 'Actions').should('be.visible').click()
    cy.contains('div[role="button"]', 'Envoyer le brouillon').should('be.visible').click();
    cy.wait(3000)
    this.getWorklogRowByStatus("Non révisé").should('be.visible')
    cy.wait(3000)
  }

  backToDraftsEntryActionWorklogs() {
    cy.wait(2000)
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').eq(0).closest('[role="button"]').click()
    this.getWorklogsModal()
    cy.wait(3000)
    this.getWorklogRowByStatus("Non révisé").find('input[type="checkbox"]').first().click({ force: true })
    cy.contains('button', 'Actions').should('be.visible').click()
    cy.contains('div[role="button"]', 'Convertir en brouillon').should('be.visible').click();
    cy.wait(3000)
    this.getWorklogRowByStatus("Brouillon").should('be.visible')
    cy.wait(3000)
  }

  editAnEntry(newValue) {
    cy.get('td').contains('0,00').first().click({ force: true });
    cy.get('[name="hours"]').clear().type(newValue);
    cy.get('button:has([data-testid="CheckIcon"])').click();
    cy.wait(3000)
    cy.get('td').contains('1,00').click({ force: true });
    cy.get('[name="hours"]').clear().type('0');
    cy.get('button:has([data-testid="CheckIcon"])').click();
    cy.get('td').contains(newValue).should('be.visible')
    cy.wait(5000)
  }

  validateTotalHoursLogged(value) {
    cy.get('tr.MuiTableRow-footer').first().within(() => {
      cy.get('td')
        .then(($tds) => {
          const values = [...$tds].map(td => parseFloat(td.textContent)).filter(val => !isNaN(val));

          expect(values[values.length - 1]).to.eq(value);
        });
    });
  }
  
  editEntryWorklogs(newValue) {
    cy.get('[data-testid="MoreVertIcon"]').eq(0).click({ force: true })
    cy.contains('p', 'Editer').eq(0).closest('[role="button"]').click()
    cy.contains('div', /^Journaux de travail -/).should('be.visible')
    cy.wait(3000)
    cy.contains('div', /^Journaux de travail -/).parent().parent().get('table').last().within(() => {
      cy.get('tbody tr').last().within(() => {
        cy.get('td').eq(4).click()
        cy.wait(2000)
      });
    });
    cy.get('[name="hours"]', { includeShadowDom: true }).type(newValue);
    cy.get('[type="submit"]').click()
    cy.contains('div', /^Journaux de travail -/).parent().parent().find('[data-testid="CloseIcon"]')
    cy.wait(7000)
  }

  changeToTab(tab) {
    const labelMatchers = {
      "Récupération": /récupération(s)?/i,
      "RTT": /^rtt$/i,
      "Congés": /^congés$/i,
      "Temps": /^temps$/i
    };
    const tabMatcher = labelMatchers[tab] || new RegExp(`^\\s*${Cypress._.escapeRegExp(tab)}\\s*$`, "i");
    const tabSelector = '[role="tab"], .MuiTab-root, button, [role="button"]';

    cy.contains(tabSelector, tabMatcher, { timeout: 15000 })
      .filter(':visible')
      .first()
      .scrollIntoView()
      .click({ force: true });
  }

  validateRTT(jours) {
    cy.get('tr').contains('Congés payés').parents('tr').within(() => {
      cy.get('td').then($cells => {
        const values = [
          $cells.eq(4).text().trim(),
        ];
        const numbers = values.map(v => parseFloat(v.replace(',', '.')));
        expect(numbers).to.deep.equal(jours);
      });
    });

  }

  closeWeekTeamTab() {
    cy.contains('div', 'Clôturer la semaine').click();
    cy.contains('button', 'OK').click();
    cy.contains('Semaine mise à jour avec succès').should('be.visible');

  }

  openWeekTeamTab() {
    cy.contains('span', 'Ouvrir la semaine').click();
    cy.contains('div', 'Semaine mise à jour avec succès').should('be.visible');
  }

  editTimeEntryTEAMtab(option) {
    cy.get('[aria-label="Gérer la feuille de temps"]').find('button').click();
    cy.get('div[role="dialog"]').should('be.visible').and('contain.text', 'Gérer la feuille de temps');
    cy.contains('label.MuiFormControlLabel-root', option).find('input[type="radio"]').click();
    cy.get('button').find('svg[data-testid="CloseIcon"]').parent('button').last().click({ force: true });
  }

  validateTheEdit(option) {
    cy.contains('td, span, div', option, { timeout: 20000 }).should('be.visible');
  }

  validateLatestRecuperationStatus(status) {
    this.getLatestRecuperation().then(({ notes }) => {
      const row = notes ? this.getRecuperationRow(notes) : cy.contains('tr', status, { timeout: 20000 });
      row
        .should('be.visible')
        .within(() => {
          cy.contains('td, span, div', status, { timeout: 15000 }).should('be.visible');
        });
    });
  }

  changeTabToValidesOrNot(value) {
    const normalizedMatchers = {
      "Non révisé": /non\s+révis/i,
      "Non révisés": /non\s+révis/i,
      "Validés": /validés?/i
    };
    const matcher = normalizedMatchers[value] || new RegExp(Cypress._.escapeRegExp(value), 'i');

    cy.contains('button, [role="button"], [role="tab"]', matcher, { timeout: 15000 })
      .filter(':visible')
      .first()
      .click({ force: true });
  }
  
}
export const timeTab = new TimeTab();
