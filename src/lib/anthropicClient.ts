/**
 * anthropicClient.ts
 * -----------------------------------------------------------------------------
 * Optional "AI Boost" mode. Calls the Anthropic Messages API DIRECTLY from the
 * browser using the user's own API key.
 *
 * Privacy model:
 *  - The key is stored ONLY in localStorage on this device.
 *  - Requests go straight to https://api.anthropic.com — never through any
 *    server of ours (there is no server; this is a static app).
 *  - The `anthropic-dangerous-direct-browser-access` header is required for
 *    Anthropic to accept browser-origin requests.
 *
 * We use Claude Haiku 4.5 — fast and cheap — to produce a smarter rewrite than
 * the rule engine can.
 */

const STORAGE_KEY = 'ai-compass:anthropic-key'
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5' // matches pricing.ts id
const API_VERSION = '2023-06-01'

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

export class AiBoostError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiBoostError'
  }
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
 * Ask Claude Haiku to rewrite the prompt. Resolves to the rewritten string.
 * Throws AiBoostError with a friendly message on any failure.
 */
export async function aiBoostRewrite(prompt: string, apiKey?: string): Promise<string> {
  const key = (apiKey ?? getStoredKey())?.trim()
  if (!key) throw new AiBoostError('No API key set. Add your Anthropic key to use AI Boost.')

  let res: Response
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Rewrite this prompt:\n\n"""\n${prompt}\n"""`,
          },
        ],
      }),
    })
  } catch {
    // Network error or CORS rejection lands here.
    throw new AiBoostError(
      'Could not reach Anthropic. Check your connection. Some networks/extensions block direct browser API calls.',
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
    throw new AiBoostError(`Anthropic returned an error (${res.status})${detail}.`)
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new AiBoostError('Got an unreadable response from Anthropic.')
  }

  const text = extractText(data)
  if (!text) throw new AiBoostError('Anthropic returned an empty rewrite. Try again.')
  return text.trim()
}

interface AnthropicContentBlock {
  type: string
  text?: string
}
interface AnthropicResponse {
  content?: AnthropicContentBlock[]
}

function extractText(data: unknown): string {
  const resp = data as AnthropicResponse
  if (!resp?.content || !Array.isArray(resp.content)) return ''
  return resp.content
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text as string)
    .join('')
}
