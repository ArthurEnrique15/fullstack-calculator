import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Calculator } from '../components/Calculator'
import type { CalcClient } from '../api'
import type { CalcResult, Operation } from '../types'

function stubClient(fn: (op: Operation, a: number, b?: number) => CalcResult): CalcClient {
  return { calculate: vi.fn(async (op, a, b) => fn(op, a, b)) }
}

function key(k: string, opts: Partial<KeyboardEventInit> = {}) {
  fireEvent.keyDown(window, { key: k, ...opts })
}

describe('useKeyboardControls', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 0 }),
    }) as unknown as typeof fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('digits and decimal type into the display', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    key('1')
    key('2')
    key('.')
    key('5')
    expect(screen.getByTestId('display')).toHaveTextContent('12.5')
  })

  it('Enter fires equals through the backend', async () => {
    const client = stubClient(() => ({ ok: true, value: 5 }))
    render(<Calculator client={client} />)
    key('2')
    key('+')
    key('3')
    key('Enter')
    await Promise.resolve()
    await Promise.resolve()
    expect(client.calculate).toHaveBeenCalledWith('add', 2, 3)
  })

  it("'=' key also fires equals", async () => {
    const client = stubClient(() => ({ ok: true, value: 4 }))
    render(<Calculator client={client} />)
    key('2')
    key('+')
    key('2')
    key('=')
    await Promise.resolve()
    await Promise.resolve()
    expect(client.calculate).toHaveBeenCalledWith('add', 2, 2)
  })

  it('Escape and c clear', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    key('9')
    key('Escape')
    expect(screen.getByTestId('display')).toHaveTextContent('0')
    key('9')
    key('c')
    expect(screen.getByTestId('display')).toHaveTextContent('0')
    key('9')
    key('C')
    expect(screen.getByTestId('display')).toHaveTextContent('0')
  })

  it('Backspace deletes the last character', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    key('4')
    key('2')
    key('Backspace')
    expect(screen.getByTestId('display')).toHaveTextContent('4')
  })

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
    ['%', 'percentage'],
  ] as const)('%s routes to %s', async (k, op) => {
    const client = stubClient(() => ({ ok: true, value: 0 }))
    render(<Calculator client={client} />)
    key('5')
    key(k)
    key('3')
    key('=')
    await Promise.resolve()
    await Promise.resolve()
    expect(client.calculate).toHaveBeenCalledWith(op, 5, 3)
  })

  it.each(['x', 'X'])("'%s' also multiplies", async (k) => {
    const client = stubClient(() => ({ ok: true, value: 0 }))
    render(<Calculator client={client} />)
    key('2')
    key(k)
    key('3')
    key('=')
    await Promise.resolve()
    await Promise.resolve()
    expect(client.calculate).toHaveBeenCalledWith('multiply', 2, 3)
  })

  it("'r' triggers sqrt", async () => {
    const client = stubClient(() => ({ ok: true, value: 3 }))
    render(<Calculator client={client} />)
    key('9')
    key('r')
    await Promise.resolve()
    expect(client.calculate).toHaveBeenCalledWith('sqrt', 9)
    key('4')
    key('R')
    await Promise.resolve()
    expect((client.calculate as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe('sqrt')
  })

  it('ignores keys when a modifier is held', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    key('5', { ctrlKey: true })
    key('5', { metaKey: true })
    key('5', { altKey: true })
    expect(screen.getByTestId('display')).toHaveTextContent('0')
  })

  it('ignores unmapped keys', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    key('q')
    key('Tab')
    key('ArrowLeft')
    expect(screen.getByTestId('display')).toHaveTextContent('0')
  })

  it('prevents default on handled keys', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    let prevented = false
    act(() => {
      const evt = new KeyboardEvent('keydown', { key: '/', cancelable: true })
      prevented = !window.dispatchEvent(evt)
    })
    expect(prevented).toBe(true)
  })

  it('removes the listener on unmount', () => {
    const client = stubClient(() => ({ ok: true, value: 0 }))
    const { unmount } = render(<Calculator client={client} />)
    unmount()
    key('5')
    key('Enter')
    expect(client.calculate).not.toHaveBeenCalled()
  })
})
