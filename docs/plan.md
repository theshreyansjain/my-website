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
- Five scenes, in scroll order:
  1. stand: intro ("Hi, I'm Shreyans"), no topic
  2. run: #running
  3. bike: #biking
  4. desk + computer, titled "Productivity": #programming-ai, #quant,
     #finance (one scene, three buttons)
  5. read: #psychology
- Each scene has visible buttons to its topic page(s); no keyboard
  shortcuts.
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
- [x] 4. Homepage skeleton with scroll sections and navigation, placeholder figure.
- [x] 5. Figure prototype at /lab/figure: stand + run, then desk, bike, read.
  Done, then rejected: the 2D homepage figure is the final figure.
- [ ] 6. Polish: portrait layout, performance, reduced motion.
- [ ] 7. Analytics: see where visitors come from (country, referring site),
  what device, OS and browser they use, and which pages they read.
  Privacy-friendly and cookie-free, so no consent banner. Likely Vercel Web
  Analytics (built into the hosting; enabled in the dashboard plus one
  script tag, no npm package needed); Plausible or Umami are alternatives.
- [ ] 8. Later: custom domain, newsletter.

## Build notes
What changed from the plan while building, and why. Newest first.

- Step 5 (2026-10-16): a Three.js version of the figure was built at
  /lab/figure (elbows, IK hands and feet, real turn and lighting, all five
  scenes with motion) and the owner preferred the 2D figure. It was not
  merged; the code is kept on the `step-5-figure-3d` branch for reference.
  The 2D homepage figure (CSS shapes + SVG props, GSAP poses and motion
  loops) is final, `three` is not a dependency, and the "Homepage plan"
  bullets about a procedural Three.js humanoid are superseded.

- Homepage: keyboard shortcuts (→, 1/2/3) and their "press …" hints were
  removed at the owner's request, along with the → in button labels.
  Buttons are the only way to open a topic from the homepage.
- Homepage layout: from 700px wide the figure is on the left and text on
  the right; phones stack figure above text (too narrow for side by side).
  Figure scaled up via a `.figure-scale` wrapper: 1.6x on phones (1.25x on
  short ones), 2.3x from 700px wide (1.7x on short windows, 2.7x on tall
  screens). The "scroll ↓" hint was removed.
- Homepage scenes: desk scene is titled "Productivity" and shows a desk with
  a computer monitor (code lines on screen). Run scene adds a headband and
  running shoes that fade in only while running. Step 5's Three.js figure
  should keep these props.
- Figure details: arms and head follow the torso lean (attached at the
  shoulder/neck, computed from the lean angle). Legs have knees (thigh +
  shin). Bike scene: SVG frame built around the rider (saddle under the
  hip, crank within leg reach, grips where the hands land), a teardrop
  helmet with vents and strap, and real pedalling: the crank turns and
  two-bone inverse kinematics keeps each foot on its pedal every frame.
  Every animated joint has two layers: the scroll pose on the outer element
  and the motion loop's offset on an inner one, so loops never overwrite a
  pose. Desk scene: a stool. Intro (facing
  the viewer): a green superhero cape that billows with the wave (a smiley
  face was tried and rejected), slight head tilt, and both arms and legs the
  same colour; side-on, the far limbs are darker. The cape fades out as the
  figure turns to run.
- Intro pose faces the viewer, with the figure's right hand (viewer's left)
  raised and waving, then turns side-on while scrolling to Running. The wave
  is a small loop that plays only while the intro is on screen: the one
  exception to "no idle animation", at the owner's request. With reduced
  motion the hand is raised but still.
- Scene motion loops (owner's request, extending the wave exception): each
  plays only while its scene is on screen. Running: arms and legs swing in
  a stride. Biking: legs pedal, wheels (with spokes) spin. Productivity:
  hands tap up and down, typing. Psychology: the figure holds an open book
  and the brain bursts out of the head into its structures (frontal,
  parietal, temporal and occipital lobes, cerebellum, brainstem), then
  collapses back in. Limb loops rotate an inner `.seg` element so they don't
  fight the scroll pose. None of them run with reduced motion.
- Homepage text: the intro shows "Hi, I'm Shreyans." (name in green) and
  "This is where I write down what I learn." with "Scroll to look around."
  on its own line ("Scroll" in green); no button. All homepage text lives in
  one pinned panel (40% down on desktop, below the figure on phones): the
  intro fades out as you scroll, then a white "I write about" heading and
  the scene's topic button(s) fade in, in the same spot. On phones the
  panel sits 71% down the screen (64% on short phones) to leave a clear gap
  below the figure.
- The homepage has no footer (other pages keep it): the page ends with the
  last scene, so the pinned figure doesn't get pushed up at the end.
- Figure tweaks: on phones the figure is nudged left (props stick out to its
  right). The desk monitor's code lines type themselves out, hold and clear
  on a 4s loop (still with reduced motion). Running torso lean cut to 4°.
  Limbs have an explicit draw order: far arm/leg behind the torso and head,
  near ones in front.
- Bike scene is a race position: back nearly flat (80° lean), saddle well
  behind the crank, fork raking forward to the front hub, drop bars.
- Brain: an SVG side view (frontal, parietal, occipital and temporal lobes,
  cerebellum, brainstem, each with fold lines). It appears over the head
  like an X-ray, bursts apart, holds, snaps back together and fades. Between scenes the buttons cross-fade (scrubbed by
  scroll) instead of scrolling past. Each topic group shows its button(s)
  with the topic description underneath; topic scenes have no title
  ("Productivity" is only the desk group's screen-reader label). "I write
  about" ends in three dots that appear one, two, three on a loop (still
  "..." with reduced motion).

- Step 4: added `gsap` (3.15, free "standard no charge" license); `three`
  comes in step 5. The stage is pinned with CSS `position: sticky`, not GSAP
  pinning (simpler, no layout jumps on phones); GSAP only scrubs one timeline
  across the page from scroll. The placeholder figure is CSS blocks with
  per-scene poses in `src/scripts/homepage.ts`; props (bike wheels, desk,
  book) fade in. Keys: → opens the scene's topic; on the desk scene 1/2/3
  pick a topic. Key hints hide on touch screens. Reduced motion: poses
  switch per scene with no animation. Scene copy lives in the `scenes` array
  in `src/pages/index.astro` and is a draft.

- Step 3: `topic` is optional, not required: posts without one (like
  hello-world) are general and only listed in `/blog`, so no catch-all
  "meta" topic is needed. A misspelled topic still fails the build. Topic list lives in `TOPICS` in `src/consts.ts`. Topics are part of
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
