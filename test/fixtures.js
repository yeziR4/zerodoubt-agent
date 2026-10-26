export const ADDR = "0xDe42aB000000000000000000000000000000_9f01".replace("_", "");
export const OTHER = "0x1111111111111111111111111111111111119f01";
export const VK = "0x7d3a00000000000000000000000000000000000000000000000000000000f291";
export const VK_BAD = "0xa4c100000000000000000000000000000000000000000000000000000000b8ff";

let n = 0;
export function task(overrides = {}, top = {}) {
  n += 1;
  return {
    type: "agent-games.proof-gatekeeper.v1",
    task_id: `gk_test_${n}`,
    mode: "practice",
    issued_at: new Date().toISOString(),
    deadline_at: new Date(Date.now() + 60_000).toISOString(),
    ...top,
    input: {
      registered_vk: VK,
      proof_vk: VK,
      minimum: "1000",
      public_balance: "1460",
      expiry_block: 8430000,
      current_block: 8420000,
      recipient: ADDR,
      condition_recipient: ADDR,
      amount: "500",
      max_transfer: "1000",
      proof_tx: `0xproof${n.toString(16).padStart(4, "0")}`,
      ...overrides,
    },
  };
}
