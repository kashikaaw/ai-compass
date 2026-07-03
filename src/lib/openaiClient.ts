/**
 * openaiClient.ts
 * -----------------------------------------------------------------------------
 * Optional "AI Boost" mode, OpenAI variant. Calls the OpenAI Chat Completions
 * API DIRECTLY from the browser using the user's own API key.
 *
 * Mirrors anthropicClient.ts exactly (same privacy model, same shape) so the
 * two providers are interchangeable from the UI's point of view:
 *  - The key is stored ONLY in localStorage on this device, under its own key
 *    so it never collides with (or gets sent to) the Anthropic key.
 *  - Requests go straight to https://api.openai.com — never through any
 *    server of ours (there is no server; this is a static app).
 */
import { AiBoostError } from './aiBoostError'

const STORAGE_KEY = 'ai-compass:openai-key'
const API_URL = 'https://api.openai.com/v1/chat/completions'
// NOTE: OpenAI's real API model strings use dot notation for the version
// (e.g. "gpt-5.5", "gpt-5.2"), not the kebab-case id pricing.ts uses for its
// own internal id field ("gpt-5-4-nano") — using the kebab-case form here
// caused a live 404 ("model does not exist"). This must match pricing.ts's
// display `name` ("GPT-5.4-nano"), lowercased, not its `id`.
const MODEL = 'gpt-5.4-nano' // fast & cheap, mirrors Claude Haiku's role for Anthropic

export function getStoredKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function storeKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim())
  } catch {
    /* localStorage may be unavailable (private mode); fail silently. */
  }
}

export function forgetKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}

export function hasKey(): boolean {
  const k = getStoredKey()
  return !!k && k.length > 10
}

const SYSTEM_PROMPT = `You are a world-class prompt engineer. You rewrite a user's raw AI prompt so it is shorter, clearer, and produces better results.

Rules:
- Remove filler, politeness padding, and redundancy.
- Use direct, imperative phrasing.
- Add explicit output-format constraints (length, structure) when missing.
- If the request is a known archetype (book, essay, email, code, etc.), impose a tight, well-scoped structure.
- Preserve the user's actual intent and any concrete details/constraints they gave.
- Preserve any explicit instruction telling the downstream model to ask clarifying questions if something is missing.
- Do NOT answer or fulfill the prompt. Only rewrite it.

Respond with ONLY the rewritten prompt text. No preamble, no explanation, no code fences.`

/**
 * Ask an OpenAI chat model to rewrite the prompt. Resolves to the rewritten
 * string. Throws AiBoostError with a friendly message on any failure.
 */
export async function aiBoostRewrite(prompt: string, apiKey?: string): Promise<string> {
  const key = (apiKey ?? getStoredKey())?.trim()
  if (!key) throw new AiBoostError('No API key set. Add your OpenAI key to use AI Boost.')

  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_completion_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Rewrite this prompt:\n\n"""\n${prompt}\n"""` },
        ],
      }),
    })
  } catch {
    // Network error or CORS rejection lands here.
    throw new AiBoostError(
      'Could not reach OpenAI. Check your connection. Some networks/extensions block direct browser API calls.',
    )
  }

  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data?.error?.message ? ` — ${data.error.message}` : ''
    } catch {
      /* ignore parse failure */
    }
    if (res.status === 401) {
      throw new AiBoostError(`Invalid API key (401)${detail}. Double-check the key you pasted.`)
    }
    if (res.status === 429) {
      throw new AiBoostError(`Rate limited (429)${detail}. Wait a moment and try again.`)
    }
    if (res.status === 400) {
      throw new AiBoostError(`Request rejected (400)${detail}.`)
    }
    throw new AiBoostError(`OpenAI returned an error (${res.status})${detail}.`)
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new AiBoostError('Got an unreadable response from OpenAI.')
  }

  const text = extractText(data)
  if (!text) throw new AiBoostError('OpenAI returned an empty rewrite. Try again.')
  return text.trim()
}

interface OpenAiChoice {
  message?: { content?: string | null }
}
interface OpenAiResponse {
  choices?: OpenAiChoice[]
}

function extractText(data: unknown): string {
  const resp = data as OpenAiResponse
  const content = resp?.choices?.[0]?.message?.content
  return typeof content === 'string' ? content : ''
}
