/**
 * historyAnalysis.ts
 * -----------------------------------------------------------------------------
 * Aggregate analysis over a user's extracted historical prompts, reusing the
 * app's EXISTING engines: detectConfusion (flags), the tokenizer (token cost),
 * and ruleBasedRewrite (before/after teaching examples). No new detector.
 */
import { detectConfusion, CATEGORY_META, type FlagCategory } from './confusionDetector'
import { countTokens } from './tokenizer'
import { ruleBasedRewrite } from './rewriteEngine'
import type { ExtractedPrompt } from './chatHistoryParser'

export interface AnalyzedPrompt {
  text: string
  tokens: number
  flagCount: number
  categories: FlagCategory[]
}

export interface CategoryStat {
  category: FlagCategory
  label: string
  color: string
  /** How many prompts had at least one flag of this category. */
  prompts: number
  /** Share of analyzed prompts (0–1). */
  share: number
}

export interface RewriteExample {
  original: string
  rewritten: string
  archetype: string | null
  changes: string[]
}

export interface HistoryReport {
  analyzedCount: number
  /** Prompts that had at least one flag. */
  flaggedCount: number
  totalTokens: number
  avgTokens: number
  categoryStats: CategoryStat[]
  /** Most expensive prompts by token count, biggest first. */
  topByTokens: AnalyzedPrompt[]
  /** A few before/after rewrites as teaching moments. */
  examples: RewriteExample[]
}

/**
 * Analyze a set of extracted prompts. Skips trivially short entries so the
 * summary reflects real prompts, not one-word replies like "yes"/"continue".
 */
export function analyzeHistory(prompts: ExtractedPrompt[]): HistoryReport {
  const analyzed: AnalyzedPrompt[] = []
  const catCounts = new Map<FlagCategory, number>()

  for (const p of prompts) {
    const text = p.text.trim()
    if (text.split(/\s+/).length < 4) continue // skip trivial one-liners
    const flags = detectConfusion(text)
    const tokens = countTokens(text)
    const categories = Array.from(new Set(flags.map((f) => f.category)))
    for (const c of categories) catCounts.set(c, (catCounts.get(c) ?? 0) + 1)
    analyzed.push({ text, tokens, flagCount: flags.length, categories })
  }

  const analyzedCount = analyzed.length
  const flaggedCount = analyzed.filter((a) => a.flagCount > 0).length
  const totalTokens = analyzed.reduce((s, a) => s + a.tokens, 0)
  const avgTokens = analyzedCount ? Math.round(totalTokens / analyzedCount) : 0

  const categoryStats: CategoryStat[] = Array.from(catCounts.entries())
    .map(([category, prompts]) => ({
      category,
      label: CATEGORY_META[category].label,
      color: CATEGORY_META[category].color,
      prompts,
      share: analyzedCount ? prompts / analyzedCount : 0,
    }))
    .sort((a, b) => b.prompts - a.prompts)

  const topByTokens = [...analyzed].sort((a, b) => b.tokens - a.tokens).slice(0, 3)

  // Teaching examples: pick the most-flagged prompts, run the rewrite engine,
  // and keep the ones where the rewrite actually differs.
  const examples: RewriteExample[] = []
  const candidates = [...analyzed].sort((a, b) => b.flagCount - a.flagCount)
  for (const c of candidates) {
    if (examples.length >= 3) break
    const r = ruleBasedRewrite(c.text)
    if (r.rewritten && r.rewritten.trim() !== c.text.trim()) {
      examples.push({
        original: c.text,
        rewritten: r.rewritten,
        archetype: r.archetype,
        changes: r.changes,
      })
    }
  }

  return {
    analyzedCount,
    flaggedCount,
    totalTokens,
    avgTokens,
    categoryStats,
    topByTokens,
    examples,
  }
}
