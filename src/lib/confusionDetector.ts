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
  | 'noexamples'
  | 'nostructure'
  | 'shorthand'

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
  noexamples: {
    label: 'No example given',
    color: '#c78bff',
    blurb:
      'Anthropic recommends showing an example for complex or creative asks — a sample makes the model far more likely to match what you want.',
  },
  nostructure: {
    label: 'No structure / delimiters',
    color: '#7fa8ff',
    blurb:
      'Anthropic recommends XML tags or clear delimiters to separate instructions from context in longer prompts, so the model doesn’t blur them together.',
  },
  shorthand: {
    label: 'Undefined shorthand',
    color: '#ffca6b',
    blurb:
      'An acronym or abbreviation the model may not know in your context. Spell it out once so it doesn’t have to guess.',
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

// Well-known acronyms/abbreviations we should NOT flag — everyone (and every
// model) knows these, so flagging them would just be noise. Compared
// case-insensitively. Err generous: adding a term here only suppresses a fuzzy
// heuristic that was always going to be imperfect.
const KNOWN_ACRONYMS = new Set(
  [
    // tech / web
    'ai', 'api', 'apis', 'url', 'urls', 'html', 'css', 'json', 'xml', 'yaml',
    'sql', 'sdk', 'sdks', 'ui', 'ux', 'cli', 'ide', 'os', 'app', 'apps', 'web',
    'http', 'https', 'ftp', 'ssh', 'dns', 'ip', 'cpu', 'gpu', 'ram', 'ssd',
    'usb', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'csv', 'md', 'db',
    'llm', 'llms', 'ml', 'nlp', 'saas', 'paas', 'iaas', 'crm', 'cms', 'seo',
    // business / roles
    'ceo', 'cto', 'cfo', 'coo', 'cmo', 'vp', 'hr', 'pr', 'roi', 'kpi', 'kpis',
    'b2b', 'b2c', 'faq', 'faqs', 'eta', 'ceo', 'id', 'ids', 'q1', 'q2', 'q3',
    'q4', 'ytd', 'mvp', 'poc', 'sla', 'nda', 'rfp', 'p&l',
    // common everyday
    'ok', 'tv', 'pc', 'usa', 'uk', 'eu', 'us', 'un', 'ceo', 'asap', 'fyi',
    'diy', 'faq', 'aka', 'etc', 'vs', 'am', 'pm', 'usd', 'eur', 'gbp',
    'gmt', 'utc', 'ceo', 'ok', 'iq', 'phd', 'mba', 'gpa', 'sat', 'gps',
    'covid', 'nasa', 'fbi', 'cia', 'gdp', 'atm', 'pin', 'otp',
  ].map((w) => w.toLowerCase()),
)

// Short English words that are NOT acronyms — a stoplist so the heuristic
// doesn't flag ordinary vocabulary that happens to be short/lowercase.
const SHORT_STOPWORDS = new Set([
  'the', 'and', 'for', 'but', 'not', 'you', 'all', 'any', 'can', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new',
  'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put',
  'say', 'she', 'too', 'use', 'are', 'this', 'that', 'with', 'have', 'from',
  'they', 'will', 'your', 'them', 'then', 'than', 'when', 'what', 'were',
  'been', 'more', 'some', 'time', 'very', 'into', 'just', 'over', 'also',
  'back', 'want', 'much', 'need', 'make', 'made', 'like', 'good', 'both',
  'each', 'even', 'here', 'many', 'most', 'must', 'only', 'such', 'take',
  'well', 'work', 'help', 'give', 'find', 'show', 'tell', 'keep', 'team',
  'food', 'client', 'about', 'their', 'there', 'these', 'those', 'would',
  'could', 'should', 'apt', 'via', 'per', 'yes', 'off', 'top', 'end',
  'add', 'ask', 'run', 'set', 'due', 'far', 'few', 'lot', 'own',
  'name', 'goal', 'plan', 'list', 'note', 'item', 'part', 'step', 'idea',
  'word', 'line', 'page', 'text', 'data', 'info', 'user', 'apps',
])

// Candidate tokens: 2–6 letters, all one case (fully lowercase like "ccm"/"wrt"
// or fully uppercase like "CCM"/"KPI"). Mixed/Title case is skipped — that's a
// normal capitalized word, not shorthand.
const SHORTHAND_TOKEN = /\b([a-z]{2,6}|[A-Z]{2,6})\b/g

/**
 * Whether `token` looks like undefined domain shorthand worth flagging.
 *
 * Conservative by design — there is no real dictionary here, so we lean on a
 * few tight signals and bail on anything whitelisted or in the short-word
 * stoplist:
 *   - all-caps 2–6 letters ("CCM", "KPI")           → shorthand
 *   - all-lowercase with NO vowel ("ccm", "wrt")     → shorthand
 * Vowel-containing lowercase words (e.g. "seo", "roi") are left alone unless
 * whitelisted, since they read like ordinary words and drive false positives.
 */
function looksLikeShorthand(token: string): boolean {
  const lower = token.toLowerCase()
  if (KNOWN_ACRONYMS.has(lower)) return false
  if (SHORT_STOPWORDS.has(lower)) return false
  // All-caps 2–6 letters is a strong acronym signal.
  if (/^[A-Z]{2,6}$/.test(token)) return true
  // All-lowercase 2–6 letters with no vowel at all ("ccm", "wrt", "mgmt",
  // "cttc") is almost never an English word — treat as shorthand.
  if (/^[a-z]{2,6}$/.test(token) && !/[aeiou]/.test(token)) return true
  return false
}

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

  // 8. Complex/creative task with no example given (Anthropic: examples /
  // few-shot prompting materially improve results on non-trivial tasks). We
  // fire a whole-prompt flag when the prompt asks for a creative/complex
  // deliverable, is non-trivial in length, and shows no sign of an example.
  {
    const lower = text.toLowerCase()
    const words = text.trim().split(/\s+/).length
    const asksComplex =
      /\b(write|draft|compose|generate|create|design|build|classify|categorize|extract|summariz|translat|rewrite|analy[sz]e|essay|story|poem|email|script|plan|outline)\b/i.test(
        text,
      )
    // Rough "has an example" signals: an explicit example marker, quoted sample,
    // or few-shot-style delimiters.
    const hasExample =
      /\b(for example|e\.g\.|for instance|such as|like this|here('| i)s an example|example:|sample:)\b/i.test(
        lower,
      ) || /(^|\n)\s*(input|output|example)\s*[:-]/i.test(text)
    if (asksComplex && !hasExample && words >= 15) {
      flags.push({
        category: 'noexamples',
        start: 0,
        end: 0, // whole-prompt flag
        match: '',
        label: 'No example provided',
        explanation:
          'Anthropic’s prompting guidance: for complex or creative tasks, showing even one example (few-shot) sharply improves how well the model matches your intent. Add a short "here’s the style/shape I want" sample.',
        suggestion: 'Add one concrete example of the output you want.',
      })
    }
  }

  // 9. Long/complex prompt with no structural delimiters (Anthropic: use XML
  // tags or clear delimiters to separate instructions from context/data in
  // longer prompts). Fire when the prompt is long yet has no XML tags, no
  // markdown headings/fences, and no clearly labeled sections.
  {
    const words = text.trim().split(/\s+/).length
    const hasXml = /<[a-zA-Z][\w-]*>[\s\S]*<\/[a-zA-Z][\w-]*>/.test(text) || /<[a-zA-Z][\w-]*\s*\/?>/.test(text)
    const hasFence = /```/.test(text) || /(^|\n)#{1,6}\s/.test(text)
    const hasTripleQuote = /"""|'''/.test(text)
    // Labeled sections like "Context:", "Instructions:", "Task:" on their own.
    const hasLabeledSection = /(^|\n)\s*[A-Z][A-Za-z ]{2,20}:\s*(\n|$)/.test(text)
    const structured = hasXml || hasFence || hasTripleQuote || hasLabeledSection
    if (!structured && words >= 60) {
      flags.push({
        category: 'nostructure',
        start: 0,
        end: 0, // whole-prompt flag
        match: '',
        label: 'No structure / delimiters',
        explanation:
          'Anthropic’s prompting guidance: in longer prompts, wrap context/data in XML tags (e.g. <context>…</context>) or use clear delimiters so the model can tell instructions apart from the material it should act on.',
        suggestion: 'Wrap background/data in XML tags or labeled sections.',
      })
    }
  }

  // 10. Undefined shorthand / acronyms — short tokens that look like domain
  // abbreviations the downstream model can't be expected to infer (e.g. "ccm",
  // "wrt"). We highlight the matched token as a span (like `vague`), skip
  // well-known acronyms and common short words, and skip a token that already
  // defines itself inline via a following parenthetical (e.g. "ccm (customer
  // communication management)"). Inherently fuzzy with no real dictionary, so
  // kept conservative to limit false positives.
  {
    let m: RegExpExecArray | null
    SHORTHAND_TOKEN.lastIndex = 0
    while ((m = SHORTHAND_TOKEN.exec(text)) !== null) {
      const token = m[0]
      if (looksLikeShorthand(token)) {
        // Skip if the token is immediately followed by its own expansion in
        // parentheses — the user already spelled it out.
        const after = text.slice(m.index + token.length, m.index + token.length + 3)
        const definedInline = /^\s*\(/.test(after)
        if (!definedInline) {
          flags.push({
            category: 'shorthand',
            start: m.index,
            end: m.index + token.length,
            match: token,
            label: 'Shorthand',
            explanation: `The model may not know what “${token}” means in your context — spell it out once (e.g. “${token} (…full term…)”) so it doesn't have to guess.`,
            suggestion: 'Define the acronym on first use.',
          })
        }
      }
      if (m.index === SHORTHAND_TOKEN.lastIndex) SHORTHAND_TOKEN.lastIndex++
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
