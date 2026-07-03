import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Cloud } from 'lucide-react'
import './App.css'

import { Hero } from './components/Hero'
import { PromptWorkbench } from './components/PromptWorkbench'
import { TokenSummary } from './components/TokenSummary'
import { CostTable } from './components/CostTable'
import { ConfusionFlags } from './components/ConfusionFlags'
import { RewritePanel } from './components/RewritePanel'
import { TemplateGallery } from './components/TemplateGallery'
import { ApiKeyModal } from './components/ApiKeyModal'
import { AuthPanel } from './components/AuthPanel'
import { History } from './components/History'
import { Footer } from './components/Footer'
import { ClarifyBanner, ClarifyFlow } from './components/ClarifyFlow'

import { countTokens } from './lib/tokenizer'
import { detectConfusion } from './lib/confusionDetector'
import { shouldOfferClarify } from './lib/clarifyFlow'
import { useDebounced, useHistory, useAuth } from './lib/hooks'

const EXAMPLE =
  'I would like you to please write me a really good book about a detective, it should be nice and engaging and interesting, and I want it to be the best, thanks so much in advance!'

export default function App() {
  const [prompt, setPrompt] = useState('')
  const [showHeat, setShowHeat] = useState(true)
  const [keyModalOpen, setKeyModalOpen] = useState(false)
  const [authPanelOpen, setAuthPanelOpen] = useState(false)
  const [aiBoost, setAiBoost] = useState(false)
  const [, forceRender] = useState(0)

  // Guided Q&A ("Clarify") flow state.
  const [clarifyOpen, setClarifyOpen] = useState(false)
  const [clarifyDismissed, setClarifyDismissed] = useState(false)

  const workbenchRef = useRef<HTMLDivElement>(null)

  const debounced = useDebounced(prompt, 300)
  const auth = useAuth()
  const { items, add, clear, sessionTotal } = useHistory(auth.session)

  // Live analysis (debounced heavy work).
  const tokens = useMemo(() => countTokens(debounced), [debounced])
  const flags = useMemo(() => detectConfusion(debounced), [debounced])
  const words = useMemo(
    () => (debounced.trim() ? debounced.trim().split(/\s+/).length : 0),
    [debounced],
  )
  const chars = debounced.length
  const hasText = debounced.trim().length > 0

  // Whether to offer the guided Q&A banner for the current (vague) prompt.
  const offerClarify = useMemo(() => shouldOfferClarify(debounced), [debounced])

  // Reset the "dismissed" state whenever the prompt text meaningfully changes,
  // so a new vague prompt gets a fresh chance to surface the suggestion.
  useEffect(() => {
    setClarifyDismissed(false)
  }, [debounced])

  // Record to history when a prompt settles (debounced) and is substantial.
  useEffect(() => {
    if (debounced.trim().length >= 20) add(debounced, tokens)
  }, [debounced, tokens, add])

  const loadPrompt = (text: string, scroll = true) => {
    setPrompt(text)
    if (scroll) {
      requestAnimationFrame(() =>
        workbenchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      )
    }
  }

  return (
    <div className="flex min-h-svh w-full max-w-full flex-col overflow-x-hidden">
      <Hero />

      {/* Workbench + live analysis */}
      <main ref={workbenchRef} className="mx-auto w-full max-w-5xl scroll-mt-4 px-4 sm:px-6">
        <div className="flex flex-col gap-4">
          <PromptWorkbench
            value={prompt}
            onChange={setPrompt}
            flags={flags}
            showHeat={showHeat}
            onToggleHeat={setShowHeat}
          />

          {/* guided Q&A suggestion for vague prompts */}
          <AnimatePresence>
            {offerClarify && !clarifyDismissed && !clarifyOpen && (
              <ClarifyBanner
                key="clarify-banner"
                onStart={() => setClarifyOpen(true)}
                onDismiss={() => setClarifyDismissed(true)}
              />
            )}
          </AnimatePresence>

          {/* quick-start row */}
          {!hasText && (
            <div
              className="flex flex-wrap items-center justify-center gap-2 text-xs"
              style={{ color: 'var(--text-dim)' }}
            >
              <span>Try:</span>
              <button
                type="button"
                onClick={() => loadPrompt(EXAMPLE, false)}
                className="md-state md-focus rounded-full px-4 py-1.5 font-medium transition-all duration-200"
                style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
              >
                “write me a really good book…”
              </button>
              <span className="hidden sm:inline">or pick a template below.</span>
            </div>
          )}

          <TokenSummary tokens={tokens} words={words} chars={chars} />

          <AnimatePresence>
            {hasText && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4"
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="min-w-0">
                    <CostTable tokens={tokens} />
                  </div>
                  <div className="min-w-0">
                    <ConfusionFlags flags={flags} hasText={hasText} />
                  </div>
                </div>

                <RewritePanel
                  original={prompt}
                  onOpenKeyModal={() => setKeyModalOpen(true)}
                  onUseRewrite={(t) => loadPrompt(t, false)}
                  aiBoostEnabled={aiBoost}
                  onToggleAiBoost={setAiBoost}
                />

                <History items={items} onSelect={(t) => loadPrompt(t)} onClear={clear} sessionTotal={sessionTotal} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <TemplateGallery onUseTemplate={(p) => loadPrompt(p)} />

      {/* Optional cloud sign-in entry point — only shown when Supabase is
          configured (env vars set). Fully hidden otherwise, so a fresh clone
          without a backend never sees a broken feature. */}
      {auth.configured && auth.ready && (
        <div className="mx-auto -mb-2 flex w-full max-w-5xl justify-center px-4 pt-2 sm:px-6">
          <button
            type="button"
            onClick={() => setAuthPanelOpen(true)}
            className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200"
            style={{ background: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }}
          >
            <Cloud size={13} />
            {auth.email ? `Synced · ${auth.email}` : 'Sign in to sync across devices'}
          </button>
        </div>
      )}

      <Footer />

      <ApiKeyModal
        open={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
        onSaved={() => forceRender((n) => n + 1)}
      />

      <AuthPanel open={authPanelOpen} onClose={() => setAuthPanelOpen(false)} auth={auth} />

      <ClarifyFlow
        open={clarifyOpen}
        original={prompt}
        onClose={() => setClarifyOpen(false)}
        onApply={(assembled) => loadPrompt(assembled, false)}
      />
    </div>
  )
}
