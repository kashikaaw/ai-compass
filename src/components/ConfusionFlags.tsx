import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { CATEGORY_META, type Flag } from '../lib/confusionDetector'

interface Props {
  flags: Flag[]
  hasText: boolean
}

export function ConfusionFlags({ flags, hasText }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
          Prompt inspector
        </h3>
        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {flags.length} flag{flags.length === 1 ? '' : 's'}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {!hasText ? (
          <Empty key="empty" text="Start typing to inspect your prompt." muted />
        ) : flags.length === 0 ? (
          <motion.div
            key="clean"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-xl p-3 text-sm"
            style={{ background: 'rgba(61,220,151,0.1)', color: 'var(--ok)' }}
          >
            <CheckCircle2 size={18} />
            Clean prompt — no filler, vagueness, or structure issues detected.
          </motion.div>
        ) : (
          <motion.ul key="list" className="flex flex-col gap-2">
            {flags.map((f, i) => (
              <FlagRow key={`${f.category}-${f.start}-${i}`} flag={f} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FlagRow({ flag }: { flag: Flag }) {
  const meta = CATEGORY_META[flag.category]
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl p-3 text-left"
      style={{ background: 'var(--surface-2)', borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          <AlertTriangle size={10} />
          {meta.label}
        </span>
        {flag.match && (
          <code
            className="rounded px-1.5 py-0.5 font-mono text-[11px]"
            style={{ background: 'var(--bg-2)', color: 'var(--text)' }}
          >
            {flag.match}
          </code>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text)' }}>
        {flag.explanation}
      </p>
      {flag.suggestion && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
          → {flag.suggestion}
        </p>
      )}
    </motion.li>
  )
}

function Empty({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="rounded-xl p-4 text-center text-sm"
      style={{ color: muted ? 'var(--text-dim)' : 'var(--text)', background: 'var(--surface-2)' }}
    >
      {text}
    </motion.div>
  )
}
