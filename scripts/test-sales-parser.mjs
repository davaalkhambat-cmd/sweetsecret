/**
 * Жинхэнэ санхүүгийн Excel файл дээр parser + aggregator-г туршиж,
 * Dashboard-ийн бэлэн JSON-тай тулгаж шалгах туршилтын script.
 *
 * Ажиллуулах:
 *   node scripts/test-sales-parser.mjs "<absolute-path-to-xlsx>"
 */

import XLSX from 'xlsx';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM-ээс src/utils/sales-г import хийхийн тулд .js dynamic import ашиглана
const here = path.dirname(fileURLToPath(import.meta.url));

const { extractLineItems } = await import(path.join(here, '..', 'src/utils/sales/parseSalesWorkbook.js'));
const { aggregateSales } = await import(path.join(here, '..', 'src/utils/sales/aggregateSales.js'));

const excelPath = process.argv[2];
if (!excelPath) {
    console.error('Usage: node scripts/test-sales-parser.mjs <path-to-xlsx>');
    process.exit(1);
}

console.log(`Reading: ${excelPath}\n`);
const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

const items = extractLineItems(rows);
console.log(`Line items extracted: ${items.length}`);
console.log(`Receipts: ${new Set(items.map(i => `${i.receiptIndex}`)).size}`);

const agg = aggregateSales(items);

console.log('\n=== KPIs ===');
Object.entries(agg.kpis).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== Channels ===');
agg.channels.forEach((c) => {
    console.log(`  ${c.channel.padEnd(24)} sales=${c.sales.toLocaleString().padStart(12)}  qty=${String(c.qty).padStart(4)}  receipts=${String(c.receipts).padStart(3)}  avg=${c.avg_basket.toLocaleString()}`);
});

console.log('\n=== Bundle KPIs ===');
Object.entries(agg.bundle_kpis).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\n=== Top 10 Products ===');
agg.products.slice(0, 10).forEach((p, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${p.product_name.slice(0, 50).padEnd(50)}  qty=${String(p.qty).padStart(4)}  revenue=${p.revenue.toLocaleString().padStart(12)}`);
});

console.log('\n=== Families (top 10) ===');
agg.families.slice(0, 10).forEach((f) => {
    console.log(`  ${f.family.padEnd(24)} qty=${String(f.qty).padStart(4)}  revenue=${f.revenue.toLocaleString().padStart(12)}`);
});

console.log('\n=== Weekday ===');
agg.weekday.forEach((w) => {
    console.log(`  ${w.weekday_mn.padEnd(8)} days=${w.n_days}  receipts=${String(w.receipts).padStart(3)}  sales=${w.sales.toLocaleString().padStart(12)}  avg/day=${w.avg_sales_per_day.toLocaleString()}`);
});

console.log('\n=== Expected vs Actual (wettrust-dashboard.html-ийн утгууд) ===');
const EXPECTED = {
    total_sales: 35310263,
    total_receipts: 70,
    total_qty: 670,
    total_discount: 3076087,
    discount_rate: 8.0,
    avg_basket: 504432,
    avg_items: 9.57,
    n_days: 17,
};
let allMatch = true;
for (const [k, exp] of Object.entries(EXPECTED)) {
    const got = agg.kpis[k];
    const ok = Math.abs(Number(got) - Number(exp)) < 1;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✓' : '✗'} ${k.padEnd(20)} expected=${exp}  got=${got}`);
}

const EXPECTED_CHANNELS = {
    'И-Март (Хан-Уул)': { sales: 9367413, qty: 209, receipts: 19 },
    'Шангри-Ла': { sales: 9265550, qty: 175, receipts: 17 },
    'Хүргэлт': { sales: 8494500, qty: 126, receipts: 16 },
    'УИД салбар': { sales: 8182800, qty: 160, receipts: 18 },
};
console.log('\n  — Channels:');
for (const [ch, exp] of Object.entries(EXPECTED_CHANNELS)) {
    const got = agg.channels.find((c) => c.channel === ch);
    if (!got) {
        console.log(`  ✗ ${ch}  NOT FOUND`);
        allMatch = false;
        continue;
    }
    const salesOk = got.sales === exp.sales;
    const qtyOk = got.qty === exp.qty;
    const recOk = got.receipts === exp.receipts;
    console.log(`  ${salesOk && qtyOk && recOk ? '✓' : '✗'} ${ch.padEnd(22)} sales=${got.sales.toLocaleString()} (exp ${exp.sales.toLocaleString()})  qty=${got.qty} (${exp.qty})  receipts=${got.receipts} (${exp.receipts})`);
    if (!(salesOk && qtyOk && recOk)) allMatch = false;
}

// Bundle KPIs
const EXPECTED_BUNDLES = {
    total_bundles_qty: 34,
    total_bundles_revenue: 5267100,
    bundle_share_pct: 14.9,
};
console.log('\n  — Bundles:');
for (const [k, exp] of Object.entries(EXPECTED_BUNDLES)) {
    const got = agg.bundle_kpis[k];
    const ok = Math.abs(Number(got) - Number(exp)) < 0.2;
    if (!ok) allMatch = false;
    console.log(`  ${ok ? '✓' : '✗'} ${k.padEnd(24)} expected=${exp}  got=${got}`);
}

console.log(`\n${allMatch ? '✅ ALL MATCH' : '⚠️  SOME MISMATCH'}`);
