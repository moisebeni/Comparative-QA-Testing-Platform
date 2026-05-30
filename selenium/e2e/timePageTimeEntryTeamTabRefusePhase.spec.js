const { loginPage } = require("../support/login");
const { timeTab } = require("../support/TimePages/timeTab");
const { browserSession } = require("../support/browser");
const { prepareSuite, cleanupSuite } = require("../support/e2e");

describe("timePageTimeEntryTeamTabRefusePhase", function () {
  this.timeout(480000);

  before(async () => {
    await prepareSuite();
    await browserSession.clearState();
    await browserSession.setViewport(1440, 1000);
    await loginPage.visit();
    await loginPage.auth("AdminMain");
    await browserSession.reload();
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

  it("Log a new entry in the previous week for one day using phase field", async () => {
    await timeTab.logTimeOneDayPhase("Travail", "Main Automation Project", "ESQ - Études d’esquisse", "Annex Automation Main1", 1);
  });

  it("Submit the newly created entry directly from the table", async () => {
    await timeTab.directlySubmitEntry();
  });

  it("Navigate to the Team tab", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Équipe");
  });

  it("Close the current week", async () => {
    await timeTab.closeWeekTeamTab();
  });

  it("Reopen the current week", async () => {
    await timeTab.openWeekTeamTab();
  });

  it("Refuse the time entry on the Team tab", async () => {
    await timeTab.editTimeEntryTEAMtab("Refuser");
  });

  it("Navigate to the Time Entry page", async () => {
    await timeTab.changeTabToTimeEntryOrTeam("Saisie de temps");
    await timeTab.validateTheEdit("Refusé");
  });

  it("Delete the entry from previous week", async () => {
    await timeTab.deleteEntry();
    await browserSession.sleep(4000);
  });
});
