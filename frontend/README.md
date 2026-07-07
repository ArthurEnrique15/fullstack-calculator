# frontend

React + TypeScript + Vite + Tailwind. Classic calculator UI that speaks to the Go backend on `/api/v1/calculate`.

## Run locally

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173
```

Vite dev server proxies `/api` → `http://localhost:8080` (the Go backend). Start the backend on that port before hitting `=`.

## Tests + coverage

```bash
npm test              # single run
npm run test:watch    # watch
npm run test:coverage # v8 coverage report → coverage/index.html
```

Global thresholds: 100% lines / statements / functions; 95% branches. `main.tsx` and `__tests__/**` are excluded from the report per the roadmap.

## Build

```bash
npm run build     # dist/
npm run preview   # serve dist/ locally
```

## Docker

```bash
docker build -t calculator-frontend .
docker run --rm -p 8081:80 calculator-frontend
```

The container serves the built SPA on port 80 and reverse-proxies `/api` and `/healthz` to the `backend` service (docker-compose service name). Use with the sibling `backend/` image via the root `docker-compose.yml`.

## Layout

- `src/api.ts` — typed `calculate(op, a, b?)` client; returns a discriminated `CalcResult`.
- `src/accumulator.ts` — pure state reducer (see `docs/adr/0002`).
- `src/hooks/useCalculator.ts` — reducer wrapper; the only module that `await`s the API.
- `src/hooks/useKeyboardControls.ts` — window keydown listener that routes into the same handlers as the button grid.
- `src/components/` — `Display`, `Button`, `ButtonGrid`, and the `Calculator` container.

## Keyboard

| key | action |
|---|---|
| `0`-`9` | digit |
| `.` | decimal |
| `+` `-` `*`/`x` `/` `^` `%` | binary operators |
| `r` | √ |
| `Enter` or `=` | evaluate |
| `Escape` or `c` | AC |
| `Backspace` | delete last input character |
