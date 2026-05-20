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
    loginPage.changeLanguageToFrench()
    loginPage.dismissOnboardingOverlay()
    timeTab.visitTime()
    timeTab.changeTabTo('Temps')
  })

  beforeEach('The vieport is set to 1280x720', () => {
    cy.viewport(1280,720)
    loginPage.dismissOnboardingOverlay()
  
  })

  it('Log a new entry in the previous week for one day using annex field', () => {
    timeTab.logTimeOneDayAnnex('Travail','Main Automation Project',`ESQ - Études d’esquisse`,'Annex Automation Main1', 1)
  })

  it('Submit the newly created entry directly from the table', () => {
    timeTab.directlySubmitEntry()
  })


  it('Navigate to the Team tab', () => {
    timeTab.changeTabToTimeEntryOrTeam("Équipe") //Saisie de temps
  })

  it('Valider the time entry on the Team tab', () => {
    timeTab.editTimeEntryTEAMtab("Valider") 
  })


  it('Navigate to the Time Entry page', () => {
    timeTab.changeTabToTimeEntryOrTeam("Saisie de temps") 
    timeTab.validateTheEdit("Approuvé")
  })

  it('Change from aprooved to not approved', () => {
    timeTab.changeTabToTimeEntryOrTeam("Équipe")
    timeTab.changeTabToValidesOrNot("Validés");
    timeTab.editTimeEntryTEAMtab("Non révisé") 
})

it('Back to draft and delete the entry', () => {
    timeTab.changeTabToTimeEntryOrTeam("Saisie de temps") 
    timeTab.directlyBackToDraftEntry()
    timeTab.deleteEntry()

  })
  
})