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
import { aiBoostRewrite, AiBoostError, hasKey, hasAnyKey, getBoostProvider, PROVIDER_LABEL } from '../lib/aiBoostClient'
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

  // `boostOverride` lets a caller force AI Boost on for this single run even
  // before the `aiBoostEnabled` prop has re-rendered (e.g. the "Try AI Boost"
  // nudge below toggles it on and re-runs in the same click handler, when the
  // prop update wouldn't have landed yet).
  const runOptimize = async (boostOverride?: boolean) => {
    setError(null)
    const ruleResult = ruleBasedRewrite(original)
    const useBoost = boostOverride ?? aiBoostEnabled

    if (useBoost) {
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
            `Rewritten by ${PROVIDER_LABEL[getBoostProvider()]} (AI Boost).`,
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
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          Optimize
        </h3>
        <div className="flex items-center gap-2">
          <AiBoostToggle enabled={aiBoostEnabled} onToggle={onToggleAiBoost} onOpenKeyModal={onOpenKeyModal} />
          <button
            type="button"
            onClick={() => void runOptimize()}
            disabled={!hasText || loading}
            className="md-state md-focus inline-flex h-10 items-center gap-2 rounded-full px-6 text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: 'var(--md-on-primary)',
              background: 'var(--md-primary)',
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : result ? <RefreshCw size={16} /> : <Wand2 size={16} />}
            {loading ? 'Boosting…' : result ? 'Re-optimize' : 'Optimize prompt'}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-3 rounded-2xl p-3 text-xs"
          style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
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
            className="rounded-2xl p-6 text-center text-sm"
            style={{ background: 'var(--md-surface-container-low)', color: 'var(--text-dim)' }}
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
                  className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl p-3"
                  style={{ background: 'var(--md-secondary-container)' }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
                    style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                  >
                    <LayoutTemplate size={12} /> Template applied
                  </span>
                  <Stat
                    icon={<LayoutTemplate size={16} style={{ color: 'var(--md-primary)' }} />}
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
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
                      style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                    >
                      <Sparkles size={12} /> AI Boost
                    </span>
                  )}
                </div>
              ) : (
                // Trim-only path. Genuine savings keep the green framing; a
                // true no-op (0% change) gets a neutral, honest framing instead
                // of dressing up "nothing changed" as a win.
                stats.delta === 0 && result.engine === 'rule-based' ? (
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl p-3"
                    style={{ background: 'var(--md-surface-container-low)' }}
                  >
                    <Stat
                      icon={<TrendingDown size={16} style={{ color: 'var(--text-dim)' }} />}
                      main="No change"
                      sub={`${stats.beforeTok} tokens either way`}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                      The rule-based checks found nothing to trim.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!hasAnyKey()) {
                          onOpenKeyModal()
                          return
                        }
                        onToggleAiBoost(true)
                        void runOptimize(true)
                      }}
                      className="md-state md-focus ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all duration-200"
                      style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                    >
                      <Sparkles size={12} /> Try AI Boost
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl p-3"
                    style={{
                      background:
                        stats.delta >= 0
                          ? 'color-mix(in srgb, var(--ok) 12%, transparent)'
                          : 'color-mix(in srgb, var(--warn) 12%, transparent)',
                    }}
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
                        className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium"
                        style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                      >
                        <Sparkles size={12} /> AI Boost
                      </span>
                    )}
                  </div>
                )
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
                    className="md-ghost md-focus inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{ color: 'var(--md-primary)' }}
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
            <details className="group rounded-2xl" style={{ background: 'var(--md-surface-container-low)' }}>
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
                className="md-state md-focus inline-flex h-10 items-center gap-2 rounded-full px-6 text-sm font-medium transition-all duration-300 active:scale-95"
                style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
              >
                <ArrowRight size={15} /> Use this rewrite
              </button>
              <button
                type="button"
                onClick={() => copy(result.rewritten)}
                className="md-ghost md-focus inline-flex h-10 items-center gap-2 rounded-full px-6 text-sm font-medium active:scale-95"
                style={{ color: 'var(--md-primary)' }}
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
  const providerLabel = PROVIDER_LABEL[getBoostProvider()]
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          if (!enabled && !hasAnyKey()) onOpenKeyModal()
          onToggle(!enabled)
        }}
        aria-pressed={enabled}
        title={`Use your own ${providerLabel} key for a smarter rewrite (choose provider in the key manager)`}
        className="md-state md-focus inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-medium transition-all duration-200"
        style={{
          background: enabled ? 'var(--md-primary)' : 'var(--md-secondary-container)',
          color: enabled ? 'var(--md-on-primary)' : 'var(--md-on-secondary-container)',
        }}
      >
        <Sparkles size={14} />
        AI Boost
      </button>
      <button
        type="button"
        onClick={onOpenKeyModal}
        aria-label={keyed ? `${providerLabel} key set — manage it` : 'Add an API key (Claude or ChatGPT)'}
        title={keyed ? `${providerLabel} key set — manage it` : 'Add an API key (Claude or ChatGPT)'}
        className="md-state md-focus inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200"
        style={{
          background: 'var(--md-secondary-container)',
          color: keyed ? 'var(--ok)' : 'var(--md-on-secondary-container)',
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
      className="flex flex-col rounded-2xl p-3"
      style={{
        background: tone === 'bright' ? 'var(--md-secondary-container)' : 'var(--md-surface-container-low)',
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
                background: 'color-mix(in srgb, var(--danger) 14%, transparent)',
                textDecoration: 'line-through',
              }}
            >
              {part.text}
            </span>
          )
        return (
          <span key={i} style={{ color: 'var(--ok)', background: 'color-mix(in srgb, var(--ok) 16%, transparent)' }}>
            {part.text}
          </span>
        )
      })}
    </p>
  )
}
