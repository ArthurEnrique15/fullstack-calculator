import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCalculator } from '../hooks/useCalculator'
import type { CalcClient } from '../api'
import type { CalcResult, Operation } from '../types'

function makeClient(handler: (op: Operation, a: number, b?: number) => CalcResult): {
  client: CalcClient
  calls: Array<{ op: Operation; a: number; b?: number }>
} {
  const calls: Array<{ op: Operation; a: number; b?: number }> = []
  const client: CalcClient = {
    calculate: vi.fn(async (op, a, b) => {
      calls.push({ op, a, b })
      return handler(op, a, b)
    }),
  }
  return { client, calls }
}

function deferredClient() {
  let resolveFn!: (r: CalcResult) => void
  const p = new Promise<CalcResult>((res) => {
    resolveFn = res
  })
  const client: CalcClient = { calculate: vi.fn(() => p) }
  return { client, resolve: resolveFn! }
}

describe('useCalculator', () => {
  it('inputs digits and decimal', () => {
    const { client } = makeClient(() => ({ ok: true, value: 0 }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => {
      result.current.inputDigit('1')
      result.current.inputDigit('2')
      result.current.inputDecimal()
      result.current.inputDigit('5')
    })
    expect(result.current.state.display).toBe('12.5')
  })

  it('clear resets state', () => {
    const { client } = makeClient(() => ({ ok: true, value: 0 }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => {
      result.current.inputDigit('9')
    })
    act(() => {
      result.current.clear()
    })
    expect(result.current.state.display).toBe('0')
  })

  it('applyBinaryOp with no pending records the operator without a backend call', async () => {
    const { client, calls } = makeClient(() => ({ ok: true, value: 999 }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => {
      result.current.inputDigit('5')
    })
    await act(async () => {
      await result.current.applyBinaryOp('add')
    })
    expect(calls).toEqual([])
    expect(result.current.state.pendingOp).toBe('add')
    expect(result.current.state.previousValue).toBe(5)
    expect(result.current.state.overwriteNext).toBe(true)
  })

  it('chains 5 + 3 + 2 = via backend (accumulator model)', async () => {
    let call = 0
    const { client, calls } = makeClient(() => {
      call++
      return call === 1 ? { ok: true, value: 8 } : { ok: true, value: 10 }
    })
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('5'))
    await act(async () => result.current.applyBinaryOp('add'))
    act(() => result.current.inputDigit('3'))
    await act(async () => result.current.applyBinaryOp('add'))
    expect(result.current.state.display).toBe('8')
    act(() => result.current.inputDigit('2'))
    await act(async () => result.current.equals())
    expect(result.current.state.display).toBe('10')
    expect(calls).toEqual([
      { op: 'add', a: 5, b: 3 },
      { op: 'add', a: 8, b: 2 },
    ])
    expect(result.current.state.pendingOp).toBe(null)
  })

  it('chain error path surfaces the message', async () => {
    let n = 0
    const { client } = makeClient(() => {
      n++
      return n === 1
        ? { ok: true, value: 5 }
        : { ok: false, code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' }
    })
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('1'))
    await act(async () => result.current.applyBinaryOp('add'))
    act(() => result.current.inputDigit('4'))
    await act(async () => result.current.applyBinaryOp('divide'))
    expect(result.current.state.display).toBe('5')
    act(() => result.current.inputDigit('0'))
    await act(async () => result.current.applyBinaryOp('add'))
    expect(result.current.state.error).toBe('cannot divide by zero')
  })

  it('applyBinaryOp on backend error surfaces the message', async () => {
    const { client } = makeClient(() => ({
      ok: false,
      code: 'DIVISION_BY_ZERO',
      message: 'cannot divide by zero',
    }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('4'))
    await act(async () => result.current.applyBinaryOp('divide'))
    act(() => result.current.inputDigit('0'))
    await act(async () => result.current.equals())
    expect(result.current.state.error).toBe('cannot divide by zero')
    expect(result.current.state.display).toBe('Error')
  })

  it('applyBinaryOp during error is a no-op', async () => {
    const { client, calls } = makeClient(() => ({
      ok: false,
      code: 'DIVISION_BY_ZERO',
      message: 'nope',
    }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('1'))
    await act(async () => result.current.applyBinaryOp('divide'))
    act(() => result.current.inputDigit('0'))
    await act(async () => result.current.equals())
    // now error state
    await act(async () => result.current.applyBinaryOp('add'))
    await act(async () => result.current.equals())
    await act(async () => result.current.applyUnary('sqrt'))
    expect(calls.length).toBe(1)
  })

  it('equals with no pending is a no-op', async () => {
    const { client, calls } = makeClient(() => ({ ok: true, value: 0 }))
    const { result } = renderHook(() => useCalculator(client))
    await act(async () => result.current.equals())
    expect(calls).toEqual([])
  })

  it('applyUnary sends sqrt with only a', async () => {
    const { client, calls } = makeClient(() => ({ ok: true, value: 3 }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('9'))
    await act(async () => result.current.applyUnary('sqrt'))
    expect(calls.length).toBe(1)
    expect(calls[0].op).toBe('sqrt')
    expect(calls[0].a).toBe(9)
    expect(result.current.state.display).toBe('3')
  })

  it('applyUnary surfaces backend error', async () => {
    const { client } = makeClient(() => ({
      ok: false,
      code: 'NEGATIVE_SQRT',
      message: 'sqrt of negative',
    }))
    const { result } = renderHook(() => useCalculator(client))
    act(() => result.current.inputDigit('4'))
    await act(async () => result.current.applyUnary('sqrt'))
    expect(result.current.state.error).toBe('sqrt of negative')
  })

  it('guards new ops while a call is in flight', async () => {
    const first = deferredClient()
    const { result } = renderHook(() => useCalculator(first.client))
    act(() => result.current.inputDigit('5'))
    await act(async () => result.current.applyBinaryOp('add'))
    act(() => result.current.inputDigit('3'))
    // start the first backend call (chain)
    let inflight: Promise<void>
    act(() => {
      inflight = result.current.equals()
    })
    // still loading — attempt other ops
    await act(async () => result.current.applyBinaryOp('add'))
    await act(async () => result.current.equals())
    await act(async () => result.current.applyUnary('sqrt'))
    expect(first.client.calculate).toHaveBeenCalledTimes(1)
    // release
    await act(async () => {
      first.resolve({ ok: true, value: 8 })
      await inflight
    })
    expect(result.current.state.display).toBe('8')
  })
})
