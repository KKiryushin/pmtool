# Verification checklist

One line per phase's acceptance behavior. Run `npm run dev` (binds to
`0.0.0.0:4317`) and check from a browser — on this Mac or from a phone over
Tailscale at `http://<tailscale-ip-or-name>:4317`.

## Phase 0 — Scaffolding, Auth, DB
- [x] `npm run dev` starts with no build/type errors.
- [x] Visiting `/` while logged out redirects to `/login`.
- [x] Logging in with the seeded admin (see `prisma/seed.ts` output) redirects back and shows "role: ADMIN".
- [x] "Sign out" clears the session and redirects to `/login`.
- [x] Session persists across a server restart (JWT cookie, not in-memory).

## Phase 1 — Admin CRUD + Seed Import
- [x] Admin screens list/create/edit/delete Framework, Scale/ScalePoint, Level, Category, CategoryLevelTarget, Competency (incl. conditional flag/question), Action (incl. weight), Users.
- [x] Seeded real PM framework content (from the Google Sheet) renders correctly end-to-end: 3 levels, 7 categories, 27 competencies (incl. the one conditional competency with its question text), 109 actions, 19 category/level targets.
- [x] Creating/editing/deleting a throwaway Scale + ScalePoint via the UI and API works (generic CRUD, not just seeded data).
- [x] Non-admin (SELF_ASSESSOR) user gets redirected away from `/admin` and gets 403 from `/api/admin/*`.

## Phase 2 — Assessment-Taking Workflow
- [x] Can create a new self-assessment (pick framework + level); level dropdown is populated from the chosen framework.
- [x] Category scoring screen shows all levels' competencies/actions side by side, with level descriptions and per-level targets, matching the real seeded content.
- [x] Conditional yes/no question UI ("Is the product being sold?") appears and excludes its 5 actions from both the screen and the category/overall progress counts when answered "No".
- [x] Scores autosave (confirmed via reload: selected score persisted); overall progress counter updates live (109 -> 104 after excluding the conditional competency, 1/104 after scoring one action).
- [x] Submitting flips status to SUBMITTED, the UI goes read-only, and the API now rejects score edits with 409.

## Phase 3 — Dashboard
- [ ] Radar chart shows current vs target % per category for the latest assessment.
- [ ] Toggling `Framework.rollupStrategy` in admin changes the dashboard numbers live, with no score re-entry.
- [ ] Numbers roughly match a hand-checked assessment against the original Google Sheet.

## Phase 4 — LLM Development Plan
- [ ] With `OPENAI_API_KEY` unset: "Generate plan" shows a clear error; rest of the app is unaffected.
- [ ] With a real key: plan generates, persists, and is re-fetchable without regenerating.
