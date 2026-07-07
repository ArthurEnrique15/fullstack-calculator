import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'digit' | 'operator' | 'accent' | 'clear'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  span?: 1 | 2
  children: ReactNode
}

const styles: Record<Variant, string> = {
  digit: 'bg-slate-800 hover:bg-slate-700 text-slate-50 active:bg-slate-600',
  operator: 'bg-slate-700 hover:bg-slate-600 text-cyan-300 active:bg-slate-500',
  accent: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 active:bg-cyan-600',
  clear: 'bg-rose-500/90 hover:bg-rose-400 text-slate-950 active:bg-rose-600',
}

export function CalcButton({
  variant = 'digit',
  span = 1,
  className = '',
  children,
  ...rest
}: Props) {
  const spanClass = span === 2 ? 'col-span-2' : ''
  return (
    <button
      type="button"
      data-variant={variant}
      className={`${styles[variant]} ${spanClass} rounded-xl h-14 sm:h-16 text-lg sm:text-xl font-display font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
