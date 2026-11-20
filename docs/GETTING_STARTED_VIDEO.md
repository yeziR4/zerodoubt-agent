# Creator Track beginner guide: production spec

Give this whole file to the video agent. Everything it needs is linked here.

## The brief
A **2-minute beginner walkthrough**: **"Your first Agent Games agent in 6 steps."** It's for someone who has never built an agent endpoint. It covers picking an event, building the endpoint, signing, hosting, registering, practising and checking results, using our open-source agent as the worked example. It ends with the five beginner mistakes that cost us real points, so viewers can skip them.

Judges score **technical substance, clarity, zkVerify relevance, originality**. Lead with clarity: one step per scene, a big step number on screen, plain words.

## Output
| Item | Spec |
|---|---|
| Length | **2:00–2:15 max** (X caps most uploads at 2:20) |
| Aspect | 16:9, 1920×1080, 30 fps, MP4 (H.264 + AAC) |
| Captions | Burned-in for every voiceover line |
| Look | A large step badge ("1/6" … "6/6") in the top-left corner of every scene |
| Voice | Friendly, slow, beginner-level. Define any term the first time it's used (endpoint, HMAC, proof). |
| End card | "Agent Games · agentgames.zkverify.io · code: github.com/yeziR4/zerodoubt-agent · #AgentGames · @ZKVProtocol" |
| Deliver | `agent-games-first-agent.mp4` + 1280×720 thumbnail: **"Your first agent in 6 steps"** |

## Links the agent will capture
**Public pages (record directly):**
| What | URL |
|---|---|
| Home | https://agentgames.zkverify.io/ |
| Events | https://agentgames.zkverify.io/events |
| Proof Gatekeeper | https://agentgames.zkverify.io/events/proof-gatekeeper |
| Steal the VFY | https://agentgames.zkverify.io/events/steal-the-vfy |
| Build guide | https://agentgames.zkverify.io/build |
| Rules & scoring | https://agentgames.zkverify.io/rules |
| Official circuits (JSON) | https://agentgames.zkverify.io/api/circuit-info |
| Leaderboard | https://agentgames.zkverify.io/leaderboard |

**Code (GitHub file view, 125% zoom, highlight the lines):**
| What | URL |
|---|---|
| Health + preflight reply | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/app.js#L130-L160 |
| Signature check on every request | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/app.js#L144 |
| HMAC verify / sign | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/hmac.js#L36-L49 |
| The field checks (Gatekeeper) | https://github.com/yeziR4/zerodoubt-agent/blob/main/src/gatekeeper.js#L33-L39 |
| Dockerfile (hosting) | https://github.com/yeziR4/zerodoubt-agent/blob/main/Dockerfile |
| Local test of all 7 traps (terminal shot) | `docs/demo/gatekeeper-replay.txt` |

**Dashboard (needs login): the human provides screenshots.** Ask for these, with **the HMAC secret blurred or cropped out**:
1. *My agents → Register agent* form
2. The agent card showing **Test preflight / Practice / Edit** and status **active**
3. A *Practice* result ("Correct decision", Submitted / Expected)
4. The agent page's round table

## Shot list and script
| # | Time | Visual | Voiceover (also the caption) |
|---|---|---|---|
| 1 | 0:00–0:08 | Home page hero | "Agent Games is an arena where AI agents compete, and zero-knowledge proofs decide who won. Here's how to enter your first agent in six steps." |
| 2 | 0:08–0:22 | **1/6** Events page, then hover each event card | "Step one: pick an event. In Proof Gatekeeper your agent approves or rejects payment requests. In Steal the VFY it plays head-to-head matches with a strategy it commits to in advance." |
| 3 | 0:22–0:38 | **2/6** Build guide, then `/api/circuit-info` JSON | "Step two: read the build guide. Your agent is just a web address, an endpoint, that receives a task and answers it. The official circuits for the proofs are published here, so everyone proves with the same rules." |
| 4 | 0:38–1:00 | **3/6** `app.js` L130–160, then `hmac.js` L36–49 | "Step three: build the endpoint. Every request is signed with a secret only you and the platform know. That's an HMAC. Check the signature first, reject anything that doesn't match, answer the 'preflight' hello, and sign your reply the same way." |
| 5 | 1:00–1:12 | **4/6** Dockerfile | "Step four: host it on a public HTTPS address that never sleeps, with a little permanent storage. Tasks arrive all evening, and a sleeping server misses them." |
| 6 | 1:12–1:30 | **5/6** Screenshots 1 and 2 | "Step five: register. Give the full address, including the path like slash agent. You'll get your secret once, so put it straight into your server's settings. Then press Test preflight until your agent shows active." |
| 7 | 1:30–1:45 | **6/6** Screenshot 3, then terminal replay of `gatekeeper-replay.txt` | "Step six: practise. Send yourself every trap type and check each decision. You can also test locally: here our agent passes all seven traps." |
| 8 | 1:45–2:05 | Five lines appearing one by one over screenshot 4 | "Five mistakes that cost us points, so you can skip them: practice doesn't check your proofs. Never redeploy during a round. Keep your list of used proofs on disk. Make sure your host never sleeps. And check 'proofs verified' after your first scored round." |
| 9 | 2:05–2:15 | Leaderboard, then end card | "Then watch your agent on the leaderboard. Our code is open source if you want a head start. See you in the arena. #AgentGames" |

## On-screen text for shot 8 (one line every ~3 s)
1. Practice ≠ proof check
2. No redeploys during a round
3. Store used proofs on disk
4. Host must never sleep
5. Check "Proofs verified" after round 1

## Facts the agent may quote (all real)
- Four events: Proof Gatekeeper, Steal the VFY, Wildcard, Creator Track; 100,000 VFY per track (50k / 30k / 20k).
- Gatekeeper scoring: +12 correct, −6 wrong approve, −3 wrong reject, −2 timeout, −2 missing/invalid proof, +0 to +5 reliability bonus per round.
- Our agent passes all 7 Gatekeeper trap types locally (`docs/demo/gatekeeper-replay.txt`).
- Every decision our agent has made in scored rounds has been correct.

Don't claim anything beyond this list: no rank, no prize, no participant counts.

## Rules
- **Never show** an HMAC secret (blur it in any screenshot), `.env`, the Railway dashboard or its variables, or `STRATEGY_SALT`.
- Don't call the live agent endpoint. Use the public pages, the repo, the replay file and the human's screenshots.

## Post copy (X, attach the video; each post fits in 280 characters)
**1/**
> Never built an AI agent endpoint? Here's how to enter your first agent in @ZKVProtocol's Agent Games in 6 steps, in 2 minutes 👇
>
> #AgentGames

**2/**
> 1. Pick an event
> 2. Read the build guide + grab the official circuits
> 3. Build an endpoint that checks the HMAC signature and answers preflight
> 4. Host it on HTTPS that never sleeps
> 5. Register + Test preflight
> 6. Practise every trap

**3/**
> 5 mistakes that cost us points:
> • practice doesn't check proofs
> • never redeploy mid-round
> • keep used proofs on disk
> • don't let your host sleep
> • check "proofs verified" after round 1
>
> Open-source starter: github.com/yeziR4/zerodoubt-agent
> #AgentGames
