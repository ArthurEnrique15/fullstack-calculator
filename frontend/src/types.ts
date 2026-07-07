export type BinaryOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percentage'
export type UnaryOp = 'sqrt'
export type Operation = BinaryOp | UnaryOp

export type ErrorCode =
  | 'INVALID_JSON'
  | 'UNKNOWN_OPERATION'
  | 'MISSING_OPERAND'
  | 'INVALID_OPERAND'
  | 'DIVISION_BY_ZERO'
  | 'NEGATIVE_SQRT'
  | 'NON_FINITE_RESULT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export type CalcResult =
  | { ok: true; value: number }
  | { ok: false; code: ErrorCode; message: string }

export const BINARY_OPS: BinaryOp[] = ['add', 'subtract', 'multiply', 'divide', 'power', 'percentage']
export const UNARY_OPS: UnaryOp[] = ['sqrt']

export function isUnary(op: Operation): op is UnaryOp {
  return (UNARY_OPS as Operation[]).includes(op)
}
