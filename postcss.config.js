// Intentionally empty.
//
// AI Compass uses Tailwind CSS v4 via the `@tailwindcss/vite` plugin, which
// handles CSS transformation (including vendor prefixing) itself — no PostCSS
// plugins are needed. This file exists mainly to STOP PostCSS from walking up
// the directory tree and picking up an unrelated parent project's config, which
// would otherwise break the build with a Tailwind v3/v4 mismatch.
export default {
  plugins: {},
}
