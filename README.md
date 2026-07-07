# Fullstack Calculator

A four-function (+ power, sqrt, percentage) calculator with a React + TypeScript frontend and a Go REST backend. The backend performs every arithmetic operation; the frontend is a classic button-grid UI that calls the backend for each step. All request/response shapes are locked to the frozen contract in [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md).

## Contents

- [Prerequisites](#prerequisites)
- [Repo layout](#repo-layout)
- [Run locally](#run-locally)
- [Run with Docker](#run-with-docker)
- [API usage](#api-usage)
- [Design decisions](#design-decisions)
- [Tests and coverage](#tests-and-coverage)
- [Assumptions](#assumptions)

---

## Prerequisites

| Tool           | Version   | Needed for                     |
|----------------|-----------|--------------------------------|
| Go             | 1.22+     | Backend build / run / test     |
| Node.js        | 20+       | Frontend build / run / test    |
| npm            | 10+       | Frontend package manager       |
| Docker         | 24+       | `docker compose up` full stack |
| Docker Compose | v2 plugin | `docker compose` subcommand    |

You need **either** Go + Node (to run each layer directly), **or** just Docker (to run the composed stack). You do not need both.

## Repo layout

```
fullstack-calculator/
├── README.md              ← this file
├── docker-compose.yml     ← full-stack via `docker compose up`
├── docs/
│   ├── API-CONTRACT.md    ← frozen HTTP contract (source of truth)
│   ├── ROADMAP.md         ← implementation plan
│   ├── NGINX-EXPECTATIONS.md
│   └── adr/               ← architectural decision records
├── backend/               ← Go REST service (Agent 1)
├── frontend/              ← Vite + React + TS SPA  (Agent 2)
├── prompts/               ← prompts used during the work
└── scripts/
    └── smoke.sh           ← integration smoke test (curl-based)
```

## Run locally

### Backend

```bash
cd backend
go run .
# Listens on :8080 (override with PORT env).
# CORS: ALLOWED_ORIGIN env (default "*"); safety net only — same-origin under Docker.
# Health: curl http://localhost:8080/healthz
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Vite dev server on :5173; /api proxied to http://localhost:8080.
```

Open http://localhost:5173.

## Run with Docker

```bash
docker compose up --build
```

Then open http://localhost:8080. The frontend container serves the built SPA and reverse-proxies `/api/*` to the backend container over Docker's default network. Stop with `Ctrl+C` or `docker compose down`.

> **Port conflict:** the local backend (`go run .`) and the Dockerised stack both bind host `:8080`. Do not run them at the same time — stop one before starting the other (`docker compose down`, or kill the `go run` process).

To rebuild after changes:

```bash
docker compose up --build --force-recreate
```

## API usage

All examples target the frozen contract. The endpoint is:

```
POST /api/v1/calculate
Content-Type: application/json
```

Health probe:

```bash
curl -s http://localhost:8080/healthz
# → {"status":"ok"}
```

### Happy paths (one per operation)

```bash
# add:        1 + 2 = 3
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"add","a":1,"b":2}'
# → {"result":3,"operation":"add","a":1,"b":2}

# subtract:   10 - 4 = 6
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"subtract","a":10,"b":4}'
# → {"result":6,"operation":"subtract","a":10,"b":4}

# multiply:   6 × 7 = 42
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"multiply","a":6,"b":7}'
# → {"result":42,"operation":"multiply","a":6,"b":7}

# divide:     20 ÷ 4 = 5
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"divide","a":20,"b":4}'
# → {"result":5,"operation":"divide","a":20,"b":4}

# power:      2 ^ 10 = 1024
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"power","a":2,"b":10}'
# → {"result":1024,"operation":"power","a":2,"b":10}

# sqrt (unary):  √16 = 4
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"sqrt","a":16}'
# → {"result":4,"operation":"sqrt","a":16}

# percentage:  "10 percent of 200" = 20
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"percentage","a":10,"b":200}'
# → {"result":20,"operation":"percentage","a":10,"b":200}

# float noise stripped: 0.1 + 0.2 = 0.3 (not 0.30000000000000004)
curl -s http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"add","a":0.1,"b":0.2}'
# → {"result":0.3,"operation":"add","a":0.1,"b":0.2}
```

### Error paths

All errors share the shape `{"error":{"code":"...","message":"..."}}`. Status code and `error.code` per [`docs/API-CONTRACT.md`](docs/API-CONTRACT.md).

```bash
# 400 INVALID_JSON — body is not JSON
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d 'not json'
# → 400  {"error":{"code":"INVALID_JSON","message":"..."}}

# 400 UNKNOWN_OPERATION
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"bogus","a":1,"b":2}'
# → 400  {"error":{"code":"UNKNOWN_OPERATION","message":"..."}}

# 400 MISSING_OPERAND — b required for add
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"add","a":1}'
# → 400  {"error":{"code":"MISSING_OPERAND","message":"..."}}

# 400 INVALID_OPERAND — a is not a number
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"add","a":"one","b":2}'
# → 400  {"error":{"code":"INVALID_OPERAND","message":"..."}}

# 422 DIVISION_BY_ZERO
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"divide","a":1,"b":0}'
# → 422  {"error":{"code":"DIVISION_BY_ZERO","message":"..."}}

# 422 NEGATIVE_SQRT
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"sqrt","a":-9}'
# → 422  {"error":{"code":"NEGATIVE_SQRT","message":"..."}}

# 422 NON_FINITE_RESULT — power overflow → ±Inf
curl -s -o /dev/stderr -w '%{http_code}\n' \
  http://localhost:8080/api/v1/calculate \
  -H 'content-type: application/json' \
  -d '{"operation":"power","a":10,"b":400}'
# → 422  {"error":{"code":"NON_FINITE_RESULT","message":"..."}}
```

The scripted equivalent lives at [`scripts/smoke.sh`](scripts/smoke.sh) and is the integration smoke test.

## Design decisions

Full ADRs live in [`docs/adr/`](docs/adr/). Summary of the load-bearing choices:

- **Single `/api/v1/calculate` endpoint, operation in the body** ([ADR 0001](docs/adr/0001-single-calculate-endpoint.md)). One handler, one validation path, one client method. The 7 operations are verbs, not resources, so the trade reads clean.
- **Backend-authoritative computation with a client-side accumulator** ([ADR 0002](docs/adr/0002-backend-authoritative-accumulator.md)). Every arithmetic result comes from the backend. The frontend tracks a Current Operand + Pending Operation and issues one API call per step. **No operator precedence** — chaining is strictly left-to-right, like a physical four-function calculator (`1 + 2 × 3 = 9`).
- **`422 Unprocessable Entity` for math errors** (div-by-zero, sqrt of negative, non-finite result). `400 Bad Request` is reserved for malformed requests. Well-formed requests that just have no mathematical answer are the classic 422 case.
- **`float64` with ~12-significant-digit rounding.** Strips binary-float noise (`0.1 + 0.2 → 0.3`). NaN and ±Inf never leak as success — they become `NON_FINITE_RESULT` errors.
- **Docker: two services, Nginx front, Go back.** The frontend container is built static + served by Nginx, which reverse-proxies `/api` to the backend container. The browser sees one origin, so CORS is a dev-only safety net. See [`docs/NGINX-EXPECTATIONS.md`](docs/NGINX-EXPECTATIONS.md).

## Tests and coverage

Target: 100% coverage of business code, entrypoints (`main.go`, `main.tsx`) excluded.

### Backend

```bash
cd backend
go test -race -coverpkg=./calculator,./handler -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html
go tool cover -func=coverage.out | tail -1   # total (target: 100%)
```

Coverage report: `backend/coverage.html` (open in browser).

### Frontend

```bash
cd frontend
npm install
npm test                 # Vitest one-shot
npm run test:coverage    # writes coverage/ (HTML + lcov)
```

Coverage report: `frontend/coverage/index.html`.

### Integration smoke test

Requires a running backend at `http://localhost:8080` (either `go run` locally or `docker compose up`).

```bash
./scripts/smoke.sh
# → exits 0 if every operation and every documented error code matches the contract.
```

## Assumptions

- **No operator precedence.** `1 + 2 × 3 = 9`, not 7. Documented in ADR 0002.
- **Percentage = "a percent of b"**: `percentage(10, 200) = 20`. Defined in [`CONTEXT.md`](CONTEXT.md).
- **Numbers are `float64`.** No arbitrary-precision or bignum support.
- **Single browser tab is the whole session.** No auth, no user accounts, no history persistence.
- **Localhost / demo scale.** No rate limiting, no TLS termination — Nginx here is a static server + reverse proxy, not a production edge.
