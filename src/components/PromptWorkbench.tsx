import { useMemo, useRef, useState, useEffect } from 'react'
import { Eraser, ClipboardPaste, Highlighter, AlertTriangle } from 'lucide-react'
import { tokenize, tokenHeat, HEAT_COLORS, type Heat } from '../lib/tokenizer'
import { CATEGORY_META, type Flag } from '../lib/confusionDetector'

interface Props {
  value: string
  onChange: (v: string) => void
  flags: Flag[]
  /** Whether the token heat overlay is on. */
  showHeat: boolean
  onToggleHeat: (v: boolean) => void
}

/**
 * A textarea layered on top of a rendered "highlight" div. The overlay paints
 * per-token background heat and confusion-flag underlines; the textarea sits
 * above it, fully transparent text, so the user types normally while the
 * colored markup shows through. Both share `.pw-shared` metrics so glyphs align.
 */
export function PromptWorkbench({ value, onChange, flags, showHeat, onToggleHeat }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)

  // Keep overlay scroll synced to the textarea.
  useEffect(() => {
    if (overlayRef.current) overlayRef.current.scrollTop = scrollTop
  }, [scrollTop])

  const spanFlags = useMemo(() => flags.filter((f) => f.end > f.start), [flags])

  // The overlay always paints flag underlines. When the heatmap is on it also
  // paints token backgrounds AND renders the text visibly (the textarea's own
  // glyphs are made transparent so the colored overlay reads through).
  const overlayShowsText = showHeat && !!value
  const highlighted = useMemo(
    () => buildHighlightedNodes(value, showHeat, spanFlags, overlayShowsText),
    [value, showHeat, spanFlags, overlayShowsText],
  )

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) onChange(value ? value + '\n' + text : text)
    } catch {
      taRef.current?.focus()
    }
  }

  return (
    <div className="glass rounded-[24px] p-4 shadow-lg sm:p-5">
      {/* toolbar */}
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text)' }}>
          <span className="hidden sm:inline">Your prompt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ToolbarToggle active={showHeat} onClick={() => onToggleHeat(!showHeat)} title="Toggle token heat overlay">
            <Highlighter size={14} />
            <span className="hidden sm:inline">Heatmap</span>
          </ToolbarToggle>
          <ToolbarButton onClick={handlePaste} title="Paste from clipboard">
            <ClipboardPaste size={14} />
            <span className="hidden sm:inline">Paste</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => onChange('')} title="Clear" disabled={!value}>
            <Eraser size={14} />
            <span className="hidden sm:inline">Clear</span>
          </ToolbarButton>
        </div>
      </div>

      {/* editor stack: overlay div behind, transparent textarea in front */}
      <div className="relative">
        <div
          ref={overlayRef}
          aria-hidden
          className="pw-shared pointer-events-none absolute inset-0 h-full overflow-hidden rounded-t-[12px]"
          style={{ color: overlayShowsText ? 'var(--text-h)' : 'transparent' }}
        >
          {highlighted}
          {/* zero-width char so a trailing newline keeps its line box */}
          {'​'}
        </div>
        {/* MD3 filled text field — kept MONOSPACE (.pw-shared) so the token
            heat overlay stays pixel-aligned; a deliberate exception to Roboto. */}
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          spellCheck={false}
          placeholder="Try: write me a book about a detective who can taste lies…"
          className="pw-shared md-field relative block h-[240px] w-full resize-y sm:h-[280px]"
          style={{
            // When the heat overlay renders visible text, hide the textarea's
            // own glyphs so only the colored overlay shows (caret stays visible).
            color: 'var(--text-h)',
            WebkitTextFillColor: overlayShowsText ? 'transparent' : 'var(--text-h)',
            caretColor: 'var(--md-primary)',
          }}
        />
      </div>

      {/* legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[11px]" style={{ color: 'var(--text-dim)' }}>
        {showHeat ? (
          <>
            <span className="font-medium" style={{ color: 'var(--text)' }}>Token heat:</span>
            <LegendSwatch heat="cold" label="efficient" />
            <LegendSwatch heat="cool" label="normal" />
            <LegendSwatch heat="warm" label="dense" />
            <LegendSwatch heat="hot" label="expensive" />
          </>
        ) : (
          <span>Turn on the Heatmap to see which words split into the most (priciest) tokens.</span>
        )}
        {flags.length > 0 && (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle size={12} style={{ color: 'var(--warn)' }} />
            {flags.length} issue{flags.length === 1 ? '' : 's'} found
          </span>
        )}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function LegendSwatch({ heat, label }: { heat: Heat; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded"
        style={{ background: HEAT_COLORS[heat].bg, border: '1px solid var(--border)' }}
      />
      {label}
    </span>
  )
}

function ToolbarButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ color: 'var(--md-on-secondary-container)', background: 'var(--md-secondary-container)' }}
    >
      {children}
    </button>
  )
}

function ToolbarToggle({
  active,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className="md-state md-focus inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200"
      style={{
        color: active ? 'var(--md-on-primary)' : 'var(--md-on-secondary-container)',
        background: active ? 'var(--md-primary)' : 'var(--md-secondary-container)',
      }}
    >
      {children}
    </button>
  )
}

/**
 * Build the array of styled spans for the overlay.
 *
 * We merge two sources of styling per character range:
 *  - token heat (background color)
 *  - confusion flags (colored underline)
 * The simplest robust approach at prompt scale: compute per-character style,
 * then coalesce consecutive identical styles into spans.
 */
function buildHighlightedNodes(
  text: string,
  showHeat: boolean,
  spanFlags: Flag[],
  visibleText = false,
): React.ReactNode[] {
  if (!text) return []

  const n = text.length
  const bg = new Array<string>(n).fill('transparent')
  const underline = new Array<string>(n).fill('')

  if (showHeat) {
    const { tokens } = tokenize(text)
    for (const tok of tokens) {
      const heat = tokenHeat(tok)
      if (heat === 'neutral') continue
      const color = HEAT_COLORS[heat].bg
      for (let i = tok.start; i < tok.end && i < n; i++) bg[i] = color
    }
  }

  for (const f of spanFlags) {
    const color = CATEGORY_META[f.category].color
    for (let i = f.start; i < f.end && i < n; i++) underline[i] = color
  }

  // Coalesce.
  const nodes: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < n) {
    const curBg = bg[i]
    const curU = underline[i]
    let j = i + 1
    while (j < n && bg[j] === curBg && underline[j] === curU) j++
    const chunk = text.slice(i, j)
    const style: React.CSSProperties = {}
    if (curBg !== 'transparent') {
      style.background = curBg
      style.borderRadius = '3px'
    }
    if (curU) {
      style.textDecoration = 'underline'
      style.textDecorationColor = curU
      style.textDecorationStyle = 'wavy'
      style.textDecorationThickness = '2px'
      style.textUnderlineOffset = '3px'
    }
    if (visibleText) style.color = 'var(--text-h)'
    nodes.push(
      <span key={key++} style={style}>
        {chunk}
      </span>,
    )
    i = j
  }
  return nodes
}
