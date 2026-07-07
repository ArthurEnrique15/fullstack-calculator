import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Calculator } from '../components/Calculator'
import type { CalcClient } from '../api'
import type { CalcResult, Operation } from '../types'

function stubClient(fn: (op: Operation, a: number, b?: number) => CalcResult): CalcClient {
  return { calculate: vi.fn(async (op, a, b) => fn(op, a, b)) }
}

async function press(label: string) {
  await userEvent.click(screen.getByRole('button', { name: label }))
}

describe('<Calculator />', () => {
  it('renders default display of 0 and all key operators', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    expect(screen.getByTestId('display')).toHaveTextContent('0')
    ;['clear', 'square root', 'power', 'divide', 'multiply', 'subtract', 'add', 'percentage', 'equals', 'decimal'].forEach(
      (name) => {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      },
    )
  })

  it('shows a digit press on the display', async () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    await press('7')
    expect(screen.getByTestId('display')).toHaveTextContent('7')
  })

  it('performs a full add cycle via backend and shows pending indicator', async () => {
    const client = stubClient(() => ({ ok: true, value: 8 }))
    render(<Calculator client={client} />)
    await press('5')
    await press('add')
    // pending indicator should show 5 +
    expect(screen.getByTestId('pending-indicator')).toHaveTextContent('5 +')
    await press('3')
    await press('equals')
    expect(screen.getByTestId('display')).toHaveTextContent('8')
    expect(client.calculate).toHaveBeenCalledWith('add', 5, 3)
  })

  it('renders a banner with the backend error message and keeps the display terse', async () => {
    const client = stubClient(() => ({
      ok: false,
      code: 'DIVISION_BY_ZERO',
      message: 'cannot divide by zero',
    }))
    render(<Calculator client={client} />)
    await press('1')
    await press('divide')
    await press('0')
    await press('equals')
    expect(screen.getByTestId('display')).toHaveTextContent('Error')
    const banner = screen.getByTestId('error-banner')
    expect(banner).toHaveTextContent('cannot divide by zero')
    expect(banner).toHaveTextContent(/press ac to reset/i)
    expect(banner.getAttribute('role')).toBe('alert')
  })

  it('wraps long error messages instead of overflowing the display', async () => {
    const long = 'unexpected response (status 500) — the backend appears to be offline'
    const client = stubClient(() => ({ ok: false, code: 'UNKNOWN', message: long }))
    render(<Calculator client={client} />)
    await press('1')
    await press('add')
    await press('2')
    await press('equals')
    expect(screen.getByTestId('display')).toHaveTextContent('Error')
    const msg = screen.getByTestId('error-message')
    expect(msg).toHaveTextContent(long)
    expect(msg.className).toMatch(/break-words/)
  })

  it('AC clears the error banner and resets the display', async () => {
    const client = stubClient(() => ({
      ok: false,
      code: 'NEGATIVE_SQRT',
      message: 'sqrt of negative',
    }))
    render(<Calculator client={client} />)
    await press('1')
    await press('subtract')
    await press('9')
    await press('equals')
    expect(screen.getByTestId('error-banner')).toHaveTextContent('sqrt of negative')
    await press('clear')
    expect(screen.getByTestId('display')).toHaveTextContent('0')
    expect(screen.queryByTestId('error-banner')).toBeNull()
  })

  it('unary sqrt runs through backend', async () => {
    const client = stubClient(() => ({ ok: true, value: 3 }))
    render(<Calculator client={client} />)
    await press('9')
    await press('square root')
    expect(client.calculate).toHaveBeenCalledWith('sqrt', 9)
    expect(screen.getByTestId('display')).toHaveTextContent('3')
  })

  it('percentage flows as a binary operator', async () => {
    const client = stubClient(() => ({ ok: true, value: 20 }))
    render(<Calculator client={client} />)
    await press('1')
    await press('0')
    await press('percentage')
    await press('2')
    await press('0')
    await press('0')
    await press('equals')
    expect(client.calculate).toHaveBeenCalledWith('percentage', 10, 200)
    expect(screen.getByTestId('display')).toHaveTextContent('20')
  })

  it('renders decimals correctly and skips duplicate decimal', async () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    await press('3')
    await press('decimal')
    await press('1')
    await press('decimal')
    await press('4')
    expect(screen.getByTestId('display')).toHaveTextContent('3.14')
  })

  it('shows empty pending indicator when nothing pending', () => {
    render(<Calculator client={stubClient(() => ({ ok: true, value: 0 }))} />)
    expect(screen.getByTestId('pending-indicator').textContent?.trim()).toBe('')
  })

  it('exercises every digit and operator button', async () => {
    const client = stubClient(() => ({ ok: true, value: 42 }))
    render(<Calculator client={client} />)
    for (const d of ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      await press(d)
    }
    for (const op of ['multiply', 'power', 'subtract', 'add', 'divide']) {
      await press(op)
      await press('1')
    }
    await press('equals')
    expect(client.calculate).toHaveBeenCalled()
  })

  it('uses defaultClient when no prop given', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ result: 4 }) })
    globalThis.fetch = fetchMock as unknown as typeof fetch
    render(<Calculator />)
    await press('2')
    await press('add')
    await press('2')
    await press('equals')
    expect(fetchMock).toHaveBeenCalled()
    const display = screen.getByTestId('display')
    expect(within(display).getByText('4')).toBeInTheDocument()
  })
})
