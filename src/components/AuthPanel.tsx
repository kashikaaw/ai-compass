import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cloud, Mail, LogOut, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../lib/hooks'

interface Props {
  open: boolean
  onClose: () => void
  auth: ReturnType<typeof useAuth>
}

/**
 * Optional passwordless sign-in panel (magic link / OTP via Supabase).
 * Styled to match ApiKeyModal / the MD3 design system. There is deliberately
 * NO password field anywhere — sign-in is a one-time link emailed to the user.
 */
export function AuthPanel({ open, onClose, auth }: Props) {
  const { email: signedInEmail, signInWithEmail, signOut } = auth

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Reset the transient form state each time the panel opens.
  useEffect(() => {
    if (open) {
      setEmail('')
      setStatus('idle')
      setErrorMsg('')
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSend = async () => {
    if (!emailValid || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')
    try {
      await signInWithEmail(email)
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Could not send the sign-in link.')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in srgb, var(--md-on-surface) 40%, transparent)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[28px] p-6 shadow-lg"
            style={{ background: 'var(--md-surface-container)' }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                >
                  <Cloud size={18} />
                </span>
                <div className="text-left">
                  <h3 className="text-base font-medium" style={{ color: 'var(--text-h)' }}>
                    Sync across devices
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    Optional sign-in so your prompt history follows you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="md-ghost md-focus inline-flex h-10 w-10 items-center justify-center rounded-full"
                style={{ color: 'var(--md-on-surface-variant)' }}
              >
                <X size={18} />
              </button>
            </div>

            {signedInEmail ? (
              /* ---------------------------- signed in ---------------------------- */
              <>
                <div
                  className="mb-4 flex items-center gap-2 rounded-2xl p-3 text-left text-xs leading-relaxed"
                  style={{ background: 'color-mix(in srgb, var(--ok) 10%, transparent)', color: 'var(--text)' }}
                >
                  <CheckCircle2 size={16} className="shrink-0" style={{ color: 'var(--ok)' }} />
                  <span>
                    Signed in as <strong>{signedInEmail}</strong>. New prompts sync to the cloud
                    automatically.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="md-state md-focus inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-6 text-sm font-medium transition-all duration-300 active:scale-95"
                  style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
                >
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : status === 'sent' ? (
              /* --------------------------- link sent ----------------------------- */
              <div
                className="flex gap-2 rounded-2xl p-4 text-left text-sm leading-relaxed"
                style={{ background: 'color-mix(in srgb, var(--md-primary) 10%, transparent)', color: 'var(--text)' }}
              >
                <Mail size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--md-primary)' }} />
                <span>
                  Check your email for a sign-in link. Open it on this device and you'll be signed
                  in automatically — no password needed.
                </span>
              </div>
            ) : (
              /* --------------------------- send link ----------------------------- */
              <>
                <div
                  className="mb-4 flex gap-2 rounded-2xl p-3 text-left text-xs leading-relaxed"
                  style={{ background: 'color-mix(in srgb, var(--ok) 10%, transparent)', color: 'var(--text)' }}
                >
                  <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
                  <span>
                    <strong>No password.</strong> We email you a one-time sign-in link. The app works
                    fully without signing in — this only adds cross-device history sync.
                  </span>
                </div>

                <label className="mb-1 block text-left text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSend()
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  spellCheck={false}
                  className="md-field mb-3 w-full px-3 py-2.5 text-sm"
                  style={{ color: 'var(--text-h)' }}
                />

                {status === 'error' && (
                  <p className="mb-3 text-left text-xs" style={{ color: 'var(--danger)' }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!emailValid || status === 'sending'}
                  className="md-state md-focus inline-flex h-12 w-full items-center justify-center gap-1.5 rounded-full px-6 text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                >
                  <Mail size={15} /> {status === 'sending' ? 'Sending…' : 'Send magic link'}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
