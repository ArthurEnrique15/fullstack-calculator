import type { BinaryOp } from './types'

export const MAX_INPUT_LEN = 15

export interface CalcState {
  display: string
  previousValue: number | null
  pendingOp: BinaryOp | null
  overwriteNext: boolean
  error: string | null
  isLoading: boolean
}

export const initialState: CalcState = {
  display: '0',
  previousValue: null,
  pendingOp: null,
  overwriteNext: true,
  error: null,
  isLoading: false,
}

export type Action =
  | { type: 'DIGIT'; digit: string }
  | { type: 'DECIMAL' }
  | { type: 'BACKSPACE' }
  | { type: 'CLEAR' }
  | { type: 'SET_PENDING'; op: BinaryOp; value: number }
  | { type: 'CHAIN_OK'; value: number; nextOp: BinaryOp }
  | { type: 'EQUALS_OK'; value: number }
  | { type: 'UNARY_OK'; value: number }
  | { type: 'LOADING' }
  | { type: 'ERROR'; message: string }

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return 'Error'
  const s = String(n)
  return s
}

export function reducer(state: CalcState, action: Action): CalcState {
  switch (action.type) {
    case 'DIGIT': {
      if (state.isLoading) return state
      if (state.error) return state
      const d = action.digit
      if (state.overwriteNext) {
        return { ...state, display: d, overwriteNext: false }
      }
      if (state.display === '0') {
        return { ...state, display: d }
      }
      if (state.display.replace('-', '').length >= MAX_INPUT_LEN) return state
      return { ...state, display: state.display + d }
    }

    case 'DECIMAL': {
      if (state.isLoading || state.error) return state
      if (state.overwriteNext) {
        return { ...state, display: '0.', overwriteNext: false }
      }
      if (state.display.includes('.')) return state
      if (state.display.length >= MAX_INPUT_LEN) return state
      return { ...state, display: state.display + '.' }
    }

    case 'BACKSPACE': {
      if (state.isLoading || state.error || state.overwriteNext) return state
      if (state.display.length <= 1) {
        return { ...state, display: '0', overwriteNext: true }
      }
      return { ...state, display: state.display.slice(0, -1) }
    }

    case 'CLEAR':
      return initialState

    case 'SET_PENDING':
      return {
        ...state,
        previousValue: action.value,
        pendingOp: action.op,
        overwriteNext: true,
        display: formatNumber(action.value),
        error: null,
      }

    case 'CHAIN_OK':
      return {
        display: formatNumber(action.value),
        previousValue: action.value,
        pendingOp: action.nextOp,
        overwriteNext: true,
        error: null,
        isLoading: false,
      }

    case 'EQUALS_OK':
      return {
        display: formatNumber(action.value),
        previousValue: null,
        pendingOp: null,
        overwriteNext: true,
        error: null,
        isLoading: false,
      }

    case 'UNARY_OK':
      return {
        ...state,
        display: formatNumber(action.value),
        overwriteNext: true,
        error: null,
        isLoading: false,
      }

    case 'LOADING':
      return { ...state, isLoading: true, error: null }

    case 'ERROR':
      return {
        display: 'Error',
        previousValue: null,
        pendingOp: null,
        overwriteNext: true,
        error: action.message,
        isLoading: false,
      }
  }
}
