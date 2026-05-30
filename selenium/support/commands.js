const { browserSession, By } = require("./browser");

async function clickFirstVisible(locator, timeout = 15000) {
  const element = await browserSession.findVisible(locator, timeout);
  await browserSession.clickElement(element);
  return element;
}

module.exports = {
  browserSession,
  By,
  clickFirstVisible,
};
