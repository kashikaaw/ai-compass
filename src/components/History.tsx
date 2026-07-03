import { motion, AnimatePresence } from 'framer-motion'
import { History as HistoryIcon, Trash2, CornerDownLeft } from 'lucide-react'
import type { HistoryItem, SessionTotal } from '../lib/hooks'
import { SESSION_MODEL } from '../lib/hooks'
import { formatUSD } from '../lib/pricing'
import { InfoTooltip } from './InfoTooltip'

interface Props {
  items: HistoryItem[]
  onSelect: (text: string) => void
  onClear: () => void
  sessionTotal: SessionTotal
  /** Whether cloud sign-in is available at all (Supabase configured). */
  authConfigured?: boolean
}

export function History({ items, onSelect, onClear, sessionTotal, authConfigured }: Props) {
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          <HistoryIcon size={15} style={{ color: 'var(--md-on-surface-variant)' }} />
          Recent prompts
          <InfoTooltip label="What this list is">
            Prompts you've analyzed on this device, saved so you can revisit or reuse them —
            click one to load it back in.
            {authConfigured &&
              ' Sign in (top right) to keep this list, and your running total below, across every device instead of just this browser.'}
          </InfoTooltip>
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="md-ghost md-focus inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium"
          style={{ color: 'var(--md-primary)' }}
          aria-label="Clear recent prompts and reset the session total"
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

      {/* running session cost total — accumulated locally, resets on Clear */}
      {sessionTotal.count > 0 && (
        <div
          className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl px-3.5 py-2.5"
          style={{ background: 'var(--md-surface-container)', color: 'var(--text)' }}
          title={`Rough estimate accumulated in this browser on ${SESSION_MODEL.name} (prompt + assumed reply). Resets when you clear history.`}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-h)' }}>
            {sessionTotal.count} prompt{sessionTotal.count === 1 ? '' : 's'} analyzed this session
          </span>
          <span aria-hidden style={{ color: 'var(--md-outline)' }}>·</span>
          <span className="font-mono text-xs" style={{ color: 'var(--md-primary)' }}>
            ~{formatUSD(sessionTotal.totalCost)} total
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
            ({SESSION_MODEL.name}, est. · full call · local)
          </span>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <button
                type="button"
                onClick={() => onSelect(item.text)}
                className="md-focus group flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left transition-all duration-200 hover:shadow-sm"
                style={{ background: 'var(--md-surface-container-low)', color: 'var(--md-on-secondary-container)' }}
              >
                <span className="flex-1 truncate text-xs" style={{ color: 'var(--text)' }}>
                  {item.text}
                </span>
                <span
                  className="shrink-0 font-mono text-[10px]"
                  style={{ color: 'var(--text-dim)' }}
                >
                  {item.tokens} tok
                </span>
                <CornerDownLeft
                  size={13}
                  className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--md-primary)' }}
                />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  )
}
