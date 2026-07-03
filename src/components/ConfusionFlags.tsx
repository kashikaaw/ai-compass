import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { CATEGORY_META, type Flag } from '../lib/confusionDetector'

const ANTHROPIC_DOCS_URL =
  'https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices'

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
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          Prompt inspector
          <span
            className="group relative inline-flex"
            tabIndex={0}
            aria-label="About these checks"
          >
            <Info size={13} style={{ color: 'var(--md-on-surface-variant)' }} />
            {/* hover/focus tooltip crediting the source of the heuristics */}
            <span
              className="pointer-events-none absolute left-1/2 top-6 z-10 w-64 -translate-x-1/2 rounded-xl p-2.5 text-left text-[11px] leading-relaxed opacity-0 shadow-lg transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus:pointer-events-auto group-focus:opacity-100"
              style={{ background: 'var(--md-surface-container)', color: 'var(--text)' }}
              role="tooltip"
            >
              Some checks are informed by{' '}
              <a
                href={ANTHROPIC_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="pointer-events-auto underline"
                style={{ color: 'var(--md-primary)' }}
              >
                Anthropic’s prompting best practices
              </a>{' '}
              (clear/direct wording, examples, structure, explicit output format).
              These are heuristic hints — not an official or certified linter.
            </span>
          </span>
        </h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
        >
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
            className="flex items-center gap-2 rounded-2xl p-3 text-sm font-medium"
            style={{ background: 'color-mix(in srgb, var(--ok) 12%, transparent)', color: 'var(--ok)' }}
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
      className="rounded-2xl p-3 text-left"
      style={{ background: 'var(--md-surface-container-low)', borderLeft: `4px solid ${meta.color}` }}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
        >
          <AlertTriangle size={10} style={{ color: meta.color }} />
          {meta.label}
        </span>
        {flag.match && (
          <code
            className="rounded-full px-2 py-0.5 font-mono text-[11px]"
            style={{ background: 'var(--md-surface)', color: 'var(--text)' }}
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
      className="rounded-2xl p-4 text-center text-sm"
      style={{ color: muted ? 'var(--text-dim)' : 'var(--text)', background: 'var(--md-surface-container-low)' }}
    >
      {text}
    </motion.div>
  )
}
