import { useEffect, useRef } from 'react'
import type { CalculatorControls } from './useCalculator'
import type { BinaryOp } from '../types'

const BINARY_KEY_MAP: Record<string, BinaryOp> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  x: 'multiply',
  X: 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percentage',
}

const DIGITS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

export function useKeyboardControls(controls: CalculatorControls) {
  const ref = useRef(controls)
  ref.current = controls

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const c = ref.current
      const k = e.key

      if (DIGITS.has(k)) {
        e.preventDefault()
        c.inputDigit(k)
        return
      }

      if (k === '.') {
        e.preventDefault()
        c.inputDecimal()
        return
      }

      if (k === 'Enter' || k === '=') {
        e.preventDefault()
        void c.equals()
        return
      }

      if (k === 'Escape' || k === 'c' || k === 'C') {
        e.preventDefault()
        c.clear()
        return
      }

      if (k === 'Backspace') {
        e.preventDefault()
        c.backspace()
        return
      }

      if (k === 'r' || k === 'R') {
        e.preventDefault()
        void c.applyUnary('sqrt')
        return
      }

      const binary = BINARY_KEY_MAP[k]
      if (binary) {
        e.preventDefault()
        void c.applyBinaryOp(binary)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
