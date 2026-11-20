# Creator Track tutorial: production spec

Give this whole file to the video agent. Everything it needs is linked here.

## The brief
A **2-minute practical walkthrough** for builders. Title: **"Practice said 'verified'. The arena said 0."**

Our Proof Gatekeeper agent made **8 of 8 correct decisions in Round 01 and got 0 proofs verified**. The tutorial shows how a gatekeeper agent works, then the four things that decide whether your proofs actually count on zkVerify, with the real code, the real dashboard numbers, and the fix that took us to **8/8 verified**.

Judges score **technical substance, clarity, zkVerify relevance, originality**. This is our own build and our own failure-and-fix story, so all four are covered.

## Output
| Item | Spec |
|---|---|
| Length | **2:00–2:15 max** (X caps most uploads at 2:20) |
| Aspect | 16:9, 1920×1080, 30 fps, MP4 (H.264 + AAC) |
| Captions | Burned-in for every voiceover line (X autoplays muted) |
| Voice | Calm, practical, "here's what we learned". No hype. |
| Code shots | GitHub file view at 125% zoom, target line highlighted, hold ≥3 s |
| End card | "ZeroDoubt Gatekeeper · github.com/yeziR4/zerodoubt-agent · #AgentGames · @ZKVProtocol" |
| Deliver | `zerodoubt-tutorial.mp4` + 1280×720 thumbnail: **"8/8 correct. 0 verified."** |

## Links the agent will capture
| What | URL |
|---|---|
| Repo | https://github.com/yeziR4/zerodoubt-agent |
| The seven field checks | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/gatekeeper.js#L33-L39 |
| Proof-reuse check | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/gatekeeper.js#L68-L71 |
| Groth16 prove + self-verify | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/prover.js#L18-L19 |
| **Fix 1: taskId encoding** | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/encode.js#L30-L34 |
| **Fix 2: proof inside policyProof** | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/vfy/agent.js#L119-L125 |
| HMAC signature check | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/app.js#L144 |
| No-compression header | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/app.js#L192-L193 |
| Official circuit info (vk hashes, artifacts) | https://agentgames.zkverify.io/api/circuit-info |
| Proof Gatekeeper event page | https://agentgames.zkverify.io/events/proof-gatekeeper |
| Real local run of all 7 traps (terminal shot) | `docs/demo/gatekeeper-replay.txt` |
| Dashboard round table | **provided by the human as a screenshot** (see shot 2) |

## Shot list and script
| # | Time | Visual | Voiceover (also the caption) |
|---|---|---|---|
| 1 | 0:00–0:10 | Thumbnail text full screen: **"8/8 correct. 0 verified."** | "In Round 1 our gatekeeper agent made eight correct decisions out of eight, and got zero points for its proofs. Here's why, so yours doesn't." |
| 2 | 0:10–0:22 | Dashboard screenshot of the round table, highlight **R01: Correct 8, Proofs verified 0**, then **R04: 8, 8** | "Proof Gatekeeper pays 12 points per correct decision, but only when a Groth16 proof backs it on zkVerify. A missing or invalid proof costs 2 points every time." |
| 3 | 0:22–0:40 | `gatekeeper.js` L33–39, then L68–71 | "The agent itself is simple. Every request has a real proof attached, but the proof can back the wrong request. So we check every field: same verification key, balance above the minimum, not expired, right recipient, amount under the cap. Then we check that this proof reference hasn't been used before." |
| 4 | 0:40–0:52 | `prover.js` L18–19 | "Then we prove the decision with the official circuit and check that proof against the official verification key before sending it. Our proofs were valid. They still didn't count." |
| 5 | 0:52–1:00 | Big caption: **Lesson 1: Practice doesn't check proofs** | "First lesson: practice mode marks every answer 'proof verified', even one with no proof at all. Only scored rounds send proofs to zkVerify." |
| 6 | 1:00–1:22 | `encode.js` L30–34. Overlay: `task_R03_a5399562-…` → `0xa5399562…` | "Lesson 2: the proof is bound to the task through a taskId public input, and the encoding isn't documented. We encoded the whole string. The platform reads the UUID at the end of the task ID as one hex number. Wrong encoding, valid proof, zero credit." |
| 7 | 1:22–1:38 | `vfy/agent.js` L119–125 | "Lesson 3, for Steal the VFY: the proof must sit inside policyProof. We put it one level up. The platform saw no proof, swapped every move for HOLD, and charged 2 points a turn." |
| 8 | 1:38–1:48 | `app.js` L192–193 | "Lesson 4: send replies uncompressed with a content length. Another team lost a whole round to a proxy compressing their answers." |
| 9 | 1:48–2:05 | Terminal replaying `docs/demo/gatekeeper-replay.txt` line by line, then dashboard **R04: 8 answered, 8 verified** | "After the fixes: all seven traps decided correctly, every provable answer carries a proof, and the next scored round went eight for eight, verified on zkVerify." |
| 10 | 2:05–2:15 | End card | "If your proofs aren't counting, check these four first. Code is open source. #AgentGames on zkVerify." |

## On-screen callouts
- Shot 3: label each check as it's read: `VK` `THRESHOLD` `EXPIRY` `RECIPIENT` `AMOUNT` `REUSE`
- Shot 6: `taskId = BigInt("0x" + trailing UUID)`
- Shot 9: `7/7 traps PASS · proofs on every provable task`

## Facts the agent may quote (all real)
- Round 01: 8 answered, 8 correct, **0 proofs verified**.
- Round 04: 8 answered, 8 correct, **8 proofs verified**.
- Scoring (event page): +12 correct, −6 wrong approve, −3 wrong reject, −2 timeout, −2 missing/invalid proof, +0 to +5 reliability bonus per round.
- Every decision our agent has made in scored rounds has been correct.
- The taskId encoding was confirmed on scored tasks; VK-SENTINEL's public repo documented the same finding. Credit them if the encoding is discussed in the post.

Don't claim anything beyond this list: no final rank, no prize.

## Rules
- **Never show** `.env`, the Railway dashboard or variables, the HMAC secret, or anything named `STRATEGY_SALT`.
- Don't hit the live endpoint. Use the repo, the local replay file, and the dashboard screenshots.
- Show the dashboard only from screenshots the human provides.

## Post copy (X, attach the video; each post fits in 280 characters)
**1/**
> Our Proof Gatekeeper agent went 8/8 correct in Round 1 and got 0 proofs verified.
>
> Practice said "verified". The arena said 0. Here's the 2-minute fix-list so your agent's proofs actually count on @ZKVProtocol 👇
>
> #AgentGames

**2/**
> 1. Practice doesn't check proofs. It shows "verified" even with no proof. Only scored rounds tell you.
> 2. The taskId public input = the trailing UUID of task_id as one hex number. Encode the whole string and a valid proof gets zero credit.

**3/**
> 3. Steal the VFY: proof + public_signals go INSIDE policyProof. Anywhere else = no proof, HOLD, −2 per turn.
> 4. Reply uncompressed with Content-Length.
>
> After fixing: 8/8 verified.
> Code: github.com/yeziR4/zerodoubt-agent
> #AgentGames @ZKVProtocol
