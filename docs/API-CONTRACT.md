# API Contract (FROZEN)

This is the shared dependency between backend and frontend. **Do not change without re-grilling** — both agents build against it. If a recruited agent believes a change is needed, it must stop and use `grill-with-docs`, not decide unilaterally.

## Endpoint

```
POST /api/v1/calculate
Content-Type: application/json
```

### Request body

```json
{ "operation": "add", "a": 1, "b": 2 }
```

| Field       | Type   | Required        | Notes                                              |
|-------------|--------|-----------------|----------------------------------------------------|
| `operation` | string | yes             | One of: `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `percentage` |
| `a`         | number | yes             | First operand                                      |
| `b`         | number | yes for binary  | Second operand. Omitted/ignored for `sqrt` (unary) |

Operation semantics:

| operation    | arity  | result                     |
|--------------|--------|----------------------------|
| `add`        | binary | a + b                      |
| `subtract`   | binary | a − b                      |
| `multiply`   | binary | a × b                      |
| `divide`     | binary | a ÷ b   (b = 0 → Math Error)|
| `power`      | binary | a ^ b                      |
| `sqrt`       | unary  | √a      (a < 0 → Math Error)|
| `percentage` | binary | (a / 100) × b              |

## Responses

### 200 — success

```json
{ "result": 20, "operation": "percentage", "a": 10, "b": 200 }
```

- `result` is a JSON number.
- Numbers are `float64`. Result is rounded to a sane precision (target: ~12 significant digits) to strip binary-float noise (e.g. `0.1 + 0.2` → `0.3`).
- A non-finite result (NaN, ±Inf) is never returned as success — it becomes a Math Error.

### 400 — Validation Error

Unknown operation, missing required operand, non-numeric operand, malformed JSON, wrong content type.

### 422 — Math Error

Well-formed request, but operation undefined for operands.

### Error body (same shape for 400 and 422)

```json
{ "error": { "code": "DIVISION_BY_ZERO", "message": "cannot divide by zero" } }
```

- `error.code` — stable machine-readable UPPER_SNAKE token. Frontend switches on this.
- `error.message` — human-readable, safe to display.

Error code catalogue (extend as needed, keep stable):

| code                 | status | when                                    |
|----------------------|--------|-----------------------------------------|
| `INVALID_JSON`       | 400    | body is not valid JSON                  |
| `UNKNOWN_OPERATION`  | 400    | `operation` not in the allowed set      |
| `MISSING_OPERAND`    | 400    | required operand absent                 |
| `INVALID_OPERAND`    | 400    | operand not a number                    |
| `DIVISION_BY_ZERO`   | 422    | divide with b = 0                       |
| `NEGATIVE_SQRT`      | 422    | sqrt of a negative number               |
| `NON_FINITE_RESULT`  | 422    | result is NaN or ±Infinity              |
| `INTERNAL_ERROR`     | 500    | unexpected/unclassified server error    |

### 500 — Internal Error

Defensive catch-all. The handler maps each known math error to an explicit `422`
code; anything unrecognized fails loud as `500 INTERNAL_ERROR` (and is logged
server-side) rather than being silently relabeled. Not reachable in normal
operation — it is a bug signal, not a math-error case.

## Health

```
GET /healthz  →  200  { "status": "ok" }
```

## Notes for consumers

- Frontend calls a relative path `/api/v1/calculate`. In dev, Vite proxies to the Go server; in Docker, Nginx reverse-proxies `/api` to the backend. So the browser always sees one origin.
- Backend keeps a narrow, configurable CORS middleware as a safety net (allowed origin via env), even though the proxy setup means it is usually unused.
