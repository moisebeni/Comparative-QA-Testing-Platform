const { loginPage } = require("../support/login");
const { timeTab } = require("../support/TimePages/timeTab");
const { browserSession } = require("../support/browser");
const { prepareSuite, cleanupSuite } = require("../support/e2e");

describe("timePageTimeEntryTeamTabApproveAnnex", function () {
  this.timeout(480000);

  before(async () => {
    await prepareSuite();
    await browserSession.clearState();
    await browserSession.setViewport(1440, 1000);
    await loginPage.visit();
    await loginPage.auth("AdminMain");
    await loginPage.changeLanguageToFrench();
    await loginPage.dismissOnboardingOverlay();
    await timeTab.visitTime();
    await timeTab.changeTabTo("Temps");
  });

  beforeEach(async () => {
    await browserSession.setViewport(1440, 1000);
    await loginPage.dismissOnboardingOverlay();
  });

  after(async () => {
    await cleanupSuite();
  });

  it("Log a new entry in the previous week for one day using annex field", async () => {
    await timeTab.logTimeOneDayAnnex("Travail", "Main Automation Project", "ESQ - Études d’esquisse", "Annex Automation Main1", 1);
  });

  it("Submit the newly created entry directly from the table", async () => {
    await timeTab.directlySubmitEntry();
  });

  it("Navigate to the Team tab", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Équipe");
  });

  it("Valider the time entry on the Team tab", async () => {
    await timeTab.editTimeEntryTEAMtab("Valider");
  });

  it("Navigate to the Time Entry page", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Saisie de temps");
    await timeTab.validateTheEdit("Approuvé");
  });

  it("Change from aprooved to not approved", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Équipe");
    await timeTab.changeTabToValidesOrNot("Validés");
    await timeTab.editTimeEntryTEAMtab("Non révisé");
  });

  it("Back to draft and delete the entry", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Saisie de temps");
    await timeTab.directlyBackToDraftEntry();
    await timeTab.deleteEntry();
  });
});
