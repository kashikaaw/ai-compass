/**
 * aiBoostClient.ts
 * -----------------------------------------------------------------------------
 * Unified "AI Boost" entry point. The feature has two interchangeable
 * providers (Anthropic / Claude and OpenAI / ChatGPT) — each with its own
 * client module (anthropicClient.ts, openaiClient.ts) that stores its key
 * separately and calls its own API directly from the browser.
 *
 * This module just picks whichever provider the user has selected (persisted
 * in localStorage) and dispatches to the matching client, so the rest of the
 * app (RewritePanel, ClarifyFlow) can call one `aiBoostRewrite()` without
 * caring which provider is behind it.
 */
import * as anthropic from './anthropicClient'
import * as openai from './openaiClient'
import { AiBoostError } from './aiBoostError'

export { AiBoostError }

export type BoostProvider = 'anthropic' | 'openai'

const PROVIDER_KEY = 'ai-compass:boost-provider'

export const PROVIDER_LABEL: Record<BoostProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'ChatGPT (OpenAI)',
}

export function getBoostProvider(): BoostProvider {
  try {
    const stored = localStorage.getItem(PROVIDER_KEY)
    return stored === 'openai' ? 'openai' : 'anthropic'
  } catch {
    return 'anthropic'
  }
}

export function setBoostProvider(provider: BoostProvider): void {
  try {
    localStorage.setItem(PROVIDER_KEY, provider)
  } catch {
    /* no-op */
  }
}

function clientFor(provider: BoostProvider) {
  return provider === 'openai' ? openai : anthropic
}

/** Whether the given provider (or the currently-selected one) has a stored key. */
export function hasKey(provider?: BoostProvider): boolean {
  return clientFor(provider ?? getBoostProvider()).hasKey()
}

/** Whether EITHER provider has a stored key — used to decide if AI Boost is usable at all. */
export function hasAnyKey(): boolean {
  return anthropic.hasKey() || openai.hasKey()
}

export function getStoredKey(provider: BoostProvider): string | null {
  return clientFor(provider).getStoredKey()
}

export function storeKey(provider: BoostProvider, key: string): void {
  clientFor(provider).storeKey(key)
}

export function forgetKey(provider: BoostProvider): void {
  clientFor(provider).forgetKey()
}

/**
 * Rewrite using the currently-selected provider. Throws AiBoostError (shared
 * across providers) with a friendly message on any failure.
 */
export async function aiBoostRewrite(prompt: string): Promise<string> {
  const provider = getBoostProvider()
  return clientFor(provider).aiBoostRewrite(prompt)
}
