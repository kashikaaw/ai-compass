/**
 * hooks.ts — small reusable React hooks.
 */
import { useEffect, useRef, useState, useCallback } from 'react'

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

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(loadHistory)

  const persist = useCallback((next: HistoryItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
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
        return next
      })
    },
    [],
  )

  const clear = useCallback(() => persist([]), [persist])

  return { items, add, clear }
}
