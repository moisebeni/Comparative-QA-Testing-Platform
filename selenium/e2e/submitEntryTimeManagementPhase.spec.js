const { loginPage } = require("../support/login");
const { timeTab } = require("../support/TimePages/timeTab");
const { browserSession } = require("../support/browser");
const { prepareSuite, cleanupSuite } = require("../support/e2e");

describe("submitEntryTimeManagementPhase", function () {
  this.timeout(180000);

  before(async () => {
    await prepareSuite();
    await browserSession.clearState();
    await browserSession.setViewport(1440, 1000);
    await loginPage.visit();
    await loginPage.auth("ArhitectMain");
    await browserSession.sleep(2000);
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
    await timeTab.changeTabTo("Temps");
  });

  it("Log a new entry in the previous week for one day using phase", async () => {
    await timeTab.logTimeOneDayPhase("Travail", "Main Automation Project", "ESQ - Études d’esquisse", "Annex Automation Main1", 1);
  });

  it("Submit the newly created entry directly from the table", async () => {
    await timeTab.directlySubmitEntry();
  });

  it("Back to draft the newly created entry directly from the table", async () => {
    await timeTab.directlyBackToDraftEntry();
  });

  it("Submit the newly created entry using kebab menu", async () => {
    await timeTab.submitEntryKebabMenu();
  });

  it("Back to draft the newly created entry using kebab menu", async () => {
    await timeTab.backToDraftEntryKebabMenu();
  });

  it("Submit the newly created entry dirrectly from Worklogs modal", async () => {
    await timeTab.submitEntryDirrectlyWorklogs();
  });

  it("Back to draft the newly created entry dirrectly from Worklogs modal", async () => {
    await timeTab.backToDraftsDirrectlyWorklogs();
  });

  it("Submit the newly created entry using kebab menu from Worklogs modal", async () => {
    await timeTab.submitEntryKebabMenuWorklogs();
  });

  it("Back to draft the newly created entry using kebabmenu from Worklogs modal", async () => {
    await timeTab.backToDraftsEntryKebabMenuWorklogs();
  });

  it("Submit the newly created entry using ACTION button from Worklogs modal", async () => {
    await timeTab.submitEntryActionWorklogs();
  });

  it("Back to draft the newly created entry using ACTION button from Worklogs modal", async () => {
    await timeTab.backToDraftsEntryActionWorklogs();
  });

  it("Delete the entry from previous week", async () => {
    await timeTab.deleteEntry();
  });
});
