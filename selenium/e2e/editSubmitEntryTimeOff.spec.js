const { loginPage } = require("../support/login");
const { timeTab } = require("../support/TimePages/timeTab");
const { browserSession } = require("../support/browser");
const { prepareSuite, cleanupSuite } = require("../support/e2e");

describe("editSubmitEntryTimeOff", function () {
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

  it("Navigate to the time page, time off tab", async () => {
    await timeTab.visitTime();
    await timeTab.changeTabTo("Temps");
    await timeTab.changeToTab("Congés");
  });

  it("Create a new Time Off Entry", async () => {
    await timeTab.createTimeOffRequest();
    await timeTab.validateTimeOffCreated(1, 0, 1);
  });

  it("Edit the paye directly from the table", async () => {
    await timeTab.editPayeTimeOff("1,00", "0,00");
    await timeTab.validateTimeOffCreated(1, 1, 0);
  });

  it("Edit the sans solde directly from the table", async () => {
    await timeTab.editSansSoldeTimeOff("1,00", "0,00");
    await timeTab.validateTimeOffCreated(1, 0, 1);
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

  it("Submit the newly created entry dirrectly from Modifier modal", async () => {
    await timeTab.submitTimeOffDirrectlyModifier();
  });

  it("Back to draft the newly created entry dirrectly from Modifier modal", async () => {
    await timeTab.backToDraftsTimeOffDirrectlyModifier();
  });

  it("Edit time off entru from Modifier modal", async () => {
    await timeTab.ediTimeOffModifierModal();
  });

  it("Delete the entry", async () => {
    await timeTab.deleteTimeOffEntry();
  });
});
