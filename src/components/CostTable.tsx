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
      className="glass rounded-2xl p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="text-left">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-h)' }}>
            Cost per call
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Your {tokens.toLocaleString()} input tokens + an assumed{' '}
            {ASSUMED_OUTPUT}-token reply.
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px]"
          style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}
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

      <p className="mt-3 text-left text-[10px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
        Token counts use the o200k_base tokenizer as a universal estimate. Claude and
        Gemini use different tokenizers, so their counts are close approximations,
        not exact. Verify current pricing at each provider's docs.
      </p>
    </motion.div>
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
        className="inline-flex items-center gap-1 transition-colors hover:brightness-150"
        style={{ color: active ? 'var(--brand-2)' : 'var(--text-dim)' }}
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
      style={{ borderColor: 'var(--border)' }}
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
                  className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                  style={{ background: 'rgba(61,220,151,0.16)', color: 'var(--ok)' }}
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
