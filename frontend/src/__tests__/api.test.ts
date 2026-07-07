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

  it('defaults missing binary b to 0', async () => {
    fetchMock.mockResolvedValue(mockResponse({ result: 5 }))
    await calculate('add', 5)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ operation: 'add', a: 5, b: 0 })
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

  it('falls back to UNKNOWN for unrecognized error codes', async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ error: { code: 'MYSTERY', message: 'weird' } }, { status: 400 }),
    )
    const res = await calculate('add', 1, 2)
    if (res.ok) throw new Error('expected error')
    expect(res.code).toBe('UNKNOWN')
    expect(res.message).toBe('weird')
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
