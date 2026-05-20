const API_ENDPOINTS = {
  runTest: "/api/run-test",
  testResults: "/api/test-results",
  testHistory: "/api/test-history",
};

const testingTools = ["Cypress", "Postman"];
const scenarioStatusTools = ["Cypress", "Postman", "Selenium"];

const scenarios = [
  {
    id: "editEntryTimeManagementAnnex",
    name: "editEntryTimeManagementAnnex.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for an annex-based time management edit.",
  },
  {
    id: "editEntryTimeManagementPhase",
    name: "editEntryTimeManagementPhase.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for a phase-based time management edit.",
  },
  {
    id: "editSubmitEntryTimeOff",
    name: "editSubmitEntryTimeOff.cy.js",
    description: "Runs the Cypress spec for editing and submitting a time-off entry.",
  },
  {
    id: "submitEntryTimeManagementAnnex",
    name: "submitEntryTimeManagementAnnex.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for an annex-based time management submit.",
  },
  {
    id: "submitEntryTimeManagementPhase",
    name: "submitEntryTimeManagementPhase.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for a phase-based time management submit.",
  },
  {
    id: "timePageTimeEntryTeamTabApproveAnnex",
    name: "timePageTimeEntryTeamTabApproveAnnex.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for approving an annex time entry.",
  },
  {
    id: "timePageTimeEntryTeamTabApprovePhase",
    name: "timePageTimeEntryTeamTabApprovePhase.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for approving a phase time entry.",
  },
  {
    id: "timePageTimeEntryTeamTabRefuseAnnex",
    name: "timePageTimeEntryTeamTabRefuseAnnex.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for refusing an annex time entry.",
  },
  {
    id: "timePageTimeEntryTeamTabRefusePhase",
    name: "timePageTimeEntryTeamTabRefusePhase.cy.js",
    description: "Runs the matching Cypress spec and Postman folder for refusing a phase time entry.",
  },
];

const state = {
  selectedScenarioId: null,
  scenarioToolStatuses: Object.fromEntries(scenarios.map((scenario) => [scenario.id, createInitialToolStatuses()])),
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
  scrollTopButton: document.querySelector("#scrollTopButton"),
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

function createInitialToolStatuses() {
  return {
    Cypress: "Not Started",
    Postman: "Not Started",
    Selenium: "Not Integrated",
  };
}

function renderScenarios() {
  elements.scenarioList.innerHTML = scenarios
    .map((scenario, index) => {
      const statuses = state.scenarioToolStatuses[scenario.id] ?? createInitialToolStatuses();
      return `
        <article class="scenario-card" data-index="${String(index + 1).padStart(2, "0")}">
          <div class="scenario-content">
            <h3>${scenario.name}</h3>
            <p>${scenario.description}</p>
          </div>
          <div class="scenario-actions">
            <div class="scenario-statuses" aria-label="Tool statuses">
              ${scenarioStatusTools
                .map((tool) => {
                  const status = statuses[tool] ?? "Not Started";
                  return `<span class="scenario-status ${statusClass(status)}">${tool} ${status}</span>`;
                })
                .join("")}
            </div>
            <button class="primary-button" data-scenario-id="${scenario.id}" type="button" ${state.isRunning ? "disabled" : ""}>
              Run QA Test
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
      const statusClassName = statusClass(status);
      return `
        <div class="environment-pill ${isActive ? "active" : ""} ${statusClassName}">
          <div>
            <strong>${tool}</strong>
            <span>${status}</span>
          </div>
          <span class="environment-indicator" aria-hidden="true"></span>
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
  elements.progressBar.classList.toggle("completed", percent >= 100);
  elements.progressValue.textContent = `${percent}%`;
  elements.progressLabel.textContent = label;
}

function updateScenarioToolStatusesFromProgress(scenarioId, progress) {
  const completedTools = progress.completedTools ?? [];
  const activeTool = progress.activeTool;
  const statuses = createInitialToolStatuses();

  for (const tool of testingTools) {
    if (completedTools.includes(tool)) {
      statuses[tool] = "Completed";
    } else if (activeTool === tool) {
      statuses[tool] = "Running";
    } else {
      statuses[tool] = "Queued";
    }
  }

  statuses.Selenium = "Not Integrated";
  state.scenarioToolStatuses[scenarioId] = statuses;
}

function updateScenarioToolStatusesFromResults(scenarioId, results) {
  const statuses = createInitialToolStatuses();

  for (const result of results) {
    statuses[result.tool] = result.status;
  }

  statuses.Selenium = "Not Integrated";
  state.scenarioToolStatuses[scenarioId] = statuses;
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
  state.scenarioToolStatuses[scenarioId] = {
    Cypress: "Running",
    Postman: "Queued",
    Selenium: "Not Integrated",
  };
  state.currentResults = null;

  document.querySelector("#execution")?.scrollIntoView({ behavior: "smooth", block: "start" });
  renderScenarios();
  clearLogs();
  renderEnvironmentStrip("Cypress", [], 0);
  renderEmptyResults();
  setExecutionStatus("Running");
  setProgress(0, "Preparing shared test scenario");
  elements.selectedScenarioName.textContent = scenario.name;
  elements.recommendationCard.hidden = true;
  elements.lastRunStatus.textContent = "Running";
  elements.bestToolStat.textContent = "Pending";
  elements.avgTimeStat.textContent = "--";

  appendLog("Runner", `Scenario selected: ${scenario.name}`);
  appendLog("Runner", "Initializing real Cypress and Postman execution workflow.");

  let runId;
  try {
    runId = await apiClient.runTest(scenarioId);
  } catch (err) {
    state.isRunning = false;
    state.scenarioToolStatuses[scenarioId] = {
      Cypress: "Failed",
      Postman: "Queued",
      Selenium: "Not Integrated",
    };
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
    updateScenarioToolStatusesFromProgress(scenarioId, progress);
    renderScenarios();

    const logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
    for (const entry of logs.slice(lastLogCount)) {
      appendLog(entry.tool ?? "Runner", entry.message ?? "");
    }
    lastLogCount = logs.length;

    if (snapshot.status === "Completed" || snapshot.status === "Failed") {
      const results = Array.isArray(snapshot.results) ? snapshot.results : [];
      state.currentResults = results;
      updateScenarioToolStatusesFromResults(scenarioId, results);
      state.isRunning = false;

      renderEnvironmentStrip(null, testingTools);
      renderResults(results);
      renderRecommendation(results, scenario.name);
      updateStats(results, snapshot.status === "Failed" ? "Failed" : "Completed");
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
  const passedTieCount = results.filter((result) => result.passed === best.passed).length;

  elements.recommendationTitle.textContent = `${best.tool} is recommended for ${scenarioName}`;
  elements.recommendationText.textContent =
    `${best.tool} is recommended because it has the highest number of passed tests in this run (${best.passed}). ` +
    `Passed tests are the primary recommendation rule. ` +
    (passedTieCount > 1 ? `Because more than one tool had ${best.passed} passed tests, failed tests and execution time were used as tie-breakers. ` : "") +
    `${fastest.tool} had the fastest execution time. ` +
    `The highest stability score in this run was ${mostStable.stability}% from ${mostStable.tool}.`;
  elements.recommendationCard.hidden = false;
}

function getBestTool(results) {
  return [...results].sort((a, b) => {
    if (b.passed !== a.passed) return b.passed - a.passed;
    if (a.failed !== b.failed) return a.failed - b.failed;
    return a.time - b.time;
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

elements.scenarioList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-scenario-id]");
  if (!button) return;
  runScenario(button.dataset.scenarioId);
});

elements.scrollTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderScenarios();
renderEnvironmentStrip();
