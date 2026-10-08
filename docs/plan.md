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
- [ ] 1. Replace template homepage text and footer.
- [ ] 2. Dark theme.
- [ ] 3. Topic field, /topics pages.
- [ ] 4. Homepage skeleton with scroll sections and navigation, placeholder figure.
- [ ] 5. Figure prototype at /lab/figure: stand + run, then desk, bike, read.
- [ ] 6. Polish: portrait layout, performance, reduced motion.
- [ ] 7. Later: custom domain, analytics, newsletter.

## Build notes
What changed from the plan while building, and why. Newest first.
