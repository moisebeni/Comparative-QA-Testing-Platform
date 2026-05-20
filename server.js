const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const HISTORY_PATH = path.join(DATA_DIR, "test-history.json");
const CYPRESS_SPEC_DIR = "cypress/e2e";
const POSTMAN_COLLECTION_PATH = "postman/collections/Licenta.postman_collection.json";
const POSTMAN_ENVIRONMENT_PATH = "postman/environments/Licenta.postman_environment.json";
const POSTMAN_ENVIRONMENT_VALUES_PATH = "postman/environments/Licenta_values.postman_environment.json";
const NEWMAN_REPORT_DIR = path.join(DATA_DIR, "newman-reports");

const PORT = Number.parseInt(process.env.PORT ?? "5173", 10);
const HOST = process.env.HOST ?? "127.0.0.1";

const testingTools = ["Cypress", "Postman"];

const postmanFolderByScenario = {
  editEntryTimeManagementAnnex: "editEntryTimeManagementAnnex",
  editEntryTimeManagementPhase: "editEntryTimeManagementPhase",
  editSubmitEntryTimeOff: null,
  submitEntryTimeManagementAnnex: "submitEntryTimeManagamentAnnex",
  submitEntryTimeManagementPhase: "submitEntryTimeManagamentPhase",
  timePageTimeEntryTeamTabApproveAnnex: "timePageTimeEntryTeamTabApproveAnnex",
  timePageTimeEntryTeamTabApprovePhase: "timePageTimeEntryTeamTabApprovePhase",
  timePageTimeEntryTeamTabRefuseAnnex: "timePageTimeEntryTeamTabRefuseAnnex",
  timePageTimeEntryTeamTabRefusePhase: "timePageTimeEntryTeamTabRefusePhase",
};

function nowIso() {
  return new Date().toISOString();
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function text(res, status, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "content-type": contentType, "cache-control": "no-store" });
  res.end(payload);
}

function notFound(res) {
  text(res, 404, "Not found");
}

function safeJoin(root, rel) {
  const resolved = path.resolve(root, rel);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

async function readJsonFile(filePath, fallback) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFileAtomic(filePath, value) {
  const tmpPath = `${filePath}.${randomUUID()}.tmp`;
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
  await fsp.rename(tmpPath, filePath);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory run state for polling.
// Structure:
// runs[runId] = {
//   runId, scenarioId, status, startedAt, finishedAt,
//   progress: { percent, label, activeTool, completedTools },
//   logs: [{ ts, tool, message }],
//   results: [{ tool, passed, failed, time, stability, status }],
// }
const runs = new Map();

function appendLog(run, tool, message) {
  run.logs.push({ ts: nowIso(), tool, message });
}

function computeStability(history, scenarioId, tool) {
  const recent = history
    .filter((entry) => entry.scenarioId === scenarioId && entry.tool === tool)
    .slice(-10);
  if (recent.length === 0) return null;
  const passed = recent.filter((entry) => entry.status === "Passed").length;
  return Math.round((passed / recent.length) * 100);
}

async function persistRunToHistory(run) {
  const history = await readJsonFile(HISTORY_PATH, []);
  const finishedAt = run.finishedAt ?? nowIso();
  for (const result of run.results ?? []) {
    history.push({
      runId: run.runId,
      scenarioId: run.scenarioId,
      tool: result.tool,
      passed: result.passed,
      failed: result.failed,
      time: result.time,
      status: result.status,
      finishedAt,
    });
  }
  await writeJsonFileAtomic(HISTORY_PATH, history);
}

function toolCommand(tool, scenarioId, runId) {
  if (tool === "Cypress") {
    return {
      cmd: process.platform === "win32" ? "node_modules\\.bin\\cypress.cmd" : "./node_modules/.bin/cypress",
      args: ["run", "--browser", "chrome", "--spec", `${CYPRESS_SPEC_DIR}/${scenarioId}.cy.js`],
    };
  }

  if (tool === "Postman") {
    const folder = postmanFolderByScenario[scenarioId];
    const reportPath = path.join(NEWMAN_REPORT_DIR, `${runId}-${scenarioId}.json`);
    const environmentPath = path.join(NEWMAN_REPORT_DIR, `${runId}-${scenarioId}.environment.json`);
    return {
      cmd: process.platform === "win32" ? "node_modules\\.bin\\newman.cmd" : "./node_modules/.bin/newman",
      args: [
        "run",
        POSTMAN_COLLECTION_PATH,
        "--environment",
        environmentPath,
        "--folder",
        folder,
        "--reporters",
        "cli,json",
        "--reporter-json-export",
        reportPath,
      ],
      reportPath,
      environmentPath,
    };
  }

  return null;
}

async function pathExists(relPath) {
  try {
    await fsp.access(path.join(ROOT_DIR, relPath));
    return true;
  } catch {
    return false;
  }
}

async function readPostmanCollection() {
  return readJsonFile(path.join(ROOT_DIR, POSTMAN_COLLECTION_PATH), null);
}

async function buildPostmanRuntimeEnvironment(outputPath) {
  const baseEnvironment = await readJsonFile(path.join(ROOT_DIR, POSTMAN_ENVIRONMENT_PATH), null);
  const valuesEnvironment = await readJsonFile(path.join(ROOT_DIR, POSTMAN_ENVIRONMENT_VALUES_PATH), null);
  const baseValues = baseEnvironment?.values ?? [];
  const rawValues = valuesEnvironment?.values ?? [];

  if (!baseEnvironment || baseValues.length === 0) {
    throw new Error(`Invalid Postman environment: ${POSTMAN_ENVIRONMENT_PATH}`);
  }

  const merged = {
    ...baseEnvironment,
    name: baseEnvironment.name ?? "Licenta",
    values: baseValues.map((variable, index) => {
      const valueSource = rawValues[index];
      const exportedValue = valueSource?.value || valueSource?.key || variable.value || "";
      return {
        ...variable,
        value: exportedValue,
        enabled: variable.enabled !== false,
      };
    }),
  };

  await writeJsonFileAtomic(outputPath, merged);
  return outputPath;
}

function hasPostmanFolder(collection, folderName) {
  const stack = [...(collection?.item ?? [])];
  while (stack.length > 0) {
    const item = stack.shift();
    if (item?.name === folderName) return true;
    if (Array.isArray(item?.item)) stack.push(...item.item);
  }
  return false;
}

async function toolReadiness(tool, scenarioId) {
  if (tool === "Cypress") {
    const hasBin = await pathExists(process.platform === "win32" ? "node_modules/.bin/cypress.cmd" : "node_modules/.bin/cypress");
    const hasSpec = await pathExists(`${CYPRESS_SPEC_DIR}/${scenarioId}.cy.js`);
    if (!hasBin) return { ok: false, reason: "Cypress is not installed. Run npm install before executing tests." };
    if (!hasSpec) return { ok: false, reason: `Missing Cypress spec: ${CYPRESS_SPEC_DIR}/${scenarioId}.cy.js` };
    return { ok: true, reason: "" };
  }

  if (tool === "Postman") {
    const folder = postmanFolderByScenario[scenarioId];
    if (!folder) return { ok: false, reason: `No Postman folder mapped for ${scenarioId}.` };

    const hasBin = await pathExists(process.platform === "win32" ? "node_modules/.bin/newman.cmd" : "node_modules/.bin/newman");
    const hasCollection = await pathExists(POSTMAN_COLLECTION_PATH);
    const hasEnvironment = await pathExists(POSTMAN_ENVIRONMENT_PATH);
    const hasEnvironmentValues = await pathExists(POSTMAN_ENVIRONMENT_VALUES_PATH);
    if (!hasBin) return { ok: false, reason: "Newman is not installed. Run npm install before executing Postman tests." };
    if (!hasCollection) return { ok: false, reason: `Missing Postman collection: ${POSTMAN_COLLECTION_PATH}` };
    if (!hasEnvironment) return { ok: false, reason: `Missing Postman environment: ${POSTMAN_ENVIRONMENT_PATH}` };
    if (!hasEnvironmentValues) return { ok: false, reason: `Missing Postman environment values: ${POSTMAN_ENVIRONMENT_VALUES_PATH}` };

    const collection = await readPostmanCollection();
    if (!hasPostmanFolder(collection, folder)) return { ok: false, reason: `Missing Postman folder: ${folder}` };
    return { ok: true, reason: "" };
  }

  return { ok: false, reason: `No real runner configured for ${tool}.` };
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

async function countCypressIts(scenarioId) {
  const specPath = path.join(ROOT_DIR, CYPRESS_SPEC_DIR, `${scenarioId}.cy.js`);
  const source = await fsp.readFile(specPath, "utf8");
  return [...stripJsComments(source).matchAll(/\bit(?:\.only|\.skip)?\s*\(/g)].length;
}

function countFromSpecOutput(stdout, label) {
  const matches = [...stdout.matchAll(new RegExp(`(\\d+)\\s+${label}\\b`, "gi"))];
  if (matches.length === 0) return 0;
  return Number.parseInt(matches[matches.length - 1][1], 10);
}

function resultFromCypressSpecOutput(stdout, fallbackDurationSec, exitCode) {
  const passed = countFromSpecOutput(stdout, "passing");
  const failed = countFromSpecOutput(stdout, "failing");
  const durationMatch = stdout.match(/(\d+):(\d+)\s+\d+\s+\d+\s+\d+\s+[–-]\s+[–-]/);
  const duration = durationMatch
    ? Number.parseInt(durationMatch[1], 10) * 60 + Number.parseInt(durationMatch[2], 10)
    : fallbackDurationSec;

  return {
    tool: "Cypress",
    passed,
    failed: failed || (exitCode === 0 ? 0 : 1),
    time: Number(duration.toFixed(1)),
    stability: null,
    status: failed === 0 && exitCode === 0 ? "Passed" : "Failed",
  };
}

async function resultFromPostmanReport(reportPath, fallbackDurationSec, exitCode) {
  const report = await readJsonFile(reportPath, null);
  const assertions = report?.run?.stats?.assertions ?? {};
  const total = Number.isFinite(assertions.total) ? assertions.total : 0;
  const failed = Number.isFinite(assertions.failed) ? assertions.failed : exitCode === 0 ? 0 : 1;
  const timings = report?.run?.timings ?? {};
  const durationMs = Number.isFinite(timings.completed) && Number.isFinite(timings.started)
    ? timings.completed - timings.started
    : fallbackDurationSec * 1000;

  return {
    tool: "Postman",
    passed: Math.max(0, total - failed),
    failed,
    time: Number((durationMs / 1000).toFixed(1)),
    stability: null,
    status: failed === 0 && exitCode === 0 ? "Passed" : "Failed",
  };
}

async function runToolReal(run, tool, scenarioId, progressStart, progressEnd) {
  const readiness = await toolReadiness(tool, scenarioId);
  if (!readiness.ok) {
    appendLog(run, tool, readiness.reason);
    return {
      tool,
      passed: 0,
      failed: 1,
      time: 0,
      stability: null,
      status: "Failed",
    };
  }

  const spec = toolCommand(tool, scenarioId, run.runId);
  if (!spec) {
    appendLog(run, tool, `No command configured for ${tool}.`);
    return { tool, passed: 0, failed: 1, time: 0, stability: null, status: "Failed" };
  }

  if (spec.reportPath) await fsp.mkdir(path.dirname(spec.reportPath), { recursive: true });
  if (tool === "Postman") {
    await buildPostmanRuntimeEnvironment(spec.environmentPath);
    appendLog(run, tool, "Merged Postman environment keys with Licenta_values runtime values.");
  }

  const totalTests = tool === "Cypress" ? await countCypressIts(scenarioId) : 0;
  let completedTests = 0;

  return new Promise((resolve) => {
    let finished = false;
    let sawOutput = false;
    let stdout = "";
    const startedAt = Date.now();

    appendLog(run, tool, `Launching: ${spec.cmd} ${spec.args.join(" ")}`);

    const child = spawn(spec.cmd, spec.args, {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        CYPRESS_BASE_URL: process.env.CYPRESS_BASE_URL ?? `http://${HOST}:${PORT}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const onLine = (kind) => (chunk) => {
      sawOutput = true;
      const textChunk = chunk.toString("utf8");
      if (kind === "out") stdout += textChunk;
      for (const line of textChunk.split(/\r?\n/)) {
        if (!line.trim()) continue;
        appendLog(run, tool, `${kind}: ${line}`);
        if (tool === "Cypress" && line.includes("(Run Starting)")) {
          run.progress.percent = Math.max(run.progress.percent, progressStart + 2);
          run.progress.label = "Cypress run started";
        }
        if (tool === "Cypress" && line.includes("Running:")) {
          run.progress.percent = Math.max(run.progress.percent, progressStart + 5);
          run.progress.label = "Cypress spec is running";
        }
        if (tool === "Cypress" && /^(\s*)(✓|√|✖|×|\d+\))\s+/.test(line)) {
          completedTests = Math.min(totalTests || completedTests + 1, completedTests + 1);
          const percent = totalTests > 0
            ? Math.min(progressEnd - 1, Math.round(progressStart + (completedTests / totalTests) * (progressEnd - progressStart)))
            : run.progress.percent;
          run.progress.percent = Math.max(run.progress.percent, percent);
          run.progress.label = `Completed ${completedTests}${totalTests ? ` of ${totalTests}` : ""} Cypress tests`;
        }
        if (tool === "Cypress" && line.includes("(Run Finished)")) {
          run.progress.percent = Math.max(run.progress.percent, progressEnd - 1);
          run.progress.label = "Cypress run finished";
        }
        if (tool === "Postman" && line.includes("→")) {
          run.progress.percent = Math.max(run.progress.percent, progressStart + 8);
          run.progress.label = "Postman requests are running";
        }
        if (tool === "Postman" && /┌|│|└|executions|assertions/i.test(line)) {
          run.progress.percent = Math.max(run.progress.percent, progressEnd - 3);
          run.progress.label = "Postman run summary generated";
        }
      }
    };

    child.stdout.on("data", onLine("out"));
    child.stderr.on("data", onLine("err"));

    child.on("error", async (err) => {
      if (finished) return;
      finished = true;
      appendLog(run, tool, `Runner failed to start: ${err.message}`);
      resolve({ tool, passed: 0, failed: 1, time: 0, stability: null, status: "Failed" });
    });

    child.on("close", async (code) => {
      if (finished) return;
      finished = true;
      const durationSec = (Date.now() - startedAt) / 1000;
      appendLog(run, tool, `Process exit code: ${code}`);

      if (!sawOutput) appendLog(run, tool, "No output captured from runner.");
      resolve(
        tool === "Cypress"
          ? resultFromCypressSpecOutput(stdout, durationSec, code)
          : tool === "Postman"
            ? await resultFromPostmanReport(spec.reportPath, durationSec, code)
          : { tool, passed: 0, failed: code === 0 ? 0 : 1, time: Number(durationSec.toFixed(1)), stability: null, status: code === 0 ? "Passed" : "Failed" }
      );
    });
  });
}

async function executeRun(runId, scenarioId) {
  const run = runs.get(runId);
  if (!run) return;

  run.status = "Running";
  run.startedAt = nowIso();
  run.progress = { percent: 0, label: "Preparing shared test scenario", activeTool: "Cypress", completedTools: [] };

  appendLog(run, "Runner", `Scenario selected: ${scenarioId}`);
  appendLog(run, "Runner", "Initializing real Cypress execution workflow.");

  const history = await readJsonFile(HISTORY_PATH, []);

  const completedTools = [];
  const results = [];

  for (const [index, tool] of testingTools.entries()) {
    run.progress.activeTool = tool;
    run.progress.completedTools = [...completedTools];
    run.progress.percent = 0;
    run.progress.label = `Current environment: ${tool}`;

    const result = await runToolReal(run, tool, scenarioId, 0, 100);
    const stability = computeStability(history, scenarioId, tool);
    results.push({ ...result, stability: stability ?? 95 });
    completedTools.push(tool);

    run.progress.completedTools = [...completedTools];
    run.progress.percent = 100;
    run.progress.label = `${tool} completed`;
  }

  run.results = results;
  run.status = results.some((r) => r.status === "Failed") ? "Failed" : "Completed";
  run.progress = { percent: 100, label: "Execution complete", activeTool: null, completedTools: [...testingTools] };
  run.finishedAt = nowIso();

  appendLog(run, "Runner", "Comparison table and recommendation generated.");
  await persistRunToHistory(run);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function handleApi(req, res, urlObj) {
  if (req.method === "POST" && urlObj.pathname === "/api/run-test") {
    const body = await parseBody(req);
    const scenarioId = body?.scenarioId;
    if (!scenarioId || typeof scenarioId !== "string") return json(res, 400, { error: "Missing scenarioId" });

    const runId = randomUUID();
    const run = {
      runId,
      scenarioId,
      status: "Queued",
      startedAt: null,
      finishedAt: null,
      progress: { percent: 0, label: "Queued", activeTool: null, completedTools: [] },
      logs: [],
      results: null,
    };
    runs.set(runId, run);
    json(res, 200, { runId });

    // Execute asynchronously.
    executeRun(runId, scenarioId).catch((err) => {
      const current = runs.get(runId);
      if (!current) return;
      current.status = "Failed";
      current.finishedAt = nowIso();
      appendLog(current, "Runner", `Fatal error: ${err?.message ?? String(err)}`);
    });
    return;
  }

  if (req.method === "GET" && urlObj.pathname === "/api/test-results") {
    const runId = urlObj.searchParams.get("runId");
    if (!runId) return json(res, 400, { error: "Missing runId" });
    const run = runs.get(runId);
    if (!run) return json(res, 404, { error: "Unknown runId" });
    return json(res, 200, run);
  }

  if (req.method === "GET" && urlObj.pathname === "/api/test-history") {
    const history = await readJsonFile(HISTORY_PATH, []);
    return json(res, 200, { items: history });
  }

  return null;
}

async function serveStatic(req, res, urlObj) {
  const pathname = urlObj.pathname === "/" ? "/index.html" : urlObj.pathname;
  const filePath = safeJoin(ROOT_DIR, pathname.slice(1));
  if (!filePath) return notFound(res);
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return notFound(res);

    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { "content-type": guessContentType(filePath), "cache-control": "no-store" });
    stream.pipe(res);
    stream.on("error", () => notFound(res));
  } catch {
    notFound(res);
  }
}

async function main() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    // CORS for local dev (handy if you serve UI separately later).
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    if (req.method === "OPTIONS") return text(res, 204, "");

    const handled = await handleApi(req, res, urlObj);
    if (handled !== null) return;
    await serveStatic(req, res, urlObj);
  });

  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
