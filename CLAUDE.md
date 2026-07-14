# Daybird (working codename)

Local-first macOS productivity app — a from-scratch Super Productivity replacement with a Things 3-style UX. Tauri v2 + React/TS/Vite + Motion + Zustand (SQLite, Linear, and Apple Calendar arrive in Phase 2).

- **Spec:** `docs/superpowers/specs/2026-07-14-daybird-design.md` (approved — don't relitigate locked decisions)
- **Active plan:** `docs/superpowers/plans/2026-07-14-daybird-phase1-ux.md`
- **Commands:** `npm test` (Vitest), `npm run tauri dev` (app)

## Orchestration workflow

You (whichever model is orchestrating) plan, decompose, dispatch, verify, and synthesize. Orchestrator context is the scarcest resource: hand artifacts over as files, keep dispatches lean, and do nothing mechanical yourself.

Model assignment (ladder inherited from reservation-master's validated runs; re-tune here as evidence accumulates):

- **Codex (`codex:codex-rescue` agent or `/codex:rescue --background`)** — implementation when the plan text contains the complete code (transcription + testing), and root-cause investigations. A peer engineer, not a reviewer. Sandbox caveat: it may not be able to commit in worktrees — it leaves changes in the working tree and the orchestrator verifies + commits.
- **`fast-worker` (haiku)** — verbatim reviewer-prescribed fixes, single-file mechanical changes.
- **sonnet (general-purpose)** — multi-file wiring with judgment, task reviews.
- **`deep-reasoner` (opus)** — final whole-branch reviews, architecture, gnarly debugging.
- **Orchestrator itself** — specs, plans, adjudicating review findings, anything taste- or money-adjacent. Nothing else.

Non-negotiables:

- Verify every subagent "done" yourself via git + re-running the named tests. Completion claims are untrustworthy.
- High-stakes decisions: task deep-reasoner + Codex on the same problem in parallel, synthesize the best of both, without showing either the other's answer.
- Reviews receive the diff as a file; Critical/Important findings get fix dispatches, Minor findings go to a ledger for the final review to triage.

**Daybird-specific exception:** taste-driven UI/UX iteration (all of Phase 1 — animations, spacing, feel) stays **inline** with the human in the HMR loop. Dispatching it through subagents adds latency and severs the feedback loop that phase exists for. Dispatch only well-specified, mechanically-verifiable work.
