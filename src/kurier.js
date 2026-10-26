/**
 * Optional zkVerify audit trail via Kurier. Runs after the response is sent, so
 * it never costs response time; the job id is logged for disputes.
 */
export function makeKurier({ apiKey, apiUrl, vkHash, log }) {
  if (!apiKey) return { submit: async () => null };

  async function submit(taskId, { proof, publicSignals }) {
    try {
      const res = await fetch(`${apiUrl}/submit-proof/${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proofType: "groth16",
          vkRegistered: true,
          proofOptions: { library: "snarkjs", curve: "bn128" },
          proofData: { proof, publicSignals, vk: vkHash },
        }),
      });
      const job = await res.json().catch(() => ({}));
      log("kurier", { task_id: taskId, status: res.status, job });
      return job;
    } catch (err) {
      // Never log the URL: it carries the API key.
      log("kurier", { task_id: taskId, error: err.message });
      return null;
    }
  }

  return { submit };
}
