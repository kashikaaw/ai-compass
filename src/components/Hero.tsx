import { motion } from 'framer-motion'
import { Compass, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <header className="relative overflow-hidden px-6 pt-14 pb-8 text-center sm:pt-24">
      {/* signature decorative blur shapes — atmospheric tonal depth (MD3) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute h-[420px] w-[420px] rounded-full blur-3xl"
          style={{ background: 'var(--md-primary)', opacity: 0.16, top: '-140px', left: '-120px' }}
        />
        <div
          className="absolute h-[360px] w-[520px] rounded-full blur-3xl"
          style={{ background: 'var(--md-secondary-container)', opacity: 0.7, top: '-80px', right: '-160px' }}
        />
        <div
          className="absolute h-[300px] w-[300px] rounded-full blur-3xl"
          style={{ background: 'var(--md-tertiary)', opacity: 0.14, bottom: '-160px', left: '30%' }}
        />
      </div>

      {/* floating brand mark — tonal pill (secondary container) */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-7 flex items-center justify-center gap-2"
      >
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide"
          style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
        >
          <Compass size={14} style={{ color: 'var(--md-primary)' }} />
          AI Compass
          <span aria-hidden style={{ color: 'var(--md-outline)' }}>·</span>
          <span className="hidden sm:inline">no signup · runs in your browser</span>
          <span className="sm:hidden">free · private</span>
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
        className="mx-auto max-w-3xl text-4xl font-medium leading-[1.15] tracking-tight sm:text-6xl"
        style={{ color: 'var(--text-h)' }}
      >
        See what your AI prompt{' '}
        <span className="text-gradient">costs before you run it.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
        className="mx-auto mt-5 max-w-xl text-base leading-relaxed sm:text-xl"
        style={{ color: 'var(--text)' }}
      >
        Paste a prompt. AI Compass shows the token count and per-model price,
        flags confusing or wasteful parts, and rewrites it to be shorter and
        clearer — instantly, with{' '}
        <span className="font-medium" style={{ color: 'var(--text-h)' }}>zero setup</span>.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs"
        style={{ color: 'var(--text)' }}
      >
        <Feature icon="⚡" label="Live cost as you type" />
        <Feature icon="🖍️" label="Marks up expensive tokens" />
        <Feature icon="✂️" label="One-click optimize" />
        <Feature icon={<Sparkles size={13} style={{ color: 'var(--md-primary)' }} />} label="AI Boost" />
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
