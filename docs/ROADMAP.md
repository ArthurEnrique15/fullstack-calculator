# Implementation Roadmap — Fullstack Calculator

Manager-owned plan. Recruited agents execute against this + the frozen `docs/API-CONTRACT.md`. The manager does not write code.

## Frozen decisions (resolved via grill-with-docs)

| # | Decision |
|---|----------|
| Operations | All 7: add, subtract, multiply, divide, power, sqrt, percentage |
| Percentage | `(a/100) × b` ("a percent of b") |
| API | Single `POST /api/v1/calculate`, operation in body |
| Errors | `400` validation, `422` math; structured `{error:{code,message}}` |
| Numbers | `float64`, rounded to ~12 sig digits; reject NaN/Inf as `422` |
| Backend | Go **stdlib `net/http`** (1.22+ routing), controller/service layering, no framework |
| Frontend | Vite + React + TypeScript + **Tailwind**, `useState`, native `fetch`, Vitest + RTL |
| UI | Classic calculator button grid; accumulator model; backend-authoritative (ADR 0002) |
| Dev networking | Vite dev proxy `/api` → Go; narrow configurable CORS on Go as safety net |
| Docker | `docker-compose`, 2 services; frontend built to static, Nginx serves it and reverse-proxies `/api` → backend |
| Coverage | 100% target, excluding only entrypoints (`main.go`, `main.tsx`) |

## Shared rules for every recruited agent

1. **Do not make arbitrary decisions.** Any design question or ambiguity → stop and use the `grill-with-docs` skill. This rule is inherited; pass it to any sub-agent you spawn.
2. **The API contract is frozen.** Build against `docs/API-CONTRACT.md`. Proposing a change requires grilling, not a unilateral edit.
3. Idiomatic, readable code. Match the ecosystem's conventions.
4. Tests are part of "done," not a follow-up. Hit the 100% target (entrypoints excluded).
5. **Do not write to `prompts/`.** The manager alone curates it (only the exact `maestri ask` messages). Never duplicate context that already lives in roles, `docs/`, ADRs, or code.
6. Keep your own detail in your own context; report back a concise summary, not a code dump.

## Dependency graph

```
API-CONTRACT (frozen) ──┬──► Agent 1: Backend  ──┐
                        └──► Agent 2: Frontend ──┼──► Agent 3: Integration & Docs
                                                 ┘
```

Backend and Frontend are independent (both depend only on the frozen contract) → run in parallel. Integration/Docs assembles the two and can draft in parallel from the roadmap, finalizing after 1 & 2 land.

---

## Agent 1 — Backend (Go)

**Directory:** `backend/`

**Deliverables:**
- Go module. Layered structure:
  - `calculator` package — pure domain: one function per operation (or an op-dispatch table), returns typed math errors (div by zero, negative sqrt, non-finite). No HTTP, no JSON.
  - `handler` (or `api`) package — HTTP: parse/validate request, map to calculator, format success + error JSON, set correct status codes per the contract.
  - `main.go` — wiring only (routes, server, config via env: port, allowed CORS origin). Excluded from coverage target.
  - Narrow configurable CORS middleware.
  - `GET /healthz`.
- Rounding of results to ~12 significant digits; NaN/Inf → `422 NON_FINITE_RESULT`.
- **Tests:**
  - `calculator`: table-driven, every operation + every edge case (div0, sqrt neg, power overflow → non-finite, rounding correctness).
  - `handler`: `httptest` — happy path per op, `400` cases (bad JSON, unknown op, missing/invalid operand), `422` cases.
  - 100% coverage of `calculator` + `handler`. `go test -cover` + HTML report generation documented.
- `Dockerfile` — multi-stage (build → minimal final image), exposes `:8080`.

**Must match:** every status code, error `code`, and JSON field in `docs/API-CONTRACT.md` exactly. Frontend and integration tests depend on it.

---

## Agent 2 — Frontend (React + TypeScript)

**Directory:** `frontend/`

**Deliverables:**
- Vite + React + TS scaffold. Tailwind configured.
- Typed API client `api.ts` — one `calculate(operation, a, b?)` call against relative `/api/v1/calculate`; maps error `code` → typed result the UI can switch on.
- Classic calculator UI:
  - Display screen + button grid: digits `0–9`, `.`, operators `+ − × ÷`, `xʸ` (power), `√`, `%`, `=`, clear (`C`/`AC`).
  - **Accumulator model** (ADR 0002): Current Operand + Pending Operation; operator/`=`/unary press triggers a backend call; result becomes the new Current Operand. **No client-side arithmetic, no operator precedence.**
  - Input validation: only valid number entry (single decimal point, sane length); disable/guard illegal states.
  - Error handling: render backend error messages (div by zero, negative sqrt) on the display; recover gracefully (clear resets).
  - Responsive: works on mobile widths (Tailwind grid + breakpoints).
- Separate the accumulator/state logic from presentation (e.g. a reducer or hook) so logic is unit-testable without the DOM.
- **Tests (Vitest + RTL):**
  - `api.ts` with mocked `fetch` (success, 400, 422, network error).
  - Accumulator logic: enter number → operator → number → `=` → renders result; chaining; unary ops; clear; error states.
  - Component interaction: button press → display update; error render.
  - 100% coverage excluding `main.tsx`.
- Vite dev proxy config: `/api` → `http://localhost:8080`.
- `Dockerfile` — build static assets, serve via Nginx; Nginx config reverse-proxies `/api` → `backend:8080`.

**Must match:** the frozen contract's request shape and error `code`s.

---

## Agent 3 — Integration & Docs

**Depends on:** Agent 1 + Agent 2 (can draft from roadmap in parallel, finalize after).

**Deliverables:**
- `docker-compose.yml` — `backend` + `frontend` services; `docker compose up` brings the full app up; frontend reachable on one port, `/api` proxied to backend. Verify end-to-end in containers (no real prod env needed, but must run in Docker).
- Root `README.md`:
  - Setup + prerequisites (Go, Node, Docker).
  - How to run each layer locally (backend, frontend dev server) **and** via `docker compose up`.
  - API usage: `curl` examples for each operation + error cases, matching the contract.
  - Design decisions / assumptions — summarize ADRs (single endpoint, backend-authoritative accumulator, no operator precedence, 422 for math errors), link to `docs/adr/`.
  - How to run tests + regenerate coverage reports for both layers.
- Coverage: ensure both reports are reproducible and referenced from the README.
- Cross-check that backend responses and frontend expectations agree with `docs/API-CONTRACT.md` (integration smoke test, e.g. a scripted `curl` per op).

---

## Manager checklist

- [x] Grill design decisions (grill-with-docs)
- [x] CLAUDE.md, CONTEXT.md, API-CONTRACT, ADRs, ROADMAP
- [x] Recruit Agent 1 (Backend) + Agent 2 (Frontend) in parallel via Maestro
- [x] Recruit Agent 3 (Integration & Docs)
- [x] Verify deliverables against contract (smoke 16/16 in Docker)
- [x] Push to GitHub in separated commits (docs / backend / frontend)
- [x] Code review pass (reviewer agent) + route fixes to owners
