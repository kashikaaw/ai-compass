import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, Info } from 'lucide-react'
import {
  MODELS,
  PROVIDER_ACCENT,
  PRICING_LAST_UPDATED,
  formatUSD,
  inputCost,
  roundTripCost,
  type ModelPricing,
} from '../lib/pricing'
import { InfoTooltip } from './InfoTooltip'

interface Props {
  tokens: number
}

type SortKey = 'name' | 'input' | 'roundtrip'

const ASSUMED_OUTPUT = 500

export function CostTable({ tokens }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('roundtrip')
  const [asc, setAsc] = useState(true)

  const rows = useMemo(() => {
    const data = MODELS.map((m) => ({
      model: m,
      input: inputCost(m, tokens),
      roundtrip: roundTripCost(m, tokens, ASSUMED_OUTPUT),
    }))
    data.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.model.name.localeCompare(b.model.name)
      else if (sortKey === 'input') cmp = a.input - b.input
      else cmp = a.roundtrip - b.roundtrip
      return asc ? cmp : -cmp
    })
    return data
  }, [tokens, sortKey, asc])

  const cheapest = useMemo(
    () => rows.reduce((min, r) => (r.roundtrip < min.roundtrip ? r : min), rows[0]),
    [rows],
  )

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((a) => !a)
    else {
      setSortKey(k)
      setAsc(k === 'name')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="text-left">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
            Cost per call
            <InfoTooltip label="What this table shows">
              What it would cost to send this exact prompt once and get a typical reply back —
              per model, so you can compare providers before you spend anything. Estimates only:
              counts use one universal tokenizer, so treat these as close approximations.
            </InfoTooltip>
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            {tokens.toLocaleString()} input tokens + a typical {ASSUMED_OUTPUT}-token reply.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
          style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
        >
          <Info size={11} />
          Estimated · prices {PRICING_LAST_UPDATED}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr style={{ color: 'var(--text-dim)' }} className="text-xs">
              <Th onClick={() => toggleSort('name')} active={sortKey === 'name'}>
                Model
              </Th>
              <Th onClick={() => toggleSort('input')} active={sortKey === 'input'} align="right">
                Prompt only
              </Th>
              <Th onClick={() => toggleSort('roundtrip')} active={sortKey === 'roundtrip'} align="right">
                Full call
              </Th>
              <th className="hidden py-2 pl-3 text-right font-medium sm:table-cell">Per 1k calls</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ model, input, roundtrip }) => (
              <Row
                key={model.id}
                model={model}
                input={input}
                roundtrip={roundtrip}
                isCheapest={model.id === cheapest?.model.id && tokens > 0}
              />
            ))}
          </tbody>
        </table>
      </div>

      {tokens > 0 && cheapest && (
        <UsageProjection model={cheapest.model} perCall={cheapest.roundtrip} />
      )}
    </motion.div>
  )
}

/**
 * A tiny "why does a fraction of a cent matter?" projection. Non-technical
 * users rarely send a prompt once — they send similar prompts over and over.
 * This multiplies the cheapest model's per-call cost across a chosen daily
 * volume into per-day and per-month figures, in plain English.
 *
 * This is a FORWARD-LOOKING what-if projection for a single repeated prompt —
 * distinct from History's session total, which sums the *actual* distinct
 * prompts you've already analyzed. They complement rather than duplicate.
 */
const FREQ_PRESETS = [1, 10, 50, 100] as const

function UsageProjection({ model, perCall }: { model: ModelPricing; perCall: number }) {
  const [perDay, setPerDay] = useState<number>(10)
  const daily = perCall * perDay
  const monthly = daily * 30

  return (
    <div
      className="mt-4 rounded-2xl p-3.5 sm:p-4"
      style={{ background: 'var(--md-surface-container-low)' }}
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="text-left">
          <h4 className="text-xs font-medium" style={{ color: 'var(--text-h)' }}>
            You rarely send a prompt just once
          </h4>
          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
            If you ran this prompt on {model.name} …
          </p>
        </div>
        <div className="inline-flex items-center gap-1" role="group" aria-label="Prompts per day">
          {FREQ_PRESETS.map((n) => {
            const active = n === perDay
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPerDay(n)}
                aria-pressed={active}
                className="md-state md-focus rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200"
                style={{
                  background: active ? 'var(--md-primary)' : 'var(--md-secondary-container)',
                  color: active ? 'var(--md-on-primary)' : 'var(--md-on-secondary-container)',
                }}
              >
                {n}/day
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <ProjectionStat label={`${perDay}× a day`} value={formatUSD(daily)} caption="per day" />
        <ProjectionStat label="over a month" value={formatUSD(monthly)} caption="~30 days" highlight />
      </div>
    </div>
  )
}

function ProjectionStat({
  label,
  value,
  caption,
  highlight,
}: {
  label: string
  value: string
  caption: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-left"
      style={{ background: highlight ? 'color-mix(in srgb, var(--md-primary) 10%, transparent)' : 'var(--md-surface-container)' }}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
        {label}
      </div>
      <div
        className="font-mono text-lg font-semibold leading-tight"
        style={{ color: highlight ? 'var(--md-primary)' : 'var(--text-h)' }}
      >
        {value}
      </div>
      <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
        {caption}
      </div>
    </div>
  )
}

function Th({
  children,
  onClick,
  active,
  align = 'left',
}: {
  children: React.ReactNode
  onClick: () => void
  active: boolean
  align?: 'left' | 'right'
}) {
  return (
    <th className={`py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={onClick}
        className="md-focus inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium transition-colors duration-200"
        style={{ color: active ? 'var(--md-primary)' : 'var(--text-dim)' }}
      >
        {children}
        <ArrowUpDown size={11} />
      </button>
    </th>
  )
}

function Row({
  model,
  input,
  roundtrip,
  isCheapest,
}: {
  model: ModelPricing
  input: number
  roundtrip: number
  isCheapest: boolean
}) {
  return (
    <tr
      className="border-t transition-colors"
      style={{ borderColor: 'var(--md-surface-container-low)' }}
    >
      <td className="py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: PROVIDER_ACCENT[model.provider] }}
            title={model.provider}
          />
          <div className="leading-tight">
            <div className="flex items-center gap-2 font-medium" style={{ color: 'var(--text-h)' }}>
              {model.name}
              {isCheapest && (
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide"
                  style={{ background: 'color-mix(in srgb, var(--ok) 16%, transparent)', color: 'var(--ok)' }}
                >
                  cheapest
                </span>
              )}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
              {model.provider} · ${model.inputPerMTok}/${model.outputPerMTok} per MTok
            </div>
          </div>
        </div>
      </td>
      <td className="py-2.5 text-right font-mono text-xs" style={{ color: 'var(--text)' }}>
        {formatUSD(input)}
      </td>
      <td className="py-2.5 text-right font-mono text-xs font-semibold" style={{ color: 'var(--text-h)' }}>
        {formatUSD(roundtrip)}
      </td>
      <td className="hidden py-2.5 pl-3 text-right font-mono text-xs sm:table-cell" style={{ color: 'var(--text-dim)' }}>
        {formatUSD(roundtrip * 1000)}
      </td>
    </tr>
  )
}
