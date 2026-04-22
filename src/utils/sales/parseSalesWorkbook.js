/**
 * Санхүүгийн "Борлуулалтын жагсаалт /бараагаар/" тайланг парс хийх.
 *
 * Эх сурвалж: Санхүүгээс ирдэг xlsx эсвэл Google Sheets-ээс татсан
 * CSV (gviz). Мөрийн бүтэц нь хоёуланд нь адил — баримт бүр
 * "Баримт: N" гэсэн тусгаарлах мөрөөр эхэлж, дараа нь тэр баримтын
 * бүтээгдэхүүний мөрүүд цуг явна.
 *
 * Гаралт: line item-уудын массив. Нэг мөр = нэг бүтээгдэхүүн нэг
 * баримтанд. `receiptIndex` нь тухайн мөрийг ямар баримтанд хамаарч
 * байгааг заана (0-с эхэлнэ).
 */

// Excel дэх column индекс (header row дээр merged cell байдаг учир
// header нэрсээр таних биш index-ээр шууд тогтоосон — санхүүгээс
// ирдэг формат нь тогтвортой).
export const COLUMN = {
    DATE: 2,        // Огноо (Excel serial number, e.g. 46113 = 2026-04-01)
    TRANSACTION: 3, // Гүйлгээний утга — Хүргэлт танихад ашиглана
    LOCATION: 6,    // Байршил — И-Март /Хан-Уул /, Шангри-ла, УИД салбар
    CODE: 8,        // Барааны код
    NAME: 9,        // Барааны нэр
    UNIT: 10,       // Хэмжих нэгж
    PRICE: 11,      // Үнэ
    QTY: 12,        // Тоо хэмжээ
    DISC_PCT: 13,   // Хөнгөлөлтийн %
    DISC_AMT: 14,   // Хөнгөлөлтийн дүн
    PRE_VAT: 15,    // НӨАТ-гүй дүн
    VAT: 16,        // НӨАТ
    // Google Sheets CSV export-д 17 болон 19-р баганууд нь spacer (merged/empty)
    // учир Нийт дүн = 18, Цэвэр борлуулалт = 20.
    TOTAL: 18,      // Нийт дүн
    NET: 20,        // Цэвэр борлуулалт (Dashboard-д энэ ашиглагдана)
};

const CHANNEL_DELIVERY = 'Хүргэлт';

const LOCATION_MAP = {
    'И-Март /Хан-Уул /': 'И-Март (Хан-Уул)',
    'Шангри-ла': 'Шангри-Ла',
    'УИД салбар': 'УИД салбар',
};

/**
 * Excel-ийн serial огноог JS Date руу хөрвүүлнэ.
 * Excel дээр 1900-01-01 = 1 (гэхдээ 1900 "leap year" bug-ийн улмаас
 * 1899-12-30-оос эхэлж тоолно).
 */
export function excelSerialToDate(serial) {
    if (serial == null || serial === '') return null;
    const n = Number(serial);
    if (!Number.isFinite(n)) return null;
    const utcMs = Math.round((n - 25569) * 86400 * 1000);
    return new Date(utcMs);
}

/**
 * Огноог ямар ч хэлбэрээс Date руу хөрвүүлнэ:
 *   - Excel serial number (46113)
 *   - "2026.04.01" эсвэл "2026/04/01" эсвэл "2026-04-01"
 *   - ISO timestamp
 */
export function parseDateAny(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number') return excelSerialToDate(value);
    const s = String(value).trim();
    if (!s) return null;
    // Excel serial-г number болгосон string
    if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToDate(Number(s));
    // YYYY.MM.DD | YYYY/MM/DD | YYYY-MM-DD
    const m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return new Date(Date.UTC(y, mo - 1, d));
    }
    // Fallback
    const fallback = new Date(s);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function dateToYMD(date) {
    if (!date) return null;
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Line item-ийн channel-г тогтоох.
 * Санхүү нь Хүргэлт захиалгыг И-Март салбарын доор бүртгэдэг боловч
 * Гүйлгээний утга дээр "Хүргэлт" гэсэн тэмдэг үлдээдэг.
 */
export function detectChannel(transaction, location) {
    const txn = (transaction || '').toString();
    if (/Хүргэлт/i.test(txn)) return CHANNEL_DELIVERY;
    const loc = (location || '').toString().trim();
    return LOCATION_MAP[loc] || loc || 'Тодорхойгүй';
}

/**
 * Нэг мөрөнд "Баримт: N" marker байгаа эсэхийг тогтоох.
 * Excel-д энэ нь эхний cell-д тусдаа мөрөөр байна. Google Sheets
 * export-од merged cells нь нэгдэж эхний cell-д холилддог тул аль
 * ч cell-ээс хайх хэрэгтэй.
 */
function rowReceiptMarkerIndex(row) {
    if (!row) return -1;
    for (let i = 0; i < row.length; i++) {
        const v = row[i];
        if (v == null) continue;
        if (/Баримт\s*:\s*\d+/.test(String(v))) return i;
    }
    return -1;
}

function isPrintedFooter(row) {
    if (!row) return false;
    for (const v of row) {
        if (v == null) continue;
        if (/^Хэвлэсэн/i.test(String(v).trim())) return true;
    }
    return false;
}

function toNumber(v) {
    if (v == null || v === '') return 0;
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
}

/**
 * Raw 2D массив (array-of-arrays) → line items.
 *
 * Excel-ийг `XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })`
 * эсвэл CSV-г мөрлөн хуваасан тохиолдолд ижил формат. Google Sheets-ээс
 * ирдэг CSV-г parse хийхдээ `parseCSV` ашигла.
 */
export function extractLineItems(rows) {
    const items = [];
    let currentReceipt = -1;

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];

        // Баримтын тусгаарлагч — мөрийн дурын cell-д байж болно (Google
        // Sheets export нь merged cells-г нийлүүлдэг)
        if (rowReceiptMarkerIndex(row) !== -1) {
            currentReceipt += 1;
            // Заримдаа marker мөрөнд product info ч байдаггүй — үргэлжилнэ
            continue;
        }

        // Тайлангийн төгсгөлийн мөрүүд
        if (isPrintedFooter(row)) break;

        const dateCell = row[COLUMN.DATE];
        const productName = row[COLUMN.NAME];

        // Нэгдсэн нийлбэр мөр: огноо ч, нэр ч байхгүй — алгасна
        if (!dateCell || !productName) continue;

        // Баримтын өмнө мөр гарсан (найдвартай байдлын хувьд алгасна)
        if (currentReceipt < 0) continue;

        const dateObj = parseDateAny(dateCell);
        if (!dateObj) continue;

        items.push({
            receiptIndex: currentReceipt,
            date: dateToYMD(dateObj),
            transaction: String(row[COLUMN.TRANSACTION] || '').trim(),
            location: String(row[COLUMN.LOCATION] || '').trim(),
            channel: detectChannel(row[COLUMN.TRANSACTION], row[COLUMN.LOCATION]),
            productCode: String(row[COLUMN.CODE] || '').trim(),
            productName: String(productName).trim(),
            unit: String(row[COLUMN.UNIT] || '').trim(),
            unitPrice: toNumber(row[COLUMN.PRICE]),
            qty: toNumber(row[COLUMN.QTY]),
            discountPct: toNumber(row[COLUMN.DISC_PCT]),
            discountAmount: toNumber(row[COLUMN.DISC_AMT]),
            preVat: toNumber(row[COLUMN.PRE_VAT]),
            vat: toNumber(row[COLUMN.VAT]),
            total: toNumber(row[COLUMN.TOTAL]),
            net: toNumber(row[COLUMN.NET]),
        });
    }

    return items;
}

/**
 * Google Sheets-ийн `gviz?tqx=out:csv` CSV-г парс хийнэ.
 * - Хашилттай талбарууд доторх таслал, мөр шилжилт, давхар хашилтыг
 *   зөв боловсруулна.
 * - Тоонуудыг Number болгоно (тоо биш байвал string үлдэнэ).
 */
export function parseCSV(csvText) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const ch = csvText[i];
        const next = csvText[i + 1];

        if (inQuotes) {
            if (ch === '"' && next === '"') {
                field += '"';
                i += 1;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                field += ch;
            }
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            continue;
        }
        if (ch === ',') {
            row.push(coerce(field));
            field = '';
            continue;
        }
        if (ch === '\n') {
            row.push(coerce(field));
            rows.push(row);
            row = [];
            field = '';
            continue;
        }
        if (ch === '\r') continue;
        field += ch;
    }
    // Сүүлийн талбар/мөр
    if (field.length > 0 || row.length > 0) {
        row.push(coerce(field));
        rows.push(row);
    }
    return rows;
}

function coerce(value) {
    if (value === '') return null;
    // Огноо serial, үнэ зэрэг тоон утгуудыг Number болгоно
    if (/^-?\d+(\.\d+)?$/.test(value)) {
        return Number(value);
    }
    return value;
}
