# Backend — Fullstack Calculator

Go REST microservice for the calculator. Implements the frozen
[`docs/API-CONTRACT.md`](../docs/API-CONTRACT.md).

## Layout

```
backend/
├── calculator/    # pure domain: one function per op, typed math errors, rounding
├── handler/       # HTTP: parse/validate, format success + error JSON per contract
├── main.go        # wiring: routes, CORS middleware, env config (excluded from coverage)
├── go.mod
└── Dockerfile     # multi-stage → distroless static; exposes :8080
```

## Configuration

| Env var          | Default | Notes                               |
|------------------|---------|-------------------------------------|
| `PORT`           | `8080`  | Server port.                        |
| `ALLOWED_ORIGIN` | `*`     | CORS `Access-Control-Allow-Origin`. |

## Run locally

```sh
go run ./...
# or
PORT=9000 ALLOWED_ORIGIN=http://localhost:5173 go run .
```

## Test + coverage

```sh
go test ./...
go test -race -coverpkg=./calculator,./handler -coverprofile=coverage.out ./...
go tool cover -func=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

Coverage target: **100% of `calculator` + `handler`**. `main.go` is excluded per the roadmap allowance for entrypoints. Reported: 100.0%.

## Docker

```sh
docker build -t fullstack-calc-backend .
docker run --rm -p 8080:8080 fullstack-calc-backend
```

## Sanity checks

```sh
curl -s http://localhost:8080/healthz
# {"status":"ok"}

curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"operation":"add","a":0.1,"b":0.2}' \
  http://localhost:8080/api/v1/calculate
# {"result":0.3,"operation":"add","a":0.1,"b":0.2}

curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"operation":"divide","a":1,"b":0}' \
  http://localhost:8080/api/v1/calculate
# {"error":{"code":"DIVISION_BY_ZERO","message":"cannot divide by zero"}}
```
