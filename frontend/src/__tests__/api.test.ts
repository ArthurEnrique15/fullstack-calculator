import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate, CALCULATE_ENDPOINT, defaultClient } from '../api'

function mockResponse(body: unknown, init: { status?: number; ok?: boolean } = {}) {
  const status = init.status ?? 200
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    json: async () => body,
  } as unknown as Response
}

describe('api.calculate', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    globalThis.fetch = fetchMock as unknown as typeof fetch
    fetchMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends binary body with a and b', async () => {
    fetchMock.mockResolvedValue(mockResponse({ result: 3, operation: 'add', a: 1, b: 2 }))
    const res = await calculate('add', 1, 2)
    expect(res).toEqual({ ok: true, value: 3 })
    expect(fetchMock).toHaveBeenCalledWith(
      CALCULATE_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'add', a: 1, b: 2 }),
      }),
    )
  })

  it('sends unary body without b for sqrt', async () => {
    fetchMock.mockResolvedValue(mockResponse({ result: 3 }))
    const res = await calculate('sqrt', 9)
    expect(res).toEqual({ ok: true, value: 3 })
    const call = fetchMock.mock.calls[0]
    expect(JSON.parse(call[1].body)).toEqual({ operation: 'sqrt', a: 9 })
  })

  it('throws TypeError when a binary op is called without b', async () => {
    await expect(calculate('add', 5)).rejects.toThrow(TypeError)
    await expect(calculate('add', 5)).rejects.toThrow(/operand b required/i)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 400 validation error into typed CalcResult', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        { error: { code: 'UNKNOWN_OPERATION', message: 'unknown operation' } },
        { status: 400 },
      ),
    )
    const res = await calculate('add', 1, 2)
    expect(res).toEqual({ ok: false, code: 'UNKNOWN_OPERATION', message: 'unknown operation' })
  })

  it('maps 422 math error into typed CalcResult', async () => {
    fetchMock.mockResolvedValue(
      mockResponse(
        { error: { code: 'DIVISION_BY_ZERO', message: 'cannot divide by zero' } },
        { status: 422 },
      ),
    )
    const res = await calculate('divide', 1, 0)
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.code).toBe('DIVISION_BY_ZERO')
      expect(res.message).toBe('cannot divide by zero')
    }
  })

  it('narrows unknown server codes (even client-only codes) to UNKNOWN', async () => {
    // A code the backend has no business sending — must be treated as UNKNOWN.
    fetchMock.mockResolvedValue(
      mockResponse({ error: { code: 'MYSTERY', message: 'weird' } }, { status: 400 }),
    )
    let res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('UNKNOWN')
    expect(res.message).toBe('weird')

    // Client-only codes must not be accepted from the server either.
    fetchMock.mockResolvedValue(
      mockResponse({ error: { code: 'NETWORK_ERROR', message: 'x' } }, { status: 400 }),
    )
    res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('UNKNOWN')
  })

  it('falls back to default message when error message missing', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: { code: 'DIVISION_BY_ZERO' } }, { status: 422 }))
    const res = await calculate('divide', 1, 0)
    if (res.ok) throw new Error('expected error')
    expect(res.message).toBe('calculation failed')
  })

  it('returns UNKNOWN when body is not valid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('bad json')
      },
    } as unknown as Response)
    const res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('UNKNOWN')
    expect(res.message).toContain('500')
  })

  it('returns NETWORK_ERROR when fetch throws', async () => {
    fetchMock.mockRejectedValue(new TypeError('boom'))
    const res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('NETWORK_ERROR')
  })

  it('treats non-numeric result as error', async () => {
    fetchMock.mockResolvedValue(mockResponse({ result: 'nope' }))
    const res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('UNKNOWN')
  })

  it('defaultClient.calculate delegates to calculate()', async () => {
    fetchMock.mockResolvedValue(mockResponse({ result: 4 }))
    const res = await defaultClient.calculate('add', 2, 2)
    expect(res).toEqual({ ok: true, value: 4 })
  })
})
