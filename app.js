const API_ENDPOINTS = {
  runTest: "/api/run-test",
  testResults: "/api/test-results",
  testHistory: "/api/test-history",
};

const testingTools = ["Cypress", "Selenium", "Postman"];
const scenarioStatusTools = testingTools;

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
    runTest: async (scenarioId, tool = null) => {
      const payload = await requestJson(API_ENDPOINTS.runTest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioId, tool }),
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
    Selenium: "Not Started",
    Postman: "Not Started",
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
                  return `<span class="scenario-status ${statusClass(status)}"><span class="scenario-tool-name">${tool}</span><span class="scenario-tool-state">${status}</span></span>`;
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

function renderEnvironmentStrip(activeTool = null, completedTools = [], selectedTools = testingTools) {
  elements.environmentStrip.innerHTML = testingTools
    .map((tool) => {
      const isSelected = selectedTools.includes(tool);
      const isActive = activeTool === tool;
      const status = completedTools.includes(tool)
        ? "Completed"
        : isActive
          ? "Running"
          : isSelected
            ? "Queued"
            : "Not Started";
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

function setProgress(percent, label) {
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.classList.toggle("completed", percent >= 100);
  elements.progressValue.textContent = `${percent}%`;
  elements.progressLabel.textContent = label;
}

function updateScenarioToolStatusesFromProgress(scenarioId, progress) {
  const completedTools = progress.completedTools ?? [];
  const activeTool = progress.activeTool;
  const selectedTools = progress.selectedTools ?? testingTools;
  const statuses = {
    ...(state.scenarioToolStatuses[scenarioId] ?? createInitialToolStatuses()),
  };

  for (const tool of selectedTools) {
    if (completedTools.includes(tool)) {
      statuses[tool] = "Completed";
    } else if (activeTool === tool) {
      statuses[tool] = "Running";
    } else {
      statuses[tool] = "Queued";
    }
  }

  state.scenarioToolStatuses[scenarioId] = statuses;
}

function updateScenarioToolStatusesFromResults(scenarioId, results) {
  const statuses = {
    ...(state.scenarioToolStatuses[scenarioId] ?? createInitialToolStatuses()),
  };

  for (const result of results) {
    statuses[result.tool] = result.status;
  }

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

async function runScenario(scenarioId, tool) {
  if (state.isRunning) return;

  const scenario = scenarios.find((item) => item.id === scenarioId);
  state.selectedScenarioId = scenarioId;
  state.isRunning = true;
  const selectedTools = tool ? [tool] : testingTools;
  const scenarioStatuses = {
    ...(state.scenarioToolStatuses[scenarioId] ?? createInitialToolStatuses()),
  };
  for (const selectedTool of selectedTools) {
    scenarioStatuses[selectedTool] = selectedTool === selectedTools[0] ? "Running" : "Queued";
  }
  state.scenarioToolStatuses[scenarioId] = scenarioStatuses;
  state.currentResults = null;

  document.querySelector("#execution")?.scrollIntoView({ behavior: "smooth", block: "start" });
  renderScenarios();
  clearLogs();
  renderEnvironmentStrip(selectedTools[0] ?? null, [], selectedTools);
  renderEmptyResults();
  setProgress(0, "Preparing shared test scenario");
  elements.selectedScenarioName.textContent = tool ? `${scenario.name} • ${tool}` : scenario.name;
  elements.recommendationCard.hidden = true;
  elements.lastRunStatus.textContent = "Running";
  elements.bestToolStat.textContent = "Pending";
  elements.avgTimeStat.textContent = "--";

  appendLog("Runner", `Scenario selected: ${scenario.name}`);
  appendLog("Runner", `Initializing real ${tool ?? "Cypress, Selenium, and Postman"} execution workflow.`);

  let runId;
  try {
    runId = await apiClient.runTest(scenarioId, tool ?? null);
  } catch (err) {
    state.isRunning = false;
    state.scenarioToolStatuses[scenarioId] = {
      ...(state.scenarioToolStatuses[scenarioId] ?? createInitialToolStatuses()),
      [tool || "Cypress"]: "Failed",
    };
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
    renderEnvironmentStrip(progress.activeTool, progress.completedTools ?? [], progress.selectedTools ?? selectedTools);
    setProgress(progress.percent ?? 0, progress.label ?? "Running");
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
      <td colspan="6" class="empty-table">Execution in progress. Results will appear after the selected script finishes.</td>
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
          <td>${result.stability == null ? "--" : `${result.stability}%`}</td>
          <td><span class="final-status ${statusClass(result.status)}">${result.status}</span></td>
        </tr>
      `
    )
    .join("");
}

function renderRecommendation(results, scenarioName) {
  const comparable = results.filter((result) => result.status !== "Not Implemented");
  if (!comparable.length) {
    elements.recommendationCard.hidden = true;
    return;
  }

  const best = getBestTool(comparable);
  const fastest = [...comparable].sort((a, b) => a.time - b.time)[0];
  const mostStable = [...comparable].sort((a, b) => (b.stability ?? -1) - (a.stability ?? -1))[0];
  const passedTieCount = comparable.filter((result) => result.passed === best.passed).length;

  elements.recommendationTitle.textContent = `${best.tool} is recommended for ${scenarioName}`;
  elements.recommendationText.textContent =
    `${best.tool} is recommended because it has the highest number of passed tests in this run (${best.passed}). ` +
    `Recommendation priority is passed tests first, then stability, then execution time. ` +
    (passedTieCount > 1 ? `Because more than one tool had ${best.passed} passed tests, stability and execution time were used as tie-breakers. ` : "") +
    `${mostStable.tool} had the strongest stability score in this run (${mostStable.stability ?? 0}%). ` +
    `${fastest.tool} had the fastest execution time.`;
  elements.recommendationCard.hidden = false;
}

function getBestTool(results) {
  return [...results].sort((a, b) => {
    if (b.passed !== a.passed) return b.passed - a.passed;
    if ((b.stability ?? -1) !== (a.stability ?? -1)) return (b.stability ?? -1) - (a.stability ?? -1);
    return a.time - b.time;
  })[0];
}

function updateStats(results, status) {
  const comparable = results.filter((result) => result.status !== "Not Implemented");
  const best = comparable.length ? getBestTool(comparable) : null;
  const avgTime = comparable.length
    ? comparable.reduce((total, result) => total + result.time, 0) / comparable.length
    : null;

  elements.lastRunStatus.textContent = status;
  elements.bestToolStat.textContent = best ? best.tool : "Pending";
  elements.avgTimeStat.textContent = avgTime == null ? "--" : `${avgTime.toFixed(1)}s`;
}

elements.scenarioList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-scenario-id]");
  if (!button) return;
  runScenario(button.dataset.scenarioId);
});

elements.scrollTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

renderScenarios();
renderEnvironmentStrip();
