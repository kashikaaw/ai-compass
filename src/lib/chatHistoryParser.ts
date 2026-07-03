/**
 * chatHistoryParser.ts
 * -----------------------------------------------------------------------------
 * Defensive parsers that extract *the user's own prompts* from an exported
 * ChatGPT or Claude chat-history JSON file. Everything runs client-side; the
 * file never leaves the browser.
 *
 * Both export formats are messy and vary by version, so every accessor is
 * guarded and the whole thing is wrapped so a malformed/empty file yields a
 * clear result object rather than throwing.
 */

export type ChatSource = 'chatgpt' | 'claude' | 'unknown'

export interface ExtractedPrompt {
  /** The user-authored prompt text. */
  text: string
  /** Epoch seconds if we could recover a timestamp, else null. */
  at: number | null
}

export interface ParseResult {
  source: ChatSource
  prompts: ExtractedPrompt[]
  /** Total user messages seen before capping (for a "showing N of M" note). */
  totalFound: number
  error?: string
}

/** Hard cap so a huge export stays fast and client-side. */
export const MAX_PROMPTS = 200

/* --------------------------- ChatGPT export shape -------------------------- */
/* conversations.json: an array of conversations, each with a tree-structured
 * `mapping` keyed by node id. A node has an optional `message` (null for
 * structural nodes) with `author.role` and `content.parts`.                   */

interface CGPTContent {
  parts?: unknown[]
}
interface CGPTAuthor {
  role?: string
}
interface CGPTMessage {
  author?: CGPTAuthor | null
  content?: CGPTContent | null
  create_time?: number | null
}
interface CGPTNode {
  message?: CGPTMessage | null
}
interface CGPTConversation {
  mapping?: Record<string, CGPTNode> | null
}

/* ---------------------------- Claude export shape -------------------------- */
/* Flatter: an array of conversations each with a `messages` (or similar) array
 * whose entries carry a sender/role and text. Key names vary by version, so we
 * probe several likely keys.                                                   */

interface ClaudeMessageLike {
  sender?: string
  role?: string
  text?: unknown
  content?: unknown
  created_at?: string | number
  create_time?: string | number
}
interface ClaudeConversationLike {
  messages?: ClaudeMessageLike[]
  chat_messages?: ClaudeMessageLike[]
  created_at?: string | number
}

/* -------------------------------------------------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Pull joined text from a ChatGPT `content.parts` array (strings or objects). */
function partsToText(parts: unknown): string {
  if (!Array.isArray(parts)) return ''
  const pieces: string[] = []
  for (const p of parts) {
    if (typeof p === 'string') {
      if (p.trim()) pieces.push(p)
    } else if (isRecord(p)) {
      // Some parts are objects, e.g. { text: "…" } or { content_type, text }.
      const t = p.text ?? p.content ?? p.value
      if (typeof t === 'string' && t.trim()) pieces.push(t)
    }
  }
  return pieces.join('\n').trim()
}

/** Detect which export format an already-parsed JSON value looks like. */
export function detectSource(data: unknown): ChatSource {
  if (!Array.isArray(data)) {
    // Some exports wrap the array in an object; try common containers.
    if (isRecord(data)) {
      const inner =
        (data.conversations as unknown) ??
        (data.data as unknown) ??
        (data.chats as unknown)
      if (Array.isArray(inner)) return detectSource(inner)
    }
    return 'unknown'
  }
  const sample = data.find((d) => isRecord(d)) as Record<string, unknown> | undefined
  if (!sample) return 'unknown'
  if ('mapping' in sample) return 'chatgpt'
  if ('messages' in sample || 'chat_messages' in sample) return 'claude'
  return 'unknown'
}

/** Unwrap common object containers into the underlying conversation array. */
function toConversationArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (isRecord(data)) {
    const inner = data.conversations ?? data.data ?? data.chats
    if (Array.isArray(inner)) return inner
  }
  return []
}

/** Extract user prompts from a ChatGPT `conversations.json` structure. */
export function parseChatGPT(data: unknown): ExtractedPrompt[] {
  const conversations = toConversationArray(data) as CGPTConversation[]
  const out: ExtractedPrompt[] = []
  for (const conv of conversations) {
    const mapping = conv?.mapping
    if (!isRecord(mapping)) continue
    for (const node of Object.values(mapping)) {
      const msg = (node as CGPTNode)?.message
      if (!msg || msg.author?.role !== 'user') continue
      const text = partsToText(msg.content?.parts)
      if (!text) continue
      const at =
        typeof msg.create_time === 'number' && isFinite(msg.create_time)
          ? msg.create_time
          : null
      out.push({ text, at })
    }
  }
  return out
}

/** Normalize a Claude timestamp (ISO string or epoch) to epoch seconds. */
function claudeTime(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v > 1e12 ? v / 1000 : v
  if (typeof v === 'string') {
    const ms = Date.parse(v)
    if (!isNaN(ms)) return ms / 1000
  }
  return null
}

/** Extract user prompts from a Claude export structure. */
export function parseClaude(data: unknown): ExtractedPrompt[] {
  const conversations = toConversationArray(data) as ClaudeConversationLike[]
  const out: ExtractedPrompt[] = []
  for (const conv of conversations) {
    const messages = conv?.messages ?? conv?.chat_messages
    if (!Array.isArray(messages)) continue
    for (const m of messages) {
      if (!isRecord(m)) continue
      const roleRaw = (m.sender ?? m.role ?? '') as string
      const role = String(roleRaw).toLowerCase()
      // Claude uses "human"/"user" for the person; skip assistant/model/system.
      if (role !== 'human' && role !== 'user') continue
      let text = ''
      if (typeof m.text === 'string') text = m.text
      else if (typeof m.content === 'string') text = m.content
      else if (Array.isArray(m.content)) {
        // content: [{ type:'text', text:'…' }, …]
        text = m.content
          .map((c) => (isRecord(c) && typeof c.text === 'string' ? c.text : ''))
          .filter(Boolean)
          .join('\n')
      }
      text = text.trim()
      if (!text) continue
      out.push({ text, at: claudeTime(m.created_at ?? m.create_time) })
    }
  }
  return out
}

/**
 * Parse a raw JSON string from an uploaded export. Never throws — returns a
 * ParseResult with an `error` string for anything unrecognized/malformed.
 */
export function parseChatHistory(raw: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { source: 'unknown', prompts: [], totalFound: 0, error: 'That file is not valid JSON. Make sure you uploaded the exported .json file.' }
  }

  try {
    const source = detectSource(data)
    let prompts: ExtractedPrompt[] = []
    if (source === 'chatgpt') prompts = parseChatGPT(data)
    else if (source === 'claude') prompts = parseClaude(data)
    else {
      return {
        source: 'unknown',
        prompts: [],
        totalFound: 0,
        error:
          "This doesn't look like a ChatGPT or Claude export. Upload conversations.json (ChatGPT) or the exported data file (Claude).",
      }
    }

    const totalFound = prompts.length
    if (totalFound === 0) {
      return { source, prompts: [], totalFound: 0, error: 'No user prompts were found in that file.' }
    }

    // Most recent first when timestamps exist; keep file order otherwise. Cap.
    const sorted = [...prompts].sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    return { source, prompts: sorted.slice(0, MAX_PROMPTS), totalFound }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { source: 'unknown', prompts: [], totalFound: 0, error: `Could not parse that file: ${msg}` }
  }
}
