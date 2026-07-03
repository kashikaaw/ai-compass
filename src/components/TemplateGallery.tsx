import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as Icons from 'lucide-react'
import { X, Wand2 } from 'lucide-react'
import { TEMPLATES, type Template } from '../lib/templates'

interface Props {
  onUseTemplate: (prompt: string) => void
}

/** Resolve a lucide icon by name with a safe fallback. */
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name]
  const Fallback = Icons.Sparkles
  const C = Cmp ?? Fallback
  return <C size={size} />
}

export function TemplateGallery({ onUseTemplate }: Props) {
  const [active, setActive] = useState<Template | null>(null)

  return (
    <section className="px-6 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-2xl font-medium tracking-tight sm:text-3xl" style={{ color: 'var(--text-h)' }}>
          Start from a proven template
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: 'var(--text-dim)' }}>
          Fill a few blanks and get an already-optimized, structured prompt — the
          fix for “write me a book” and every other one-liner.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TEMPLATES.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => setActive(t)}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.3, delay: (i % 4) * 0.04 }}
              whileHover={{ y: -3 }}
              className="glass md-focus group flex flex-col items-start gap-2 rounded-3xl p-4 text-left shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
            >
              <span
                className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300"
                style={{ background: 'var(--md-secondary-container)', color: 'var(--md-primary)' }}
              >
                <Icon name={t.icon} />
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>
                {t.name}
              </span>
              <span className="text-[11px] leading-snug" style={{ color: 'var(--text-dim)' }}>
                {t.tagline}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <TemplateModal
        template={active}
        onClose={() => setActive(null)}
        onUse={(prompt) => {
          onUseTemplate(prompt)
          setActive(null)
        }}
      />
    </section>
  )
}

function TemplateModal({
  template,
  onClose,
  onUse,
}: {
  template: Template | null
  onClose: () => void
  onUse: (prompt: string) => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})

  // Reset field values whenever a different template is opened.
  const key = template?.id ?? ''
  useEffect(() => {
    setValues({})
  }, [key])

  return (
    <AnimatePresence>
      {template && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ background: 'color-mix(in srgb, var(--md-on-surface) 40%, transparent)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            key={`modal-${key}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-[28px] p-6 shadow-lg sm:rounded-[28px]"
            style={{ background: 'var(--md-surface-container)' }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: 'var(--md-secondary-container)', color: 'var(--md-primary)' }}
                >
                  <Icon name={template.icon} />
                </span>
                <div className="text-left">
                  <h3 className="text-base font-medium" style={{ color: 'var(--text-h)' }}>
                    {template.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {template.tagline}
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

            <div className="flex flex-col gap-3">
              {template.fields.map((f) => (
                <div key={f.key} className="text-left">
                  <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                    {f.label}
                  </label>
                  {f.multiline ? (
                    <textarea
                      value={values[f.key] ?? f.defaultValue ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={3}
                      className="md-field w-full resize-y px-3 py-2.5 text-sm"
                      style={{ color: 'var(--text-h)' }}
                    />
                  ) : (
                    <input
                      value={values[f.key] ?? f.defaultValue ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="md-field w-full px-3 py-2.5 text-sm"
                      style={{ color: 'var(--text-h)' }}
                    />
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const merged: Record<string, string> = {}
                for (const f of template.fields) {
                  // Prefer what the user typed; if they left a field blank, fall
                  // back to its default and then to the placeholder they saw in
                  // the field — never to generic filler. This guarantees the real
                  // field values (or the concrete examples shown to the user) are
                  // interpolated into the assembled prompt.
                  const typed = values[f.key]?.trim()
                  merged[f.key] = typed || f.defaultValue || f.placeholder || ''
                }
                onUse(template.assemble(merged))
              }}
              className="md-state md-focus mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-all duration-300 hover:shadow-md active:scale-95"
              style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
            >
              <Wand2 size={16} /> Build my prompt
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
