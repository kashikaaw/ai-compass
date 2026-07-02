import { motion } from 'framer-motion'
import { Hash, Type, AlignLeft, Coins } from 'lucide-react'
import { MODELS, roundTripCost, formatUSD } from '../lib/pricing'

interface Props {
  tokens: number
  words: number
  chars: number
}

// Use the cheapest and priciest flagship for a quick "range" read.
const CHEAP = MODELS.find((m) => m.id === 'gpt-5-4-nano') ?? MODELS[0]
const PRICEY = MODELS.find((m) => m.id === 'gpt-5-5') ?? MODELS[0]

export function TokenSummary({ tokens, words, chars }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      <Stat icon={<Hash size={16} />} value={tokens.toLocaleString()} label="tokens" accent />
      <Stat icon={<Type size={16} />} value={words.toLocaleString()} label="words" />
      <Stat icon={<AlignLeft size={16} />} value={chars.toLocaleString()} label="characters" />
      <Stat
        icon={<Coins size={16} />}
        value={`${formatUSD(roundTripCost(CHEAP, tokens))}–${formatUSD(roundTripCost(PRICEY, tokens))}`}
        label="cost / call range"
      />
    </motion.div>
  )
}

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode
  value: string
  label: string
  accent?: boolean
}) {
  return (
    <div
      className="glass flex flex-col items-start gap-1 rounded-xl p-3"
      style={{ border: `1px solid ${accent ? 'var(--brand)' : 'var(--border)'}` }}
    >
      <span style={{ color: accent ? 'var(--brand-2)' : 'var(--text-dim)' }}>{icon}</span>
      <span
        className="font-mono text-lg font-bold leading-none sm:text-xl"
        style={{ color: 'var(--text-h)' }}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
        {label}
      </span>
    </div>
  )
}
