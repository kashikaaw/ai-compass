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
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
          <HistoryIcon size={15} style={{ color: 'var(--text-dim)' }} />
          Recent prompts
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-[11px] transition-colors hover:brightness-150"
          style={{ color: 'var(--text-dim)' }}
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
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:brightness-125"
                style={{ background: 'var(--surface-2)' }}
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
                  style={{ color: 'var(--brand-2)' }}
                />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  )
}
