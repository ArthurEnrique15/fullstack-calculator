import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalcButton } from '../components/Button'

describe('<CalcButton />', () => {
  it('renders each variant', () => {
    render(
      <>
        <CalcButton>digit</CalcButton>
        <CalcButton variant="operator">op</CalcButton>
        <CalcButton variant="accent">accent</CalcButton>
        <CalcButton variant="clear">clear</CalcButton>
      </>,
    )
    expect(screen.getByText('digit').className).toMatch(/bg-slate-800/)
    expect(screen.getByText('op').className).toMatch(/text-cyan-300/)
    expect(screen.getByText('accent').className).toMatch(/bg-cyan-500/)
    expect(screen.getByText('clear').className).toMatch(/bg-rose-500/)
  })

  it('supports col-span 2', () => {
    render(<CalcButton span={2}>wide</CalcButton>)
    expect(screen.getByText('wide').className).toMatch(/col-span-2/)
  })

  it('forwards extra className and props', () => {
    render(
      <CalcButton className="extra" aria-label="x" disabled>
        z
      </CalcButton>,
    )
    const btn = screen.getByRole('button', { name: 'x' })
    expect(btn).toBeDisabled()
    expect(btn.className).toMatch(/extra/)
  })
})
