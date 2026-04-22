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

// Default column индексүүд — fallback зориулалттай. Санхүүгийн format нь
// цаг хугацаанд багана нэмэгдэж индекс шилждэг тул runtime-д header
// мөрнөөс нэрээр хайж олно.
export const COLUMN = {
    DATE: 2,
    TRANSACTION: 3,
    LOCATION: 6,
    CODE: 8,
    NAME: 9,
    UNIT: 10,
    PRICE: 11,
    QTY: 12,
    DISC_PCT: 13,
    DISC_AMT: 14,
    PRE_VAT: 15,
    VAT: 16,
    TOTAL: 18,
    NET: 20,
};

// Header row-оос column-г олох regex.
const HEADER_PATTERNS = {
    DATE: /^Огноо/i,
    TRANSACTION: /^Гүйлгээний\s*утга/i,
    LOCATION: /^Байршил/i,
    CODE: /^Барааны\s*код/i,
    NAME: /^Барааны\s*нэр/i,
    UNIT: /^Хэмжих\s*нэгж/i,
    PRICE: /^Үнэ/i,
    QTY: /^Тоо\s*хэмжээ/i,
    DISC_PCT: /^Хөнгөлөлтийн\s*%/i,
    DISC_AMT: /^Хөнгөлөлтийн\s*дүн/i,
    PRE_VAT: /^НӨАТ[\s-]*гүй\s*дүн/i,
    VAT: /^НӨАТ\s*$/i,
    TOTAL: /Нийт\s*дүн/i,
    NET: /Цэвэр\s*борлуулалт/i,
};

/**
 * Rows-оос header мөрийг олоод column индексүүдийг тодорхойлно.
 * Олдоогүй багануудыг default COLUMN-оор орлуулна.
 */
export function resolveColumns(rows) {
    // "Огноо" үгтэй эхний мөр бол header. Санхүүгийн форматад энэ нь
    // ихэвчлэн row 3, гэхдээ зарим тохиолдолд row 0 (Google Sheets
    // merged cells нийлсэн) байдаг.
    let headerRow = null;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
        const row = rows[i] || [];
        if (row.some((c) => c != null && HEADER_PATTERNS.DATE.test(String(c).trim()))) {
            headerRow = row;
            break;
        }
    }
    if (!headerRow) return { ...COLUMN };

    const resolved = { ...COLUMN };
    for (const [key, re] of Object.entries(HEADER_PATTERNS)) {
        const idx = headerRow.findIndex((c) => c != null && re.test(String(c).trim()));
        if (idx !== -1) resolved[key] = idx;
    }
    return resolved;
}

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
    // Header row-оос column индексийг тодорхойлно. Формат шилжвэл ч ажиллана.
    const cols = resolveColumns(rows);

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i] || [];

        // Баримтын тусгаарлагч — мөрийн дурын cell-д байж болно (Google
        // Sheets export нь merged cells-г нийлүүлдэг)
        if (rowReceiptMarkerIndex(row) !== -1) {
            currentReceipt += 1;
            continue;
        }

        // Тайлангийн төгсгөлийн мөрүүд
        if (isPrintedFooter(row)) break;

        const dateCell = row[cols.DATE];
        const productName = row[cols.NAME];

        // Нэгдсэн нийлбэр мөр: огноо ч, нэр ч байхгүй — алгасна
        if (!dateCell || !productName) continue;

        // Баримтын өмнө мөр гарсан (найдвартай байдлын хувьд алгасна)
        if (currentReceipt < 0) continue;

        const dateObj = parseDateAny(dateCell);
        if (!dateObj) continue;

        items.push({
            receiptIndex: currentReceipt,
            date: dateToYMD(dateObj),
            transaction: String(row[cols.TRANSACTION] || '').trim(),
            location: String(row[cols.LOCATION] || '').trim(),
            channel: detectChannel(row[cols.TRANSACTION], row[cols.LOCATION]),
            productCode: String(row[cols.CODE] || '').trim(),
            productName: String(productName).trim(),
            unit: String(row[cols.UNIT] || '').trim(),
            unitPrice: toNumber(row[cols.PRICE]),
            qty: toNumber(row[cols.QTY]),
            discountPct: toNumber(row[cols.DISC_PCT]),
            discountAmount: toNumber(row[cols.DISC_AMT]),
            preVat: toNumber(row[cols.PRE_VAT]),
            vat: toNumber(row[cols.VAT]),
            total: toNumber(row[cols.TOTAL]),
            net: toNumber(row[cols.NET]),
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
