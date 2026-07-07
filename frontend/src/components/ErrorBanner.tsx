interface Props {
  message: string
}

export function ErrorBanner({ message }: Props) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="error-banner"
      className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-200 p-3 flex gap-3 items-start"
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500/25 text-rose-100 font-display text-sm font-bold"
      >
        !
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-rose-300/80 font-display">
          error
        </div>
        <p
          className="text-sm leading-snug break-words font-display"
          data-testid="error-message"
        >
          {message}
        </p>
        <p className="mt-1 text-[11px] text-rose-300/70 font-display">
          press AC to reset
        </p>
      </div>
    </div>
  )
}
