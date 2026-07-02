/**
 * rewriteEngine.ts
 * -----------------------------------------------------------------------------
 * The rule-based prompt optimizer. Runs entirely in the browser, no API key.
 *
 * Two layers:
 *  1. Generic cleanup — strip filler/politeness, collapse redundancy, tighten
 *     phrasing, and (if missing) append a sensible output-format constraint.
 *  2. Archetype detection — if the prompt matches a known "intent" (write a
 *     book, blog post, email, debug code, …), we swap the vague ask for a tight
 *     structured template that reliably produces better results.
 */

export interface RewriteResult {
  original: string
  rewritten: string
  /** Which archetype (if any) was detected. */
  archetype: string | null
  /** Human-readable list of transformations applied. */
  changes: string[]
  /** Where the rewrite came from. */
  engine: 'rule-based' | 'ai-boost'
}

/* -------------------------------------------------------------------------- */
/* Generic cleanup                                                            */
/* -------------------------------------------------------------------------- */

// Phrases to strip outright (ordered longest-first so we remove the big ones).
const STRIP_PHRASES: Array<[RegExp, string]> = [
  [/\bi would like you to please\b/gi, ''],
  [/\bi was wondering if you could\b/gi, ''],
  [/\bi was hoping you could\b/gi, ''],
  [/\bif it is not too much trouble,?\b/gi, ''],
  [/\bcould you possibly\b/gi, ''],
  [/\bcould you please\b/gi, ''],
  [/\bwould you kindly\b/gi, ''],
  [/\bwould you please\b/gi, ''],
  [/\bcan you please\b/gi, ''],
  [/\bplease kindly\b/gi, ''],
  [/\bi would like you to\b/gi, ''],
  [/\bi want you to\b/gi, ''],
  [/\bi need you to\b/gi, ''],
  [/\bi'd like you to\b/gi, ''],
  [/\bplease go ahead and\b/gi, ''],
  [/\bplease\b/gi, ''],
  [/\bkindly\b/gi, ''],
  [/\bfeel free to\b/gi, ''],
  [/\bif you could,?\b/gi, ''],
  [/\bthanks so much\b/gi, ''],
  [/\bthanks in advance\b/gi, ''],
  [/\bthanks a lot\b/gi, ''],
  [/\bmany thanks\b/gi, ''],
  [/\bthank you( very much)?\b/gi, ''],
  [/\bthanks\b/gi, ''],
  [/\bneedless to say,?\b/gi, ''],
  [/\bit is important to note that\b/gi, ''],
  [/\bbasically,?\b/gi, ''],
  [/\bactually,?\b/gi, ''],
]

// Wordy → tight replacements.
const TIGHTEN: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, 'to'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\ba large number of\b/gi, 'many'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bwith regard to\b/gi, 'about'],
  [/\bin terms of\b/gi, 'for'],
  [/\beach and every\b/gi, 'every'],
  [/\bfirst and foremost\b/gi, 'first'],
  [/\bend result\b/gi, 'result'],
  [/\bvarious different\b/gi, 'different'],
  [/\bcombine together\b/gi, 'combine'],
  [/\bfree gift\b/gi, 'gift'],
]

function cleanupWhitespace(s: string): string {
  return (
    s
      // Collapse runs of spaces/tabs left behind by removed words.
      .replace(/[ \t]{2,}/g, ' ')
      // Drop a space that now sits before punctuation ("good ," -> "good,").
      .replace(/[ \t]+([.,;:!?])/g, '$1')
      // Collapse duplicated punctuation created by removals (",," / ", ,").
      .replace(/([,;:])(\s*[,;:])+/g, '$1')
      // Remove a comma/semicolon that has been orphaned right before a sentence
      // end or the end of the string ("interesting and good, ." -> "...good.").
      .replace(/[,;:]+\s*([.!?])/g, '$1')
      .replace(/[,;:]+\s*$/g, '')
      // Remove a stray leading comma/space at the very start or after a newline.
      .replace(/(^|\n)[ \t]*[,;:]+[ \t]*/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+/gm, (m) => (m.includes('\n') ? m : ''))
      .trim()
  )
}

/** Capitalize the first letter of each sentence after cleanup. */
function fixCapitalization(s: string): string {
  return s.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase())
}

/* -------------------------------------------------------------------------- */
/* Archetype detection                                                        */
/* -------------------------------------------------------------------------- */

export interface Archetype {
  id: string
  name: string
  /** Keywords that trigger this archetype. */
  keywords: RegExp
  /**
   * Given the user's raw prompt, produce a tight structured replacement.
   * The `topic` is our best guess at what they're actually asking about.
   */
  build: (topic: string) => string
}

/** Pull a rough "topic" out of the prompt after removing the trigger verb. */
function extractTopic(prompt: string): string {
  let t = prompt
    .replace(/^(write|create|make|generate|give me|help me( write| create| make)?|i want|i need|can you|could you|please)\b/gi, '')
    .replace(/^(me )?(a|an|the|some)\b/gi, '')
    .replace(/\b(for me|please|thanks)\b/gi, '')
    .trim()
  // Keep it to a reasonable phrase length.
  t = t.replace(/[.!?].*$/s, '').trim()
  return t || 'your topic'
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'book',
    name: 'Book / long-form fiction',
    keywords: /\b(write|create|make)\b.*\b(book|novel|story|novella)\b|\b(book|novel|story)\b.*\b(about|on)\b/i,
    build: (topic) => `You are an experienced novelist and story architect.

Goal: Produce a book concept and opening for: ${topic}.

Because a full book is too large for one response, work in stages. Start with STAGE 1 only, then wait.

STAGE 1 — Blueprint (do this now):
- Premise (2–3 sentences)
- Genre, tone, and target reader
- Setting overview
- 3–5 main characters, each: name, want, flaw, arc
- A chapter-by-chapter outline (10–15 chapters, one line each)

STAGE 2 (after I approve): Write Chapter 1 in full (~1,500 words).

Constraints: Show, don't tell. Keep continuity notes. Ask me up to 3 clarifying questions first if anything is ambiguous.`,
  },
  {
    id: 'essay',
    name: 'Essay',
    keywords: /\b(write|compose)\b.*\bessay\b|\bessay\b.*\b(about|on)\b/i,
    build: (topic) => `Write a well-structured essay on: ${topic}.

Requirements:
- Length: ~800 words.
- Structure: a clear thesis in the intro, 3 body paragraphs each with one main point + evidence, and a conclusion that synthesizes (doesn't just repeat).
- Tone: analytical and specific; avoid filler and clichés.
- Use concrete examples or data where possible.
- End with one thought-provoking implication.`,
  },
  {
    id: 'blog',
    name: 'Blog post',
    keywords: /\bblog\s*post\b|\barticle\b.*\b(about|on)\b|\bwrite\b.*\bblog\b/i,
    build: (topic) => `Write an engaging blog post about: ${topic}.

Format:
- A hooky title + 1-sentence subtitle.
- ~700 words, scannable: short paragraphs, descriptive H2 subheadings.
- Open with a relatable hook, not a definition.
- Include 3–5 actionable takeaways as a bulleted list.
- Close with a call-to-action question.
- Audience: general readers new to the topic. Tone: friendly, concrete, no fluff.`,
  },
  {
    id: 'email',
    name: 'Email',
    keywords: /\b(write|draft|compose|send)\b.*\bemail\b|\bemail\b.*\b(to|about|for)\b/i,
    build: (topic) => `Draft a professional email about: ${topic}.

Provide:
- A clear, specific subject line.
- A greeting, a 2–4 sentence body that states the purpose up front and the ask/next step, and a sign-off.
- Tone: polite but concise; no filler.
- Keep it under 120 words.
- If key details are missing (recipient, deadline, context), list them as [bracketed placeholders] for me to fill in.`,
  },
  {
    id: 'code',
    name: 'Code / debugging',
    keywords: /\b(code|function|script|bug|debug|error|program|refactor|implement|api|component)\b/i,
    build: (topic) => `Act as a senior software engineer. Task: ${topic}.

Please:
- State any assumptions before coding.
- Provide complete, runnable code with brief inline comments only where non-obvious.
- Specify the language/version and any dependencies.
- Include a short usage example and note edge cases or failure modes.
- If debugging: explain the root cause first, then the fix, then how to verify it.

Keep prose minimal; prioritize working code.`,
  },
  {
    id: 'summarize',
    name: 'Summarization',
    keywords: /\b(summari[sz]e|summary|tl;?dr|condense|recap)\b/i,
    build: (topic) => `Summarize the following: ${topic}.

Output:
- A one-sentence TL;DR.
- 3–5 bullet points covering the key ideas (no minor details).
- Preserve any critical numbers, names, or conclusions.
- Neutral tone; do not add opinions or information not in the source.
- Target length: ~120 words total.`,
  },
  {
    id: 'translate',
    name: 'Translation',
    keywords: /\btranslat(e|ion)\b|\binto (spanish|french|german|chinese|japanese|italian|portuguese|korean|arabic|hindi)\b/i,
    build: (topic) => `Translate the following text: ${topic}.

Rules:
- Preserve meaning, tone, and register (formal vs casual).
- Keep names, code, and placeholders unchanged.
- If a phrase is idiomatic, prefer a natural equivalent over a literal translation and add a brief [note] if meaning shifts.
- Output only the translation unless I ask for explanation.
- Specify the source and target language explicitly: [source] → [target].`,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm / ideation',
    keywords: /\b(brainstorm|ideas?|ideate|come up with|suggestions?)\b/i,
    build: (topic) => `Brainstorm ideas for: ${topic}.

Give me:
- 10 distinct ideas, ranging from safe/obvious to bold/unconventional.
- One line each: the idea + why it could work.
- Group them into 2–3 themes.
- Flag your top 3 picks and the single biggest risk for each.
Prioritize variety over volume; no repeats.`,
  },
  {
    id: 'resume',
    name: 'Resume / cover letter',
    keywords: /\b(resume|cv|cover letter|job application)\b/i,
    build: (topic) => `Help me with: ${topic}.

Produce a tailored draft that:
- Leads with impact, not duties (use "achieved X by doing Y, resulting in Z").
- Quantifies results wherever possible.
- Mirrors the language of the target role/industry.
- Stays to one page (resume) or ~250 words (cover letter).
- Uses [bracketed placeholders] for any specifics I haven't provided (company, metrics, dates).
Ask me for the target job description if I haven't given one.`,
  },
  {
    id: 'business',
    name: 'Business plan',
    keywords: /\bbusiness plan\b|\bstartup\b.*\bplan\b|\bgo[- ]to[- ]market\b/i,
    build: (topic) => `Draft a concise business plan for: ${topic}.

Cover these sections, one short paragraph or bulleted list each:
1. Problem & target customer
2. Solution & unique value proposition
3. Market size (rough estimate + reasoning)
4. Business/revenue model
5. Go-to-market strategy
6. Key risks & mitigations
7. First 90-day milestones

Be specific and realistic; flag assumptions. Keep the whole plan under ~600 words.`,
  },
  {
    id: 'social',
    name: 'Social media post',
    keywords: /\b(tweet|twitter|linkedin|instagram|social( media)? post|caption|thread)\b/i,
    build: (topic) => `Write a social media post about: ${topic}.

Deliver:
- 3 variations (different angles/hooks).
- Platform-appropriate length and tone (tell me which platform you assumed).
- A strong first line that stops the scroll.
- 3–5 relevant hashtags.
- One optional CTA.
No hashtag stuffing, no generic motivational filler.`,
  },
  {
    id: 'presentation',
    name: 'Presentation outline',
    keywords: /\b(presentation|slide deck|slides|pitch deck|keynote|talk)\b/i,
    build: (topic) => `Create a presentation outline on: ${topic}.

For a ~10-slide deck, give me for each slide:
- Slide title
- 2–3 bullet points (the actual talking points, not placeholders)
- A note on any visual/chart that would help

Structure it as: hook → context → core argument (3 slides) → evidence → objection/counter → summary → call to action. Keep bullets tight and speakable.`,
  },
  {
    id: 'analysis',
    name: 'Analysis / report',
    keywords: /\b(analy[sz]e|analysis|report|evaluate|assessment|review of)\b/i,
    build: (topic) => `Produce a structured analysis of: ${topic}.

Format:
- Executive summary (2–3 sentences).
- Key findings as bullets, most important first.
- Supporting reasoning/data for each finding.
- Risks, caveats, or unknowns.
- Clear, prioritized recommendations.
Be objective; separate fact from inference. Target ~500 words.`,
  },
]

export function detectArchetype(prompt: string): Archetype | null {
  for (const a of ARCHETYPES) {
    if (a.keywords.test(prompt)) return a
  }
  return null
}

/* -------------------------------------------------------------------------- */
/* Main entry                                                                 */
/* -------------------------------------------------------------------------- */

export function ruleBasedRewrite(original: string): RewriteResult {
  const changes: string[] = []
  const trimmed = original.trim()

  if (!trimmed) {
    return { original, rewritten: '', archetype: null, changes: [], engine: 'rule-based' }
  }

  // 1. Try archetype detection first — this is the highest-leverage transform.
  const archetype = detectArchetype(trimmed)
  if (archetype) {
    const topic = extractTopic(trimmed)
    const rewritten = archetype.build(topic)
    changes.push(
      `Detected intent: "${archetype.name}" — replaced a vague ask with a proven structured template.`,
      'Added explicit output format, constraints, and staged instructions.',
      'Told the model what role to take and to ask clarifying questions when needed.',
    )
    return { original, rewritten, archetype: archetype.name, changes, engine: 'rule-based' }
  }

  // 2. Generic cleanup path.
  let s = trimmed
  let strippedAny = false
  for (const [re, rep] of STRIP_PHRASES) {
    if (re.test(s)) {
      s = s.replace(re, rep)
      strippedAny = true
    }
  }
  if (strippedAny) changes.push('Removed filler and politeness padding.')

  let tightenedAny = false
  for (const [re, rep] of TIGHTEN) {
    if (re.test(s)) {
      s = s.replace(re, rep)
      tightenedAny = true
    }
  }
  if (tightenedAny) changes.push('Tightened wordy phrases into direct wording.')

  s = cleanupWhitespace(s)
  s = fixCapitalization(s)

  // 3. Add an output-format constraint if none is present.
  const lower = s.toLowerCase()
  const hasFormat = /\b(json|markdown|table|bullet|list|numbered|words|sentences|paragraph|format|steps|headings)\b/.test(
    lower,
  )
  if (!hasFormat && s.split(/\s+/).length >= 6) {
    s += '\n\nOutput format: respond concisely and in a clearly structured form (use bullet points or short sections). State any assumptions.'
    changes.push('Added an explicit output-format instruction.')
  }

  if (changes.length === 0) {
    changes.push('Your prompt is already lean — no filler or structure issues found.')
  }

  return { original, rewritten: s, archetype: null, changes, engine: 'rule-based' }
}

/* -------------------------------------------------------------------------- */
/* Word-level diff (LCS)                                                       */
/* -------------------------------------------------------------------------- */

export type DiffOp = 'equal' | 'insert' | 'delete'
export interface DiffPart {
  op: DiffOp
  text: string
}

/** Tokenize into words + whitespace so we can render an inline word diff. */
function splitWords(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? []
}

/** Classic LCS-based word diff. Good enough for prompt-sized text. */
export function wordDiff(a: string, b: string): DiffPart[] {
  const aw = splitWords(a)
  const bw = splitWords(b)
  const n = aw.length
  const m = bw.length

  // DP table of LCS lengths.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aw[i] === bw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const parts: DiffPart[] = []
  let i = 0
  let j = 0
  const push = (op: DiffOp, text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.op === op) last.text += text
    else parts.push({ op, text })
  }
  while (i < n && j < m) {
    if (aw[i] === bw[j]) {
      push('equal', aw[i])
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('delete', aw[i])
      i++
    } else {
      push('insert', bw[j])
      j++
    }
  }
  while (i < n) push('delete', aw[i++])
  while (j < m) push('insert', bw[j++])
  return parts
}
