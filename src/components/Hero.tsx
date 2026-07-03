import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, Sparkles, Cloud, LogOut, Check } from 'lucide-react'
import type { useAuth } from '../lib/hooks'
import { InfoTooltip } from './InfoTooltip'

interface HeroProps {
  /** Auth state; only rendered when Supabase is configured + ready. */
  auth?: ReturnType<typeof useAuth>
  /** Opens the full magic-link sign-in modal. */
  onOpenAuth?: () => void
}

export function Hero({ auth, onOpenAuth }: HeroProps) {
  return (
    <header className="relative overflow-hidden px-6 pt-14 pb-8 text-center sm:pt-24">
      {/* Persistent sign-in / synced affordance, top-right, visible without
          scrolling. Only shown when cloud sync is actually configured. */}
      {auth?.configured && auth.ready && (
        <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
          <HeroAuthControl auth={auth} onOpenAuth={onOpenAuth} />
        </div>
      )}
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

/**
 * Top-right auth affordance.
 * - Signed out: a pill that opens the full magic-link modal.
 * - Signed in: a "Synced" pill that toggles a tiny popover showing the email
 *   and a one-click "Sign out" — so signing out doesn't require reopening the
 *   whole sign-in modal.
 */
function HeroAuthControl({
  auth,
  onOpenAuth,
}: {
  auth: ReturnType<typeof useAuth>
  onOpenAuth?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close the popover on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  if (!auth.email) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onOpenAuth}
          className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200"
          style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
        >
          <Cloud size={13} />
          <span className="hidden sm:inline">Sign in to sync</span>
          <span className="sm:hidden">Sign in</span>
        </button>
        <span
          className="hidden rounded-full p-1 shadow-sm sm:inline-flex"
          style={{ background: 'var(--md-secondary-container)' }}
        >
          <InfoTooltip label="What signing in gets you">
            Free, passwordless sign-in (we just email you a one-time link — no password to
            remember). It saves your prompt history and running cost total to your account, so
            both follow you to any device instead of resetting per browser. Everything still
            works fully without it.
          </InfoTooltip>
        </span>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all duration-200"
        style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
      >
        <Check size={13} style={{ color: 'var(--ok)' }} />
        <span className="max-w-[9rem] truncate">Synced · {auth.email}</span>
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 mt-2 w-60 rounded-2xl p-2 text-left shadow-lg"
            style={{ background: 'var(--md-surface-container)' }}
          >
            <div className="px-2 py-1.5 text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>
              Signed in as
              <div className="truncate font-medium" style={{ color: 'var(--text-h)' }}>
                {auth.email}
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                void auth.signOut()
              }}
              className="md-ghost md-focus mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium transition-colors duration-200"
              style={{ color: 'var(--danger)' }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
