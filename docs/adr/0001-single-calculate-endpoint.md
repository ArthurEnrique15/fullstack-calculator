# ADR 0001 — Single `/calculate` endpoint instead of per-operation routes

## Status
Accepted

## Context
The API exposes 7 arithmetic operations. Two natural REST shapes:

1. One endpoint `POST /api/v1/calculate` with an `operation` field in the body.
2. One endpoint per operation (`POST /api/v1/add`, `/subtract`, …).

A reviewer might expect option 2, since "a resource per action" reads as more RESTful.

## Decision
Use a single `POST /api/v1/calculate` endpoint; the operation is a field in the request body.

## Consequences
- **+** One HTTP handler, one validation path, one frontend client method. Adding an operation touches a lookup table, not routing/tests/client wiring in three places.
- **+** Uniform request/response and error shape across all operations.
- **−** Slightly less "resourceful" than per-operation routes. These operations are verbs, not resources, so the trade reads fine.
- Changing this later means reworking routing, the frontend client, and all handler tests — hence recording it. The contract is frozen in `docs/API-CONTRACT.md`.
