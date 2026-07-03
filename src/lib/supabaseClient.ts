/**
 * supabaseClient.ts
 * -----------------------------------------------------------------------------
 * Optional cloud sign-in. When a Supabase project is configured (via the
 * VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars), users can sign in
 * with a passwordless magic link so their prompt history follows them across
 * devices.
 *
 * This is entirely OPTIONAL. If the env vars are absent (e.g. a fresh clone of
 * the repo without a Supabase project), the client is simply `null` and the
 * sign-in UI hides itself — the app keeps working fully local-only. We log a
 * single, quiet console.info in that case, never an error, so nothing crashes.
 *
 * The publishable key is meant to be public client-side; safety comes from the
 * Row Level Security policies in supabase/schema.sql (each user only ever reads
 * or writes their own rows).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** True when both env vars are present, so the sign-in feature can be offered. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/**
 * The Supabase client, or `null` when the project isn't configured. Callers
 * must treat `null` as "cloud sign-in disabled" and fall back to local-only.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, publishableKey as string)
  : null

if (!isSupabaseConfigured) {
  // Not an error — this is the expected, graceful no-op path for anyone who
  // hasn't set up their own Supabase project. Sign-in just won't appear.
  console.info(
    '[AI Compass] Cloud sign-in disabled: no Supabase env vars set. The app runs fully local-only.',
  )
}

/** Shape of a row in the `prompt_history` table (see supabase/schema.sql). */
export interface PromptHistoryRow {
  id: string
  user_id: string
  text: string
  tokens: number
  cost: number | null
  created_at: string
}
