/**
 * hooks.ts — small reusable React hooks.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { MODELS, roundTripCost, type ModelPricing } from './pricing'

/** Returns a debounced copy of `value` that updates `delay`ms after it settles. */
export function useDebounced<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Copy-to-clipboard with a transient "copied" flag. */
export function useCopy(resetMs = 1600): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text).then(
        () => {
          setCopied(true)
          if (timer.current) clearTimeout(timer.current)
          timer.current = setTimeout(() => setCopied(false), resetMs)
        },
        () => setCopied(false),
      )
    },
    [resetMs],
  )
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return [copied, copy]
}

/* ------------------------------- history ---------------------------------- */

const HISTORY_KEY = 'ai-compass:history'
const HISTORY_MAX = 8

export interface HistoryItem {
  id: string
  text: string
  tokens: number
  at: number
}

function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  } catch {
    return []
  }
}

/* --------------------------- session cost total --------------------------- */

const SESSION_TOTAL_KEY = 'ai-compass:session-total'

/**
 * Reference model used for the running session-cost total. We deliberately pin
 * a single, clearly-labeled model so the accumulated figure is unambiguous.
 * Claude Sonnet 4.6 is the example/default model used elsewhere in the app.
 */
export const SESSION_MODEL: ModelPricing =
  MODELS.find((m) => m.id === 'claude-sonnet-4-6') ?? MODELS[0]

/**
 * Assumed reply length for a "full call" cost. Kept in sync with the Cost
 * Table's ASSUMED_OUTPUT so the session total matches what's shown per-prompt.
 */
const SESSION_ASSUMED_OUTPUT = 500

export interface SessionTotal {
  /** Number of distinct prompts settled into history this session. */
  count: number
  /** Accumulated estimated full-call cost (USD) on the reference model. */
  totalCost: number
}

function loadSessionTotal(): SessionTotal {
  try {
    const raw = localStorage.getItem(SESSION_TOTAL_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionTotal>
      return {
        count: typeof parsed.count === 'number' ? parsed.count : 0,
        totalCost: typeof parsed.totalCost === 'number' ? parsed.totalCost : 0,
      }
    }
  } catch {
    /* ignore */
  }
  return { count: 0, totalCost: 0 }
}

/** Full-call cost of a single prompt on the reference model. */
export function sessionPromptCost(tokens: number): number {
  return roundTripCost(SESSION_MODEL, tokens, SESSION_ASSUMED_OUTPUT)
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(loadHistory)
  const [sessionTotal, setSessionTotal] = useState<SessionTotal>(loadSessionTotal)

  const persist = useCallback((next: HistoryItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const persistSessionTotal = useCallback((next: SessionTotal) => {
    setSessionTotal(next)
    try {
      localStorage.setItem(SESSION_TOTAL_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const add = useCallback(
    (text: string, tokens: number) => {
      const trimmed = text.trim()
      if (trimmed.length < 12) return
      setItems((prev) => {
        // de-dupe by identical text
        const alreadySeen = prev.some((i) => i.text === trimmed)
        const filtered = prev.filter((i) => i.text !== trimmed)
        const next = [{ id: crypto.randomUUID(), text: trimmed, tokens, at: Date.now() }, ...filtered].slice(
          0,
          HISTORY_MAX,
        )
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
        } catch {
          /* ignore */
        }
        // Only accumulate the session total once per *distinct* prompt — a
        // re-typed or re-loaded prompt already in history must not double-count.
        if (!alreadySeen) {
          setSessionTotal((prevTotal) => {
            const nextTotal: SessionTotal = {
              count: prevTotal.count + 1,
              totalCost: prevTotal.totalCost + sessionPromptCost(tokens),
            }
            try {
              localStorage.setItem(SESSION_TOTAL_KEY, JSON.stringify(nextTotal))
            } catch {
              /* ignore */
            }
            return nextTotal
          })
        }
        return next
      })
    },
    [],
  )

  const clear = useCallback(() => {
    persist([])
    persistSessionTotal({ count: 0, totalCost: 0 })
  }, [persist, persistSessionTotal])

  return { items, add, clear, sessionTotal }
}
