# AI Compass

> **See what your AI prompt costs before you run it.**

[![Live demo](https://img.shields.io/badge/live_demo-kashikaaw.github.io%2Fai--compass-7c3aed?style=for-the-badge)](https://kashikaaw.github.io/ai-compass/)
[![Deploy to GitHub Pages](https://github.com/kashikaaw/ai-compass/actions/workflows/deploy.yml/badge.svg)](https://github.com/kashikaaw/ai-compass/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

AI Compass is a consumer-facing web app that inspects an AI prompt _before_ you
send it: it shows the token count and per-model dollar cost, flags confusing or
wasteful parts, and rewrites the prompt to be shorter and clearer — with a
gallery of ready-made templates for common asks (e.g. turning "write me a book"
into a tight, structured prompt).

Everything runs **locally in your browser**. There is no backend, no signup, and
nothing you type is uploaded.

### Optional: cloud sign-in

There is an **optional**, passwordless sign-in (magic link — we email you a
one-time link, there is never a password) that lets your prompt history follow
you across devices via [Supabase](https://supabase.com). It's a pure
enhancement: the app works fully without it, and if no Supabase project is
configured the sign-in UI simply doesn't appear (graceful no-op). To enable it,
the site operator sets up their own Supabase project, runs
[`supabase/schema.sql`](supabase/schema.sql) once in the Supabase SQL Editor,
and provides two values — as a local `.env` (see [`.env.example`](.env.example))
for development, and as the GitHub repository secrets `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` for the deployed build.

<img width="1512" height="805" alt="image" src="https://github.com/user-attachments/assets/e7682be0-9399-4f35-8c67-ea6146a3d900" />

---

## Features

- **Live analysis as you type** (debounced)
  - Total token count + a sortable per-model **$ cost table** across Anthropic,
    OpenAI, and Google models.
  - A **token heatmap** painted directly onto your prompt — expensive words
    (rare/long terms that split into many subword tokens) light up hot, so it
    reads like a bill inspector marking up the text.
- **Prompt inspector** — rule-based heuristics flag and underline:
  filler / politeness padding, vague adjectives, ambiguous pronoun references,
  redundant phrasing, likely contradictions, missing output-format constraints,
  run-on sentences, complex/creative asks with no example given, and long
  prompts with no structure/delimiters — each with a plain-English
  “why it matters.” Several of these heuristics are **informed by Anthropic’s
  official prompting best-practices guidance** (be clear and direct, use
  examples/few-shot, structure complex prompts with XML tags or delimiters,
  specify the desired output format) — see
  [Claude prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices).
- **Analyze your past prompts** — upload an exported ChatGPT
  (`conversations.json`) or Claude data export and get an aggregate read on
  your own prompting: most common issues, priciest prompts by token count, and
  example before/after rewrites. Parsed entirely in your browser — the file
  never leaves your device.
- **One-click Optimize**
  - A **rule-based rewrite engine** (zero setup) strips waste, tightens phrasing,
    adds output constraints, and — when it recognizes your intent (book, essay,
    blog, email, code, summary, translation, brainstorm, resume, business plan,
    social post, presentation, analysis) — swaps a vague ask for a proven,
    structured template.
  - **Before / after** view, a **word-level diff**, and a savings callout
    (“↓ 42% tokens, save $0.0031 / call on Claude Sonnet 4.6”).
  - **AI Boost:** an even smarter rewrite pass powered by Claude Haiku 4.5.
- **Template gallery** — a grid of common prompt archetypes. Fill a few
  mad-libs-style blanks and get an already-optimized prompt dropped into the
  workbench, ready to analyze or copy.
- **Nice touches** — copy-to-clipboard, a local recent-prompt history, subtle
  Framer Motion animations, responsive layout, and a dark-mode-friendly palette.

---

## Tech stack

- [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) 8
- [Tailwind CSS v4](https://tailwindcss.com/) (via `@tailwindcss/vite`)
- [gpt-tokenizer](https://github.com/niieani/gpt-tokenizer) (`o200k_base`) for token counting
- [Framer Motion](https://www.framer.com/motion/) for animation
- [lucide-react](https://lucide.dev/) for icons
- [Oxlint](https://oxc.rs/) for linting

---

## Local development

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build locally
npm run lint     # run oxlint
```

---

## Deploy to GitHub Pages

This repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that
builds and deploys on every push to `main`. **The live site above is deployed
this way** — no manual build step required.

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or run the workflow manually). The action builds the site and
   publishes `dist/` to Pages.

The Vite `base` is set to `'./'` (relative), so the app works under any repo path
without further configuration.

> **If your first deploy fails or hangs:** go to **Settings → Actions →
> General → Workflow permissions** and make sure **Read and write permissions**
> is selected. A repo defaulting to read-only can make the `pages: write` /
> `id-token: write` scopes this workflow requests behave inconsistently on the
> very first run.

---

## Accuracy notes

- Token counts use the `o200k_base` tokenizer as a **universal approximation**.
  Anthropic (Claude) and Google (Gemini) use their own tokenizers, so their
  counts are close estimates, not exact.
- Pricing is **estimated** (last updated July 2026) and baked into
  `src/lib/pricing.ts`. Always verify current rates at each provider's docs
  before relying on the numbers for real budgeting.

---

## Project structure

```
src/
  lib/
    pricing.ts            model pricing table + cost helpers
    tokenizer.ts          gpt-tokenizer wrapper (counts + per-token offsets)
    confusionDetector.ts  rule-based waste/confusion heuristics
    rewriteEngine.ts      rule-based rewrite, archetype detection, word diff
    templates.ts          template gallery data + prompt assembly
    anthropicClient.ts    AI Boost integration
    hooks.ts              debounce, copy, and history hooks
  components/
    Hero, PromptWorkbench, TokenSummary, CostTable, ConfusionFlags,
    RewritePanel, TemplateGallery, ApiKeyModal, History, Footer
  App.tsx                 composition root
```

---

## License

[MIT](LICENSE) © 2026 Kashika Wanchoo
