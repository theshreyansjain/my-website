# Site plan

Design decisions and roadmap for the site. Design discussions happen in a
claude.ai chat; Claude Code builds from this file. Record conclusions here,
not transcripts.

## Design
- Dark and techy: near-black background, one accent color, monospace font.
- Mobile-first; must look good in portrait on a phone.

## Site structure
- Posts: Markdown in `src/content/blog/`, URL `/blog/<slug>`.
- Each post has a `topic` field (psychology, running, biking, programming-ai,
  quant, finance). Topic listings at `/topics/<topic>`; `/blog` lists all.

## Homepage plan
- A solid-color humanoid built procedurally in Three.js (primitives + joint
  hierarchy, no model files), driven purely by scroll position. No idle
  animation. GSAP ScrollTrigger for scroll. Props and camera move too.
- One scene per topic (stand, run, desk+laptop, bike, read). Desktop: "press
  →" opens that topic's page; mobile: a visible button.
- Respect prefers-reduced-motion; cap devicePixelRatio at 2.

## Roadmap (in order)
- [ ] 0. Setup checks:
  - [x] Vercel: Node.js version 22.x or newer (package.json needs >= 22.12).
    Set to 24.x.
  - [x] Vercel: production branch is `main`; previews viewable on the phone.
    Previews use Vercel Authentication: log in to vercel.com on the phone.
    The production URL stays public.
  - [ ] Claude Code: allow `git add` / `git commit` in `.claude/settings.json`
    (push stays on "ask").
  - [ ] Optional, needs approval for dev deps: `@astrojs/check` + `typescript`
    for `astro check` before the Three.js work.
- [x] 1. Replace template homepage text and footer. Also clear the other
  template leftovers: Astro's social links in Header/Footer, lorem ipsum on
  the About page, Astro favicon.
- [x] 2. Dark theme, including swapping Atkinson for a self-hosted monospace
  font.
- [x] 3. Topic field, /topics pages.
- [ ] 4. Homepage skeleton with scroll sections and navigation, placeholder figure.
- [ ] 5. Figure prototype at /lab/figure: stand + run, then desk, bike, read.
- [ ] 6. Polish: portrait layout, performance, reduced motion.
- [ ] 7. Later: custom domain, analytics, newsletter.

## Build notes
What changed from the plan while building, and why. Newest first.

- Step 3: `topic` is optional, not required: posts without one (like
  hello-world) are general and only listed in `/blog`, so the six topics stay
  matched to the six homepage scenes. A misspelled topic still fails the
  build. Topic list lives in `TOPICS` in `src/consts.ts`. Topics are part of
  the blog, so they are not in the header (which stays Home | Blog | About,
  with Blog highlighted on topic pages too); instead a row of `#topic` chips
  sits above the post list on `/blog` and every topic page. No `/topics`
  index page. A hover dropdown was rejected because phones have no hover.

- Step 2: font is JetBrains Mono (self-hosted woff2, regular + bold, OFL
  license in `src/assets/fonts/`); Atkinson removed. Accent is green
  `#39f58c`, with a faint green glow on h1 and link hover. Color variables in
  `global.css` were renamed by role (`--bg`, `--surface`, `--border`,
  `--text`, `--text-heading`, `--text-muted`, `--accent`) instead of shade.
  Type scale shrunk (body 17px, 16px on mobile) because monospace is wide.

- Step 1: Astro's social links were removed, not replaced, since no accounts
  were chosen yet; add them back in Header/Footer when decided. The favicon is
  now a placeholder monospace "S" SVG; `favicon.ico` was dropped because
  modern browsers use the SVG. Homepage and About copy are short drafts
  for Shreyans to rewrite.
