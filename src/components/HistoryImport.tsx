import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ShieldCheck, AlertTriangle, FileJson, ArrowRight } from 'lucide-react'
import { parseChatHistory } from '../lib/chatHistoryParser'
import { analyzeHistory, type HistoryReport } from '../lib/historyAnalysis'
import { formatUSD } from '../lib/pricing'
import { sessionPromptCost, SESSION_MODEL } from '../lib/hooks'

interface Props {
  /** Load a prompt (e.g. a rewrite) back into the workbench. */
  onUsePrompt?: (text: string) => void
}

type State =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'error'; message: string }
  | { kind: 'done'; source: string; totalFound: number; shown: number; report: HistoryReport }

/**
 * Upload an exported ChatGPT/Claude history and get an aggregate analysis of
 * your own past prompts, using the app's existing analysis engine. Everything
 * is parsed in-browser; the file never leaves the device.
 */
export function HistoryImport({ onUsePrompt }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setState({ kind: 'parsing' })
    try {
      const raw = await file.text()
      const parsed = parseChatHistory(raw)
      if (parsed.error || parsed.prompts.length === 0) {
        setState({ kind: 'error', message: parsed.error ?? 'No prompts found in that file.' })
        return
      }
      const report = analyzeHistory(parsed.prompts)
      if (report.analyzedCount === 0) {
        setState({ kind: 'error', message: 'Found messages, but none were substantial enough to analyze.' })
        return
      }
      setState({
        kind: 'done',
        source: parsed.source,
        totalFound: parsed.totalFound,
        shown: parsed.prompts.length,
        report,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read that file.'
      setState({ kind: 'error', message: msg })
    }
  }

  const reset = () => {
    setState({ kind: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          <FileJson size={16} style={{ color: 'var(--md-primary)' }} />
          Analyze your past prompts
        </h3>
        {state.kind === 'done' && (
          <button
            type="button"
            onClick={reset}
            className="md-ghost md-focus rounded-full px-3 py-1 text-[11px] font-medium"
            style={{ color: 'var(--md-primary)' }}
          >
            Upload another
          </button>
        )}
      </div>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        Upload your exported ChatGPT (<code>conversations.json</code>) or Claude data export
        and see the patterns in your own prompting — most common issues, priciest prompts, and
        example rewrites.
      </p>

      {/* privacy note — matches the app's "nothing you type is uploaded" stance */}
      <div
        className="mb-4 flex items-start gap-2 rounded-2xl p-3 text-[11px] leading-relaxed"
        style={{ background: 'color-mix(in srgb, var(--ok) 10%, transparent)', color: 'var(--text)' }}
      >
        <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
        <span>
          <strong>Private.</strong> Your file is parsed entirely in your browser and never leaves
          your device — nothing is uploaded to any server.
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {state.kind !== 'done' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state.kind === 'parsing'}
          className="md-state md-focus flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-sm font-medium transition-all duration-200 disabled:opacity-60"
          style={{ borderColor: 'var(--md-outline)', color: 'var(--md-primary)', background: 'var(--md-surface-container-low)' }}
        >
          <Upload size={16} />
          {state.kind === 'parsing' ? 'Reading your file…' : 'Choose an export file (.json)'}
        </button>
      )}

      <AnimatePresence mode="wait">
        {state.kind === 'error' && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start gap-2 rounded-2xl p-3 text-xs leading-relaxed"
            style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', color: 'var(--text)' }}
          >
            <AlertTriangle size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--danger)' }} />
            <span>{state.message}</span>
          </motion.div>
        )}

        {state.kind === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-1 flex flex-col gap-4"
          >
            <Summary state={state} />
            {state.report.examples.length > 0 && (
              <Examples report={state.report} onUsePrompt={onUsePrompt} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Summary({ state }: { state: Extract<State, { kind: 'done' }> }) {
  const { report, source, totalFound, shown } = state
  const flaggedPct = report.analyzedCount
    ? Math.round((report.flaggedCount / report.analyzedCount) * 100)
    : 0
  const sourceLabel = source === 'chatgpt' ? 'ChatGPT' : source === 'claude' ? 'Claude' : 'your'

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs" style={{ color: 'var(--text)' }}>
        Analyzed <strong>{report.analyzedCount}</strong> of your {sourceLabel} prompts
        {totalFound > shown && <> (most recent {shown} of {totalFound} found)</>}. About{' '}
        <strong>{flaggedPct}%</strong> had at least one issue worth trimming.
      </p>

      {report.categoryStats.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
            Most common issues
          </div>
          <ul className="flex flex-col gap-1.5">
            {report.categoryStats.slice(0, 4).map((c) => {
              const pct = Math.round(c.share * 100)
              return (
                <li key={c.category} className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 text-xs" style={{ color: 'var(--text)' }}>
                    {c.label}
                  </span>
                  <span className="font-mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    {pct}% of prompts
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {report.topByTokens.length > 0 && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
            Your priciest prompts (by token count)
          </div>
          <ul className="flex flex-col gap-1.5">
            {report.topByTokens.map((p, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-full px-3.5 py-2"
                style={{ background: 'var(--md-surface-container-low)' }}
              >
                <span className="flex-1 truncate text-xs" style={{ color: 'var(--text)' }}>
                  {p.text}
                </span>
                <span className="shrink-0 font-mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
                  {p.tokens} tok · ~{formatUSD(sessionPromptCost(p.tokens))}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[10px]" style={{ color: 'var(--text-dim)' }}>
            Per-call estimate on {SESSION_MODEL.name} (prompt + assumed reply).
          </p>
        </div>
      )}
    </div>
  )
}

function Examples({
  report,
  onUsePrompt,
}: {
  report: HistoryReport
  onUsePrompt?: (text: string) => void
}) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
        Example rewrites from your history
      </div>
      <div className="flex flex-col gap-3">
        {report.examples.map((ex, i) => (
          <div
            key={i}
            className="rounded-2xl p-3"
            style={{ background: 'var(--md-surface-container-low)' }}
          >
            <div className="mb-2 text-[11px]" style={{ color: 'var(--text-dim)' }}>
              <span className="font-medium" style={{ color: 'var(--text)' }}>Before</span>
              <p className="mt-0.5 line-clamp-3 italic" style={{ color: 'var(--text)' }}>
                “{ex.original}”
              </p>
            </div>
            <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
              <span className="font-medium" style={{ color: 'var(--md-primary)' }}>
                After{ex.archetype ? ` · ${ex.archetype}` : ''}
              </span>
              <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
                {ex.rewritten}
              </p>
            </div>
            {onUsePrompt && (
              <button
                type="button"
                onClick={() => onUsePrompt(ex.rewritten)}
                className="md-ghost md-focus mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ color: 'var(--md-primary)' }}
              >
                Load into editor <ArrowRight size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
