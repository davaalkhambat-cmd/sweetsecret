/**
 * Line items-оос dashboard-д шаардлагатай бүх aggregation-уудыг
 * тооцоолно: KPI, daily trend, channels, products, families,
 * bundles, weekday, heatmap.
 *
 * Гаралтын формат нь одоогийн wettrust-dashboard-ийн DATA JSON-тай
 * 1:1 таарахаар бүтээсэн — ингэснээр UI бараг өөрчлөгдөхгүйгээр
 * Firestore-ийн snapshot-г шууд render хийх боломжтой.
 */

const WEEKDAY_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
// Санхүүгийн форматад өдрийн дарааллыг Даваа=0 гэж тоолъё (Mongolian
// бизнесийн уламжлалт дараалал, wettrust dashboard-тай таарна).
const WEEKDAY_BUSINESS_ORDER = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

const CHANNEL_ORDER = ['И-Март (Хан-Уул)', 'Шангри-Ла', 'Хүргэлт', 'УИД салбар'];

/**
 * Бүтээгдэхүүний нэрээс "family" (брэнд/бүлэг)-г гаргах.
 * Эхэнд илүү тодорхой pattern-ууд шалгана.
 */
function detectFamily(productName) {
    const n = (productName || '').trim();
    if (!n) return 'Бусад';

    // Урамшууллын багцууд (1+1 / 50%) — wettrust dashboard-д тусгай
    // "Урамшуулал (1+1)" family-тэй
    if (/^\s*1\+1\b|\b1\s*\+\s*1\b|Урамшуулал/i.test(n) && /\b1\s*\+\s*1\b|^1\+1/i.test(n)) {
        return 'Урамшуулал (1+1)';
    }
    if (/^1\+1/i.test(n) || /\b1\+1\b.*Урамшуулал/i.test(n)) {
        return 'Урамшуулал (1+1)';
    }
    // Багц (багц гэж нэрлэгдсэн боловч 1+1 биш)
    if (/багц/i.test(n)) return 'Багц';

    // Брэнд pattern-ууд — эхэнд нь тохирох үгээр таньж эхлэнэ
    const patterns = [
        [/^Innergarm\b/i, 'Innergarm'],
        [/^innergarm\b/i, 'innergarm'],
        [/^Innergam\b/i, 'Innergam'],
        [/^Intime\b/i, 'Intime'],
        [/Rainbow/i, 'Rainbow series'],
        [/Let's inclear/i, "Let's inclear"],
        [/^Outclear\b/i, 'Outclear'],
        [/Tea Tree/i, 'Tea Tree'],
        [/Intimate Earth/i, 'Intimate Earth'],
        [/^Inner\b/i, 'Inner'],
        [/^Zero\b/i, 'Zero'],
        [/Collagen/i, 'Collagen'],
        [/Kagel/i, 'Kagel'],
        [/Menstrual/i, 'Menstrual'],
        [/AGE-R/i, 'AGE-R'],
        [/^The\b/i, 'The'],
        [/^Red\b/i, 'Red'],
        [/^Deep\b/i, 'Deep'],
        [/^Ном\b/i, 'Ном'],
        [/Маск|Mask/i, 'Маск'],
        [/Клавин/i, 'Клавин'],
        [/Пад|Pad/i, 'Пад'],
    ];
    for (const [re, name] of patterns) {
        if (re.test(n)) return name;
    }
    return 'Бусад';
}

/**
 * Product name-ээс "bundle" мөн эсэхийг тогтоох.
 * Wettrust-ийн тодорхойлолт: зөвхөн `family === "Багц"`. "Урамшуулал
 * (1+1)" нь promo discount тул bundle-д тоохгүй.
 */
function isBundle(family) {
    return family === 'Багц';
}

function sortChannelsCanonical(channels) {
    return [...channels].sort((a, b) => {
        const ia = CHANNEL_ORDER.indexOf(a);
        const ib = CHANNEL_ORDER.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
}

function weekdayNumBusiness(date) {
    // JS: 0=Sun, 1=Mon, ... 6=Sat. Бизнес дараалалд Mon=0 гэж оруулъя.
    const js = date.getUTCDay();
    return (js + 6) % 7;
}

export function aggregateSales(lineItems) {
    const channelsSet = new Set();
    const datesSet = new Set();
    const receiptKeys = new Set();

    // ==== 1. Basic totals ====
    let totalNet = 0;
    let totalQty = 0;
    let totalDiscount = 0;
    let totalLines = 0;

    for (const it of lineItems) {
        totalNet += it.net;
        totalQty += it.qty;
        totalDiscount += it.discountAmount;
        totalLines += 1;
        channelsSet.add(it.channel);
        if (it.date) datesSet.add(it.date);
        receiptKeys.add(`${it.receiptIndex}@${it.channel}@${it.date}`);
    }

    const totalReceipts = receiptKeys.size;
    const nDays = datesSet.size || 1;

    // ==== 2. Daily trend (channel-оор задрах) ====
    const dailyMap = new Map(); // date -> { date, [channel]: sales }
    for (const it of lineItems) {
        if (!it.date) continue;
        if (!dailyMap.has(it.date)) {
            dailyMap.set(it.date, { date: it.date });
        }
        const row = dailyMap.get(it.date);
        row[it.channel] = (row[it.channel] || 0) + it.net;
    }
    const daily = [...dailyMap.values()].sort((a, b) => a.date.localeCompare(b.date));
    // Бүх channel-д key байгаа эсэхийг хангана (зарим өдөр 0 байж болно)
    const channelsSorted = sortChannelsCanonical(channelsSet);
    for (const row of daily) {
        for (const ch of channelsSorted) {
            if (row[ch] == null) row[ch] = 0;
        }
    }

    // ==== 3. Receipts per day ====
    const receiptsByDate = new Map(); // date -> Set of receiptKeys
    const salesByDate = new Map();
    const qtyByDate = new Map();
    for (const it of lineItems) {
        const key = `${it.receiptIndex}@${it.channel}`;
        if (!receiptsByDate.has(it.date)) receiptsByDate.set(it.date, new Set());
        receiptsByDate.get(it.date).add(key);
        salesByDate.set(it.date, (salesByDate.get(it.date) || 0) + it.net);
        qtyByDate.set(it.date, (qtyByDate.get(it.date) || 0) + it.qty);
    }
    const receipts = [...receiptsByDate.keys()].sort().map((date) => ({
        date,
        receipts: receiptsByDate.get(date).size,
        sales: salesByDate.get(date) || 0,
        qty: qtyByDate.get(date) || 0,
    }));

    // ==== 4. Channels summary ====
    const channelsAgg = new Map();
    const channelReceiptSets = new Map();
    for (const it of lineItems) {
        if (!channelsAgg.has(it.channel)) {
            channelsAgg.set(it.channel, { channel: it.channel, sales: 0, qty: 0, lines: 0 });
            channelReceiptSets.set(it.channel, new Set());
        }
        const c = channelsAgg.get(it.channel);
        c.sales += it.net;
        c.qty += it.qty;
        c.lines += 1;
        channelReceiptSets.get(it.channel).add(`${it.receiptIndex}@${it.date}`);
    }
    const channels = [...channelsAgg.values()].map((c) => {
        const receiptsCount = channelReceiptSets.get(c.channel).size;
        return {
            ...c,
            receipts: receiptsCount,
            avg_basket: receiptsCount ? Math.round(c.sales / receiptsCount) : 0,
            items_per_basket: receiptsCount ? +(c.qty / receiptsCount).toFixed(2) : 0,
        };
    }).sort((a, b) => b.sales - a.sales);

    // ==== 5. Products summary ====
    const productsAgg = new Map();
    const productReceiptSets = new Map();
    for (const it of lineItems) {
        const key = it.productName;
        if (!productsAgg.has(key)) {
            productsAgg.set(key, { product_name: key, qty: 0, revenue: 0 });
            productReceiptSets.set(key, new Set());
        }
        const p = productsAgg.get(key);
        p.qty += it.qty;
        p.revenue += it.net;
        productReceiptSets.get(key).add(`${it.receiptIndex}@${it.channel}@${it.date}`);
    }
    const products = [...productsAgg.values()]
        .map((p) => ({ ...p, n_receipts: productReceiptSets.get(p.product_name).size }))
        .sort((a, b) => b.revenue - a.revenue);

    // ==== 6. Families ====
    const familiesAgg = new Map();
    for (const it of lineItems) {
        const fam = detectFamily(it.productName);
        if (!familiesAgg.has(fam)) {
            familiesAgg.set(fam, { family: fam, qty: 0, revenue: 0 });
        }
        const f = familiesAgg.get(fam);
        f.qty += it.qty;
        f.revenue += it.net;
    }
    const families = [...familiesAgg.values()].sort((a, b) => b.revenue - a.revenue);

    // ==== 7. Bundles ====
    const bundlesAgg = new Map();
    const bundleReceiptSets = new Map();
    const bundleChannelAgg = new Map(); // `${bundle}@${channel}` -> {bundle, channel, revenue, qty}
    let bundleTotalQty = 0;
    let bundleTotalRevenue = 0;
    for (const it of lineItems) {
        const fam = detectFamily(it.productName);
        if (!isBundle(fam)) continue;
        bundleTotalQty += it.qty;
        bundleTotalRevenue += it.net;
        const key = it.productName;
        if (!bundlesAgg.has(key)) {
            bundlesAgg.set(key, { product_name: key, qty: 0, revenue: 0 });
            bundleReceiptSets.set(key, new Set());
        }
        const b = bundlesAgg.get(key);
        b.qty += it.qty;
        b.revenue += it.net;
        bundleReceiptSets.get(key).add(`${it.receiptIndex}@${it.channel}@${it.date}`);

        const chKey = `${key}@@${it.channel}`;
        if (!bundleChannelAgg.has(chKey)) {
            bundleChannelAgg.set(chKey, { bundle: key, channel: it.channel, qty: 0, revenue: 0 });
        }
        const bc = bundleChannelAgg.get(chKey);
        bc.qty += it.qty;
        bc.revenue += it.net;
    }
    const bundles = [...bundlesAgg.values()]
        .map((b) => ({ ...b, n_receipts: bundleReceiptSets.get(b.product_name).size }))
        .sort((a, b) => b.revenue - a.revenue);
    const bundlesByChannel = [...bundleChannelAgg.values()];

    // ==== 8. Weekday ====
    const weekdayAgg = new Map(); // business_num -> { sales, receipts, daysSet }
    const weekdayReceiptSets = new Map();
    for (const it of lineItems) {
        if (!it.date) continue;
        const d = new Date(it.date + 'T00:00:00Z');
        const wnum = weekdayNumBusiness(d);
        if (!weekdayAgg.has(wnum)) {
            weekdayAgg.set(wnum, { weekday_num: wnum, sales: 0, daysSet: new Set() });
            weekdayReceiptSets.set(wnum, new Set());
        }
        const w = weekdayAgg.get(wnum);
        w.sales += it.net;
        w.daysSet.add(it.date);
        weekdayReceiptSets.get(wnum).add(`${it.receiptIndex}@${it.channel}@${it.date}`);
    }
    const weekday = [...weekdayAgg.values()].map((w) => ({
        weekday_num: w.weekday_num,
        weekday_mn: WEEKDAY_BUSINESS_ORDER[w.weekday_num],
        sales: w.sales,
        receipts: weekdayReceiptSets.get(w.weekday_num).size,
        n_days: w.daysSet.size,
        avg_sales_per_day: w.daysSet.size ? Math.round(w.sales / w.daysSet.size) : 0,
    })).sort((a, b) => a.weekday_num - b.weekday_num);

    // ==== 9. Heatmap — channel × weekday ====
    const heatmapAgg = new Map();
    for (const it of lineItems) {
        if (!it.date) continue;
        const d = new Date(it.date + 'T00:00:00Z');
        const wnum = weekdayNumBusiness(d);
        const key = `${it.channel}@@${wnum}`;
        if (!heatmapAgg.has(key)) {
            heatmapAgg.set(key, {
                channel: it.channel,
                weekday_num: wnum,
                weekday_mn: WEEKDAY_BUSINESS_ORDER[wnum],
                sales: 0,
            });
        }
        heatmapAgg.get(key).sales += it.net;
    }
    const heatmap = [...heatmapAgg.values()];

    // ==== 10. KPIs ====
    const grossSales = totalNet + totalDiscount;
    const kpis = {
        total_sales: totalNet,
        total_receipts: totalReceipts,
        total_qty: totalQty,
        total_lines: totalLines,
        avg_basket: totalReceipts ? Math.round(totalNet / totalReceipts) : 0,
        avg_items: totalReceipts ? +(totalQty / totalReceipts).toFixed(2) : 0,
        total_discount: totalDiscount,
        discount_rate: grossSales ? +((totalDiscount / grossSales) * 100).toFixed(1) : 0,
        n_days: nDays,
        avg_daily_sales: Math.round(totalNet / nDays),
        avg_daily_receipts: +(totalReceipts / nDays).toFixed(1),
        date_start: [...datesSet].sort()[0] || null,
        date_end: [...datesSet].sort().slice(-1)[0] || null,
    };

    // ==== 11. Bundle KPIs ====
    const uniqueBundles = bundles.length;
    const bundleKpis = {
        total_bundles_qty: bundleTotalQty,
        total_bundles_revenue: bundleTotalRevenue,
        bundle_share_pct: totalNet ? +((bundleTotalRevenue / totalNet) * 100).toFixed(1) : 0,
        unique_bundles: uniqueBundles,
        avg_bundle_price: bundleTotalQty ? Math.round(bundleTotalRevenue / bundleTotalQty) : 0,
    };

    return {
        kpis,
        daily,
        receipts,
        channels,
        products,
        families,
        bundles,
        bundles_by_channel: bundlesByChannel,
        bundle_kpis: bundleKpis,
        weekday,
        heatmap,
    };
}

/**
 * Compact-д хадгалагдсан line item-уудыг буцаан full хэлбэрт болгоно.
 * Firestore-д `{ r, d, c, pc, pn, q, dp, da, n }` compact format-аар хадгалдаг.
 */
export function expandCompactItems(compact) {
    if (!Array.isArray(compact)) return [];
    return compact.map((it) => ({
        receiptIndex: it.r,
        date: it.d,
        channel: it.c,
        productCode: it.pc || '',
        productName: it.pn || '',
        qty: Number(it.q) || 0,
        discountPct: Number(it.dp) || 0,
        discountAmount: Number(it.da) || 0,
        net: Number(it.n) || 0,
        // Aggregation ашиглагддаггүй талбарууд — 0 орлуулна
        unitPrice: 0,
        preVat: 0,
        vat: 0,
        total: Number(it.n) || 0,
        transaction: '',
        location: '',
        unit: '',
    }));
}

/**
 * Line items-ийг channel-аар filter хийгээд шинэ aggregation буцаана.
 * `channel === 'all'` бол бүх items-г ашиглана.
 */
export function aggregateByChannel(lineItems, channel) {
    if (!channel || channel === 'all') return aggregateSales(lineItems);
    const filtered = lineItems.filter((it) => it.channel === channel);
    return aggregateSales(filtered);
}

// Testing/debug-т ашиглана
export const __test = { detectFamily, weekdayNumBusiness, isBundle };
