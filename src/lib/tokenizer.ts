/**
 * tokenizer.ts
 * -----------------------------------------------------------------------------
 * Thin wrapper around `gpt-tokenizer` (o200k_base — the encoding used by
 * GPT-4o / GPT-5-class models).
 *
 * IMPORTANT ACCURACY NOTE: We use o200k_base as a *universal approximation*
 * across all providers. Anthropic (Claude) and Google (Gemini) use their own
 * tokenizers, so counts for those models are close estimates, not exact. This
 * is disclosed in the UI. For relative comparisons and "is my prompt bloated?"
 * intuition it is more than good enough.
 */

import { encode, decodeGenerator } from 'gpt-tokenizer/encoding/o200k_base'

export interface Token {
  /** The raw token id from the BPE vocabulary. */
  id: number
  /** The decoded text of this token (may include leading spaces). */
  text: string
  /** Inclusive start char offset into the original string. */
  start: number
  /** Exclusive end char offset into the original string. */
  end: number
  /** Number of characters this token spans. */
  charLen: number
  /**
   * Cost score: characters-per-token. A token that encodes many characters is
   * "cheap" (efficient); a token that encodes few characters (e.g. a rare word
   * split into many subword pieces) is "expensive" per character.
   */
  charsPerToken: number
}

export interface TokenizeResult {
  tokens: Token[]
  count: number
}

/** Fast count-only path (used for the live headline number). */
export function countTokens(text: string): number {
  if (!text) return 0
  return encode(text).length
}

/**
 * Full tokenization with char offsets. We walk the decoded token stream and
 * accumulate character lengths to reconstruct where each token sits in the
 * original text. This lets us paint a per-token highlight overlay.
 */
export function tokenize(text: string): TokenizeResult {
  if (!text) return { tokens: [], count: 0 }

  const ids = encode(text)
  const tokens: Token[] = []
  let cursor = 0

  // decodeGenerator yields the decoded string for each token id, in order.
  let i = 0
  for (const piece of decodeGenerator(ids)) {
    const start = cursor
    const charLen = piece.length
    const end = start + charLen
    tokens.push({
      id: ids[i] ?? -1,
      text: piece,
      start,
      end,
      charLen,
      charsPerToken: charLen, // one token, so chars-per-token == charLen
    })
    cursor = end
    i++
  }

  return { tokens, count: ids.length }
}

/**
 * Heat level for a token, driven by how many characters it packs.
 * Fewer chars per token => the word was chopped into many pieces => "hot".
 *  - 'hot'  : <= 2 chars (dense/rare — expensive per character)
 *  - 'warm' : 3 chars
 *  - 'cool' : 4-6 chars
 *  - 'cold' : 7+ chars (very efficient)
 * Whitespace-only tokens are neutral.
 */
export type Heat = 'neutral' | 'cold' | 'cool' | 'warm' | 'hot'

export function tokenHeat(token: Token): Heat {
  if (token.text.trim().length === 0) return 'neutral'
  const c = token.text.trim().length
  if (c <= 2) return 'hot'
  if (c === 3) return 'warm'
  if (c <= 6) return 'cool'
  return 'cold'
}

export const HEAT_COLORS: Record<Heat, { bg: string; label: string }> = {
  neutral: { bg: 'transparent', label: 'whitespace' },
  cold: { bg: 'rgba(61, 220, 151, 0.16)', label: 'efficient (packs many chars)' },
  cool: { bg: 'rgba(77, 214, 255, 0.14)', label: 'normal' },
  warm: { bg: 'rgba(255, 180, 84, 0.20)', label: 'a bit dense' },
  hot: { bg: 'rgba(255, 107, 138, 0.24)', label: 'expensive (split into many tokens)' },
}
