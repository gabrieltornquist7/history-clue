# HISTORYCLUE — CLAUDE.md (Master Guide)

> This file tells Claude exactly how to work in this repo. Keep it short, strict, and up to date.

---

## Snapshot
- Web game where players guess a **city + year** from up to **5 clues**.
- Modes: **Menu, Game (Endless), Daily Challenge, Challenges, Profile, Leaderboard**.
- Live features (new): **LiveLobbyView, LiveBattleView** for 1v1 best-of-3 battles.
- Stack: **Next.js (App Router)**, **React**, **Tailwind**, **Supabase** (auth/db/realtime).
- Design: dark onyx gradient + **gold accents `#d4af37`**, serif headings, system body.

---

## Commands (canonical)
- Install: `npm i`
- Dev: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- (If tests added later) `npm test`

Claude: when asked to build/lint, **run and paste full logs** (no summaries).

---

## Repo Structure (key files/folders)
- `/app/page.js` — view/router that lazy-loads screens and switches on `view`.
- `/app/layout.js`, `/app/globals.css` — app shell + global styles.
- `/components/`  
  - `Auth.js` — sign in/up.
  - `MainMenu.js` — entry UI, navigates via `setView`.
  - `GameView.js` — core guessing gameplay (non-live).
  - `DailyChallengeView.js` — daily flow and thresholds.
  - `ChallengeView.js` — challenge lists/starts.
  - `LeaderboardView.js` — scores.
  - `ProfileView.js`, `ProfileSettingsView.js` — user areas.
  - `ClueDisplay.js`, `ClueUnlockBar.js`, `GuessingInterface.js`, `ScoreDisplay.js`, `ResultsScreen.js`, `Map.js` — supporting UI.
  - **Live features (new, keep tidy):**
    - `LiveLobbyView.js` — random queue + invite flow UI.
    - `LiveBattleView.js` — 1v1 match UI (map center, clues, timers, scores).
- `/lib/supabaseClient.js` — Supabase singleton.
- `/public` — icons/assets.
- `eslint.config.mjs` — lint rules.

> If any component exceeds ~300 lines, split into subcomponents in a folder.

---

## UI Conventions
- Tailwind for styling; keep inline styles minimal.
- Panels: translucent black, `rounded-2xl`, thin border, subtle `backdrop-blur`.
- Accent gold: `#d4af37`. Serif for titles; system for body text.
- Mobile first (min width target **360px**).

---

## Workflow (ALWAYS)
**PLAN → DIFF → APPLY → BUILD**

1) **PLAN**: List files to touch, exact actions, and risks.  
2) **DIFF**: Show unified diffs for only those files. **Wait for approval.**  
3) **APPLY**: Apply approved diffs.  
4) **BUILD**: Run `npm run build`; paste full output.

Rules:
- Keep changes **small and reversible**.
- No broad search/replace across repo.
- Ask before deleting files or changing schema.

---

## Guardrails
- Do **not** edit env/deployment configs or secrets.
- Do **not** hardcode secrets or puzzle answers client-side.
- Supabase schema changes must go in **migrations**, not inline in components.
- Respect existing design language and view names.
- Keep imports clean; remove dead code in the same PR only if safe and reviewed.

---

## Supabase Notes
- Use **RLS** for any new tables; restrict visibility to the current user/battle.
- Realtime channel naming: `prefix:{id}` (e.g., `live_battle:{battleId}`, `invites:{userId}`).
- Never expose answers client-side; do correctness checks in an edge function later (MVP can mock).

---

## Live Battle (1v1) — Contracts (MVP)
**Flow:** Lobby → Round 1 → (intermission) → Round 2 → (intermission) → Round 3 (if needed) → Results.  
**Timer:** 180s per round; when one player answers correctly, the opponent’s remaining time clamps to **30s**.  
**Scoring by clues used (c = 1..5):** `[5000, 3500, 2500, 1500, 800][c-1]`.  
**Best-of-3:** First to 2 round wins; if full tie, **Sudden Death**: 60s, first correct wins.

**Realtime channel:** `live_battle:{battleId}`  
**Events (broadcast):** `match_ready`, `start_round`, `reveal_clue`, `guess`, `opponent_correct`, `round_result`, `match_result` (+ optional `typing`, `disconnect`).

**Component responsibilities:**
- `LiveLobbyView`  
  - Props: `{ session, onEnterMatch(battleId: string) }`  
  - Handles random matchmaking + invite accept/decline, then calls `onEnterMatch`.
- `LiveBattleView`  
  - Props: `{ session, battleId: string, onExit?: () => void }`  
  - Orchestrates timers, clue reveals, map guesses, scoring, and transitions.
- If file size grows, extract: `TopBar`, `CluesPanel`, `MapBoard`, `OpponentPanel`, `RoundSummary`, `MatchSummary`.

---

## Common Tasks (Claude Templates)

### A) Clean up legacy live references (safe)
1. **Search** the repo for: `LiveGameView`, `LiveLobbyView`, `LiveBattleView`, `liveGame`, `liveLobby`, `live_invite`.  
2. **PLAN** minimal edits to remove or update references.  
3. **DIFF** only those lines; wait for approval.  
4. **APPLY → BUILD** and paste logs.

### B) Add/adjust LiveBattle shell
- Add `case "liveBattle"` in `/app/page.js` to render `LiveBattleView`.
- Create/adjust `LiveBattleView.js` with minimal layout (map center, clues left, opponent right). No real logic yet.

Process: **PLAN → DIFF → APPLY → BUILD**.

### C) Move to subfolder (if requested)
- Move `LiveLobbyView.js` and `LiveBattleView.js` into `/components/LiveBattle/` and update imports.
- Show PLAN and DIFFs first.

### D) Fix first build error
- Run `npm run build`, paste full output.  
- Explain the **first** error plainly.  
- **PLAN** minimal fix → **DIFF** → **APPLY → BUILD**.

---

## Branching / Commits
- Small fixes: may commit to `master`.  
- Features: create branch `feat/<short-name>` and open a PR with:
  - Short description, screenshots/GIFs if UI,
  - Checklist below.

**Commit format:** `feat(scope): summary`, `fix(scope): …`, `chore: …`, `refactor: …`.

---

## “Done” Checklist
- [ ] Lint + build pass.
- [ ] No unused imports or console noise.
- [ ] Mobile layout OK at 360px.
- [ ] No env/secrets/deploy changes.
- [ ] For Live Battle: `LiveLobbyView` and/or `LiveBattleView` compile and render.
- [ ] If schema touched: migration file added (with RLS) — not inline.

---

## Handy Prompts (you can paste to Claude)

**Remove old live refs safely**
> Use the Code tool and follow `/CLAUDE.md`. PLAN → DIFF → APPLY → BUILD.  
> Goal: remove/update any leftover references to legacy live views or invite code.  
> Step 1: search terms and list matches with file paths + line numbers: `LiveGameView`, `LiveLobbyView`, `LiveBattleView`, `liveGame`, `liveLobby`, `live_invite`.  
> Step 2: propose a minimal PLAN.  
> Step 3: show DIFFS only for proposed files (don’t apply yet).

**Add LiveBattle shell**
> Use the Code tool and follow `/CLAUDE.md`. Branch: `feat/live-battle-shell`.  
> Add `case "liveBattle"` in `/app/page.js` and scaffold `/components/LiveBattleView.js` with a minimal three-panel layout (clues / map / opponent). No Supabase logic yet.  
> PLAN → DIFF (wait) → APPLY → BUILD.

**Fix build**
> Use the Code tool and follow `/CLAUDE.md`.  
> Run `npm run build` and paste full output.  
> Explain the first error, propose a minimal fix (PLAN), show DIFF only, then apply and rebuild.

---

## Glossary
- **Clue**: one of the five hints (revealed progressively).  
- **Round**: one puzzle attempt; in live battle, best-of-3.  
- **Battle**: a 1v1 live match composed of rounds.  
- **BattleId**: unique id for a live match session.

---
