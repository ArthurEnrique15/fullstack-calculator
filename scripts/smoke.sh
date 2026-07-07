#!/usr/bin/env bash
# Integration smoke test for the fullstack calculator.
#
# Requires: bash, curl, and either `jq` (preferred) or python3 (fallback).
# Points at a running backend (or Nginx-fronted stack) via BASE_URL.
#
#   ./scripts/smoke.sh                              # defaults to http://localhost:8080
#   BASE_URL=http://localhost:5173 ./scripts/smoke.sh
#
# Every case is cross-checked against docs/API-CONTRACT.md:
#   - HTTP status code
#   - success shape: result / operation / a / b
#   - error shape:   error.code
# Exits 0 if all pass, 1 on first failure (after continuing through the rest for report).

set -u
BASE_URL="${BASE_URL:-http://localhost:8080}"
ENDPOINT="${BASE_URL%/}/api/v1/calculate"
HEALTH="${BASE_URL%/}/healthz"

pass=0
fail=0
failed_cases=()

# --- JSON field extractor: prefer jq, fall back to python3 --------------------
if command -v jq >/dev/null 2>&1; then
  json_get() { jq -r "$2 // empty" <<<"$1"; }
else
  json_get() {
    python3 - "$2" <<PY
import json, sys
path = sys.argv[1].lstrip('.')
try:
    data = json.loads(sys.stdin.read())
except Exception:
    sys.exit(0)
cur = data
for part in path.split('.'):
    if not part:
        continue
    if isinstance(cur, dict) and part in cur:
        cur = cur[part]
    else:
        sys.exit(0)
print(cur if not isinstance(cur, (dict, list)) else json.dumps(cur))
PY
    printf '' <<<"$1" >/dev/null
  }
fi

# --- one HTTP round-trip, capture status + body -------------------------------
# $1 = method, $2 = url, $3 = body (may be empty), $4 = content-type override
http_call() {
  local method="$1" url="$2" body="${3:-}" ctype="${4:-application/json}"
  if [[ -n "$body" ]]; then
    curl -sS -o /tmp/smoke_body.$$ -w '%{http_code}' \
      -X "$method" -H "content-type: $ctype" -d "$body" "$url"
  else
    curl -sS -o /tmp/smoke_body.$$ -w '%{http_code}' -X "$method" "$url"
  fi
  echo   # newline after status
  cat /tmp/smoke_body.$$
  rm -f /tmp/smoke_body.$$
}

# --- assertion primitive ------------------------------------------------------
# $1=name, $2=expected_status, $3=actual_status, $4=expected_field=value pairs (space-sep),
# $5=body
assert_case() {
  local name="$1" want_status="$2" got_status="$3" checks="$4" body="$5"
  local ok=1 reason=""

  if [[ "$want_status" != "$got_status" ]]; then
    ok=0; reason="status want=$want_status got=$got_status"
  else
    IFS=';' read -ra parts <<<"$checks"
    for kv in "${parts[@]}"; do
      [[ -z "$kv" ]] && continue
      local path="${kv%%=*}" want="${kv#*=}"
      local got; got="$(json_get "$body" "$path")"
      if [[ "$got" != "$want" ]]; then
        ok=0; reason="$path want=$want got=$got"; break
      fi
    done
  fi

  if (( ok )); then
    echo "  PASS  $name"
    pass=$((pass+1))
  else
    echo "  FAIL  $name — $reason"
    echo "        body: $body"
    fail=$((fail+1))
    failed_cases+=("$name")
  fi
}

# --- run one case: (name, method, url, body, want_status, checks) -------------
run_case() {
  local name="$1" method="$2" url="$3" body="$4" want_status="$5" checks="$6"
  local out status resp_body
  out="$(http_call "$method" "$url" "$body")"
  status="$(head -n1 <<<"$out")"
  resp_body="$(tail -n +2 <<<"$out")"
  assert_case "$name" "$want_status" "$status" "$checks" "$resp_body"
}

echo "Smoke test → $BASE_URL"
echo

# ─── Health ───────────────────────────────────────────────────────────────────
echo "Health"
run_case "GET /healthz" GET "$HEALTH" "" 200 ".status=ok"
echo

# ─── Happy paths ──────────────────────────────────────────────────────────────
echo "Success cases"
run_case "add 1+2=3"           POST "$ENDPOINT" '{"operation":"add","a":1,"b":2}'            200 ".result=3;.operation=add"
run_case "subtract 10-4=6"     POST "$ENDPOINT" '{"operation":"subtract","a":10,"b":4}'      200 ".result=6;.operation=subtract"
run_case "multiply 6*7=42"     POST "$ENDPOINT" '{"operation":"multiply","a":6,"b":7}'       200 ".result=42;.operation=multiply"
run_case "divide 20/4=5"       POST "$ENDPOINT" '{"operation":"divide","a":20,"b":4}'        200 ".result=5;.operation=divide"
run_case "power 2^10=1024"     POST "$ENDPOINT" '{"operation":"power","a":2,"b":10}'         200 ".result=1024;.operation=power"
run_case "sqrt 16=4"           POST "$ENDPOINT" '{"operation":"sqrt","a":16}'                200 ".result=4;.operation=sqrt"
run_case "percentage 10 of 200=20" POST "$ENDPOINT" '{"operation":"percentage","a":10,"b":200}' 200 ".result=20;.operation=percentage"
run_case "float noise 0.1+0.2=0.3" POST "$ENDPOINT" '{"operation":"add","a":0.1,"b":0.2}'    200 ".result=0.3"
echo

# ─── 400 Validation ───────────────────────────────────────────────────────────
echo "400 Validation errors"
run_case "invalid JSON"        POST "$ENDPOINT" 'not json'                                  400 ".error.code=INVALID_JSON"
run_case "unknown operation"   POST "$ENDPOINT" '{"operation":"bogus","a":1,"b":2}'         400 ".error.code=UNKNOWN_OPERATION"
run_case "missing operand b"   POST "$ENDPOINT" '{"operation":"add","a":1}'                 400 ".error.code=MISSING_OPERAND"
run_case "invalid operand a"   POST "$ENDPOINT" '{"operation":"add","a":"one","b":2}'       400 ".error.code=INVALID_OPERAND"
echo

# ─── 422 Math ─────────────────────────────────────────────────────────────────
echo "422 Math errors"
run_case "divide by zero"      POST "$ENDPOINT" '{"operation":"divide","a":1,"b":0}'        422 ".error.code=DIVISION_BY_ZERO"
run_case "sqrt negative"       POST "$ENDPOINT" '{"operation":"sqrt","a":-9}'               422 ".error.code=NEGATIVE_SQRT"
run_case "power overflow"      POST "$ENDPOINT" '{"operation":"power","a":10,"b":1000}'     422 ".error.code=NON_FINITE_RESULT"
echo

# ─── Report ───────────────────────────────────────────────────────────────────
echo "──────────────────────────────────────────"
echo "PASS: $pass    FAIL: $fail"
if (( fail > 0 )); then
  echo "Failed cases:"
  for c in "${failed_cases[@]}"; do echo "  - $c"; done
  exit 1
fi
