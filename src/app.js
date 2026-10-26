import { verifySignature, sign } from "./hmac.js";
import { decide, TASK_TYPE } from "./gatekeeper.js";
import { withTimeout } from "./prover.js";

const PREFLIGHT_TYPE = "agent-games.preflight.v1";
const MAX_BODY_BYTES = 1 << 20;
const DEFAULT_BUDGET_MS = 45_000;

/**
 * deps: { config, store, prover, kurier, now? }
 * Returns a node:http request listener.
 */
export function createApp({ config, store, prover, kurier, now = () => Date.now() }) {
  const inFlight = new Map(); // task_id -> Promise<{ body, scheme }>

  async function handleGatekeeper(task, scheme) {
    const cached = store.cachedResponse(task.task_id);
    if (cached) return cached;
    if (inFlight.has(task.task_id)) return inFlight.get(task.task_id);

    const work = (async () => {
      const verdict = decide(task, {
        acceptedBy: (ref) => store.acceptedBy(ref),
        taskIdEncoding: config.taskIdEncoding,
      });
      const response = { decision: verdict.decision, reason_code: verdict.reason_code, proof_tx: task.input?.proof_tx ?? null };

      let proved = null;
      if (verdict.circuitInput && prover) {
        const deadline = Date.parse(task.deadline_at);
        const budget = Number.isFinite(deadline) ? deadline - now() - config.deadlineMarginMs : DEFAULT_BUDGET_MS;
        try {
          proved = await withTimeout(prover.prove(verdict.circuitInput), budget);
          response.proof = proved.proof;
          response.public_signals = proved.publicSignals;
        } catch (err) {
          // A correct decision without a proof still scores; never delay past the deadline.
          store.log("errors", { task_id: task.task_id, stage: "prove", error: err.message });
        }
      }

      const body = JSON.stringify(response);
      store.saveResponse(task.task_id, body, scheme);
      if (verdict.decision === "APPROVE") store.markAccepted(task.input.proof_tx, task.task_id, task.mode);
      store.log("decisions", {
        task_id: task.task_id,
        mode: task.mode,
        decision: verdict.decision,
        reason_code: verdict.reason_code,
        proved: Boolean(proved),
        input: task.input,
      });
      if (proved) kurier?.submit(task.task_id, proved);
      return { body, scheme };
    })();

    inFlight.set(task.task_id, work);
    try {
      return await work;
    } finally {
      inFlight.delete(task.task_id);
    }
  }

  return async function app(req, res) {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === config.agentPath)) {
      return send(res, 200, JSON.stringify({ ok: true }));
    }
    if (req.method !== "POST" || url.pathname !== config.agentPath) {
      return send(res, 404, JSON.stringify({ error: "not found" }));
    }

    let raw;
    try {
      raw = await readBody(req);
    } catch {
      return send(res, 413, JSON.stringify({ error: "body too large" }));
    }

    const scheme = verifySignature(config.hmacSecret, raw, req.headers["x-agent-games-signature"]);
    if (!scheme) {
      store.log("auth", { path: url.pathname, has_header: Boolean(req.headers["x-agent-games-signature"]), bytes: raw.length });
      return send(res, 401, JSON.stringify({ error: "invalid signature" }));
    }

    let msg;
    try {
      msg = JSON.parse(raw.toString("utf8"));
    } catch {
      return reply(res, 400, { error: "invalid json" }, scheme);
    }

    try {
      if (msg?.type === PREFLIGHT_TYPE) {
        store.log("preflight", { agent_id: msg.agent_id, nonce: msg.nonce, scheme });
        return reply(res, 200, { ok: true, protocolVersion: "v1" }, scheme);
      }
      if (msg?.type === TASK_TYPE && typeof msg.task_id === "string") {
        const out = await handleGatekeeper(msg, scheme);
        return send(res, 200, out.body, sign(config.hmacSecret, out.body, out.scheme));
      }
      store.log("unhandled", { type: msg?.type ?? null, eventId: msg?.eventId ?? null });
      return reply(res, 501, { error: "unsupported task type" }, scheme);
    } catch (err) {
      store.log("errors", { stage: "handler", error: err.message });
      // Fail closed: a gatekeeper task that blew up is a REJECT, never silence.
      if (msg?.type === TASK_TYPE) {
        return reply(res, 200, { decision: "REJECT", reason_code: "INTERNAL_ERROR", proof_tx: msg.input?.proof_tx ?? null }, scheme);
      }
      return reply(res, 500, { error: "internal error" }, scheme);
    }
  };

  function reply(res, status, obj, scheme) {
    const body = JSON.stringify(obj);
    send(res, status, body, sign(config.hmacSecret, body, scheme));
  }
}

function send(res, status, body, signature) {
  const headers = { "content-type": "application/json", "content-length": Buffer.byteLength(body) };
  if (signature) headers["x-agent-games-signature"] = signature;
  res.writeHead(status, headers);
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
