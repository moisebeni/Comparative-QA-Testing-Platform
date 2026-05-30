const { browserSession } = require("./browser");

async function prepareSuite() {
  await browserSession.start();
}

async function cleanupSuite() {
  await browserSession.quit();
}

module.exports = {
  prepareSuite,
  cleanupSuite,
};
