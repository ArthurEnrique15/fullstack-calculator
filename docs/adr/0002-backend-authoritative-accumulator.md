# ADR 0002 — Backend-authoritative computation with a client-side accumulator

## Status
Accepted

## Context
The UI is a classic calculator button grid (chosen to demonstrate frontend skill), so users expect to chain operations: `1 + 2 + 3 =`. But the backend performs exactly one binary operation per request, and the assignment requires the backend to be the calculator — the frontend should not compute the "real" arithmetic answer.

These two facts pull against each other: a classic grid implies multi-term expressions and order-of-operations, which would tempt the frontend into doing math locally.

## Decision
The frontend uses an **accumulator** interaction model, and every arithmetic result is **backend-authoritative**:

- The frontend tracks a Current Operand (the display) and a Pending Operation.
- Pressing an operator sends the pending calculation (if any) to the backend, then stores the returned result as the new Current Operand.
- Pressing `=` or a unary operator (`sqrt`) always issues an API call.
- The frontend never evaluates arithmetic itself and never implements operator precedence. Chaining is left-to-right, one backend call per step — exactly like a physical four-function calculator.

## Consequences
- **+** Meets the requirement literally: the backend computes every result.
- **+** No arithmetic logic (or bugs) on the frontend; the frontend's logic is pure state management, which is unit-testable without doing math.
- **+** Keeps the frozen single-op API contract intact — no batch/expression endpoint needed.
- **−** Every `=` / operator press is a network round-trip; latency is visible. Acceptable for a demo and honest to the "backend is the calculator" constraint.
- **−** No operator precedence (`1 + 2 × 3` evaluates left-to-right = 9). This matches physical calculators and is documented as an assumption in the README.
- Reversing this (moving math to the client, or adding an expression endpoint) would change the core architecture of both layers — hence recorded here.
