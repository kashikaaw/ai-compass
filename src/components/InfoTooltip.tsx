import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

interface Props {
  /** Accessible label for the trigger icon (not the tooltip body). */
  label: string
  /** Tooltip body content. */
  children: ReactNode
  size?: number
}

/**
 * Small "(i)" trigger that reveals an explanatory popup on hover/focus.
 * Shared pattern used anywhere a first-time user might not know what a
 * label, stat, or button means — extracted so every instance looks and
 * behaves identically instead of each component rolling its own.
 */
export function InfoTooltip({ label, children, size = 13 }: Props) {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={label}>
      <Info size={size} style={{ color: 'var(--md-on-surface-variant)' }} />
      <span
        className="pointer-events-none absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-xl p-2.5 text-left text-[11px] leading-relaxed opacity-0 shadow-lg transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus:pointer-events-auto group-focus:opacity-100"
        style={{ background: 'var(--md-surface-container)', color: 'var(--text)' }}
        role="tooltip"
      >
        {children}
      </span>
    </span>
  )
}
