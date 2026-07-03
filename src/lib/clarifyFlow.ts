/**
 * clarifyFlow.ts
 * -----------------------------------------------------------------------------
 * The guided Q&A ("Clarify") flow for vague / under-specified prompts.
 *
 * This is intentionally SEPARATE from the archetype template gallery: rather
 * than swapping in a category-specific template, it asks a handful of GENERIC
 * questions that apply to any prompt, then assembles the original ask plus the
 * answers into a clear, structured prompt.
 *
 * The assembled output mirrors the "Goal / Context / Constraints / Notes" voice
 * used by the archetype templates in rewriteEngine.ts for consistency, but is
 * deliberately archetype-agnostic.
 */

import { detectConfusion } from './confusionDetector'

/* --------------------------------- trigger -------------------------------- */

/** Word count below which we consider a prompt "short". */
const SHORT_WORD_THRESHOLD = 20
/** Word count below which a bare, unspecified ask is itself a vague signal. */
const VERY_SHORT_WORD_THRESHOLD = 8

/** Keywords that signal the prompt already carries a format/length/style spec. */
const SPEC_HINTS =
  /\b(json|markdown|table|bullet|list|numbered|csv|xml|yaml|headings?|paragraphs?|words?|sentences?|format|schema|columns?|steps?|tone|formal|casual|under \d|less than \d|\d+[- ]?word|word count|characters?|pages?)\b/i

/**
 * Whether the guided flow should be *offered* for this prompt.
 *
 * We build on the existing confusion heuristics rather than inventing a wholly
 * new one. The banner appears when the prompt is short (under ~20 words) AND
 * either:
 *   - the detector already raised a "vague word" or "no output format" flag, or
 *   - the prompt is very short (under ~8 words) with no format/length/style
 *     spec at all — a bare ask like "write me a book about dragons" that would
 *     otherwise dodge the word-count-gated format flag.
 * Well-specified prompts and empty prompts never trigger it.
 */
export function shouldOfferClarify(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false

  const words = trimmed.split(/\s+/).filter(Boolean).length
  if (words < 4) return false // too little to build anything meaningful from
  if (words >= SHORT_WORD_THRESHOLD) return false

  const flags = detectConfusion(trimmed)
  const hasSpec = SPEC_HINTS.test(trimmed)
  // Treat the detector's format flag as meaningful only when the prompt truly
  // lacks any spec — the detector's format keyword list is narrower than
  // SPEC_HINTS, so "500-word formal email" would otherwise falsely flag.
  const hasFlagSignal = flags.some(
    (f) => f.category === 'vague' || (f.category === 'format' && !hasSpec),
  )

  // A bare, very-short ask with no explicit spec is itself under-specified,
  // even when it dodges the detector's word-count-gated format flag.
  const bareShortAsk = words < VERY_SHORT_WORD_THRESHOLD && !hasSpec

  return hasFlagSignal || bareShortAsk
}

/* --------------------------------- steps ---------------------------------- */

export interface ClarifyQuestion {
  id: 'goal' | 'audience' | 'constraints' | 'notes'
  /** Section heading used when assembling the final prompt. */
  section: string
  title: string
  helper: string
  placeholder: string
  /** Whether an answer is required to advance (last step is optional). */
  optional: boolean
}

export const CLARIFY_QUESTIONS: ClarifyQuestion[] = [
  {
    id: 'goal',
    section: 'Goal',
    title: "What's the main goal here — what do you actually want to end up with?",
    helper: 'Be concrete about the deliverable. We prefilled your original ask as a starting point.',
    placeholder: 'e.g. A finished short story, a working script, a decision recommendation…',
    optional: false,
  },
  {
    id: 'audience',
    section: 'Context',
    title: 'Who or what is this for?',
    helper: 'Audience, purpose, or use case — this shapes tone and depth.',
    placeholder: 'e.g. For my team, for beginners, for a client pitch…',
    optional: false,
  },
  {
    id: 'constraints',
    section: 'Constraints',
    title: 'Any format, length, or style requirements?',
    helper: 'Even rough ones help the model shape the answer predictably.',
    placeholder: 'e.g. Under 500 words · formal tone · bullet points · JSON…',
    optional: false,
  },
  {
    id: 'notes',
    section: 'Additional notes',
    title: 'Anything else the model should know?',
    helper: 'Optional — extra background, examples to follow, things to avoid.',
    placeholder: 'e.g. Avoid jargon · match the attached example · UK spelling…',
    optional: true,
  },
]

export type ClarifyAnswers = Record<ClarifyQuestion['id'], string>

export function emptyAnswers(): ClarifyAnswers {
  return { goal: '', audience: '', constraints: '', notes: '' }
}

/* -------------------------------- assembly -------------------------------- */

/**
 * Assemble the original ask + the user's answers into a clear, structured
 * prompt. Skipped/blank answers are omitted so the result stays clean. If the
 * user skipped essentially everything, we fall back to their original ask plus
 * a generic structure nudge so the output is never worse than the input.
 */
export function assembleClarifiedPrompt(original: string, answers: ClarifyAnswers): string {
  const originalAsk = original.trim()
  const goal = answers.goal.trim()
  const audience = answers.audience.trim()
  const constraints = answers.constraints.trim()
  const notes = answers.notes.trim()

  const answered = [goal, audience, constraints, notes].filter(Boolean).length

  // If nothing meaningful was provided, don't fabricate structure — just return
  // the original with a light output-format nudge.
  if (answered === 0) {
    if (!originalAsk) return originalAsk
    return `${originalAsk}\n\nOutput format: respond in a clearly structured form (short sections or bullet points) and state any assumptions.`
  }

  const lines: string[] = []

  // Lead with the request. Prefer the user's stated goal; keep the original ask
  // as context so nothing is lost.
  lines.push(goal ? `Task: ${goal}` : `Task: ${originalAsk}`)
  lines.push('')

  if (goal && originalAsk && goal.toLowerCase() !== originalAsk.toLowerCase()) {
    lines.push(`Original request: ${originalAsk}`)
    lines.push('')
  }

  if (audience) {
    lines.push('Context')
    lines.push(`- Intended for: ${audience}`)
    lines.push('')
  }

  if (constraints) {
    lines.push('Constraints')
    lines.push(`- ${constraints}`)
    lines.push('')
  } else {
    // No explicit constraints — add a sensible default so output stays shaped.
    lines.push('Constraints')
    lines.push('- Respond in a clearly structured form (short sections or bullet points).')
    lines.push('')
  }

  if (notes) {
    lines.push('Additional notes')
    lines.push(`- ${notes}`)
    lines.push('')
  }

  lines.push('If any key detail is missing, ask up to 3 clarifying questions before proceeding.')

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
