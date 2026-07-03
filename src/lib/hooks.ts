/**
 * hooks.ts — small reusable React hooks.
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { MODELS, roundTripCost, type ModelPricing } from './pricing'
import { supabase, isSupabaseConfigured, type PromptHistoryRow } from './supabaseClient'
import type { Session } from '@supabase/supabase-js'

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

/* --------------------------------- auth ----------------------------------- */

/**
 * Tracks the optional Supabase auth session. When Supabase isn't configured
 * (no env vars), this is a permanent no-op: `configured` is false and there is
 * never a session, so the UI hides the sign-in feature entirely.
 */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setSession(data.session)
        setReady(true)
      })
      .catch(() => {
        if (active) setReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Cloud sign-in is not configured.')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }, [])

  return {
    configured: isSupabaseConfigured,
    ready,
    session,
    user: session?.user ?? null,
    email: session?.user?.email ?? null,
    signInWithEmail,
    signOut,
  }
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

/**
 * Map a Supabase row into the local HistoryItem shape. The cloud stores an ISO
 * timestamp; we convert it back to the epoch-ms `at` the UI already uses.
 */
function rowToItem(row: PromptHistoryRow): HistoryItem {
  return {
    id: row.id,
    text: row.text,
    tokens: row.tokens,
    at: new Date(row.created_at).getTime(),
  }
}

/**
 * @param session Optional Supabase auth session. When present (signed in),
 *   history syncs to the cloud: local-only items are pushed up on first
 *   sign-in, new prompts are also inserted remotely (fire-and-forget), and the
 *   list is treated as cloud-backed for the session. When null/undefined the
 *   hook behaves exactly as the original local-only implementation.
 */
export function useHistory(session?: Session | null) {
  const [items, setItems] = useState<HistoryItem[]>(loadHistory)
  const [sessionTotal, setSessionTotal] = useState<SessionTotal>(loadSessionTotal)

  const userId = session?.user?.id ?? null
  // Track which user we've already synced for, so the merge runs once per login.
  const syncedFor = useRef<string | null>(null)

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

          // When signed in, also persist the new prompt to the cloud so history
          // follows the user across devices. Fire-and-forget: any failure is
          // logged, never thrown — a flaky network must not break the UI.
          if (supabase && userId) {
            supabase
              .from('prompt_history')
              .insert({
                user_id: userId,
                text: trimmed,
                tokens,
                cost: sessionPromptCost(tokens),
              })
              .then(({ error }) => {
                if (error) {
                  console.warn('[AI Compass] Could not sync prompt to cloud:', error.message)
                }
              })
          }
        }
        return next
      })
    },
    [userId],
  )

  // On sign-in: push any local-only prompts up to the cloud, then adopt the
  // cloud rows as the source of truth for this session. On sign-out: reset the
  // sync marker but keep local history intact (we simply stop syncing).
  useEffect(() => {
    if (!supabase || !userId) {
      syncedFor.current = null
      return
    }
    if (syncedFor.current === userId) return
    syncedFor.current = userId

    let active = true
    const client = supabase

    void (async () => {
      try {
        const { data, error } = await client
          .from('prompt_history')
          .select('id, user_id, text, tokens, cost, created_at')
          .order('created_at', { ascending: false })
        if (error) throw error

        const remote = (data ?? []) as PromptHistoryRow[]
        const remoteTexts = new Set(remote.map((r) => r.text))

        // Local-only entries (not yet in the cloud) get pushed up.
        const localOnly = loadHistory().filter((i) => !remoteTexts.has(i.text))
        if (localOnly.length > 0) {
          const { error: insErr } = await client.from('prompt_history').insert(
            localOnly.map((i) => ({
              user_id: userId,
              text: i.text,
              tokens: i.tokens,
              cost: sessionPromptCost(i.tokens),
              created_at: new Date(i.at).toISOString(),
            })),
          )
          if (insErr) {
            console.warn('[AI Compass] Could not push local history to cloud:', insErr.message)
          }
        }

        if (!active) return

        // Cloud is now the source of truth: merge (remote + freshly pushed
        // locals), newest first, capped at HISTORY_MAX.
        const merged = [
          ...remote.map(rowToItem),
          ...localOnly,
        ]
          .sort((a, b) => b.at - a.at)
          .slice(0, HISTORY_MAX)

        setItems(merged)
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(merged))
        } catch {
          /* ignore */
        }
      } catch (err) {
        // Never break the UI on a sync failure — just keep local-only history.
        const msg = err instanceof Error ? err.message : String(err)
        console.warn('[AI Compass] History sync failed; staying local-only:', msg)
      }
    })()

    return () => {
      active = false
    }
  }, [userId])

  const clear = useCallback(() => {
    persist([])
    persistSessionTotal({ count: 0, totalCost: 0 })
  }, [persist, persistSessionTotal])

  return { items, add, clear, sessionTotal }
}
