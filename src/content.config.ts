import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TOPICS, type Topic } from './consts';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			// Image for link previews on social sites (1200×630). Falls back to
			// heroImage, then to the site-wide placeholder.
			ogImage: z.optional(image()),
			// Optional: posts without a topic only appear in /blog.
			topic: z.enum(Object.keys(TOPICS) as [Topic, ...Topic[]]).optional(),
		}),
});

export const collections = { blog };
