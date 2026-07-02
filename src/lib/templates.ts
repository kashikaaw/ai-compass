/**
 * templates.ts
 * -----------------------------------------------------------------------------
 * The template gallery. Each template is a common prompt archetype exposed as
 * a small "mad-libs" form: the user fills a few fields and we assemble an
 * already-optimized, structured prompt ready to drop into the workbench.
 *
 * This directly solves the "someone types 'write me a book'" problem: instead
 * of a vague ask, they get a tight, well-scoped prompt.
 */

export interface TemplateField {
  key: string
  label: string
  placeholder: string
  /** Rendered as a textarea instead of a single-line input. */
  multiline?: boolean
  /** Optional preset value. */
  defaultValue?: string
}

export interface Template {
  id: string
  name: string
  /** lucide-react icon name; resolved in the component. */
  icon: string
  tagline: string
  fields: TemplateField[]
  /** Assemble the final prompt from filled field values. */
  assemble: (v: Record<string, string>) => string
}

const g = (v: Record<string, string>, k: string, fallback: string) =>
  (v[k] && v[k].trim()) || fallback

export const TEMPLATES: Template[] = [
  {
    id: 'book',
    name: 'Book',
    icon: 'BookOpen',
    tagline: 'Turn "write me a book" into a real plan.',
    fields: [
      { key: 'topic', label: 'What is the book about?', placeholder: 'a detective who can taste lies' },
      { key: 'genre', label: 'Genre', placeholder: 'mystery / sci-fi / romance', defaultValue: 'literary fiction' },
      { key: 'audience', label: 'Target reader', placeholder: 'adults who love slow-burn thrillers' },
      { key: 'length', label: 'Approx length', placeholder: '12 chapters', defaultValue: '12 chapters' },
    ],
    assemble: (v) => `You are an experienced novelist and story architect.

Goal: Develop a book about ${g(v, 'topic', 'my topic')} (${g(v, 'genre', 'fiction')}) for ${g(v, 'audience', 'a general adult audience')}.

Work in stages — do STAGE 1 only, then wait for my approval.

STAGE 1 — Blueprint:
- Premise (2–3 sentences)
- Tone and comparable titles
- 3–5 main characters (name, want, flaw, arc)
- Chapter-by-chapter outline (${g(v, 'length', '12 chapters')}, one line each)

STAGE 2 (after approval): Write Chapter 1 in full (~1,500 words), showing not telling.

Ask me up to 3 clarifying questions first if anything is ambiguous.`,
  },
  {
    id: 'blog',
    name: 'Blog post',
    icon: 'PenLine',
    tagline: 'Scannable, hooky, actionable.',
    fields: [
      { key: 'topic', label: 'Post topic', placeholder: 'how to start composting in an apartment' },
      { key: 'audience', label: 'Audience', placeholder: 'total beginners', defaultValue: 'general readers new to the topic' },
      { key: 'tone', label: 'Tone', placeholder: 'friendly and practical', defaultValue: 'friendly, concrete, no fluff' },
      { key: 'words', label: 'Word count', placeholder: '700', defaultValue: '700' },
    ],
    assemble: (v) => `Write an engaging blog post about ${g(v, 'topic', 'my topic')}.

Audience: ${g(v, 'audience', 'general readers')}. Tone: ${g(v, 'tone', 'friendly, concrete')}.

Format:
- A hooky title + one-sentence subtitle
- ~${g(v, 'words', '700')} words, scannable with descriptive H2 subheadings
- Open with a relatable hook, not a definition
- Include 3–5 actionable takeaways as a bulleted list
- Close with a call-to-action question`,
  },
  {
    id: 'email',
    name: 'Email',
    icon: 'Mail',
    tagline: 'Get to the point, politely.',
    fields: [
      { key: 'purpose', label: 'What is the email for?', placeholder: 'asking my manager for a deadline extension' },
      { key: 'recipient', label: 'Recipient', placeholder: 'my manager', defaultValue: 'the recipient' },
      { key: 'tone', label: 'Tone', placeholder: 'professional', defaultValue: 'polite and concise' },
    ],
    assemble: (v) => `Draft an email to ${g(v, 'recipient', 'the recipient')} for the purpose of ${g(v, 'purpose', 'my request')}.

Requirements:
- A clear, specific subject line
- Body: state the purpose up front, then the ask/next step (2–4 sentences)
- Tone: ${g(v, 'tone', 'polite and concise')}; no filler
- Under 120 words
- Use [bracketed placeholders] for any specifics I haven't given (dates, names, context)`,
  },
  {
    id: 'code',
    name: 'Code review',
    icon: 'Code2',
    tagline: 'Root cause first, then the fix.',
    fields: [
      { key: 'task', label: 'What do you need?', placeholder: 'review this function for bugs and performance', multiline: true },
      { key: 'lang', label: 'Language / stack', placeholder: 'TypeScript, React', defaultValue: 'TypeScript' },
    ],
    assemble: (v) => `Act as a senior software engineer reviewing ${g(v, 'lang', 'the following')} code.

Task: ${g(v, 'task', 'review the code below')}.

Please:
- State assumptions first
- Identify issues in priority order (correctness → security → performance → style)
- For each: explain the root cause, then show the fix, then how to verify it
- Provide complete, runnable code for any changes
- Keep prose minimal; prioritize working code

[Paste your code here]`,
  },
  {
    id: 'resume',
    name: 'Resume',
    icon: 'FileUser',
    tagline: 'Lead with impact, not duties.',
    fields: [
      { key: 'role', label: 'Target role', placeholder: 'Senior Product Manager' },
      { key: 'background', label: 'Your background (brief)', placeholder: '6 years in fintech, led 3 launches', multiline: true },
    ],
    assemble: (v) => `Help me write a resume tailored to a ${g(v, 'role', 'target role')} position.

My background: ${g(v, 'background', '[summarize your experience]')}.

Make it:
- Lead with impact using "achieved X by doing Y, resulting in Z"
- Quantify results wherever possible
- Mirror the language of the target role
- Fit one page
- Use [bracketed placeholders] for metrics/dates I haven't provided

Ask me for the job description if it would sharpen the tailoring.`,
  },
  {
    id: 'business',
    name: 'Business plan',
    icon: 'Briefcase',
    tagline: 'Concise, realistic, assumption-flagged.',
    fields: [
      { key: 'idea', label: 'Business idea', placeholder: 'a subscription box for rare houseplants', multiline: true },
      { key: 'market', label: 'Target customer', placeholder: 'urban millennials with disposable income' },
    ],
    assemble: (v) => `Draft a concise business plan for: ${g(v, 'idea', 'my idea')}.
Target customer: ${g(v, 'market', '[describe your customer]')}.

Cover each in a short paragraph or bullets:
1. Problem & target customer
2. Solution & unique value proposition
3. Market size (rough estimate + reasoning)
4. Revenue model
5. Go-to-market strategy
6. Key risks & mitigations
7. First 90-day milestones

Be specific and realistic; flag assumptions. Under ~600 words.`,
  },
  {
    id: 'social',
    name: 'Social post',
    icon: 'Megaphone',
    tagline: 'Scroll-stopping, on-platform.',
    fields: [
      { key: 'topic', label: 'What is it about?', placeholder: 'launching my new podcast' },
      { key: 'platform', label: 'Platform', placeholder: 'LinkedIn', defaultValue: 'LinkedIn' },
      { key: 'goal', label: 'Goal', placeholder: 'drive sign-ups', defaultValue: 'drive engagement' },
    ],
    assemble: (v) => `Write a ${g(v, 'platform', 'social media')} post about ${g(v, 'topic', 'my topic')}. Goal: ${g(v, 'goal', 'drive engagement')}.

Deliver:
- 3 variations with different hooks
- Length and tone appropriate for ${g(v, 'platform', 'the platform')}
- A strong first line that stops the scroll
- 3–5 relevant hashtags
- One optional CTA
No hashtag stuffing, no generic motivational filler.`,
  },
  {
    id: 'essay',
    name: 'Essay',
    icon: 'GraduationCap',
    tagline: 'Thesis-driven and specific.',
    fields: [
      { key: 'topic', label: 'Essay topic / question', placeholder: 'Should cities ban cars downtown?' },
      { key: 'stance', label: 'Your stance (optional)', placeholder: 'argue in favor', defaultValue: 'take a clear, defensible position' },
      { key: 'words', label: 'Word count', placeholder: '800', defaultValue: '800' },
    ],
    assemble: (v) => `Write a well-structured essay on: ${g(v, 'topic', 'my topic')}.
Position: ${g(v, 'stance', 'take a clear stance')}.

Requirements:
- ~${g(v, 'words', '800')} words
- Clear thesis in the intro; 3 body paragraphs each with one point + evidence; a synthesizing conclusion
- Analytical, specific tone; avoid filler and clichés
- Use concrete examples or data
- End with one thought-provoking implication`,
  },
  {
    id: 'summary',
    name: 'Summary',
    icon: 'ScrollText',
    tagline: 'TL;DR + the points that matter.',
    fields: [
      { key: 'source', label: 'What to summarize', placeholder: 'paste the text or describe the source', multiline: true },
      { key: 'length', label: 'Target length', placeholder: '120 words', defaultValue: '120 words' },
    ],
    assemble: (v) => `Summarize the following:

${g(v, 'source', '[paste your text here]')}

Output:
- A one-sentence TL;DR
- 3–5 bullet points covering key ideas (no minor details)
- Preserve critical numbers, names, and conclusions
- Neutral tone; add nothing not in the source
- Target: ~${g(v, 'length', '120 words')}`,
  },
  {
    id: 'translate',
    name: 'Translation',
    icon: 'Languages',
    tagline: 'Natural, register-aware translation.',
    fields: [
      { key: 'text', label: 'Text to translate', placeholder: 'paste the text', multiline: true },
      { key: 'from', label: 'From language', placeholder: 'English', defaultValue: 'English' },
      { key: 'to', label: 'To language', placeholder: 'Spanish' },
    ],
    assemble: (v) => `Translate the following from ${g(v, 'from', 'English')} to ${g(v, 'to', '[target language]')}:

${g(v, 'text', '[paste your text here]')}

Rules:
- Preserve meaning, tone, and register
- Keep names, code, and placeholders unchanged
- Prefer natural equivalents for idioms; add a brief [note] if meaning shifts
- Output only the translation unless I ask for explanation`,
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: 'Lightbulb',
    tagline: 'Ranked ideas across the risk spectrum.',
    fields: [
      { key: 'challenge', label: 'What do you need ideas for?', placeholder: 'names for a coffee subscription brand' },
      { key: 'count', label: 'How many ideas?', placeholder: '10', defaultValue: '10' },
    ],
    assemble: (v) => `Brainstorm ideas for: ${g(v, 'challenge', 'my challenge')}.

Give me:
- ${g(v, 'count', '10')} distinct ideas, from safe/obvious to bold/unconventional
- One line each: the idea + why it could work
- Grouped into 2–3 themes
- Your top 3 picks and the single biggest risk for each
Prioritize variety over volume; no repeats.`,
  },
  {
    id: 'presentation',
    name: 'Presentation',
    icon: 'Presentation',
    tagline: 'Speakable, well-structured slides.',
    fields: [
      { key: 'topic', label: 'Presentation topic', placeholder: 'Q3 results and next-year strategy' },
      { key: 'slides', label: 'Number of slides', placeholder: '10', defaultValue: '10' },
      { key: 'audience', label: 'Audience', placeholder: 'the exec team', defaultValue: 'a general audience' },
    ],
    assemble: (v) => `Create a ~${g(v, 'slides', '10')}-slide presentation outline on ${g(v, 'topic', 'my topic')} for ${g(v, 'audience', 'a general audience')}.

For each slide give me:
- Slide title
- 2–3 actual talking points (not placeholders)
- A note on any visual/chart that would help

Structure: hook → context → core argument → evidence → objection/counter → summary → call to action. Keep bullets tight and speakable.`,
  },
]
