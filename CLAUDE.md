# Fullstack Calculator — Workspace Guide

This file orients any agent (human or AI) working in this repository. Read it before doing anything.

## What we are building

A full-stack calculator application:

- **Frontend**: React + TypeScript. Intuitive UI, input validation, error handling, responsive (basic mobile support).
- **Backend**: Go REST microservice. Exposes calculator operation endpoints, validates input, handles edge cases, returns JSON.
- **Operations (required)**: Addition, Subtraction, Multiplication, Division.
- **Operations (optional)**: Exponentiation, Square Root, Percentage.

The frontend consumes the backend API for all arithmetic. No client-side computation of the "real" answer.

### Non-functional requirements

- Clean, readable, idiomatic code on both layers.
- Unit tests covering key functionality, both layers, with a coverage report.
- Documentation: setup instructions, API usage, design rationale.
- Optional: Dockerfile(s) to run frontend + backend together.

### Deliverables

- Git repo with frontend + backend.
- README: setup, run instructions, API examples, design decisions/assumptions.
- Unit tests + coverage report.
- Optional: Docker for full-stack deployment.
- `prompts/` directory: record of prompts used during the work (assignment asks us to share prompts).

### Constraints

- Frontend: React (TypeScript preferred).
- Backend: Go preferred.
- Time box: ~2–4 hours of equivalent effort. Prioritize correctness, clarity, maintainability over extra features.

## How this workspace is run (Maestro model)

This is a **Maestri terminal** with the Maestro feature. Work is split across a manager agent and recruited implementing/design agents.

### Manager agent (roadmap architect)

- Owns the **implementation roadmap** and the design docs that other agents execute against.
- **Does not touch code.** Writes roadmap/design documents only.
- Recruits and manages implementing and design agents via Maestro; parallelizes independent work.
- Delegates implementation specifics to recruited agents so the manager's context window stays small and controlled. Goal: finish the implementation **without needing to compact the manager's context.**

### Rules for all agents (manager AND recruited)

1. **Do not make arbitrary decisions.** When you are unsure or a design decision is needed, stop and discuss it using the `grill-with-docs` skill before proceeding.
2. This grilling requirement is **inherited**: the manager passes it down to every recruited agent. Recruited agents must use `grill-with-docs` for their own design decisions too.
3. Keep contexts controlled. Implementation detail lives with the recruited agent that owns it, not in the manager's context.
4. **Do not write to `prompts/`.** The manager alone curates it, and it records only the exact `maestri ask` messages sent to agents — never role prompts, design decisions, or reasoning (those live in `.maestri/roles`, `docs/`, ADRs, code). Do not duplicate context that already lives elsewhere.

## Repo layout (target)

```
fullstack-calculator/
├── CLAUDE.md              # this file
├── README.md             # setup, run, API examples, design decisions
├── docs/                 # roadmap + design docs (manager-owned)
├── backend/              # Go REST microservice
├── frontend/             # React + TypeScript app
├── prompts/              # prompts used during the work
└── (Dockerfile / docker-compose — optional)
```

## Status

- [x] Workspace guide (this file)
- [x] Implementation roadmap
- [x] Backend (Go, 100% coverage)
- [x] Frontend (React + TS, keyboard support, 100% coverage)
- [x] Docs / README
- [x] Docker (docker-compose, full stack)
- [x] Code review pass (findings routed to owners)
