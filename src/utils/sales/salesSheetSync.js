/**
 * Sales sheet → Firestore sync үйлдлүүд.
 *
 * Workflow:
 *   1. Sheet config-оос (Firestore doc `sales_sheet_config/main`)
 *      SHEET_ID болон сар бүрийн GID-г уншина.
 *   2. Google Sheets gviz CSV endpoint-оос тухайн сарын CSV-г татна.
 *   3. Parse → aggregate → `sales_reports/{YYYY-MM}` doc-т snapshot
 *      хадгална. syncedAt, syncedBy талбар нэмнэ (audit).
 */

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { extractLineItems, parseCSV } from './parseSalesWorkbook';
import { aggregateSales } from './aggregateSales';

export const SALES_REPORTS_COLLECTION = 'sales_reports';
export const SHEET_CONFIG_COLLECTION = 'sales_sheet_config';
export const SHEET_CONFIG_DOC = 'main';

/**
 * Tab-ийн тодорхойлолтыг хоёр янзаар хүлээж авна:
 *   - Зөвхөн тоо (жишээ "0", "123456789") → gid
 *   - Бусад текст (жишээ "2026-04") → sheet нэр
 */
export function buildGvizCsvUrl(sheetId, tabRef) {
    if (!sheetId) throw new Error('SHEET_ID шаардлагатай');
    const ref = String(tabRef ?? '').trim();
    const base = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
    if (!ref) return `${base}&gid=0`;
    if (/^\d+$/.test(ref)) return `${base}&gid=${ref}`;
    // Tab нэрээр — URL encode хийнэ
    return `${base}&sheet=${encodeURIComponent(ref)}`;
}

/**
 * Тухайн Sheet tab-ийн CSV текстийг татна. tabRef нь GID (тоо) эсвэл
 * tab-ийн нэр (жишээ "2026-04") байж болно.
 */
export async function fetchSheetCsv(sheetId, tabRef) {
    const url = buildGvizCsvUrl(sheetId, tabRef);
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) {
        throw new Error(`Google Sheets-ээс CSV татахад алдаа гарлаа: HTTP ${res.status}`);
    }
    return await res.text();
}

/**
 * CSV текст → aggregated sales report (Firestore-д бичихэд бэлэн JSON).
 */
export function csvToSalesReport(csvText) {
    const rows = parseCSV(csvText);
    const items = extractLineItems(rows);
    if (items.length === 0) {
        throw new Error('Sheet-ээс ямар ч борлуулалтын мөр олдсонгүй. Tab эсвэл GID-г шалгана уу.');
    }
    return {
        lineItemCount: items.length,
        items,
        agg: aggregateSales(items),
    };
}

/**
 * Tab GID → Firestore sales_reports doc.
 * `user` нь audit зориулалтаар (хэн синк хийсэн) бичигдэнэ.
 */
export async function syncMonth({ yearMonth, sheetId, gid, user }) {
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
        throw new Error(`yearMonth формат буруу: "${yearMonth}". Жишээ: "2026-04"`);
    }
    const csvText = await fetchSheetCsv(sheetId, gid);
    const { agg, items } = csvToSalesReport(csvText);

    // Date range-ийг sheet-ийн жинхэнэ огноонуудаас үүсэх —
    // yearMonth-тэй давхардахгүй бол алдаа гаргана (Google Sheets tab
    // нэр олдохгүй үед эхний tab буцаадаг учир үүнийг барьж авах шаардлагатай).
    if (agg.kpis.date_start && !agg.kpis.date_start.startsWith(yearMonth)) {
        throw new Error(
            `Сар таарахгүй байна: "${yearMonth}" оноос "${agg.kpis.date_start}..${agg.kpis.date_end}" ` +
            `өгөгдөл буцлаа. Tab нэр зөв эсэхийг шалгана уу (Google Sheets нь байхгүй tab-г эхний tab-ийн ` +
            `өгөгдлөөр орлуулдаг).`
        );
    }

    // Channel filter-г client-д хийхэд ашиглах line items. Storage-ийн
    // зардлыг бууруулахын тулд зөвхөн хэрэгтэй талбаруудыг хадгална.
    const compactItems = items.map((it) => ({
        r: it.receiptIndex,
        d: it.date,
        c: it.channel,
        pc: it.productCode,
        pn: it.productName,
        q: it.qty,
        dp: it.discountPct,
        da: it.discountAmount,
        n: it.net,
    }));

    const payload = {
        ...agg,
        yearMonth,
        line_items: compactItems,
        line_item_count: compactItems.length,
        source: {
            sheetId,
            gid: String(gid),
            fetchedAt: new Date().toISOString(),
        },
        syncedAt: serverTimestamp(),
        syncedBy: user
            ? {
                  uid: user.uid || null,
                  email: user.email || null,
                  displayName: user.displayName || null,
              }
            : null,
    };

    const docRef = doc(db, SALES_REPORTS_COLLECTION, yearMonth);
    await setDoc(docRef, payload, { merge: false });

    return payload;
}

/** Firestore-оос тодорхой сарын snapshot-г устгана (зөвхөн admin) */
export async function deleteSalesReport(yearMonth) {
    if (!yearMonth) throw new Error('yearMonth шаардлагатай');
    await deleteDoc(doc(db, SALES_REPORTS_COLLECTION, yearMonth));
}

/** Firestore-оос тодорхой сарын snapshot-г уншина */
export async function getSalesReport(yearMonth) {
    const snap = await getDoc(doc(db, SALES_REPORTS_COLLECTION, yearMonth));
    return snap.exists() ? snap.data() : null;
}

/** Боломжит бүх сарын жагсаалт (нэрс, syncedAt-тай). Шинээс хуучин уруу */
export async function listSalesReportMonths() {
    const q = query(collection(db, SALES_REPORTS_COLLECTION), orderBy('yearMonth', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
        const data = d.data();
        return {
            yearMonth: d.id,
            syncedAt: data.syncedAt || null,
            syncedBy: data.syncedBy || null,
            totalSales: data.kpis?.total_sales ?? 0,
            totalReceipts: data.kpis?.total_receipts ?? 0,
            dateStart: data.kpis?.date_start || null,
            dateEnd: data.kpis?.date_end || null,
        };
    });
}

/** Sheet config-ийг уншина */
export async function getSheetConfig() {
    const snap = await getDoc(doc(db, SHEET_CONFIG_COLLECTION, SHEET_CONFIG_DOC));
    if (!snap.exists()) {
        return { sheetId: null, months: [] };
    }
    const data = snap.data();
    return {
        sheetId: data.sheetId || null,
        // `months` нь `[{ yearMonth, gid, label? }]` массив
        months: Array.isArray(data.months) ? data.months : [],
        updatedAt: data.updatedAt || null,
    };
}

/** Sheet config-ийг бүхлээр нь шинэчилнэ */
export async function saveSheetConfig({ sheetId, months, user }) {
    if (!sheetId || typeof sheetId !== 'string') {
        throw new Error('sheetId шаардлагатай');
    }
    if (!Array.isArray(months)) {
        throw new Error('months массив шаардлагатай');
    }
    const payload = {
        sheetId: sheetId.trim(),
        months: months.map((m) => ({
            yearMonth: String(m.yearMonth).trim(),
            gid: String(m.gid).trim(),
            label: m.label ? String(m.label).trim() : null,
        })),
        updatedAt: serverTimestamp(),
        updatedBy: user
            ? { uid: user.uid || null, email: user.email || null }
            : null,
    };
    await setDoc(doc(db, SHEET_CONFIG_COLLECTION, SHEET_CONFIG_DOC), payload, { merge: false });
    return payload;
}
