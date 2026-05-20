import { timeTab } from "../support/TimePages/timeTab";
import { LoginPage, loginPage } from "../support/login"

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

  it('Navigate to the time page, time tab', () => {
    timeTab.visitTime()
    loginPage.dismissOnboardingOverlay()
    timeTab.changeTabTo('Temps')
  })

  it('Navigate to the previous week', () => {
    timeTab.goPreviousWeek(4)
  })

  // it('Log a new entry in the previous week more than 40 hours', () => {
  //   timeTab.logTimeMoreThan40('Travail','Main Automation Project',`ESQ - Études d’esquisse`,'Annex Automation Main1', 37,1,1,1,1)
  // })

  it('Log a new entry in the previous week for one day using annex', () => {
    timeTab.logTimeOneDayAnnex('Travail','Main Automation Project',`ESQ - Études d’esquisse`,'Annex Automation Main1', 1)
  })

  it('Edit the newly created entry directly from the table', () => {
    timeTab.editAnEntry(5)
    timeTab.validateTotalHoursLogged(5.00)
  })

  it('Navigate to the next week', () => {
    timeTab.goNextWeek(1)
  })

  it('Copy previous week', () => {
    timeTab.copyThePreviousWeek()
    timeTab.validateTotalHoursLogged(5.00)
  })

  it('Edit entry using kebabmenu', ()=>{
    timeTab.editEntryWorklogs(6.00)
    timeTab.validateTotalHoursLogged(6.00)
  })

  it('Delete the entry from the current week week', () => {
    timeTab.deleteEntry()
  })

  it('Navigate back to the previous week', () => {
    timeTab.goPreviousWeek(1)
  })

  it('Delete the entry from the previous week', () => {
    timeTab.deleteEntry()
  })


  
})