/**
 * pricing.ts
 * -----------------------------------------------------------------------------
 * Per-model token pricing table + cost helpers for AI Compass.
 *
 * ⚠️  DISCLAIMER: These prices are ESTIMATES compiled in July 2026 for
 * demonstration purposes. Provider pricing changes frequently — ALWAYS verify
 * current rates at the official provider documentation before relying on any
 * number here for real budgeting decisions.
 *
 * Prices are expressed in US dollars per 1,000,000 tokens (per MTok).
 */

export const PRICING_LAST_UPDATED = 'July 2026'

export type Provider = 'Anthropic' | 'OpenAI' | 'Google'

export interface ModelPricing {
  id: string
  name: string
  provider: Provider
  /** USD per 1M input tokens. */
  inputPerMTok: number
  /** USD per 1M output tokens. */
  outputPerMTok: number
  /** USD per 1M cached input tokens, if the provider advertises a cache rate. */
  cachedInputPerMTok?: number
  /** Short marketing-style descriptor for the UI. */
  blurb: string
  /** Rough tier used only for sorting/labeling in the UI. */
  tier: 'flagship' | 'balanced' | 'fast'
}

/**
 * The model catalog. Ordered flagship → fast within each provider so the
 * default table reads sensibly, but the UI supports re-sorting.
 */
export const MODELS: ModelPricing[] = [
  // --- Anthropic ---
  {
    id: 'claude-opus-4-8',
    name: 'Claude Opus 4.8',
    provider: 'Anthropic',
    inputPerMTok: 5.0,
    outputPerMTok: 25.0,
    blurb: 'Most capable Claude — deep reasoning & long tasks.',
    tier: 'flagship',
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    inputPerMTok: 3.0,
    outputPerMTok: 15.0,
    blurb: 'Balanced Claude — great default for most work.',
    tier: 'balanced',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    inputPerMTok: 1.0,
    outputPerMTok: 5.0,
    blurb: 'Fast & cheap Claude — powers AI Boost rewrites.',
    tier: 'fast',
  },

  // --- OpenAI ---
  {
    id: 'gpt-5-5',
    name: 'GPT-5.5',
    provider: 'OpenAI',
    inputPerMTok: 5.0,
    outputPerMTok: 30.0,
    cachedInputPerMTok: 0.5,
    blurb: 'OpenAI flagship — top-end quality, priciest output.',
    tier: 'flagship',
  },
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    inputPerMTok: 1.25,
    outputPerMTok: 10.0,
    blurb: 'Strong all-rounder at a mid-range price.',
    tier: 'balanced',
  },
  {
    id: 'gpt-5-4-nano',
    name: 'GPT-5.4-nano',
    provider: 'OpenAI',
    inputPerMTok: 0.2,
    outputPerMTok: 1.25,
    blurb: 'Ultra-cheap for high-volume, simple tasks.',
    tier: 'fast',
  },

  // --- Google ---
  {
    id: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'Google',
    inputPerMTok: 2.0,
    outputPerMTok: 12.0,
    blurb: 'Google flagship — strong multimodal reasoning.',
    tier: 'flagship',
  },
  {
    id: 'gemini-3-5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'Google',
    inputPerMTok: 1.5,
    outputPerMTok: 9.0,
    cachedInputPerMTok: 0.15,
    blurb: 'Fast Google model with cheap cached input.',
    tier: 'balanced',
  },
]

export const PROVIDER_ACCENT: Record<Provider, string> = {
  Anthropic: '#d97757',
  OpenAI: '#10a37f',
  Google: '#4285f4',
}

/** Cost of a single input-only call (i.e. just the prompt) for one model. */
export function inputCost(model: ModelPricing, inputTokens: number): number {
  return (inputTokens / 1_000_000) * model.inputPerMTok
}

/** Cost of the model's response given an assumed output token count. */
export function outputCost(model: ModelPricing, outputTokens: number): number {
  return (outputTokens / 1_000_000) * model.outputPerMTok
}

/**
 * Estimated total cost of one round-trip call: your prompt in, an assumed
 * response out. `outputTokens` defaults to a modest 500-token reply so the
 * table shows something realistic rather than input-only.
 */
export function roundTripCost(
  model: ModelPricing,
  inputTokens: number,
  outputTokens = 500,
): number {
  return inputCost(model, inputTokens) + outputCost(model, outputTokens)
}

/** Format a USD amount with sensible precision for tiny per-call numbers. */
export function formatUSD(amount: number): string {
  if (amount === 0) return '$0.00'
  if (amount < 0.01) return `$${amount.toFixed(5)}`
  if (amount < 1) return `$${amount.toFixed(4)}`
  if (amount < 100) return `$${amount.toFixed(3)}`
  return `$${amount.toFixed(2)}`
}

/** Format a USD amount scaled to "per 1,000 calls" for at-scale intuition. */
export function formatUSDPerK(amount: number): string {
  return formatUSD(amount * 1000)
}
