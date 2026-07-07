import { CalcButton } from './Button'
import type { CalculatorApi } from '../hooks/useCalculator'

interface Props {
  api: CalculatorApi
}

export function ButtonGrid({ api }: Props) {
  const { inputDigit, inputDecimal, clear, applyBinaryOp, equals, applyUnary, state } = api
  // In an error state everything is locked out except AC — user must reset first.
  const locked = state.isLoading || state.error !== null

  const digit = (d: string) => () => inputDigit(d)

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-4">
      <CalcButton variant="clear" onClick={clear} aria-label="clear">
        AC
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyUnary('sqrt')}
        disabled={locked}
        aria-label="square root"
      >
        √
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('power')}
        disabled={locked}
        aria-label="power"
      >
        xʸ
      </CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('divide')}
        disabled={locked}
        aria-label="divide"
      >
        ÷
      </CalcButton>

      <CalcButton onClick={digit('7')} disabled={locked}>7</CalcButton>
      <CalcButton onClick={digit('8')} disabled={locked}>8</CalcButton>
      <CalcButton onClick={digit('9')} disabled={locked}>9</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('multiply')}
        disabled={locked}
        aria-label="multiply"
      >
        ×
      </CalcButton>

      <CalcButton onClick={digit('4')} disabled={locked}>4</CalcButton>
      <CalcButton onClick={digit('5')} disabled={locked}>5</CalcButton>
      <CalcButton onClick={digit('6')} disabled={locked}>6</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('subtract')}
        disabled={locked}
        aria-label="subtract"
      >
        −
      </CalcButton>

      <CalcButton onClick={digit('1')} disabled={locked}>1</CalcButton>
      <CalcButton onClick={digit('2')} disabled={locked}>2</CalcButton>
      <CalcButton onClick={digit('3')} disabled={locked}>3</CalcButton>
      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('add')}
        disabled={locked}
        aria-label="add"
      >
        +
      </CalcButton>

      <CalcButton
        variant="operator"
        onClick={() => applyBinaryOp('percentage')}
        disabled={locked}
        aria-label="percentage"
      >
        %
      </CalcButton>
      <CalcButton onClick={digit('0')} disabled={locked}>0</CalcButton>
      <CalcButton onClick={inputDecimal} disabled={locked} aria-label="decimal">
        .
      </CalcButton>
      <CalcButton variant="accent" onClick={equals} disabled={locked} aria-label="equals">
        =
      </CalcButton>
    </div>
  )
}
