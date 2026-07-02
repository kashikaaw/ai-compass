/**
 * confusionDetector.ts
 * -----------------------------------------------------------------------------
 * Rule-based heuristics that scan a prompt for things that either waste tokens
 * or degrade output quality. Each match returns a char span plus a short,
 * plain-English explanation of *why* it matters.
 *
 * These are intentionally lightweight regex/keyword heuristics — no ML — so the
 * whole thing runs instantly in the browser with zero setup.
 */

export type FlagCategory =
  | 'filler'
  | 'vague'
  | 'pronoun'
  | 'redundant'
  | 'contradiction'
  | 'format'
  | 'runon'

export interface Flag {
  category: FlagCategory
  /** Inclusive start offset. */
  start: number
  /** Exclusive end offset. */
  end: number
  /** The exact matched text. */
  match: string
  /** Short label shown on the chip. */
  label: string
  /** Plain-English why-it-matters. */
  explanation: string
  /** Optional concrete suggestion. */
  suggestion?: string
}

export interface CategoryMeta {
  label: string
  color: string
  blurb: string
}

export const CATEGORY_META: Record<FlagCategory, CategoryMeta> = {
  filler: {
    label: 'Filler / politeness',
    color: '#ffb454',
    blurb: 'Padding words the model does not need. Costs tokens, adds nothing.',
  },
  vague: {
    label: 'Vague word',
    color: '#ff6b8a',
    blurb: 'Subjective terms the model has to guess at, leading to generic output.',
  },
  pronoun: {
    label: 'Ambiguous reference',
    color: '#c084fc',
    blurb: 'A pronoun whose target is unclear — the model may resolve it wrong.',
  },
  redundant: {
    label: 'Redundant phrasing',
    color: '#4dd6ff',
    blurb: 'Says the same thing twice. Trim to one clear instruction.',
  },
  contradiction: {
    label: 'Possible contradiction',
    color: '#ff6b8a',
    blurb: 'Two instructions that may conflict — pick one.',
  },
  format: {
    label: 'No output format',
    color: '#3ddc97',
    blurb: 'You did not say how you want the answer shaped, so you get whatever.',
  },
  runon: {
    label: 'Run-on sentence',
    color: '#8890a8',
    blurb: 'A very long sentence is harder for the model to parse reliably.',
  },
}

/** Case-insensitive multi-phrase matcher that records every span. */
function matchPhrases(
  text: string,
  phrases: string[],
  build: (m: RegExpExecArray) => Omit<Flag, 'start' | 'end' | 'match'>,
): Flag[] {
  const flags: Flag[] = []
  for (const phrase of phrases) {
    // Word-boundary where the phrase starts/ends with a word char.
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const boundaryStart = /^\w/.test(phrase) ? '\\b' : ''
    const boundaryEnd = /\w$/.test(phrase) ? '\\b' : ''
    const re = new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      flags.push({ start: m.index, end: m.index + m[0].length, match: m[0], ...build(m) })
      if (m.index === re.lastIndex) re.lastIndex++ // guard against zero-length
    }
  }
  return flags
}

const FILLER_PHRASES = [
  'i would like you to please',
  'i would like you to',
  'i want you to',
  'could you possibly',
  'could you please',
  'would you please',
  'would you kindly',
  'if you could',
  'if it is not too much trouble',
  'please kindly',
  'i was wondering if you could',
  'i was hoping you could',
  'can you please',
  'please go ahead and',
  'feel free to',
  'as an ai',
  'i need you to',
  'thanks in advance',
  'thank you very much',
  'in order to',
  'for the purpose of',
  'due to the fact that',
  'at this point in time',
  'it is important to note that',
  'needless to say',
  'basically',
  'actually',
  'really',
  'very',
  'just',
]

const VAGUE_WORDS = [
  'good',
  'nice',
  'better',
  'best',
  'great',
  'some',
  'stuff',
  'things',
  'interesting',
  'engaging',
  'compelling',
  'appropriate',
  'relevant',
  'proper',
  'suitable',
  'a lot',
  'quality',
  'high-quality',
  'professional',
  'modern',
  'clean',
  'creative',
  'unique',
]

const REDUNDANT_PHRASES = [
  'each and every',
  'first and foremost',
  'end result',
  'final outcome',
  'past history',
  'advance planning',
  'close proximity',
  'exactly the same',
  'completely finished',
  'basic fundamentals',
  'new innovation',
  'unexpected surprise',
  'combine together',
  'brief summary',
  'past experience',
  'various different',
]

const AMBIGUOUS_PRONOUNS = ['it', 'this', 'that', 'they', 'them', 'these', 'those']

// Pairs of directives that commonly contradict each other.
const CONTRADICTION_PAIRS: Array<[RegExp, RegExp, string]> = [
  [/\bbrief\b|\bconcise\b|\bshort\b|\bsuccinct\b/i, /\bdetailed\b|\bcomprehensive\b|\bin[- ]depth\b|\bthorough\b|\bexhaustive\b/i, '“brief/concise” vs “detailed/comprehensive”'],
  [/\bformal\b/i, /\bcasual\b|\bconversational\b|\binformal\b/i, '“formal” vs “casual/conversational”'],
  [/\bsimple\b|\bsimply\b/i, /\bcomplex\b|\btechnical\b|\bsophisticated\b/i, '“simple” vs “complex/technical”'],
  [/\bcreative\b/i, /\bfactual\b|\baccurate\b|\bstrictly\b/i, '“creative” vs “strictly factual”'],
]

const FORMAT_HINTS = [
  'json',
  'markdown',
  'table',
  'bullet',
  'list',
  'numbered',
  'csv',
  'xml',
  'yaml',
  'headings',
  'paragraph',
  'word count',
  'words',
  'sentences',
  'format',
  'schema',
  'columns',
  'steps',
]

export function detectConfusion(text: string): Flag[] {
  if (!text.trim()) return []
  const flags: Flag[] = []

  // 1. Filler / politeness padding
  flags.push(
    ...matchPhrases(text, FILLER_PHRASES, () => ({
      category: 'filler',
      label: 'Filler',
      explanation:
        'Politeness/padding the model ignores for quality but still pays tokens for. Cut it and use a direct instruction.',
      suggestion: 'Delete or replace with a direct verb.',
    })),
  )

  // 2. Vague adjectives
  flags.push(
    ...matchPhrases(text, VAGUE_WORDS, (m) => ({
      category: 'vague',
      label: 'Vague',
      explanation: `“${m[0]}” is subjective — the model has to guess what you mean, so you get generic output. Say what specifically you want.`,
      suggestion: 'Replace with a concrete, measurable requirement.',
    })),
  )

  // 3. Redundant phrasing
  flags.push(
    ...matchPhrases(text, REDUNDANT_PHRASES, (m) => ({
      category: 'redundant',
      label: 'Redundant',
      explanation: `“${m[0]}” repeats itself. One of the words is enough.`,
      suggestion: 'Keep one word.',
    })),
  )

  // 4. Ambiguous pronouns — only flag when there are 2+ candidate nouns before
  // it, which is a rough proxy for "unclear antecedent".
  {
    const re = new RegExp(`\\b(${AMBIGUOUS_PRONOUNS.join('|')})\\b`, 'gi')
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const before = text.slice(0, m.index)
      // crude noun proxy: count capitalized words + "the X" occurrences earlier in the sentence
      const sentenceStart = Math.max(
        before.lastIndexOf('.'),
        before.lastIndexOf('\n'),
        before.lastIndexOf('!'),
        before.lastIndexOf('?'),
      )
      const sentence = before.slice(sentenceStart + 1)
      const nounish = (sentence.match(/\b(the|a|an|my|your|our|their)\s+\w+/gi) || []).length
      if (nounish >= 2 && m.index > 0) {
        flags.push({
          category: 'pronoun',
          start: m.index,
          end: m.index + m[0].length,
          match: m[0],
          label: 'Unclear reference',
          explanation: `“${m[0]}” could point to more than one thing mentioned earlier. Name the thing explicitly so the model doesn't guess.`,
          suggestion: 'Replace the pronoun with the specific noun.',
        })
      }
      if (m.index === re.lastIndex) re.lastIndex++
    }
  }

  // 5. Contradictions
  for (const [a, b, desc] of CONTRADICTION_PAIRS) {
    const ma = a.exec(text)
    const mb = b.exec(text)
    if (ma && mb) {
      // Flag the second occurrence (the one that creates tension).
      const target = ma.index > mb.index ? ma : mb
      flags.push({
        category: 'contradiction',
        start: target.index,
        end: target.index + target[0].length,
        match: target[0],
        label: 'Conflicts',
        explanation: `This looks like a contradiction: ${desc}. The model can't fully satisfy both — pick one.`,
        suggestion: 'Choose a single direction.',
      })
    }
  }

  // 6. Missing output format — a single whole-prompt flag (no span highlight),
  // emitted only when the prompt is non-trivial and mentions no format hint.
  {
    const lower = text.toLowerCase()
    const hasFormat = FORMAT_HINTS.some((h) => lower.includes(h))
    const words = text.trim().split(/\s+/).length
    if (!hasFormat && words >= 8) {
      flags.push({
        category: 'format',
        start: 0,
        end: 0, // whole-prompt flag, not a span
        match: '',
        label: 'No output format specified',
        explanation:
          'You never told the model how to shape the answer (length, structure, format). Adding "Respond as a numbered list" or "Keep it under 150 words" makes results far more predictable.',
        suggestion: 'Add an explicit output-format line.',
      })
    }
  }

  // 7. Run-on sentences — 40+ words with no terminal punctuation.
  {
    const sentences = text.split(/(?<=[.!?])\s+/)
    let offset = 0
    for (const s of sentences) {
      const wc = s.trim().split(/\s+/).filter(Boolean).length
      if (wc >= 40) {
        const start = text.indexOf(s, offset)
        if (start >= 0) {
          flags.push({
            category: 'runon',
            start,
            end: start + s.length,
            match: s.slice(0, 60) + (s.length > 60 ? '…' : ''),
            label: `Run-on (${wc} words)`,
            explanation:
              'A very long sentence packs multiple instructions the model may drop or blur together. Break it into short, separate directives.',
            suggestion: 'Split into 2–3 short sentences or bullet points.',
          })
        }
      }
      offset += s.length
    }
  }

  // De-dupe overlapping identical spans and sort by position.
  const seen = new Set<string>()
  const unique = flags.filter((f) => {
    const key = `${f.category}:${f.start}:${f.end}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  unique.sort((a, b) => a.start - b.start)

  // Merge overlapping spans of the same category so the user doesn't see the
  // same underlying issue flagged twice (e.g. "i would like you to please" and
  // "i would like you to" both matching the same run of text). We keep the
  // widest span and prefer the longer matched text for the chip.
  const merged: Flag[] = []
  for (const f of unique) {
    // Whole-prompt flags (zero-length spans like the format hint) never merge.
    if (f.end <= f.start) {
      merged.push(f)
      continue
    }
    const prev = merged[merged.length - 1]
    if (
      prev &&
      prev.category === f.category &&
      prev.end > prev.start &&
      f.start < prev.end // spans overlap
    ) {
      // Keep the longer of the two matched phrases as the representative flag.
      if (f.end - f.start > prev.end - prev.start) {
        prev.match = f.match
        prev.label = f.label
        prev.explanation = f.explanation
        prev.suggestion = f.suggestion
      }
      prev.end = Math.max(prev.end, f.end)
      continue
    }
    merged.push({ ...f })
  }
  return merged
}
