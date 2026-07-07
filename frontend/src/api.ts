import type { CalcResult, ErrorCode, Operation } from './types'
import { isUnary } from './types'

// Codes the server can send us (per docs/API-CONTRACT.md).
export const SERVER_CODES = [
  'INVALID_JSON',
  'UNKNOWN_OPERATION',
  'MISSING_OPERAND',
  'INVALID_OPERAND',
  'DIVISION_BY_ZERO',
  'NEGATIVE_SQRT',
  'NON_FINITE_RESULT',
] as const satisfies readonly ErrorCode[]

// Codes only the client mints (never seen on the wire).
export const CLIENT_CODES = ['NETWORK_ERROR', 'UNKNOWN'] as const satisfies readonly ErrorCode[]

function toErrorCode(raw: unknown): ErrorCode {
  return typeof raw === 'string' && (SERVER_CODES as readonly string[]).includes(raw)
    ? (raw as ErrorCode)
    : 'UNKNOWN'
}

export interface CalcClient {
  calculate(op: Operation, a: number, b?: number): Promise<CalcResult>
}

export const CALCULATE_ENDPOINT = '/api/v1/calculate'

export async function calculate(op: Operation, a: number, b?: number): Promise<CalcResult> {
  const body: Record<string, unknown> = { operation: op, a }
  if (!isUnary(op)) {
    if (b === undefined) {
      throw new TypeError('operand b required for binary op')
    }
    body.b = b
  }

  let res: Response
  try {
    res = await fetch(CALCULATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return { ok: false, code: 'NETWORK_ERROR', message: 'network error — is the backend running?' }
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return { ok: false, code: 'UNKNOWN', message: `unexpected response (status ${res.status})` }
  }

  if (res.ok && typeof data?.result === 'number') {
    return { ok: true, value: data.result }
  }

  const code = toErrorCode(data?.error?.code)
  const message =
    typeof data?.error?.message === 'string' && data.error.message.length > 0
      ? data.error.message
      : 'calculation failed'
  return { ok: false, code, message }
}

export const defaultClient: CalcClient = { calculate }
