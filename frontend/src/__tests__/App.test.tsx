import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

describe('<App />', () => {
  it('mounts the calculator', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 0 }),
    }) as unknown as typeof fetch
    render(<App />)
    expect(screen.getByRole('heading', { name: /calculator/i })).toBeInTheDocument()
    expect(screen.getByTestId('display')).toHaveTextContent('0')
  })
})
