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
          style={{ background: 'rgba(5,6,12,0.7)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-md rounded-2xl p-6"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'var(--brand)', color: '#fff' }}
                >
                  <KeyRound size={18} />
                </span>
                <div className="text-left">
                  <h3 className="text-base font-semibold" style={{ color: 'var(--text-h)' }}>
                    AI Boost — your Anthropic key
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    Optional. Powers smarter rewrites with Claude Haiku 4.5.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 transition-colors hover:brightness-150"
                style={{ color: 'var(--text-dim)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* privacy callout */}
            <div
              className="mb-4 flex gap-2 rounded-xl p-3 text-left text-xs leading-relaxed"
              style={{ background: 'rgba(61,220,151,0.08)', color: 'var(--text)' }}
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
                className="w-full rounded-xl px-3 py-2.5 pr-10 font-mono text-sm outline-none"
                style={{ background: 'var(--bg-2)', color: 'var(--text-h)', border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5"
                style={{ color: 'var(--text-dim)' }}
                title={reveal ? 'Hide' : 'Show'}
              >
                {reveal ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 inline-flex items-center gap-1 text-[11px] transition-colors hover:brightness-150"
              style={{ color: 'var(--brand-2)' }}
            >
              Get a key from the Anthropic Console <ExternalLink size={11} />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={value.trim().length < 10}
                className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'linear-gradient(100deg, var(--brand-2), var(--brand))', color: '#fff' }}
              >
                Save key
              </button>
              {saved && (
                <button
                  type="button"
                  onClick={handleForget}
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:brightness-125"
                  style={{ background: 'rgba(255,107,138,0.12)', color: 'var(--danger)' }}
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
