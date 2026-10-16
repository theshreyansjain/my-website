export const SITE_TITLE = 'Shreyans';
export const SITE_DESCRIPTION = 'Documenting what I learn: psychology, running, biking, programming, AI, quant trading and finance.';

// Post topics. The key is the URL slug (/topics/<key>/) and the value in a
// post's `topic` frontmatter; the label is what readers see.
export const TOPICS = {
	psychology: 'Psychology',
	running: 'Running',
	biking: 'Biking',
	'programming-ai': 'Programming & AI',
	quant: 'Quant',
	finance: 'Finance',
} as const;

export type Topic = keyof typeof TOPICS;
