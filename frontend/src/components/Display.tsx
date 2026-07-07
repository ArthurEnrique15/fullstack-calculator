import type { BinaryOp } from '../types'

const OP_SYMBOL: Record<BinaryOp, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: 'xʸ',
  percentage: '%',
}

interface DisplayProps {
  display: string
  previousValue: number | null
  pendingOp: BinaryOp | null
  error: string | null
  isLoading: boolean
}

export function Display({ display, previousValue, pendingOp, error, isLoading }: DisplayProps) {
  const pendingText =
    pendingOp !== null && previousValue !== null
      ? `${String(previousValue)} ${OP_SYMBOL[pendingOp]}`
      : ' '

  const shellClass = error
    ? 'border-rose-500/50 bg-rose-950/30'
    : 'border-slate-800 bg-slate-950/60'

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-4 text-right shadow-inner ${shellClass}`}
    >
      <div
        className="h-5 text-sm text-slate-400 truncate font-display"
        data-testid="pending-indicator"
      >
        {pendingText}
      </div>
      <div
        className={`h-14 flex items-center justify-end font-display tabular-nums text-3xl sm:text-4xl truncate ${
          error ? 'text-rose-300' : 'text-slate-50'
        } ${isLoading ? 'opacity-60' : ''}`}
        data-testid="display"
      >
        {display}
      </div>
    </div>
  )
}
