const API_ENDPOINTS = {
  runTest: "/api/run-test",
  testResults: "/api/test-results",
  testHistory: "/api/test-history",
};

const testingTools = ["Cypress", "Selenium", "Postman"];

const scenarios = [
  {
    id: "valid-login",
    name: "Valid Login Test",
    description: "Verifies that a registered user can authenticate successfully and reach the protected dashboard.",
  },
  {
    id: "invalid-login",
    name: "Invalid Login Test",
    description: "Checks that invalid credentials are rejected and the correct validation response is displayed.",
  },
  {
    id: "user-data-validation",
    name: "User Data Validation Test",
    description: "Compares how each tool validates profile payloads, required fields, and frontend error states.",
  },
  {
    id: "create-resource",
    name: "Create Resource Test",
    description: "Executes a resource creation workflow and verifies persisted response data across the three environments.",
  },
  {
    id: "logout-invalid-token",
    name: "Logout / Invalid Token Test",
    description: "Confirms session logout behavior and validates API protection when an expired or invalid token is used.",
  },
];

const exampleResults = [
  { tool: "Cypress", passed: 5, failed: 0, time: 12.4, stability: 96, status: "Passed" },
  { tool: "Selenium", passed: 5, failed: 0, time: 18.7, stability: 89, status: "Passed" },
  { tool: "Postman", passed: 5, failed: 0, time: 3.1, stability: 98, status: "Passed" },
];

const scenarioResultProfiles = {
  "valid-login": exampleResults,
  "invalid-login": [
    { tool: "Cypress", passed: 4, failed: 0, time: 10.8, stability: 95, status: "Passed" },
    { tool: "Selenium", passed: 4, failed: 0, time: 16.3, stability: 88, status: "Passed" },
    { tool: "Postman", passed: 4, failed: 0, time: 2.7, stability: 98, status: "Passed" },
  ],
  "user-data-validation": [
    { tool: "Cypress", passed: 6, failed: 0, time: 13.6, stability: 94, status: "Passed" },
    { tool: "Selenium", passed: 6, failed: 1, time: 21.5, stability: 83, status: "Failed" },
    { tool: "Postman", passed: 7, failed: 0, time: 4.2, stability: 97, status: "Passed" },
  ],
  "create-resource": [
    { tool: "Cypress", passed: 5, failed: 0, time: 14.8, stability: 93, status: "Passed" },
    { tool: "Selenium", passed: 5, failed: 0, time: 22.1, stability: 86, status: "Passed" },
    { tool: "Postman", passed: 5, failed: 0, time: 3.8, stability: 99, status: "Passed" },
  ],
  "logout-invalid-token": [
    { tool: "Cypress", passed: 4, failed: 0, time: 11.9, stability: 94, status: "Passed" },
    { tool: "Selenium", passed: 4, failed: 0, time: 17.6, stability: 87, status: "Passed" },
    { tool: "Postman", passed: 5, failed: 0, time: 2.9, stability: 98, status: "Passed" },
  ],
};

const state = {
  selectedScenarioId: null,
  scenarioStatuses: Object.fromEntries(scenarios.map((scenario) => [scenario.id, "Not Started"])),
  isRunning: false,
  currentResults: null,
};

const elements = {
  scenarioList: document.querySelector("#scenarioList"),
  selectedScenarioName: document.querySelector("#selectedScenarioName"),
  environmentStrip: document.querySelector("#environmentStrip"),
  executionBadge: document.querySelector("#executionBadge"),
  progressLabel: document.querySelector("#progressLabel"),
  progressValue: document.querySelector("#progressValue"),
  progressBar: document.querySelector("#progressBar"),
  logsArea: document.querySelector("#logsArea"),
  resultsTableBody: document.querySelector("#resultsTableBody"),
  recommendationCard: document.querySelector("#recommendationCard"),
  recommendationTitle: document.querySelector("#recommendationTitle"),
  recommendationText: document.querySelector("#recommendationText"),
  lastRunStatus: document.querySelector("#lastRunStatus"),
  bestToolStat: document.querySelector("#bestToolStat"),
  avgTimeStat: document.querySelector("#avgTimeStat"),
  heroBestTool: document.querySelector("#heroBestTool"),
  heroAvgTime: document.querySelector("#heroAvgTime"),
  loadMockResultsButton: document.querySelector("#loadMockResultsButton"),
};

function futureApiClient() {
  async function requestJson(url, options) {
    const res = await fetch(url, options);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = payload?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return payload;
  }

  return {
    runTest: async (scenarioId) => {
      const payload = await requestJson(API_ENDPOINTS.runTest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      return payload.runId;
    },
    getResults: (runId) => {
      return requestJson(`${API_ENDPOINTS.testResults}?runId=${encodeURIComponent(runId)}`, { method: "GET" });
    },
    getHistory: () => {
      return requestJson(API_ENDPOINTS.testHistory, { method: "GET" });
    },
  };
}

const apiClient = futureApiClient();

function renderScenarios() {
  elements.scenarioList.innerHTML = scenarios
    .map((scenario, index) => {
      const status = state.scenarioStatuses[scenario.id];
      return `
        <article class="scenario-card" data-index="${String(index + 1).padStart(2, "0")}">
          <div>
            <h3>${scenario.name}</h3>
            <p>${scenario.description}</p>
          </div>
          <div class="scenario-actions">
            <span class="scenario-status ${statusClass(status)}">${status}</span>
            <button class="primary-button" data-scenario-id="${scenario.id}" type="button" ${state.isRunning ? "disabled" : ""}>
              Run in All Environments
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderEnvironmentStrip(activeTool = null, completedTools = []) {
  elements.environmentStrip.innerHTML = testingTools
    .map((tool) => {
      const isActive = activeTool === tool;
      const status = completedTools.includes(tool) ? "Completed" : isActive ? "Running" : "Queued";
      return `
        <div class="environment-pill ${isActive ? "active" : ""}">
          <strong>${tool}</strong>
          <span>${status}</span>
        </div>
      `;
    })
    .join("");
}

function statusClass(status) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function setExecutionStatus(status) {
  elements.executionBadge.textContent = status;
  elements.executionBadge.className = `status-badge ${statusClass(status)}`;
}

function setProgress(percent, label) {
  elements.progressBar.style.width = `${percent}%`;
  elements.progressValue.textContent = `${percent}%`;
  elements.progressLabel.textContent = label;
}

function appendLog(tool, message) {
  const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const line = document.createElement("p");
  line.className = "log-line";
  line.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-tool">${tool}</span> ${message}`;
  elements.logsArea.appendChild(line);
  elements.logsArea.scrollTop = elements.logsArea.scrollHeight;
}

function clearLogs() {
  elements.logsArea.innerHTML = "";
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runScenario(scenarioId) {
  if (state.isRunning) return;

  const scenario = scenarios.find((item) => item.id === scenarioId);
  state.selectedScenarioId = scenarioId;
  state.isRunning = true;
  state.scenarioStatuses[scenarioId] = "Running";
  state.currentResults = null;

  renderScenarios();
  clearLogs();
  renderEnvironmentStrip("Cypress");
  renderEmptyResults();
  setExecutionStatus("Running");
  setProgress(0, "Preparing shared test scenario");
  elements.selectedScenarioName.textContent = scenario.name;
  elements.recommendationCard.hidden = true;
  elements.lastRunStatus.textContent = "Running";
  elements.bestToolStat.textContent = "Pending";
  elements.avgTimeStat.textContent = "--";

  appendLog("Runner", `Scenario selected: ${scenario.name}`);
  appendLog("Runner", "Initializing unified execution workflow for Cypress, Selenium, and Postman.");

  let runId;
  try {
    runId = await apiClient.runTest(scenarioId);
  } catch (err) {
    state.isRunning = false;
    state.scenarioStatuses[scenarioId] = "Failed";
    setExecutionStatus("Failed");
    setProgress(0, "Failed to start execution");
    appendLog("Runner", `Failed to start: ${err?.message ?? String(err)}`);
    renderScenarios();
    return;
  }

  let lastLogCount = 0;
  while (true) {
    const snapshot = await apiClient.getResults(runId).catch((err) => {
      appendLog("Runner", `Polling error: ${err?.message ?? String(err)}`);
      return null;
    });
    if (!snapshot) {
      await sleep(700);
      continue;
    }

    const progress = snapshot.progress ?? { percent: 0, label: "Waiting", activeTool: null, completedTools: [] };
    renderEnvironmentStrip(progress.activeTool, progress.completedTools ?? []);
    setProgress(progress.percent ?? 0, progress.label ?? "Running");
    setExecutionStatus(snapshot.status ?? "Running");
    elements.lastRunStatus.textContent = snapshot.status ?? "Running";

    const logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
    for (const entry of logs.slice(lastLogCount)) {
      appendLog(entry.tool ?? "Runner", entry.message ?? "");
    }
    lastLogCount = logs.length;

    if (snapshot.status === "Completed" || snapshot.status === "Failed") {
      const results = Array.isArray(snapshot.results) ? snapshot.results : [];
      state.currentResults = results;
      state.scenarioStatuses[scenarioId] = snapshot.status === "Failed" ? "Failed" : "Completed";
      state.isRunning = false;

      renderEnvironmentStrip(null, testingTools);
      renderResults(results);
      renderRecommendation(results, scenario.name);
      updateStats(results, state.scenarioStatuses[scenarioId]);
      renderScenarios();
      return;
    }

    await sleep(650);
  }
}

function renderEmptyResults() {
  elements.resultsTableBody.innerHTML = `
    <tr>
      <td colspan="6" class="empty-table">Execution in progress. Results will appear after all environments finish.</td>
    </tr>
  `;
}

function renderResults(results) {
  elements.resultsTableBody.innerHTML = results
    .map(
      (result) => `
        <tr>
          <td>
            <span class="tool-name-cell">
              <span class="tool-dot ${result.tool.toLowerCase()}"></span>
              ${result.tool}
            </span>
          </td>
          <td>${result.passed}</td>
          <td>${result.failed}</td>
          <td>${result.time.toFixed(1)}s</td>
          <td>${result.stability}%</td>
          <td><span class="final-status ${result.status.toLowerCase()}">${result.status}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderRecommendation(results, scenarioName) {
  const best = getBestTool(results);
  const fastest = [...results].sort((a, b) => a.time - b.time)[0];
  const mostStable = [...results].sort((a, b) => b.stability - a.stability)[0];

  elements.recommendationTitle.textContent = `${best.tool} is recommended for ${scenarioName}`;
  elements.recommendationText.textContent =
    `${best.tool} produced the strongest combined outcome for this scenario, balancing execution time, passed tests, failed tests, and stability score. ` +
    `${fastest.tool} had the fastest execution time because it can validate the most direct layer of the system for this workflow. ` +
    `Cypress remains effective for modern frontend end-to-end validation, Selenium remains useful for cross-browser scenarios, and Postman is strongest for backend API validation. ` +
    `The highest stability score in this run was ${mostStable.stability}% from ${mostStable.tool}.`;
  elements.recommendationCard.hidden = false;
}

function getBestTool(results) {
  return [...results].sort((a, b) => {
    const scoreA = a.passed * 20 - a.failed * 35 + a.stability - a.time;
    const scoreB = b.passed * 20 - b.failed * 35 + b.stability - b.time;
    return scoreB - scoreA;
  })[0];
}

function updateStats(results, status) {
  const best = getBestTool(results);
  const avgTime = results.reduce((total, result) => total + result.time, 0) / results.length;

  elements.lastRunStatus.textContent = status;
  elements.bestToolStat.textContent = best.tool;
  elements.avgTimeStat.textContent = `${avgTime.toFixed(1)}s`;
  elements.heroBestTool.textContent = best.tool;
  elements.heroAvgTime.textContent = `${avgTime.toFixed(1)}s`;
}

function loadExampleResults() {
  state.currentResults = exampleResults;
  state.selectedScenarioId = "valid-login";
  state.scenarioStatuses["valid-login"] = "Completed";
  elements.selectedScenarioName.textContent = "Valid Login Test";
  setExecutionStatus("Completed");
  setProgress(100, "Example results loaded");
  clearLogs();
  renderEnvironmentStrip(null, testingTools);
  appendLog("Runner", "Example result set loaded for thesis demonstration.");
  renderResults(exampleResults);
  renderRecommendation(exampleResults, "Valid Login Test");
  updateStats(exampleResults, "Completed");
  renderScenarios();
}

elements.scenarioList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scenario-id]");
  if (!button) return;
  runScenario(button.dataset.scenarioId);
});

elements.loadMockResultsButton.addEventListener("click", loadExampleResults);

renderScenarios();
renderEnvironmentStrip();
