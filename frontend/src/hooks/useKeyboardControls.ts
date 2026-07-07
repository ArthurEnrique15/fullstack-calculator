import { useEffect } from 'react'
import type { CalculatorApi } from './useCalculator'
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

export function useKeyboardControls(api: CalculatorApi) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const k = e.key

      if (DIGITS.has(k)) {
        e.preventDefault()
        api.inputDigit(k)
        return
      }

      if (k === '.') {
        e.preventDefault()
        api.inputDecimal()
        return
      }

      if (k === 'Enter' || k === '=') {
        e.preventDefault()
        void api.equals()
        return
      }

      if (k === 'Escape' || k === 'c' || k === 'C') {
        e.preventDefault()
        api.clear()
        return
      }

      if (k === 'Backspace') {
        e.preventDefault()
        api.backspace()
        return
      }

      if (k === 'r' || k === 'R') {
        e.preventDefault()
        void api.applyUnary('sqrt')
        return
      }

      const binary = BINARY_KEY_MAP[k]
      if (binary) {
        e.preventDefault()
        void api.applyBinaryOp(binary)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [api])
}
