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

- **Content**: blog posts are Markdown/MDX files in `src/content/blog/`, loaded by the `blog` collection in `src/content.config.ts`. A Zod schema validates frontmatter: `title`, `description`, and `pubDate` are required; `updatedDate` and `heroImage` are optional. `heroImage` is a relative image path that goes through Astro's image pipeline. The filename becomes the post's `id` and URL slug.
- **Routing**: `src/pages/blog/[...slug].astro` uses `getStaticPaths()` to generate one static page per post and renders it inside `src/layouts/BlogPost.astro`. `src/pages/about.astro` reuses that same layout with hard-coded props, so changes to `BlogPost.astro` affect it too. `src/pages/blog/index.astro` lists posts sorted by `pubDate`. `src/pages/rss.xml.js` builds the RSS feed from the same collection, and its links must stay in sync with the `/blog/<id>/` route.
- **Site-wide metadata**: `SITE_TITLE` and `SITE_DESCRIPTION` live in `src/consts.ts`. `src/components/BaseHead.astro` holds all `<head>` tags (SEO, Open Graph, canonical URL, RSS/sitemap links, fonts). It also imports `src/styles/global.css`, so every page must include it to get global styles. Pages without their own image fall back to `src/assets/blog-placeholder-1.jpg` as the Open Graph image.
- **Config**: `astro.config.mjs` sets `site`, which canonical URLs, RSS, and the sitemap depend on. It also enables the MDX and sitemap integrations and uses Astro's fonts API to register the self-hosted Atkinson font as the `--font-atkinson` CSS variable.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
