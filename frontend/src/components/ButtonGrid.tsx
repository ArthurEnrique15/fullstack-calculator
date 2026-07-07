import { CalcButton } from './Button'
import type { CalculatorApi } from '../hooks/useCalculator'

interface Props {
  api: CalculatorApi
}

export function ButtonGrid({ api }: Props) {
  const { inputDigit, inputDecimal, clear, applyBinaryOp, equals, applyUnary, state } = api
  const busy = state.isLoading

  const digit = (d: string) => () => inputDigit(d)

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4">
      <CalcButton variant="clear" onClick={clear} aria-label="clear">
        AC
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyUnary('sqrt')}
        disabled={busy}
        aria-label="square root"
      >
        √
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('power')}
        disabled={busy}
        aria-label="power"
      >
        xʸ
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('divide')}
        disabled={busy}
        aria-label="divide"
      >
        ÷
      </CalcButton>

      <CalcButton onClick={digit('7')} disabled={busy}>7</CalcButton>
      <CalcButton onClick={digit('8')} disabled={busy}>8</CalcButton>
      <CalcButton onClick={digit('9')} disabled={busy}>9</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('multiply')}
        disabled={busy}
        aria-label="multiply"
      >
        ×
      </CalcButton>

      <CalcButton onClick={digit('4')} disabled={busy}>4</CalcButton>
      <CalcButton onClick={digit('5')} disabled={busy}>5</CalcButton>
      <CalcButton onClick={digit('6')} disabled={busy}>6</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('subtract')}
        disabled={busy}
        aria-label="subtract"
      >
        −
      </CalcButton>

      <CalcButton onClick={digit('1')} disabled={busy}>1</CalcButton>
      <CalcButton onClick={digit('2')} disabled={busy}>2</CalcButton>
      <CalcButton onClick={digit('3')} disabled={busy}>3</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('add')}
        disabled={busy}
        aria-label="add"
      >
        +
      </CalcButton>

      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('percentage')}
        disabled={busy}
        aria-label="percentage"
      >
        %
      </CalcButton>
      <CalcButton onClick={digit('0')} disabled={busy}>0</CalcButton>
      <CalcButton onClick={inputDecimal} disabled={busy} aria-label="decimal">
        .
      </CalcButton>
      <CalcButton variant="accent" onClick={equals} disabled={busy} aria-label="equals">
        =
      </CalcButton>
    </div>
  )
}
