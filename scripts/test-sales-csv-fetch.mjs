/**
 * End-to-end test: Google Sheets gviz CSV-г татаж, parse хийгээд
 * KPI утгууд dashboard-ийн утгатай таарахыг шалгана.
 *
 * Usage:
 *   node scripts/test-sales-csv-fetch.mjs <SHEET_ID> <GID>
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { extractLineItems, parseCSV } = await import(path.join(here, '..', 'src/utils/sales/parseSalesWorkbook.js'));
const { aggregateSales } = await import(path.join(here, '..', 'src/utils/sales/aggregateSales.js'));

const SHEET_ID = process.argv[2];
const GID = process.argv[3] || '0';
if (!SHEET_ID) {
    console.error('Usage: node scripts/test-sales-csv-fetch.mjs <SHEET_ID> [GID]');
    process.exit(1);
}

const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;
console.log(`Fetching: ${url}\n`);

const res = await fetch(url);
if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
}
const csvText = await res.text();
console.log(`CSV: ${csvText.length} bytes`);

const rows = parseCSV(csvText);
console.log(`Rows: ${rows.length}`);

const items = extractLineItems(rows);
console.log(`Line items: ${items.length}`);

const agg = aggregateSales(items);

console.log('\n=== KPIs ===');
Object.entries(agg.kpis).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== Channels ===');
agg.channels.forEach((c) => {
    console.log(`  ${c.channel.padEnd(24)} sales=${c.sales.toLocaleString().padStart(12)}  qty=${String(c.qty).padStart(4)}  receipts=${String(c.receipts).padStart(3)}`);
});

console.log('\n=== Bundle KPIs ===');
Object.entries(agg.bundle_kpis).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// Expected from wettrust-dashboard.html
const EXPECTED = {
    total_sales: 35310263,
    total_receipts: 70,
    total_qty: 670,
    total_discount: 3076087,
};
console.log('\n=== Match check ===');
let allMatch = true;
for (const [k, exp] of Object.entries(EXPECTED)) {
    const got = agg.kpis[k];
    const ok = Math.abs(Number(got) - Number(exp)) < 1;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✓' : '✗'} ${k.padEnd(20)} expected=${exp}  got=${got}`);
}

console.log(`\n${allMatch ? '✅ ALL MATCH — CSV fetch + parse end-to-end works!' : '⚠️  MISMATCH — парсерыг шалгах хэрэгтэй'}`);
