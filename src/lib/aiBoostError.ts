/**
 * aiBoostError.ts
 * -----------------------------------------------------------------------------
 * Shared error type for the "AI Boost" feature, thrown by both provider
 * clients (anthropicClient.ts, openaiClient.ts) and surfaced identically by
 * the UI regardless of which provider the user picked.
 */
export class AiBoostError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiBoostError'
  }
}
