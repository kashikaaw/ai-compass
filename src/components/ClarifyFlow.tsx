import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, ArrowRight, ArrowLeft, Check, SkipForward, Wand2 } from 'lucide-react'
import {
  CLARIFY_QUESTIONS,
  assembleClarifiedPrompt,
  emptyAnswers,
  type ClarifyAnswers,
} from '../lib/clarifyFlow'
import { countTokens } from '../lib/tokenizer'
import { SESSION_MODEL, sessionPromptCost } from '../lib/hooks'
import { formatUSD } from '../lib/pricing'

/* ------------------------------ trigger banner ---------------------------- */

interface BannerProps {
  onStart: () => void
  onDismiss: () => void
}

/**
 * A helpful (not alarming) suggestion card shown above the analysis when the
 * current prompt looks vague / under-specified. Tonal surface — not red.
 */
export function ClarifyBanner({ onStart, onDismiss }: BannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-wrap items-center gap-3 rounded-2xl p-3.5 sm:flex-nowrap"
      style={{ background: 'var(--md-surface-container)', color: 'var(--text)' }}
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--md-secondary-container)', color: 'var(--md-primary)' }}
        aria-hidden
      >
        <Sparkles size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-h)' }}>
          This prompt could go further
        </p>
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Answer a few quick questions and I'll build you a much stronger version.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onStart}
          className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 active:scale-95"
          style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
        >
          <Wand2 size={14} /> Let's improve it
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss this suggestion"
          className="md-state md-focus inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200"
          style={{ color: 'var(--md-on-surface-variant)' }}
        >
          <X size={15} />
        </button>
      </div>
    </motion.div>
  )
}

/* --------------------------------- wizard --------------------------------- */

interface FlowProps {
  open: boolean
  original: string
  onClose: () => void
  onApply: (assembled: string) => void
}

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

export function ClarifyFlow({ open, original, onClose, onApply }: FlowProps) {
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [answers, setAnswers] = useState<ClarifyAnswers>(emptyAnswers)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const total = CLARIFY_QUESTIONS.length
  const question = CLARIFY_QUESTIONS[step]
  const isLast = step === total - 1

  // Reset + prefill the goal field with the original ask whenever we (re)open.
  useEffect(() => {
    if (open) {
      setStep(0)
      setDir(1)
      setAnswers({ ...emptyAnswers(), goal: original.trim() })
    }
  }, [open, original])

  // Focus management: move focus to the field each time the step changes.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
  }, [open, step])

  // Escape closes the wizard.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const preview = useMemo(
    () => (open ? assembleClarifiedPrompt(original, answers) : ''),
    [open, original, answers],
  )

  const delta = useMemo(() => {
    if (!open) return null
    const beforeTok = countTokens(original)
    const afterTok = countTokens(preview)
    return {
      beforeTok,
      afterTok,
      costBefore: sessionPromptCost(beforeTok),
      costAfter: sessionPromptCost(afterTok),
    }
  }, [open, original, preview])

  const setAnswer = (v: string) => setAnswers((a) => ({ ...a, [question.id]: v }))

  const goNext = () => {
    if (isLast) {
      onApply(assembleClarifiedPrompt(original, answers))
      onClose()
      return
    }
    setDir(1)
    setStep((s) => Math.min(s + 1, total - 1))
  }

  const goBack = () => {
    setDir(-1)
    setStep((s) => Math.max(s - 1, 0))
  }

  const skip = () => {
    // Clear this step's answer, then advance (or finish on the last step).
    setAnswers((a) => ({ ...a, [question.id]: '' }))
    if (isLast) {
      onApply(assembleClarifiedPrompt(original, { ...answers, [question.id]: '' }))
      onClose()
      return
    }
    setDir(1)
    setStep((s) => Math.min(s + 1, total - 1))
  }

  const answerValue = answers[question?.id] ?? ''
  const canAdvance = question?.optional || answerValue.trim().length > 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'color-mix(in srgb, var(--md-scrim, #000) 40%, transparent)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Guided prompt improvement"
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="glass flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] p-5 shadow-lg sm:p-6"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* header + progress */}
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-h)' }}>
                  <Sparkles size={15} style={{ color: 'var(--md-primary)' }} />
                  Improve your prompt
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-dim)' }}>
                  Step {step + 1} of {total}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close guided improvement"
                className="md-state md-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200"
                style={{ color: 'var(--md-on-surface-variant)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* progress dots */}
            <div className="mb-5 flex items-center gap-1.5" aria-hidden>
              {CLARIFY_QUESTIONS.map((q, i) => (
                <span
                  key={q.id}
                  className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    background: i <= step ? 'var(--md-primary)' : 'var(--md-surface-container-high)',
                  }}
                />
              ))}
            </div>

            {/* animated step body */}
            <div className="relative min-h-[190px] flex-1 overflow-hidden">
              <AnimatePresence mode="wait" custom={dir}>
                <motion.div
                  key={question.id}
                  custom={dir}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="flex flex-col gap-3"
                >
                  <div>
                    <label
                      htmlFor={`clarify-${question.id}`}
                      className="block text-base font-medium"
                      style={{ color: 'var(--text-h)' }}
                    >
                      {question.title}
                      {question.optional && (
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-dim)' }}>
                          (optional)
                        </span>
                      )}
                    </label>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                      {question.helper}
                    </p>
                  </div>

                  <textarea
                    id={`clarify-${question.id}`}
                    ref={inputRef}
                    value={answerValue}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter (without Shift) advances; Shift+Enter inserts a newline.
                      if (e.key === 'Enter' && !e.shiftKey && canAdvance) {
                        e.preventDefault()
                        goNext()
                      }
                    }}
                    placeholder={question.placeholder}
                    rows={4}
                    className="md-field md-focus w-full resize-none rounded-2xl p-3 text-sm"
                    style={{ color: 'var(--text-h)', background: 'var(--md-surface-container-low)' }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* live before/after delta */}
            {delta && delta.beforeTok > 0 && (
              <div
                className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-2 text-[11px]"
                style={{ background: 'var(--md-surface-container-low)', color: 'var(--text-dim)' }}
              >
                <span>
                  {delta.beforeTok} → <span style={{ color: 'var(--text-h)' }}>{delta.afterTok}</span> tokens
                </span>
                <span aria-hidden style={{ color: 'var(--md-outline)' }}>·</span>
                <span>
                  {formatUSD(delta.costBefore)} → {formatUSD(delta.costAfter)}/call
                </span>
                <span className="opacity-70">({SESSION_MODEL.name})</span>
              </div>
            )}

            {/* nav */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className="md-ghost md-focus inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-30"
                style={{ color: 'var(--md-primary)' }}
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={skip}
                  className="md-ghost md-focus inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all duration-200"
                  style={{ color: 'var(--md-on-surface-variant)' }}
                >
                  <SkipForward size={13} /> Skip
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canAdvance}
                  className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'var(--md-primary)', color: 'var(--md-on-primary)' }}
                >
                  {isLast ? (
                    <>
                      <Check size={14} /> Build my prompt
                    </>
                  ) : (
                    <>
                      Next <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
