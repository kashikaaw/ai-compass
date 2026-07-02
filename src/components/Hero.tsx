import { motion } from 'framer-motion'
import { Compass, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <header className="relative overflow-hidden px-6 pt-14 pb-6 text-center sm:pt-20">
      {/* floating brand mark */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-6 flex items-center justify-center gap-2"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium tracking-wide"
          style={{ borderColor: 'var(--border-strong)', color: 'var(--text-dim)' }}
        >
          <Compass size={14} style={{ color: 'var(--brand-2)' }} />
          AI Compass
          <span style={{ color: 'var(--border-strong)' }}>·</span>
          <span className="hidden sm:inline">no signup · runs in your browser</span>
          <span className="sm:hidden">free · private</span>
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
        className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
        style={{ color: 'var(--text-h)' }}
      >
        See what your AI prompt{' '}
        <span className="text-gradient">costs before you run it.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
        className="mx-auto mt-5 max-w-xl text-base sm:text-lg"
        style={{ color: 'var(--text-dim)' }}
      >
        Paste a prompt. AI Compass shows the token count and per-model price,
        flags confusing or wasteful parts, and rewrites it to be shorter and
        clearer — instantly, with{' '}
        <span style={{ color: 'var(--text)' }}>zero setup</span>.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
        style={{ color: 'var(--text-dim)' }}
      >
        <Feature icon="⚡" label="Live cost as you type" />
        <Feature icon="🖍️" label="Marks up expensive tokens" />
        <Feature icon="✂️" label="One-click optimize" />
        <Feature icon={<Sparkles size={13} style={{ color: 'var(--brand-2)' }} />} label="Optional AI Boost" />
      </motion.div>
    </header>
  )
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden>{icon}</span>
      {label}
    </span>
  )
}
