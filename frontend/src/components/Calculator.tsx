import { useCalculator } from '../hooks/useCalculator'
import { useKeyboardControls } from '../hooks/useKeyboardControls'
import type { CalcClient } from '../api'
import { Display } from './Display'
import { ButtonGrid } from './ButtonGrid'
import { ErrorBanner } from './ErrorBanner'

interface Props {
  client?: CalcClient
}

export function Calculator({ client }: Props = {}) {
  const api = useCalculator(client)
  useKeyboardControls(api.controls)
  const { state } = api

  return (
    <div className="w-full max-w-sm mx-auto p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur">
      <header className="mb-4">
        <h1 className="text-sm uppercase tracking-widest text-slate-400 font-display">
          Calculator
        </h1>
      </header>
      <Display
        display={state.display}
        previousValue={state.previousValue}
        pendingOp={state.pendingOp}
        error={state.error}
        isLoading={state.isLoading}
      />
      {state.error && <ErrorBanner message={state.error} />}
      <ButtonGrid api={api} />
    </div>
  )
}
