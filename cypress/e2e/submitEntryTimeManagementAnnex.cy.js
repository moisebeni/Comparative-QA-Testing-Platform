import { timeTab } from "../support/TimePages/timeTab"
import { LoginPage, loginPage } from "../support/login"

describe('template spec', () => {

  before('Before logs into FE', () => {
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
    cy.viewport(1280,720)
    loginPage.visit()
    loginPage.auth('ArhitectMain')
    loginPage.changeLanguageToFrench()
    loginPage.dismissOnboardingOverlay()
  })

  beforeEach('The vieport is set to 1280x720', () => {
    cy.viewport(1280,720)
    loginPage.dismissOnboardingOverlay()
  })

  it('Navigate to the time page, time tab', () => {
    timeTab.visitTime()
    timeTab.changeTabTo('Temps')
  })

  it('Log a new entry in the previous week for one day using Annex', () => {
    timeTab.logTimeOneDayAnnex('Travail','Main Automation Project',`ESQ - Études d’esquisse`,'Annex Automation Main1', 1)
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


  it('Submit the newly created entry dirrectly from Worklogs modal', () => {
    timeTab.submitEntryDirrectlyWorklogs()
  })

  it('Back to draft the newly created entry dirrectly from Worklogs modal', () => {
    timeTab.backToDraftsDirrectlyWorklogs()
  })

  it('Submit the newly created entry using kebab menu from Worklogs modal', () => {
    timeTab.submitEntryKebabMenuWorklogs()
  })

  it('Back to draft the newly created entry using kebabmenu from Worklogs modal', () => {
    timeTab.backToDraftsEntryKebabMenuWorklogs()
  })

  it('Submit the newly created entry using ACTION button from Worklogs modal', () => {
    timeTab.submitEntryActionWorklogs()
  })

  it('Back to draft the newly created entry using ACTION button from Worklogs modal', () => {
    timeTab.backToDraftsEntryActionWorklogs()
  })


  it('Delete the entry from previous week', () => {
    timeTab.deleteEntry()
  })

  
})