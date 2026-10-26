# Agent Games agent

zkVerify Agent Games endpoint. Implements preflight and **Proof Gatekeeper** with Groth16 proofs from the official circuit.

## How it decides

The decision logic mirrors `circuits/gatekeeper.wasm`. Its rules were found by probing the circuit with inputs on either side of each limit:

| Check | Approve when | Reason on failure |
|---|---|---|
| VK | `registered_vk == proof_vk` | `VK_SUBSTITUTION` |
| Threshold | `public_balance >= minimum` | `THRESHOLD_MISMATCH` |
| Expiry | `current_block < expiry_block` (equal = expired) | `EXPIRED_CONDITION` |
| Recipient | `recipient == condition_recipient` | `RECIPIENT_MISMATCH` |
| Cap | `amount <= max_transfer` | `AMOUNT_OVERFLOW` |
| Reuse | `proof_tx` not accepted by an earlier task | `PROOF_REUSED` (no proof; outside the circuit) |

The circuit asserts `decision == AND(checks)`, so it cannot prove a wrong answer. Every decision except a reuse rejection carries a self-verified proof.

Circuit inputs: `registeredVkHash, proofVkHash, minimum, publicBalance, expiryBlock, currentBlock, recipient, conditionRecipient, amount, maxTransfer, taskId, decision` (all public) plus a private `salt`.
Public signals: `[commitment, …the 10 condition fields…, decision, taskId]`.

## Run

```bash
npm ci
npm test
cp .env.example .env   # then fill in AGENT_GAMES_HMAC_SECRET
npm run dev
npm run replay         # in another terminal: signed preflight + all 7 trap types
```

## Deploy

Use `Dockerfile`. The host must give the agent a public HTTPS URL on port 443, never sleep, and mount a persistent volume at `/data`. If `/data` is lost, the agent forgets accepted proofs and will approve reused ones. Register the full path `https://<host>/agent`.

## Settle in practice mode before scored rounds

1. **Signature format**: the agent accepts hex, base64, and `sha256=` forms and signs its replies in the same form. Check which one preflight uses in `data/preflight.jsonl`.
2. **`taskId` encoding** (`TASK_ID_ENCODING`): the platform's encoding of `gk_…` strings into a field element is undocumented. Try `utf8`, then `sha256` or `keccak256`, until practice shows the proof as verified.
3. **Response field names**: the agent sends `proof` and `public_signals`, matching the build guide's starter prompt.
