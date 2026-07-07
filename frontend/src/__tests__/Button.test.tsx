import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalcButton } from '../components/Button'

describe('<CalcButton />', () => {
  it('tags each variant with data-variant', () => {
    render(
      <>
        <CalcButton>digit</CalcButton>
        <CalcButton variant="operator">op</CalcButton>
        <CalcButton variant="accent">accent</CalcButton>
        <CalcButton variant="clear">clear</CalcButton>
      </>,
    )
    expect(screen.getByText('digit')).toHaveAttribute('data-variant', 'digit')
    expect(screen.getByText('op')).toHaveAttribute('data-variant', 'operator')
    expect(screen.getByText('accent')).toHaveAttribute('data-variant', 'accent')
    expect(screen.getByText('clear')).toHaveAttribute('data-variant', 'clear')
  })

  it('supports col-span 2', () => {
    render(<CalcButton span={2}>wide</CalcButton>)
    expect(screen.getByText('wide').className).toMatch(/col-span-2/)
  })

  it('forwards extra className, aria-label, and disabled state', () => {
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
