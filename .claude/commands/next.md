---
description: Find and implement the next incomplete task from the ROADMAP.
---

Pick up where the project left off and implement the next incomplete milestone.

1. **Read** `.claude/ROADMAP.md` in full. Find the **first unchecked item** (`[ ]`) that is not
   marked Phase 2. Take note of its milestone ID (e.g. M1.16b, M1.21) and its acceptance
   criteria.

2. **Read** `.claude/PROGRESS.md` (newest entries first) to understand what was just finished
   and avoid duplicating work that is already in progress.

3. **Confirm the pick.** Print one line: `Next task: <milestone ID> — <title>`, then a brief
   (2–3 bullet) plan. Pause here if the user passes `--plan-only`.

4. **Implement** the milestone following the same rules as `/new-feature`:
   - Invoke `/ui-ux-pro-max` **before** building any UI component or page.
   - Data → Shared (Zod/types) → API → Client state → UI → i18n keys in both `he.json` and
     `en.json` — no hardcoded user-facing strings.
   - Mobile-first, RTL-safe (logical properties only, no `pl-`/`mr-`/`text-left`).
   - Theme via CSS variables; no hardcoded hex.
   - All golden rules from `CLAUDE.md` apply.

5. **Finish:**
   - Run `/check` (typecheck + lint + test). Surface and fix any failures before declaring done.
   - Check the completed boxes in `.claude/ROADMAP.md`.
   - Append a dated entry to `.claude/PROGRESS.md` (format: Done / Roadmap / Decisions /
     Notes).

$ARGUMENTS
