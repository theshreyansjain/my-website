// Minutes to read a post, from its raw Markdown/MDX source. Import lines,
// HTML/component tags and code fences' markers are dropped first so they
// don't count as words. ~220 words a minute is a typical reading speed.
export function readingMinutes(body = ''): number {
	const text = body
		.replace(/^(import|export) .*$/gm, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/[#*_`>{}[\]()|-]+/g, ' ');
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 220));
}
