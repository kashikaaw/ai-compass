import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, KeyRound, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { getStoredKey, storeKey, forgetKey, hasKey } from '../lib/anthropicClient'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ApiKeyModal({ open, onClose, onSaved }: Props) {
  const [value, setValue] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setValue(getStoredKey() ?? '')
      setSaved(hasKey())
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

  const handleSave = () => {
    if (value.trim().length < 10) return
    storeKey(value)
    setSaved(true)
    onSaved()
    onClose()
  }

  const handleForget = () => {
    forgetKey()
    setValue('')
    setSaved(false)
    onSaved()
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
                  <KeyRound size={18} />
                </span>
                <div className="text-left">
                  <h3 className="text-base font-medium" style={{ color: 'var(--text-h)' }}>
                    AI Boost
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    Smarter rewrites powered by Claude Haiku 4.5.
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

            {/* privacy callout */}
            <div
              className="mb-4 flex gap-2 rounded-2xl p-3 text-left text-xs leading-relaxed"
              style={{ background: 'color-mix(in srgb, var(--ok) 10%, transparent)', color: 'var(--text)' }}
            >
              <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ok)' }} />
              <span>
                Your key is stored <strong>only in this browser</strong> (localStorage) and is sent{' '}
                <strong>directly to api.anthropic.com</strong> — never to any server of ours. There
                is no backend. Remove it anytime with “Forget key.”
              </span>
            </div>

            <label className="mb-1 block text-left text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
              Anthropic API key
            </label>
            <div className="relative mb-3">
              <input
                type={reveal ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                spellCheck={false}
                className="md-field w-full px-3 py-2.5 pr-12 font-mono text-sm"
                style={{ color: 'var(--text-h)' }}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide API key' : 'Show API key'}
                className="md-ghost md-focus absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ color: 'var(--md-on-surface-variant)' }}
                title={reveal ? 'Hide' : 'Show'}
              >
                {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="md-focus mb-4 inline-flex items-center gap-1 rounded-full py-1 text-[11px] font-medium transition-colors duration-200"
              style={{ color: 'var(--md-primary)' }}
            >
              Get a key from the Anthropic Console <ExternalLink size={11} />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={value.trim().length < 10}
                className="md-state md-focus inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
              >
                Save key
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={handleForget}
                  className="md-state md-focus inline-flex h-12 items-center gap-1.5 rounded-full px-5 text-sm font-medium transition-all duration-300 active:scale-95"
                  style={{ background: 'color-mix(in srgb, var(--danger) 12%, transparent)', color: 'var(--danger)' }}
                >
                  <Trash2 size={15} /> Forget
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
