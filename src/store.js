import fs from "node:fs";
import path from "node:path";

/**
 * Durable state in append-only JSONL files, so a restart never forgets an
 * accepted proof_tx (PROOF_REUSED) or a task we already answered (retries).
 */
export class Store {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    this.acceptedFile = path.join(dir, "accepted-proofs.jsonl");
    this.responsesFile = path.join(dir, "responses.jsonl");
    this.accepted = new Map(); // normalized proof_tx -> task_id that accepted it
    this.responses = new Map(); // task_id -> { body, scheme }
    for (const row of readJsonl(this.acceptedFile)) this.accepted.set(row.proof_tx, row.task_id);
    for (const row of readJsonl(this.responsesFile)) this.responses.set(row.task_id, { body: row.body, scheme: row.scheme });
  }

  acceptedBy(proofTx) {
    return this.accepted.get(normalizeRef(proofTx));
  }

  markAccepted(proofTx, taskId, mode) {
    const ref = normalizeRef(proofTx);
    if (!ref || this.accepted.has(ref)) return;
    this.accepted.set(ref, taskId);
    append(this.acceptedFile, { proof_tx: ref, task_id: taskId, mode, at: new Date().toISOString() });
  }

  cachedResponse(taskId) {
    return this.responses.get(taskId);
  }

  saveResponse(taskId, body, scheme) {
    this.responses.set(taskId, { body, scheme });
    append(this.responsesFile, { task_id: taskId, body, scheme, at: new Date().toISOString() });
  }

  log(name, row) {
    append(path.join(this.dir, `${name}.jsonl`), { ...row, at: new Date().toISOString() });
    // Mirror to stdout so the host's log viewer shows activity; full task input stays on disk.
    const { input, job, ...summary } = row;
    console.log(`[${name}] ${JSON.stringify(summary)}`);
  }
}

export function normalizeRef(ref) {
  return typeof ref === "string" ? ref.trim().toLowerCase() : "";
}

function append(file, row) {
  fs.appendFileSync(file, JSON.stringify(row) + "\n");
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return []; // a torn final line after a crash
      }
    });
}
