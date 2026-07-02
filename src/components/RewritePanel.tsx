import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wand2,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  TrendingDown,
  Loader2,
  KeyRound,
  RefreshCw,
  LayoutTemplate,
} from 'lucide-react'
import { ruleBasedRewrite, wordDiff, type RewriteResult, type DiffPart } from '../lib/rewriteEngine'
import { countTokens } from '../lib/tokenizer'
import { MODELS, roundTripCost, formatUSD } from '../lib/pricing'
import { aiBoostRewrite, AiBoostError, hasKey } from '../lib/anthropicClient'
import { useCopy } from '../lib/hooks'

interface Props {
  original: string
  onOpenKeyModal: () => void
  onUseRewrite: (text: string) => void
  aiBoostEnabled: boolean
  onToggleAiBoost: (on: boolean) => void
}

// Compare on Sonnet 4.6 for the headline savings callout.
const HEADLINE_MODEL = MODELS.find((m) => m.id === 'claude-sonnet-4-6') ?? MODELS[0]

export function RewritePanel({
  original,
  onOpenKeyModal,
  onUseRewrite,
  aiBoostEnabled,
  onToggleAiBoost,
}: Props) {
  const [result, setResult] = useState<RewriteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, copy] = useCopy()

  const hasText = original.trim().length > 0

  const runOptimize = async () => {
    setError(null)
    const ruleResult = ruleBasedRewrite(original)

    if (aiBoostEnabled) {
      if (!hasKey()) {
        onOpenKeyModal()
        return
      }
      setLoading(true)
      try {
        const boosted = await aiBoostRewrite(original)
        setResult({
          original,
          rewritten: boosted,
          archetype: ruleResult.archetype,
          changes: [
            'Rewritten by Claude Haiku 4.5 (AI Boost).',
            'Removed filler, tightened phrasing, and imposed clear structure.',
          ],
          engine: 'ai-boost',
        })
      } catch (e) {
        // Fall back to the rule-based result but tell the user why.
        setResult(ruleResult)
        setError(
          e instanceof AiBoostError
            ? `${e.message} Showing the rule-based rewrite instead.`
            : 'AI Boost failed. Showing the rule-based rewrite instead.',
        )
      } finally {
        setLoading(false)
      }
    } else {
      setResult(ruleResult)
    }
  }

  const stats = useMemo(() => {
    if (!result || !result.rewritten) return null
    const beforeTok = countTokens(result.original)
    const afterTok = countTokens(result.rewritten)
    const delta = beforeTok - afterTok
    const pct = beforeTok > 0 ? Math.round((delta / beforeTok) * 100) : 0
    const costBefore = roundTripCost(HEADLINE_MODEL, beforeTok)
    const costAfter = roundTripCost(HEADLINE_MODEL, afterTok)
    return { beforeTok, afterTok, delta, pct, costBefore, costAfter, costDelta: costBefore - costAfter }
  }, [result])

  const diff = useMemo(
    () => (result?.rewritten ? wordDiff(result.original, result.rewritten) : []),
    [result],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
          Optimize
        </h3>
        <div className="flex items-center gap-2">
          <AiBoostToggle enabled={aiBoostEnabled} onToggle={onToggleAiBoost} onOpenKeyModal={onOpenKeyModal} />
          <button
            type="button"
            onClick={runOptimize}
            disabled={!hasText || loading}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: '#fff',
              background: 'linear-gradient(100deg, var(--brand-2), var(--brand))',
              boxShadow: '0 6px 20px -6px var(--brand-glow)',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : result ? <RefreshCw size={16} /> : <Wand2 size={16} />}
            {loading ? 'Boosting…' : result ? 'Re-optimize' : 'Optimize prompt'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-3 rounded-xl p-3 text-xs"
          style={{ background: 'rgba(255,107,138,0.12)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-6 text-center text-sm"
            style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
          >
            {hasText
              ? 'Hit Optimize to strip waste, tighten wording, and (if we recognize your intent) swap in a proven structured template.'
              : 'Type or load a template above, then optimize it.'}
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            {/* savings / structure callout */}
            {stats && (
              result.archetype ? (
                // Template-swap path: a structured template is intentionally
                // longer than a vague one-liner, so DON'T frame the token
                // increase as a failure. Present it as "more complete".
                <div
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl p-3"
                  style={{ background: 'rgba(96,165,250,0.10)' }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: 'var(--brand)', color: '#fff' }}
                  >
                    <LayoutTemplate size={12} /> Template applied
                  </span>
                  <Stat
                    icon={<LayoutTemplate size={16} style={{ color: 'var(--brand-2)' }} />}
                    main={`${stats.afterTok} tokens`}
                    sub="longer, but structured & more complete"
                  />
                  <Stat
                    icon={<span style={{ color: 'var(--text-dim)' }}>$</span>}
                    main={`${formatUSD(stats.costAfter)}/call`}
                    sub={`on ${HEADLINE_MODEL.name}`}
                  />
                  <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                    A clear, structured prompt usually gets it right the first try —
                    fewer re-runs than a vague one-liner.
                  </span>
                  {result.engine === 'ai-boost' && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: 'var(--brand)', color: '#fff' }}
                    >
                      <Sparkles size={12} /> AI Boost
                    </span>
                  )}
                </div>
              ) : (
                // Trim-only path: genuine token savings — keep the green framing.
                <div
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl p-3"
                  style={{ background: stats.delta >= 0 ? 'rgba(61,220,151,0.1)' : 'rgba(255,180,84,0.1)' }}
                >
                  <Stat
                    icon={<TrendingDown size={16} style={{ color: stats.delta >= 0 ? 'var(--ok)' : 'var(--warn)' }} />}
                    main={`${stats.delta >= 0 ? '↓' : '↑'} ${Math.abs(stats.pct)}% tokens`}
                    sub={`${stats.beforeTok} → ${stats.afterTok}`}
                  />
                  <Stat
                    icon={<span style={{ color: 'var(--ok)' }}>$</span>}
                    main={`${stats.costDelta >= 0 ? 'save ' : '+'}${formatUSD(Math.abs(stats.costDelta))}/call`}
                    sub={`on ${HEADLINE_MODEL.name}`}
                  />
                  {result.engine === 'ai-boost' && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={{ background: 'var(--brand)', color: '#fff' }}
                    >
                      <Sparkles size={12} /> AI Boost
                    </span>
                  )}
                </div>
              )
            )}

            {/* before / after */}
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <Panel title="Before" tone="dim">
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                  {result.original}
                </pre>
              </Panel>
              <Panel
                title="After"
                tone="bright"
                action={
                  <button
                    type="button"
                    onClick={() => copy(result.rewritten)}
                    className="inline-flex items-center gap-1 text-[11px] transition-colors hover:brightness-150"
                    style={{ color: 'var(--brand-2)' }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                }
              >
                <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed" style={{ color: 'var(--text-h)' }}>
                  {result.rewritten}
                </pre>
              </Panel>
            </div>

            {/* diff */}
            <details className="group rounded-xl" style={{ background: 'var(--surface-2)' }}>
              <summary className="cursor-pointer list-none p-3 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                Show word-level diff
                <span className="ml-2 opacity-60 group-open:hidden">(what changed)</span>
              </summary>
              <div className="px-3 pb-3">
                <DiffView diff={diff} />
              </div>
            </details>

            {/* changes list */}
            <ul className="flex flex-col gap-1 text-left text-xs" style={{ color: 'var(--text-dim)' }}>
              {result.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
                  {c}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onUseRewrite(result.rewritten)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: 'var(--surface-2)', color: 'var(--text-h)' }}
              >
                <ArrowRight size={15} /> Use this rewrite
              </button>
              <button
                type="button"
                onClick={() => copy(result.rewritten)}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors hover:brightness-125"
                style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */

function AiBoostToggle({
  enabled,
  onToggle,
  onOpenKeyModal,
}: {
  enabled: boolean
  onToggle: (on: boolean) => void
  onOpenKeyModal: () => void
}) {
  const keyed = hasKey()
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (!enabled && !keyed) onOpenKeyModal()
          onToggle(!enabled)
        }}
        aria-pressed={enabled}
        title="Use your own Anthropic key for a smarter rewrite"
        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors hover:brightness-125"
        style={{
          background: enabled ? 'var(--brand)' : 'var(--surface-2)',
          color: enabled ? '#fff' : 'var(--text-dim)',
        }}
      >
        <Sparkles size={14} />
        AI Boost
      </button>
      <button
        type="button"
        onClick={onOpenKeyModal}
        title={keyed ? 'API key set — manage it' : 'Add your Anthropic API key'}
        className="inline-flex items-center rounded-xl p-2 transition-colors hover:brightness-125"
        style={{
          background: 'var(--surface-2)',
          color: keyed ? 'var(--ok)' : 'var(--text-dim)',
        }}
      >
        <KeyRound size={14} />
      </button>
    </div>
  )
}

function Stat({ icon, main, sub }: { icon: React.ReactNode; main: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-bold">{icon}</span>
      <div className="leading-tight text-left">
        <div className="text-sm font-bold" style={{ color: 'var(--text-h)' }}>
          {main}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
          {sub}
        </div>
      </div>
    </div>
  )
}

function Panel({
  title,
  tone,
  action,
  children,
}: {
  title: string
  tone: 'dim' | 'bright'
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col rounded-xl p-3"
      style={{
        background: 'var(--bg-2)',
        border: `1px solid ${tone === 'bright' ? 'var(--brand)' : 'var(--border)'}`,
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
          {title}
        </span>
        {action}
      </div>
      <div className="max-h-64 overflow-auto">{children}</div>
    </div>
  )
}

function DiffView({ diff }: { diff: DiffPart[] }) {
  return (
    <p className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
      {diff.map((part, i) => {
        if (part.op === 'equal')
          return (
            <span key={i} style={{ color: 'var(--text-dim)' }}>
              {part.text}
            </span>
          )
        if (part.op === 'delete')
          return (
            <span
              key={i}
              style={{
                color: 'var(--danger)',
                background: 'rgba(255,107,138,0.12)',
                textDecoration: 'line-through',
              }}
            >
              {part.text}
            </span>
          )
        return (
          <span key={i} style={{ color: 'var(--ok)', background: 'rgba(61,220,151,0.14)' }}>
            {part.text}
          </span>
        )
      })}
    </p>
  )
}
