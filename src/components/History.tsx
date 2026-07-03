import { motion, AnimatePresence } from 'framer-motion'
import { History as HistoryIcon, Trash2, CornerDownLeft } from 'lucide-react'
import type { HistoryItem } from '../lib/hooks'

interface Props {
  items: HistoryItem[]
  onSelect: (text: string) => void
  onClear: () => void
}

export function History({ items, onSelect, onClear }: Props) {
  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          <HistoryIcon size={15} style={{ color: 'var(--md-on-surface-variant)' }} />
          Recent prompts
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="md-ghost md-focus inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium"
          style={{ color: 'var(--md-primary)' }}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>

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
