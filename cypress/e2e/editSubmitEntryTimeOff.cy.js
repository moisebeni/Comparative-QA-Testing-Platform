import { timeTab } from "../support/TimePages/timeTab";
import { LoginPage, loginPage } from "../support/login"

const getWorkingDaysInCurrentMonth = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  let workingDays = 0;
  const cursor = new Date(year, month, 1);

  while (cursor.getMonth() === month) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      workingDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return workingDays;
};

const WORKING_DAYS_THIS_MONTH = getWorkingDaysInCurrentMonth();


describe('template spec', () => {

before('Before logs into FE', () => {
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
    loginPage.visit()
    loginPage.auth('ArhitectMain')
    loginPage.changeLanguageToFrench()
    loginPage.dismissOnboardingOverlay()
  
  })
beforeEach('The vieport is set to 1280x720', () => {
    cy.viewport(1280,720)
    loginPage.dismissOnboardingOverlay()
  
  })

it('Navigate to the time page, time off tab', () => {
    timeTab.visitTime()
    timeTab.changeTabTo('Temps')
    timeTab.changeToTab("Congés")
  })

it('Create a new Time Off Entry', () => {
    timeTab.createTimeOffRequest()
    timeTab.validateTimeOffCreated(1, 0, 1)
  })
 

  it('Edit the paye directly from the table', () => {
    timeTab.editPayeTimeOff("1,00", "0,00")
    timeTab.validateTimeOffCreated(1, 1, 0)
  })

  it('Edit the sans solde directly from the table', () => {
    timeTab.editSansSoldeTimeOff("1,00", "0,00")
    timeTab.validateTimeOffCreated(1, 0, 1)
  })

  it('Submit the newly created entry directly from the table', () => {
    timeTab.directlySubmitEntry()
  })

  it('Back to draft the newly created entry directly from the table', () => {
    timeTab.directlyBackToDraftEntry()
  })

  it('Submit the newly created entry using kebab menu', () => {
    timeTab.submitEntryKebabMenu()
  })

  it('Back to draft the newly created entry using kebab menu', () => {
    timeTab.backToDraftEntryKebabMenu()
  })

  it('Submit the newly created entry dirrectly from Modifier modal', () => {
    timeTab.submitTimeOffDirrectlyModifier()
  })

  it('Back to draft the newly created entry dirrectly from Modifier modal', () => {
    timeTab.backToDraftsTimeOffDirrectlyModifier()
  })

  it('Edit time off entru from Modifier modal', () => {
    timeTab.ediTimeOffModifierModal()
  })

  it('Delete the entry', () => {
    timeTab.deleteTimeOffEntry()  
  })

  
  
})
