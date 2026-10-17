// Fetches monthly closes for the AEX (Netherlands) and NIFTY 50 (India) since
// November 2019 from Yahoo Finance, and saves them to src/data/indices.json
// for the chart on the About page.
//
// Run it by hand when you want fresh numbers:  node scripts/update-index-data.mjs
// The site never fetches at build time, so a Yahoo outage can't break a deploy.
import { writeFile } from 'node:fs/promises';

const START = '2019-11'; // the month I moved to the Netherlands
const SERIES = [
	{ symbol: '^AEX', name: 'AEX', country: 'Netherlands' },
	{ symbol: '^NSEI', name: 'NIFTY 50', country: 'India' },
];

const monthOf = (seconds) => {
	// Yahoo stamps each monthly bar at local midnight on the 1st, which in UTC
	// can be the evening before. Two days later is safely inside the month.
	const d = new Date((seconds + 2 * 86400) * 1000);
	return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const series = [];
let asOf = 0;
for (const { symbol, name, country } of SERIES) {
	const from = Math.floor(Date.UTC(2019, 9, 25) / 1000);
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&period1=${from}&period2=${Math.floor(Date.now() / 1000)}`;
	const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
	if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
	const [result] = (await res.json()).chart.result;
	const closes = result.indicators.quote[0].close;

	// One point per month; Yahoo repeats the current month as a daily bar at
	// the end, so later bars for the same month overwrite earlier ones.
	const byMonth = new Map();
	result.timestamp.forEach((t, i) => {
		const month = monthOf(t);
		if (month >= START && closes[i] != null) byMonth.set(month, Math.round(closes[i] * 100) / 100);
	});
	series.push({
		name,
		country,
		currency: result.meta.currency,
		points: [...byMonth].map(([month, close]) => ({ month, close })),
	});
	asOf = Math.max(asOf, result.meta.regularMarketTime);
}

const data = { source: 'Yahoo Finance, monthly closes', asOf: new Date(asOf * 1000).toISOString().slice(0, 10), series };
await writeFile(new URL('../src/data/indices.json', import.meta.url), JSON.stringify(data, null, '\t') + '\n');
console.log(`Saved ${series.map((s) => `${s.name}: ${s.points.length} months`).join(', ')} (as of ${data.asOf})`);
