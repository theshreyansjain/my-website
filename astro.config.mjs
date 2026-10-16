// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://my-website-phi-topaz.vercel.app',
	integrations: [
		mdx(),
		// Lab pages are work in progress: leave them out of the sitemap.
		sitemap({ filter: (page) => !page.includes('/lab/') }),
	],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'JetBrains Mono',
			cssVariable: '--font-mono',
			fallbacks: ['monospace'],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/jetbrains-mono-regular.woff2'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/jetbrains-mono-bold.woff2'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
