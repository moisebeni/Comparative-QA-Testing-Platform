//timePageTimeEntruTeamTab.cy.js
import { timeTab } from "../support/TimePages/timeTab"
import { LoginPage, loginPage } from "../support/login"

describe('template spec', () => {

  before('Before logs into FE', () => {
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.clearAllCookies();
    cy.viewport(1280,720)
    loginPage.visit()
    loginPage.auth('AdminMain')
    cy.reload()
    loginPage.changeLanguageToFrench()
    loginPage.dismissOnboardingOverlay()
    timeTab.visitTime()
    timeTab.changeTabTo('Temps')
  })

  beforeEach('The vieport is set to 1280x720', () => {
    cy.viewport(1280,720)
    loginPage.dismissOnboardingOverlay()
  })

  it('Log a new entry in the previous week for one day using phase field', () => {
    timeTab.logTimeOneDayPhase('Travail','Main Automation Project',`ESQ - Études d’esquisse`,'Annex Automation Main1', 1)
  })

  it('Submit the newly created entry directly from the table', () => {
    timeTab.directlySubmitEntry()
  })

  it('Navigate to the Team tab', () => {
    timeTab.changeTabToTimeEntryOrTeam("Équipe") //Saisie de temps
  })

  it('Close the current week', () => {
    timeTab.closeWeekTeamTab() 
  })

  it('Reopen the current week', () => {
    timeTab.openWeekTeamTab() 
  })

  it('Refuse the time entry on the Team tab', () => {
    timeTab.editTimeEntryTEAMtab("Refuser") 
  })

  it('Navigate to the Time Entry page', () => {
    timeTab.changeTabToTimeEntryOrTeam("Saisie de temps") 
    timeTab.validateTheEdit("Refusé")
  })

  it('Delete the entry from previous week', () => {
    timeTab.deleteEntry()
    cy.wait(4000)
  })

  
})