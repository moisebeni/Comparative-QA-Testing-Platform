const { loginPage } = require("../support/login");
const { timeTab } = require("../support/TimePages/timeTab");
const { browserSession } = require("../support/browser");
const { prepareSuite, cleanupSuite } = require("../support/e2e");

describe("editEntryTimeManagementAnnex", function () {
  this.timeout(180000);

  before(async () => {
    await prepareSuite();
    await browserSession.clearState();
    await loginPage.visit();
    await loginPage.auth("ArhitectMain");
    await loginPage.changeLanguageToFrench();
    await loginPage.dismissOnboardingOverlay();
  });

  beforeEach(async () => {
    await browserSession.setViewport(1440, 1000);
    await loginPage.dismissOnboardingOverlay();
  });

  after(async () => {
    await cleanupSuite();
  });

  it("Navigate to the time page, time tab", async () => {
    await timeTab.visitTime();
    await loginPage.dismissOnboardingOverlay();
    await timeTab.changeTabTo("Temps");
  });

  it("Navigate to the previous week", async () => {
    await timeTab.goPreviousWeek(4);
  });

  it("Log a new entry in the previous week for one day using annex", async () => {
    await timeTab.logTimeOneDayAnnex("Travail", "Main Automation Project", "ESQ - Études d’esquisse", "Annex Automation Main1", 1);
  });

  it("Edit the newly created entry directly from the table", async () => {
    await timeTab.editAnEntry(5);
    await timeTab.validateTotalHoursLogged(5.0);
  });

  it("Navigate to the next week", async () => {
    await timeTab.goNextWeek(1);
  });

  it("Copy previous week", async () => {
    await timeTab.copyThePreviousWeek();
    await timeTab.validateTotalHoursLogged(5.0);
  });

  it("Edit entry using kebabmenu", async () => {
    await timeTab.editEntryWorklogs(6.0);
    await timeTab.validateTotalHoursLogged(6.0);
  });

  it("Delete the entry from the current week week", async () => {
    await timeTab.deleteEntry();
  });

  it("Navigate back to the previous week", async () => {
    await timeTab.goPreviousWeek(1);
  });

  it("Delete the entry from the previous week", async () => {
    await timeTab.deleteEntry();
  });
});
