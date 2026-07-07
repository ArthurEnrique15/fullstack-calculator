import { describe, expect, it } from 'vitest'
import {
  MAX_INPUT_LEN,
  formatNumber,
  initialState,
  reducer,
  type Action,
  type CalcState,
} from '../accumulator'

function apply(state: CalcState, ...actions: Action[]): CalcState {
  return actions.reduce(reducer, state)
}

describe('formatNumber', () => {
  it('returns Error for non-finite', () => {
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('Error')
    expect(formatNumber(Number.NaN)).toBe('Error')
  })

  it('renders finite numbers via String()', () => {
    expect(formatNumber(3)).toBe('3')
    expect(formatNumber(0.3)).toBe('0.3')
    expect(formatNumber(-2.5)).toBe('-2.5')
  })
})

describe('reducer / DIGIT', () => {
  it('replaces display on first digit (overwriteNext)', () => {
    const s = apply(initialState, { type: 'DIGIT', digit: '7' })
    expect(s.display).toBe('7')
    expect(s.overwriteNext).toBe(false)
  })

  it('appends further digits', () => {
    const s = apply(initialState, { type: 'DIGIT', digit: '1' }, { type: 'DIGIT', digit: '2' })
    expect(s.display).toBe('12')
  })

  it("replaces leading '0' with digit (non-overwrite path)", () => {
    const base: CalcState = { ...initialState, display: '0', overwriteNext: false }
    const s = reducer(base, { type: 'DIGIT', digit: '5' })
    expect(s.display).toBe('5')
  })

  it('enforces MAX_INPUT_LEN', () => {
    let s: CalcState = { ...initialState, display: '1', overwriteNext: false }
    for (let i = 0; i < MAX_INPUT_LEN + 5; i++) {
      s = reducer(s, { type: 'DIGIT', digit: '1' })
    }
    expect(s.display.length).toBe(MAX_INPUT_LEN)
  })

  it('ignores digits while loading', () => {
    const s = reducer({ ...initialState, isLoading: true }, { type: 'DIGIT', digit: '9' })
    expect(s.display).toBe('0')
  })

  it('ignores digits after error', () => {
    const s = reducer({ ...initialState, error: 'boom' }, { type: 'DIGIT', digit: '9' })
    expect(s.display).toBe('0')
  })
})

describe('reducer / DECIMAL', () => {
  it('starts a fresh decimal from overwriteNext', () => {
    const s = reducer(initialState, { type: 'DECIMAL' })
    expect(s.display).toBe('0.')
    expect(s.overwriteNext).toBe(false)
  })

  it('appends a decimal to existing input', () => {
    const s = apply(initialState, { type: 'DIGIT', digit: '3' }, { type: 'DECIMAL' })
    expect(s.display).toBe('3.')
  })

  it('does not add a second decimal', () => {
    const s = apply(
      initialState,
      { type: 'DIGIT', digit: '3' },
      { type: 'DECIMAL' },
      { type: 'DIGIT', digit: '1' },
      { type: 'DECIMAL' },
    )
    expect(s.display).toBe('3.1')
  })

  it('respects MAX_INPUT_LEN', () => {
    const long = '1'.repeat(MAX_INPUT_LEN)
    const s = reducer(
      { ...initialState, display: long, overwriteNext: false },
      { type: 'DECIMAL' },
    )
    expect(s.display).toBe(long)
  })

  it('ignores decimal while loading or in error', () => {
    expect(reducer({ ...initialState, isLoading: true }, { type: 'DECIMAL' }).display).toBe('0')
    expect(reducer({ ...initialState, error: 'x' }, { type: 'DECIMAL' }).display).toBe('0')
  })
})

describe('reducer / BACKSPACE', () => {
  it('strips the last character during input', () => {
    const s = apply(
      initialState,
      { type: 'DIGIT', digit: '4' },
      { type: 'DIGIT', digit: '2' },
      { type: 'BACKSPACE' },
    )
    expect(s.display).toBe('4')
  })

  it('collapses to 0 with overwriteNext when only one character remains', () => {
    const s = apply(initialState, { type: 'DIGIT', digit: '7' }, { type: 'BACKSPACE' })
    expect(s.display).toBe('0')
    expect(s.overwriteNext).toBe(true)
  })

  it('is a no-op when nothing has been typed yet', () => {
    const s = reducer(initialState, { type: 'BACKSPACE' })
    expect(s).toBe(initialState)
  })

  it('is a no-op while loading or in error', () => {
    expect(reducer({ ...initialState, isLoading: true }, { type: 'BACKSPACE' }).display).toBe('0')
    expect(reducer({ ...initialState, error: 'x' }, { type: 'BACKSPACE' }).display).toBe('0')
  })
})

describe('reducer / CLEAR', () => {
  it('resets to initial', () => {
    const dirty: CalcState = {
      display: '42',
      previousValue: 10,
      pendingOp: 'add',
      overwriteNext: false,
      error: 'oops',
      isLoading: true,
    }
    expect(reducer(dirty, { type: 'CLEAR' })).toEqual(initialState)
  })
})

describe('reducer / SET_PENDING', () => {
  it('records the operator and previous value', () => {
    const s = reducer(initialState, { type: 'SET_PENDING', op: 'multiply', value: 8 })
    expect(s).toMatchObject({
      previousValue: 8,
      pendingOp: 'multiply',
      display: '8',
      overwriteNext: true,
      error: null,
    })
  })
})

describe('reducer / CHAIN_OK, EQUALS_OK, UNARY_OK', () => {
  it('CHAIN_OK stores result and next op', () => {
    const s = reducer(
      { ...initialState, isLoading: true },
      { type: 'CHAIN_OK', value: 12, nextOp: 'add' },
    )
    expect(s).toMatchObject({
      display: '12',
      previousValue: 12,
      pendingOp: 'add',
      overwriteNext: true,
      isLoading: false,
      error: null,
    })
  })

  it('EQUALS_OK clears pending and stores result', () => {
    const s = reducer(
      { ...initialState, isLoading: true, pendingOp: 'add', previousValue: 5 },
      { type: 'EQUALS_OK', value: 8 },
    )
    expect(s).toMatchObject({
      display: '8',
      previousValue: null,
      pendingOp: null,
      isLoading: false,
    })
  })

  it('UNARY_OK preserves pending operation', () => {
    const s = reducer(
      { ...initialState, pendingOp: 'add', previousValue: 5, display: '9', isLoading: true },
      { type: 'UNARY_OK', value: 3 },
    )
    expect(s.display).toBe('3')
    expect(s.pendingOp).toBe('add')
    expect(s.previousValue).toBe(5)
    expect(s.isLoading).toBe(false)
  })
})

describe('reducer / LOADING & ERROR', () => {
  it('LOADING sets isLoading and clears error', () => {
    const s = reducer({ ...initialState, error: 'old' }, { type: 'LOADING' })
    expect(s.isLoading).toBe(true)
    expect(s.error).toBe(null)
  })

  it("ERROR shows terse 'Error' on display and keeps full message in state", () => {
    const s = reducer(
      { ...initialState, isLoading: true, pendingOp: 'add', previousValue: 5 },
      { type: 'ERROR', message: 'nope' },
    )
    expect(s).toMatchObject({
      display: 'Error',
      previousValue: null,
      pendingOp: null,
      error: 'nope',
      isLoading: false,
      overwriteNext: true,
    })
  })
})
