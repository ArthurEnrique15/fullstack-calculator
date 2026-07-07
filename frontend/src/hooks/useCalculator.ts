import { useCallback, useMemo, useReducer, useRef } from 'react'
import { defaultClient, type CalcClient } from '../api'
import { initialState, reducer, type CalcState } from '../accumulator'
import type { BinaryOp, UnaryOp } from '../types'

export interface CalculatorControls {
  inputDigit: (d: string) => void
  inputDecimal: () => void
  clear: () => void
  backspace: () => void
  applyBinaryOp: (op: BinaryOp) => Promise<void>
  equals: () => Promise<void>
  applyUnary: (op: UnaryOp) => Promise<void>
}

export interface CalculatorApi extends CalculatorControls {
  state: CalcState
  controls: CalculatorControls
}

export function useCalculator(client: CalcClient = defaultClient): CalculatorApi {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Refs stay fresh each render so callbacks can read the latest state / client
  // without listing them in dependency arrays — that keeps the callback identities
  // stable and downstream effects (e.g. keyboard listener) attach exactly once.
  const stateRef = useRef(state)
  stateRef.current = state
  const clientRef = useRef(client)
  clientRef.current = client

  const inputDigit = useCallback((d: string) => {
    dispatch({ type: 'DIGIT', digit: d })
  }, [])

  const inputDecimal = useCallback(() => {
    dispatch({ type: 'DECIMAL' })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])

  const backspace = useCallback(() => {
    dispatch({ type: 'BACKSPACE' })
  }, [])

  const applyBinaryOp = useCallback(async (op: BinaryOp) => {
    const s = stateRef.current
    if (s.isLoading || s.error) return
    const current = parseFloat(s.display)
    const canChain =
      s.pendingOp !== null && s.previousValue !== null && !s.overwriteNext
    if (canChain) {
      dispatch({ type: 'LOADING' })
      const res = await clientRef.current.calculate(s.pendingOp!, s.previousValue!, current)
      if (res.ok) dispatch({ type: 'CHAIN_OK', value: res.value, nextOp: op })
      else dispatch({ type: 'ERROR', message: res.message })
      return
    }
    const value = Number.isFinite(current) ? current : 0
    dispatch({ type: 'SET_PENDING', op, value })
  }, [])

  const equals = useCallback(async () => {
    const s = stateRef.current
    if (s.isLoading || s.error) return
    if (s.pendingOp === null || s.previousValue === null) return
    const current = parseFloat(s.display)
    dispatch({ type: 'LOADING' })
    const res = await clientRef.current.calculate(s.pendingOp, s.previousValue, current)
    if (res.ok) dispatch({ type: 'EQUALS_OK', value: res.value })
    else dispatch({ type: 'ERROR', message: res.message })
  }, [])

  const applyUnary = useCallback(async (op: UnaryOp) => {
    const s = stateRef.current
    if (s.isLoading || s.error) return
    const current = parseFloat(s.display)
    dispatch({ type: 'LOADING' })
    const res = await clientRef.current.calculate(op, current)
    if (res.ok) dispatch({ type: 'UNARY_OK', value: res.value })
    else dispatch({ type: 'ERROR', message: res.message })
  }, [])

  const controls = useMemo<CalculatorControls>(
    () => ({ inputDigit, inputDecimal, clear, backspace, applyBinaryOp, equals, applyUnary }),
    [inputDigit, inputDecimal, clear, backspace, applyBinaryOp, equals, applyUnary],
  )

  return {
    state,
    controls,
    inputDigit,
    inputDecimal,
    clear,
    backspace,
    applyBinaryOp,
    equals,
    applyUnary,
  }
}
