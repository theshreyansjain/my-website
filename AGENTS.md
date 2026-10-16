# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal blog (Astro 7, based on the official blog starter template), deployed at https://my-website-phi-topaz.vercel.app. Requires Node >= 22.12.0.

## Development

When starting the dev server, use background mode:

```
npx astro dev --background
```

Manage the background server with `npx astro dev stop`, `npx astro dev status`, and `npx astro dev logs`. (`astro` isn't installed globally, so always go through `npx` or `npm run astro --`.)

Other commands:

- `npm run build`: static build to `./dist/`
- `npm run preview`: serve the built site locally

There is no test suite or linter. `astro check` (type-checking) needs `@astrojs/check` and `typescript` installed first.

## Architecture

- **Content**: blog posts are Markdown/MDX files in `src/content/blog/`, loaded by the `blog` collection in `src/content.config.ts`. A Zod schema validates frontmatter: `title`, `description`, and `pubDate` are required; `updatedDate`, `heroImage` and `topic` are optional. `topic` must be one of the keys of `TOPICS` in `src/consts.ts` (the single list of topics); posts without one only appear in `/blog`. `heroImage` is a relative image path that goes through Astro's image pipeline. The filename becomes the post's `id` and URL slug.
- **Routing**: `src/pages/blog/[...slug].astro` uses `getStaticPaths()` to generate one static page per post and renders it inside `src/layouts/BlogPost.astro`. `src/pages/about.astro` reuses that same layout with hard-coded props, so changes to `BlogPost.astro` affect it too. `src/pages/blog/index.astro` lists all posts and `src/pages/topics/[topic].astro` lists one topic's posts (one page per `TOPICS` key, even if empty), both through `src/components/PostList.astro`, newest first. Both pages show `src/components/TopicNav.astro`, a row of topic chips ("all" links back to `/blog`); there is no `/topics` index page. `src/pages/rss.xml.js` builds the RSS feed from the same collection, and its links must stay in sync with the `/blog/<id>/` route.
- **Homepage**: `src/pages/index.astro` defines the scroll scenes (the `scenes` array) and a sticky stage holding the figure. `src/scripts/homepage.ts` uses GSAP ScrollTrigger to scrub the figure's pose from scroll position; scene ids must match its `poses`.
- **Site-wide metadata**: `SITE_TITLE` and `SITE_DESCRIPTION` live in `src/consts.ts`. `src/components/BaseHead.astro` holds all `<head>` tags (SEO, Open Graph, canonical URL, RSS/sitemap links, fonts). It also imports `src/styles/global.css`, so every page must include it to get global styles. Pages without their own image fall back to `src/assets/blog-placeholder-1.jpg` as the Open Graph image.
- **Config**: `astro.config.mjs` sets `site`, which canonical URLs, RSS, and the sitemap depend on. It also enables the MDX and sitemap integrations and uses Astro's fonts API to register the self-hosted JetBrains Mono font as the `--font-mono` CSS variable.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Owner and working style

Owner: Shreyans. Learning web development through this project. Explain
changes and the reasoning, not just the result. Ask before adding dependencies.

## Git workflow

Vercel is connected to the GitHub repo: pushing `main` deploys production, and
pushing any other branch gets a preview URL.

- Commit directly on `main`: blog posts, text edits, docs (`AGENTS.md`, `docs/`).
- Use one branch per roadmap step or other risky change (theme, layout, new
  pages, homepage changes). Push it so the owner can check the Vercel
  preview on a phone, then merge into `main` once approved.
- Never push without being asked.
- When asking the owner to look at a Vercel preview (or any other link), open
  it in their browser with `open <url>` instead of only printing it, and
  still include the URL in the reply.

## Plan and roadmap

Design decisions, site structure, the homepage plan and the roadmap live in
`docs/plan.md`; read it before starting feature work. The owner discusses
design in a separate claude.ai chat that reads the same file, so keep it
current: tick off roadmap steps when done, and add a short entry under
"Build notes" when the implementation departs from the plan.
