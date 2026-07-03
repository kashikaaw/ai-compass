import { Compass, Code2 } from 'lucide-react'
import { PRICING_LAST_UPDATED } from '../lib/pricing'

export function Footer() {
  return (
    <footer
      className="mt-auto border-t px-6 py-8 text-center text-xs"
      style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-h)' }}>
          <Compass size={15} style={{ color: 'var(--md-primary)' }} />
          <span className="font-medium">AI Compass</span>
        </div>

        <p className="max-w-xl leading-relaxed">
          Everything runs locally in your browser. Nothing you type is uploaded.
          Token counts use the o200k_base tokenizer as a universal estimate —
          exact tokenization varies by model/provider. Prices are estimates
          (updated {PRICING_LAST_UPDATED}); verify at each provider's docs before
          budgeting.
        </p>

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="md-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-colors duration-200"
          style={{ color: 'var(--md-primary)' }}
        >
          <Code2 size={13} /> Open source · MIT
        </a>
      </div>
    </footer>
  )
}
