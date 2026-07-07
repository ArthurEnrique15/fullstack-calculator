import { useCallback, useReducer } from 'react'
import { defaultClient, type CalcClient } from '../api'
import { initialState, reducer } from '../accumulator'
import type { BinaryOp, UnaryOp } from '../types'

export function useCalculator(client: CalcClient = defaultClient) {
  const [state, dispatch] = useReducer(reducer, initialState)

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

  const applyBinaryOp = useCallback(
    async (op: BinaryOp) => {
      if (state.isLoading || state.error) return
      const current = parseFloat(state.display)
      const canChain =
        state.pendingOp !== null && state.previousValue !== null && !state.overwriteNext
      if (canChain) {
        dispatch({ type: 'LOADING' })
        const res = await client.calculate(state.pendingOp!, state.previousValue!, current)
        if (res.ok) dispatch({ type: 'CHAIN_OK', value: res.value, nextOp: op })
        else dispatch({ type: 'ERROR', message: res.message })
        return
      }
      const value = Number.isFinite(current) ? current : 0
      dispatch({ type: 'SET_PENDING', op, value })
    },
    [state, client],
  )

  const equals = useCallback(async () => {
    if (state.isLoading || state.error) return
    if (state.pendingOp === null || state.previousValue === null) return
    const current = parseFloat(state.display)
    dispatch({ type: 'LOADING' })
    const res = await client.calculate(state.pendingOp, state.previousValue, current)
    if (res.ok) dispatch({ type: 'EQUALS_OK', value: res.value })
    else dispatch({ type: 'ERROR', message: res.message })
  }, [state, client])

  const applyUnary = useCallback(
    async (op: UnaryOp) => {
      if (state.isLoading || state.error) return
      const current = parseFloat(state.display)
      dispatch({ type: 'LOADING' })
      const res = await client.calculate(op, current)
      if (res.ok) dispatch({ type: 'UNARY_OK', value: res.value })
      else dispatch({ type: 'ERROR', message: res.message })
    },
    [state, client],
  )

  return {
    state,
    inputDigit,
    inputDecimal,
    clear,
    backspace,
    applyBinaryOp,
    equals,
    applyUnary,
  }
}

export type CalculatorApi = ReturnType<typeof useCalculator>
