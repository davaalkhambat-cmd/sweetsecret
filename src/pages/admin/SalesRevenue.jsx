import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
    AlertTriangle,
    BarChart3,
    CalendarRange,
    CircleDollarSign,
    Download,
    FileSpreadsheet,
    Goal,
    Store,
    TrendingUp,
    Upload,
} from 'lucide-react';

const STORAGE_KEY = 'sales-revenue-dashboard-sheet';
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HA-z7UUj01FfReqb6lAFRgmk6ZNNd81A_HDX6laD1ik/edit?gid=0#gid=0';
const ESTIMATED_COST_RATE = 0.38;

const CHANNELS = [
    { key: 'delivery', label: 'Хүргэлт', aliases: ['хүргэлт', 'delivery'], color: '#7c3aed' },
    { key: 'shangrila', label: 'ShangriLa', aliases: ['shangrila', 'shangri-la', 'shangrila'], color: '#2563eb' },
    { key: 'emart', label: 'E-Mart', aliases: ['e-mart', 'emart'], color: '#0f766e' },
    { key: 'departmentStore', label: 'Их дэлгүүр', aliases: ['ихдэлгүүр', 'их дэлгүүр'], color: '#ea580c' },
    { key: 'other', label: 'Бусад', aliases: ['бусад', 'other'], color: '#ec4899' },
    { key: 'office', label: 'Оффис, агуулах', aliases: ['оффисболагауулах', 'оффисболонагуулах', 'office', 'officeandagуулах'], color: '#64748b' },
    { key: 'regional', label: 'Орон нутаг', aliases: ['ороннутаг', 'regional'], color: '#14b8a6' },
    { key: 'distributor', label: 'Дистрибьютер', aliases: ['дистрибьютер', 'distributor'], color: '#f59e0b' },
];

const SUMMARY_ROW_ALIASES = {
    target: ['нийтсарынтөлөвлөгөө', 'сарынтөлөвлөгөө'],
    achievement: ['нийтгүйцэтгэлийнхувь', 'гүйцэтгэлийнхувь'],
    dailyAverage: ['өдрийндундажбо', 'өдрийндундажборлуулалт', 'өдрийндундаж'],
    previousMonth: ['2025оны02сар', 'өмнөхсар', 'өмнөхсарындүн'],
    currentMonth: ['2026оны1сар', 'одоогийнсар', 'энэсар'],
};

const TREND_HEADER_ALIASES = {
    month: ['сар', 'month', 'period', 'огноо'],
    total: ['нийт', 'нийтборлуулалт', 'сарынийтборлуулалт', 'total'],
};

const normalize = (value) =>
    String(value || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '')
        .replace(/[_-]/g, '');

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const formatSavedAt = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('mn-MN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const sumChannelValues = (channelMap = {}) =>
    CHANNELS.reduce((sum, channel) => sum + toNumber(channelMap?.[channel.key]), 0);

const MONTH_INDEX = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

const parseDateLabel = (value) => {
    const match = String(value || '').trim().match(/^(\d{1,2})[-/. ]([A-Za-z]{3,})$/);
    if (!match) return null;
    const day = Number(match[1]);
    const monthIndex = MONTH_INDEX[match[2].slice(0, 3).toLowerCase()];
    if (!Number.isFinite(day) || monthIndex === undefined) return null;
    const year = new Date().getFullYear();
    return new Date(year, monthIndex, day);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildDonutSegments = (items, valueKey) => {
    const total = items.reduce((sum, item) => sum + toNumber(item[valueKey]), 0);
    if (total <= 0) return [];

    let offset = 0;
    return items.map((item) => {
        const share = (toNumber(item[valueKey]) / total) * 100;
        const segment = {
            ...item,
            share,
            strokeDasharray: `${share} ${100 - share}`,
            strokeDashoffset: -offset,
        };
        offset += share;
        return segment;
    });
};

const getSheetIdFromUrl = (url) => {
    const match = String(url || '').match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
};

const getGidFromUrl = (url) => {
    const match = String(url || '').match(/[?#&]gid=([0-9]+)/);
    return match ? match[1] : '0';
};

const toCsvExportUrl = (url) => {
    const sheetId = getSheetIdFromUrl(url);
    if (!sheetId) return '';
    const gid = getGidFromUrl(url);
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
};

const toXlsxExportUrl = (url) => {
    const sheetId = getSheetIdFromUrl(url);
    if (!sheetId) return '';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
};

const findHeaderIndex = (rows) =>
    rows.findIndex((row) =>
        row.some((cell) => {
            const normalized = normalize(cell);
            return CHANNELS.some((channel) => channel.aliases.includes(normalized)) || normalized === 'сарынийнтборлуулалт' || normalized === 'сарынийтборлуулалт' || normalized === 'гараг';
        })
    );

const matchesAlias = (value, aliases) => aliases.includes(normalize(value));

const findTrendHeaderIndex = (rows) =>
    rows.findIndex((row) =>
        row.some((cell) => {
            const normalized = normalize(cell);
            return TREND_HEADER_ALIASES.month.includes(normalized) || TREND_HEADER_ALIASES.total.includes(normalized);
        })
    );

const parseTrendMonth = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const monthOnly = raw.match(/^(\d{1,2})$/);
    if (monthOnly) {
        const month = Number(monthOnly[1]);
        if (month >= 1 && month <= 12) {
            const now = new Date();
            let year = now.getFullYear();
            if (month > now.getMonth() + 1) year -= 1;
            return new Date(year, month - 1, 1);
        }
    }

    const isoLike = raw.match(/^(\d{4})[-/. ](\d{1,2})$/);
    if (isoLike) return new Date(Number(isoLike[1]), Number(isoLike[2]) - 1, 1);

    const mnLike = raw.match(/^(\d{4}).*?(\d{1,2}).*сар$/i);
    if (mnLike) return new Date(Number(mnLike[1]), Number(mnLike[2]) - 1, 1);

    const engLike = raw.match(/^([A-Za-z]{3,})[-/. ](\d{4})$/);
    if (engLike) {
        const monthIndex = MONTH_INDEX[engLike[1].slice(0, 3).toLowerCase()];
        if (monthIndex !== undefined) return new Date(Number(engLike[2]), monthIndex, 1);
    }

    return null;
};

const formatTrendMonthLabel = (date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;

const parseTrendWorksheet = (sheetRows) => {
    const rows = sheetRows.filter((row) => row.some((cell) => String(cell || '').trim() !== ''));
    if (!rows.length) return [];

    const headerIndex = findTrendHeaderIndex(rows);
    if (headerIndex === -1) return [];

    const header = rows[headerIndex];
    const colMap = {
        month: header.findIndex((cell) => TREND_HEADER_ALIASES.month.includes(normalize(cell))),
        total: header.findIndex((cell) => TREND_HEADER_ALIASES.total.includes(normalize(cell))),
    };

    CHANNELS.forEach((channel) => {
        colMap[channel.key] = header.findIndex((cell) => channel.aliases.includes(normalize(cell)));
    });

    return rows
        .slice(headerIndex + 1)
        .map((row, index) => {
            const monthDate = parseTrendMonth(row[colMap.month]);
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            const total = toNumber(row[colMap.total]) || sumChannelValues(channels);
            if (!monthDate || !total) return null;

            return {
                id: `${monthDate.toISOString()}-${index}`,
                monthDate,
                monthLabel: formatTrendMonthLabel(monthDate),
                channels,
                total,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.monthDate - b.monthDate)
        .slice(-12);
};

const parseWorksheet = (sheetRows) => {
    const rows = sheetRows.filter((row) => row.some((cell) => String(cell || '').trim() !== ''));
    const headerIndex = findHeaderIndex(rows);

    if (headerIndex === -1) {
        throw new Error('Header мөр олдсонгүй. Файлын эхний мөрөнд салбарын нэрс байхаар оруулна уу.');
    }

    const header = rows[headerIndex];
    const colMap = {
        weekday: header.findIndex((cell) => normalize(cell) === 'гараг'),
        date: header.findIndex((cell) => ['салбар', 'огноо', 'date'].includes(normalize(cell))),
        total: header.findIndex((cell) => ['сарынийтборлуулалт', 'сарынийнтборлуулалт', 'нийтборлуулалт', 'total'].includes(normalize(cell))),
    };

    CHANNELS.forEach((channel) => {
        colMap[channel.key] = header.findIndex((cell) => channel.aliases.includes(normalize(cell)));
    });

    const dataRows = rows.slice(headerIndex + 1);
    const dailyRows = [];
    const summary = {};

    dataRows.forEach((row, index) => {
        const firstCell = row[0];
        const normalizedFirst = normalize(firstCell);
        const numericChannelSum = CHANNELS.reduce((sum, channel) => sum + toNumber(row[colMap[channel.key]]), 0);
        const dateLabel = row[colMap.date];

        if (matchesAlias(firstCell, SUMMARY_ROW_ALIASES.target)) {
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            summary.target = {
                total: toNumber(row[colMap.total]) || sumChannelValues(channels),
                channels,
            };
            return;
        }

        if (matchesAlias(firstCell, SUMMARY_ROW_ALIASES.achievement)) {
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            summary.achievement = {
                total: toNumber(row[colMap.total]) || sumChannelValues(channels),
                channels,
            };
            return;
        }

        if (matchesAlias(firstCell, SUMMARY_ROW_ALIASES.dailyAverage)) {
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            summary.dailyAverage = {
                total: toNumber(row[colMap.total]) || sumChannelValues(channels),
                channels,
            };
            return;
        }

        if (matchesAlias(firstCell, SUMMARY_ROW_ALIASES.previousMonth)) {
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            summary.previousMonth = {
                total: toNumber(row[colMap.total]) || sumChannelValues(channels),
                channels,
            };
            return;
        }

        if (matchesAlias(firstCell, SUMMARY_ROW_ALIASES.currentMonth)) {
            const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
            summary.currentMonth = {
                total: toNumber(row[colMap.total]) || sumChannelValues(channels),
                channels,
            };
            return;
        }

        if (!dateLabel && !numericChannelSum) return;

        const channels = Object.fromEntries(CHANNELS.map((channel) => [channel.key, toNumber(row[colMap[channel.key]])]));
        const total = toNumber(row[colMap.total]) || Object.values(channels).reduce((sum, value) => sum + value, 0);

        dailyRows.push({
            id: `${dateLabel || index}-${index}`,
            weekday: String(row[colMap.weekday] || '').trim(),
            dateLabel: String(dateLabel || '').trim(),
            channels,
            total,
        });
    });

    const computedChannelTotals = Object.fromEntries(
        CHANNELS.map((channel) => [
            channel.key,
            dailyRows.reduce((sum, row) => sum + (row.channels[channel.key] || 0), 0),
        ])
    );

    const monthlyTotal = dailyRows.reduce((sum, row) => sum + row.total, 0);
    const targetTotal = summary.target?.total || sumChannelValues(summary.target?.channels);
    const achievementRate = targetTotal ? (monthlyTotal / targetTotal) * 100 : 0;
    const dailyAverage = dailyRows.length ? monthlyTotal / dailyRows.length : 0;
    const bestDay = [...dailyRows].sort((a, b) => b.total - a.total)[0] || null;

    const channelRows = CHANNELS.map((channel) => ({
        ...channel,
        amount: computedChannelTotals[channel.key] || 0,
        target: summary.target?.channels?.[channel.key] || 0,
        achievement:
            (summary.target?.channels?.[channel.key] || 0) > 0
                ? ((computedChannelTotals[channel.key] || 0) / (summary.target?.channels?.[channel.key] || 0)) * 100
                : 0,
        average: dailyRows.length ? (computedChannelTotals[channel.key] || 0) / dailyRows.length : 0,
    })).filter((item) => item.amount > 0 || item.target > 0);

    return {
        dailyRows,
        summary,
        monthlyTotal,
        targetTotal,
        achievementRate,
        dailyAverage,
        bestDay,
        channelRows,
        trendRows: [],
    };
};

const createTemplateWorkbook = () => {
    const aoa = [
        ['Гараг', 'Салбар', 'Хүргэлт', 'Shangrila', 'E-Mart', 'Их дэлгүүр', 'Бусад', 'Оффис болон агуулах', 'Орон нутаг', 'Дистрибьютер', 'Сарын нийт борлуулалт'],
        ['Ням', '1-Feb', 1309800, 1172600, 1200800, 1311800, '', '', '', '', 4995000],
        ['Даваа', '2-Feb', 705500, 410500, 394250, 642000, '', '', '', '', 2152250],
        ['Мягмар', '3-Feb', 2367100, 666200, 419900, 574500, '', '', '', '', 4027700],
        [],
        ['Нийт сарын төлөвлөгөө', '', 30000000, 30000000, 30000000, 30000000, 25000000, 0, 1000000, 0, 146000000],
        ['Нийт гүйцэтгэлийн хувь', '', 72.97, 79.19, 52.52, 64.63, 71.08, 0, 137.48, 0, 68.5],
        ['Өдрийн дундаж БО', '', 810774, 879856, 583604, 718085, 658115, 2731, 50919, 0, 3704084],
    ];

    const trendAoa = [
        ['Сар', 'Хүргэлт', 'Shangrila', 'E-Mart', 'Их дэлгүүр', 'Бусад', 'Оффис болон агуулах', 'Орон нутаг', 'Дистрибьютер', 'Нийт'],
        ['2025-03', 18500000, 16000000, 14900000, 17200000, 3200000, 0, 1200000, 0, 69800000],
        ['2025-04', 19800000, 17100000, 15300000, 18000000, 2900000, 0, 1100000, 0, 74200000],
        ['2025-05', 20200000, 18300000, 15900000, 18800000, 3500000, 0, 1200000, 0, 77900000],
    ];

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sales Revenue');
    const trendSheet = XLSX.utils.aoa_to_sheet(trendAoa);
    XLSX.utils.book_append_sheet(workbook, trendSheet, '12M Trend');
    return workbook;
};

const readStored = () => {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return { dailyRows: [], meta: null, parsed: null };
        const parsed = JSON.parse(raw);
        return {
            dailyRows: Array.isArray(parsed?.dailyRows) ? parsed.dailyRows : [],
            meta: parsed?.meta || null,
            parsed: parsed?.parsed || null,
            sheetUrl: parsed?.sheetUrl || DEFAULT_SHEET_URL,
        };
    } catch (error) {
        console.error('Sales revenue storage read error:', error);
        return { dailyRows: [], meta: null, parsed: null, sheetUrl: DEFAULT_SHEET_URL };
    }
};

const parseWorkbookData = (workbook) => {
    const primarySheetName = workbook.SheetNames[0];
    const primarySheet = workbook.Sheets[primarySheetName];
    const primaryRows = XLSX.utils.sheet_to_json(primarySheet, { header: 1, defval: '' });
    const parsedPrimary = parseWorksheet(primaryRows);

    const secondarySheetName = workbook.SheetNames[1];
    let trendRows = [];

    if (secondarySheetName) {
        const secondarySheet = workbook.Sheets[secondarySheetName];
        const secondaryRows = XLSX.utils.sheet_to_json(secondarySheet, { header: 1, defval: '' });
        trendRows = parseTrendWorksheet(secondaryRows);
    }

    return {
        ...parsedPrimary,
        trendRows,
        sheetNames: workbook.SheetNames,
    };
};

const SalesRevenue = () => {
    const stored = typeof window !== 'undefined' ? readStored() : { dailyRows: [], meta: null, parsed: null, sheetUrl: DEFAULT_SHEET_URL };
    const [salesRows, setSalesRows] = useState(stored.dailyRows);
    const [salesMeta, setSalesMeta] = useState(stored.meta);
    const [parsedState, setParsedState] = useState(stored.parsed);
    const [sheetUrl, setSheetUrl] = useState(stored.sheetUrl || DEFAULT_SHEET_URL);
    const [isUploading, setIsUploading] = useState(false);
    const [isSyncingSheet, setIsSyncingSheet] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const analytics = useMemo(() => {
        if (parsedState) {
            const parsedRows = parsedState.dailyRows || [];
            const trendRows = parsedState.trendRows || [];
            const recomputedChannelTotals = Object.fromEntries(
                CHANNELS.map((channel) => [
                    channel.key,
                    parsedRows.reduce((sum, row) => sum + toNumber(row.channels?.[channel.key]), 0),
                ])
            );
            const monthlyTotal = parsedRows.reduce((sum, row) => sum + toNumber(row.total), 0);
            const estimatedCost = monthlyTotal * ESTIMATED_COST_RATE;
            const estimatedGrossProfit = monthlyTotal - estimatedCost;
            const targetTotal = toNumber(parsedState.summary?.target?.total) || sumChannelValues(parsedState.summary?.target?.channels);
            const dailyAverage = parsedRows.length ? monthlyTotal / parsedRows.length : 0;
            const bestDay = [...parsedRows].sort((a, b) => toNumber(b.total) - toNumber(a.total))[0] || null;
            const worstDay = [...parsedRows].sort((a, b) => toNumber(a.total) - toNumber(b.total))[0] || null;
            const channelRows = CHANNELS.map((channel) => ({
                ...channel,
                amount: recomputedChannelTotals[channel.key] || 0,
                target: toNumber(parsedState.summary?.target?.channels?.[channel.key]),
                achievement:
                    toNumber(parsedState.summary?.target?.channels?.[channel.key]) > 0
                        ? ((recomputedChannelTotals[channel.key] || 0) / toNumber(parsedState.summary?.target?.channels?.[channel.key])) * 100
                        : 0,
                average: parsedRows.length ? (recomputedChannelTotals[channel.key] || 0) / parsedRows.length : 0,
                share: monthlyTotal > 0 ? ((recomputedChannelTotals[channel.key] || 0) / monthlyTotal) * 100 : 0,
            })).filter((item) => item.amount > 0 || item.target > 0);
            const channelShareSegments = buildDonutSegments(channelRows, 'amount');

            const parsedDates = parsedRows.map((row) => parseDateLabel(row.dateLabel)).filter(Boolean);
            const lastDate = parsedDates.length ? new Date(Math.max(...parsedDates.map((item) => item.getTime()))) : null;
            const daysInMonth = lastDate ? new Date(lastDate.getFullYear(), lastDate.getMonth() + 1, 0).getDate() : Math.max(parsedRows.length, 30);
            const runRateForecast = dailyAverage * daysInMonth;
            const gapToTarget = monthlyTotal - targetTotal;
            const forecastGap = runRateForecast - targetTotal;
            const riskStatus =
                targetTotal <= 0
                    ? { tone: 'neutral', label: 'No target' }
                    : runRateForecast >= targetTotal
                      ? { tone: 'good', label: 'On track' }
                      : runRateForecast >= targetTotal * 0.9
                        ? { tone: 'warn', label: 'Needs push' }
                        : { tone: 'bad', label: 'At risk' };

            const weekdayMap = new Map();
            parsedRows.forEach((row) => {
                const key = row.weekday || 'Тодорхойгүй';
                const current = weekdayMap.get(key) || { weekday: key, total: 0, count: 0 };
                current.total += toNumber(row.total);
                current.count += 1;
                weekdayMap.set(key, current);
            });
            const weekdayRows = [...weekdayMap.values()]
                .map((item) => ({ ...item, average: item.count ? item.total / item.count : 0 }))
                .sort((a, b) => b.average - a.average);
            const bestWeekday = weekdayRows[0] || null;
            const worstWeekday = weekdayRows[weekdayRows.length - 1] || null;

            const anomalyRows = parsedRows
                .map((row) => ({
                    ...row,
                    deviation: dailyAverage ? ((toNumber(row.total) - dailyAverage) / dailyAverage) * 100 : 0,
                    absDeviation: Math.abs(dailyAverage ? ((toNumber(row.total) - dailyAverage) / dailyAverage) * 100 : 0),
                }))
                .sort((a, b) => b.absDeviation - a.absDeviation);
            const topAnomaly = anomalyRows[0] || null;

            const topChannel = [...channelRows].sort((a, b) => b.share - a.share)[0] || null;
            const weakestChannel = [...channelRows]
                .filter((item) => item.target > 0)
                .sort((a, b) => a.achievement - b.achievement)[0] || null;
            const leadingChannel = [...channelRows]
                .filter((item) => item.target > 0)
                .sort((a, b) => b.achievement - a.achievement)[0] || null;

            const executiveSummary = [
                leadingChannel
                    ? `${leadingChannel.label} ${formatPercent(leadingChannel.achievement)} гүйцэтгэлтэйгээр хамгийн сайн явж байна.`
                    : 'Тэргүүлж буй суваг одоогоор тодорхойгүй байна.',
                topChannel
                    ? `${topChannel.label} нийт борлуулалтын ${formatPercent(topChannel.share)}-ийг бүрдүүлж гол growth driver болж байна.`
                    : 'Сувгийн contribution хангалттай мэдээлэлгүй байна.',
                weakestChannel
                    ? `${weakestChannel.label}-ийн run-rate төлөвлөгөөнөөс хоцорч байгаа тул энэ сувгийг түрүүлж дэмжих шаардлагатай.`
                    : 'Хоцорч буй суваг илрээгүй байна.',
            ];

            const actionPanel = [
                weakestChannel
                    ? `${weakestChannel.label} дээр conversion push promotion, bundle эсвэл staff focus хийнэ.`
                    : 'Сул суваг илрээгүй тул одоогийн momentum-оо хадгална.',
                bestWeekday && worstWeekday
                    ? `${worstWeekday.weekday} сул байгаа тул promo-г ${bestWeekday.weekday}-ийн хүчтэй форматтай төстэйгээр туршиж өсгөнө.`
                    : 'Гарагийн pattern бүрэн цуглаагүй тул дахин ажиглана.',
                topChannel
                    ? `${topChannel.label}-ийн stock, staffing, merchandising-ийг нэн түрүүнд хамгаалж тасалдалгүй явуулна.`
                    : 'Тэргүүлэх суваг тодорхой болмогц resource allocation хийнэ.',
            ];

            const latestTrend = trendRows[trendRows.length - 1] || null;
            const previousTrend = trendRows[trendRows.length - 2] || null;
            const trendGrowth =
                latestTrend && previousTrend && previousTrend.total > 0
                    ? ((latestTrend.total - previousTrend.total) / previousTrend.total) * 100
                    : 0;
            const highestTrendMonth = [...trendRows].sort((a, b) => b.total - a.total)[0] || null;

            return {
                ...parsedState,
                dailyRows: parsedRows,
                trendRows,
                monthlyTotal,
                estimatedCost,
                estimatedGrossProfit,
                targetTotal,
                achievementRate: targetTotal ? (monthlyTotal / targetTotal) * 100 : 0,
                dailyAverage,
                bestDay,
                worstDay,
                channelRows,
                runRateForecast,
                gapToTarget,
                forecastGap,
                riskStatus,
                weekdayRows,
                bestWeekday,
                worstWeekday,
                topAnomaly,
                executiveSummary,
                actionPanel,
                channelShareSegments,
                latestTrend,
                previousTrend,
                trendGrowth,
                highestTrendMonth,
            };
        }
        return {
            dailyRows: [],
            trendRows: [],
            monthlyTotal: 0,
            estimatedCost: 0,
            estimatedGrossProfit: 0,
            targetTotal: 0,
            achievementRate: 0,
            dailyAverage: 0,
            bestDay: null,
            worstDay: null,
            channelRows: [],
            summary: {},
            runRateForecast: 0,
            gapToTarget: 0,
            forecastGap: 0,
            riskStatus: { tone: 'neutral', label: 'No target' },
            weekdayRows: [],
            bestWeekday: null,
            worstWeekday: null,
            topAnomaly: null,
            executiveSummary: [],
            actionPanel: [],
            channelShareSegments: [],
            latestTrend: null,
            previousTrend: null,
            trendGrowth: 0,
            highestTrendMonth: null,
        };
    }, [parsedState]);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorMessage('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const parsed = parseWorkbookData(workbook);
            const sheetName = workbook.SheetNames[0];

            const meta = {
                fileName: file.name,
                sheetName,
                updatedAt: new Date().toISOString(),
                rowCount: parsed.dailyRows.length,
                trendSheetName: workbook.SheetNames[1] || '',
            };

            setSalesRows(parsed.dailyRows);
            setSalesMeta(meta);
            setParsedState(parsed);
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    dailyRows: parsed.dailyRows,
                    meta,
                    parsed,
                    sheetUrl,
                })
            );
        } catch (error) {
            console.error('Sales revenue upload error:', error);
            setErrorMessage(error.message || 'Excel файл уншихад алдаа гарлаа.');
        } finally {
            setIsUploading(false);
            event.target.value = '';
        }
    };

    const applyParsedData = (parsed, metaOverrides = {}) => {
        const meta = {
            fileName: metaOverrides.fileName || salesMeta?.fileName || 'Google Sheet',
            sheetName: metaOverrides.sheetName || salesMeta?.sheetName || 'Sheet1',
            updatedAt: new Date().toISOString(),
            rowCount: parsed.dailyRows.length,
            source: metaOverrides.source || 'sheet',
        };

        setSalesRows(parsed.dailyRows);
        setSalesMeta(meta);
        setParsedState(parsed);
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                dailyRows: parsed.dailyRows,
                meta,
                parsed,
                sheetUrl,
            })
        );
    };

    const handleSyncFromSheet = async () => {
        const exportUrl = toXlsxExportUrl(sheetUrl);
        if (!exportUrl) {
            setErrorMessage('Google Sheet link буруу байна. Зөв sheet link оруулна уу.');
            return;
        }

        setIsSyncingSheet(true);
        setErrorMessage('');

        try {
            const response = await fetch(exportUrl);
            const contentType = response.headers.get('content-type') || '';

            if (!response.ok || contentType.includes('text/html')) {
                throw new Error('Sheet одоогоор private байна. "Anyone with the link can view" эсвэл "Publish to web" тохируулна уу.');
            }

            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const parsed = parseWorkbookData(workbook);
            const sheetName = workbook.SheetNames[0];
            applyParsedData(parsed, { fileName: 'Google Sheet sync', sheetName, source: 'google-sheet' });
        } catch (error) {
            console.error('Sheet sync error:', error);
            setErrorMessage(error.message || 'Google Sheet-ээс мэдээлэл татахад алдаа гарлаа.');
        } finally {
            setIsSyncingSheet(false);
        }
    };

    const handleTemplateDownload = () => {
        const workbook = createTemplateWorkbook();
        XLSX.writeFile(workbook, 'sales-revenue-template.xlsx');
    };

    return (
        <div className="inventory-page sales-revenue-page">
            <div className="dashboard-header">
                <h1>Борлуулалтын орлого</h1>
                <p>Өдөр бүр хөтөлдөг Excel sheet-ээ оруулаад сарын явц, салбарын харьцуулалт, төлөвлөгөөний гүйцэтгэлийг автоматаар харна.</p>
            </div>

            <div className="section-card inventory-upload-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Борлуулалтын sheet оруулах</h3>
                        <p>Excel upload эсвэл Google Sheet link-ээр шууд sync хийгээд KPI, суваг бүрийн явцыг dashboard болгоно.</p>
                    </div>
                    {salesMeta ? (
                        <div className="inventory-upload-note">
                            <span>Сүүлд шинэчлэгдсэн</span>
                            <strong>{formatSavedAt(salesMeta.updatedAt)}</strong>
                            <small>{salesMeta.fileName}</small>
                        </div>
                    ) : null}
                </div>

                <label className="inventory-upload-dropzone">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                    />
                    <div className="inventory-upload-copy">
                        <div className="inventory-upload-icon">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <strong>{isUploading ? 'Борлуулалтын файл уншиж байна...' : 'Excel файл сонгох'}</strong>
                            <p>Гараг, огноо, салбаруудын дүн, сарын нийт борлуулалт гэсэн багануудтай байхад шууд танина.</p>
                        </div>
                    </div>
                    <span className="inventory-upload-btn">
                        <Upload size={16} />
                        <span>Файл оруулах</span>
                    </span>
                </label>

                <div className="sales-sheet-sync-row">
                    <div className="sales-sheet-sync-input">
                        <label>Google Sheet link</label>
                        <input
                            type="url"
                            className="form-input"
                            value={sheetUrl}
                            onChange={(event) => setSheetUrl(event.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                    </div>
                    <button className="product-import-btn product-import-btn-export" type="button" onClick={handleSyncFromSheet} disabled={isSyncingSheet}>
                        <BarChart3 size={16} />
                        <span>{isSyncingSheet ? 'Татаж байна...' : 'Sheet-ээс татах'}</span>
                    </button>
                </div>

                <div className="product-import-actions">
                    <button className="product-import-btn product-import-btn-template" type="button" onClick={handleTemplateDownload}>
                        <Download size={16} />
                        <span>Загвар sheet татах</span>
                    </button>
                </div>

                {errorMessage ? (
                    <div className="dashboard-alert dashboard-alert-error">
                        <AlertTriangle size={16} />
                        <span>{errorMessage}</span>
                    </div>
                ) : null}
            </div>

            <div className="stats-grid sales-kpi-grid">
                <div className="stat-card">
                    <div className="stat-icon"><CircleDollarSign size={22} color="#7c3aed" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Сарын нийт борлуулалт</span>
                        <h3 className="stat-value">{formatMoney(analytics.monthlyTotal)}</h3>
                        <small className="stat-footnote">Бодит гүйцэтгэл</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><CircleDollarSign size={22} color="#dc2626" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Ойролцоо өртөг</span>
                        <h3 className="stat-value">{formatMoney(analytics.estimatedCost)}</h3>
                        <small className="stat-footnote">Сарын нийт борлуулалтын 38%</small>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Goal size={22} color="#2563eb" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Төлөвлөгөөний гүйцэтгэл</span>
                        <h3 className="stat-value">{formatPercent(analytics.achievementRate)}</h3>
                        <small className="stat-footnote">
                            {formatMoney(analytics.monthlyTotal)} / {formatMoney(analytics.targetTotal)}
                        </small>
                        <div className="mini-progress-track">
                            <div
                                className="mini-progress-fill"
                                style={{ width: `${Math.min(analytics.achievementRate || 0, 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><CalendarRange size={22} color="#0f766e" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Өдрийн дундаж БО</span>
                        <h3 className="stat-value">{formatMoney(analytics.dailyAverage)}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><TrendingUp size={22} color="#ea580c" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Хамгийн өндөр өдөр</span>
                        <h3 className="stat-value">{analytics.bestDay ? formatMoney(analytics.bestDay.total) : '-'}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon"><Store size={22} color="#ec4899" /></div>
                    <div className="stat-info">
                        <span className="stat-title">Оруулсан өдрийн тоо</span>
                        <h3 className="stat-value">{analytics.dailyRows.length.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Сүүлийн 1 жилийн тренд</h3>
                            <p>Excel-ийн 2-р tab дээрх сарын мэдээллээс 12 сарын борлуулалтын чиглэлийг харуулна</p>
                        </div>
                    </div>
                    {analytics.trendRows.length ? (
                        <div className="sales-trend-shell">
                            <div className="sales-trend-bars">
                                {analytics.trendRows.map((row) => {
                                    const maxTrendValue = Math.max(...analytics.trendRows.map((item) => item.total), 1);
                                    return (
                                        <div key={row.id} className="sales-trend-bar-col">
                                            <div
                                                className="sales-trend-bar"
                                                style={{ height: `${clamp((row.total / maxTrendValue) * 100, 8, 100)}%` }}
                                                title={`${row.monthLabel}: ${formatMoney(row.total)}`}
                                            ></div>
                                            <span>{row.monthLabel}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="sales-trend-summary">
                                <div className="sales-highlight-card">
                                    <span>Latest month</span>
                                    <strong>{analytics.latestTrend?.monthLabel || '-'}</strong>
                                    <small>{analytics.latestTrend ? formatMoney(analytics.latestTrend.total) : '-'}</small>
                                </div>
                                <div className="sales-highlight-card">
                                    <span>MoM growth</span>
                                    <strong>{analytics.latestTrend && analytics.previousTrend ? formatPercent(analytics.trendGrowth) : '-'}</strong>
                                    <small>
                                        {analytics.previousTrend ? `${analytics.previousTrend.monthLabel} vs ${analytics.latestTrend?.monthLabel}` : 'Өмнөх сар байхгүй'}
                                    </small>
                                </div>
                                <div className="sales-highlight-card">
                                    <span>Peak month</span>
                                    <strong>{analytics.highestTrendMonth?.monthLabel || '-'}</strong>
                                    <small>{analytics.highestTrendMonth ? formatMoney(analytics.highestTrendMonth.total) : '-'}</small>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="empty-state-text">2-р tab дээр сарын trend sheet оруулсны дараа энд 12 сарын тренд харагдана.</p>
                    )}
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Executive Summary</h3>
                            <p>Менежментийн шийдвэрт шууд хэрэгтэй AI тайлбар</p>
                        </div>
                        <span className={`sales-risk-pill ${analytics.riskStatus.tone}`}>{analytics.riskStatus.label}</span>
                    </div>
                    <div className="sales-summary-stack">
                        {analytics.executiveSummary.map((item, index) => (
                            <div key={index} className="sales-summary-line">
                                <span>{`0${index + 1}`}</span>
                                <p>{item}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Forecast & Risk</h3>
                            <p>Одоогийн хурдаараа сар хаахад хүрэх төлөв</p>
                        </div>
                    </div>
                    <div className="sales-forecast-grid">
                        <div className="sales-forecast-item">
                            <span>Run-rate forecast</span>
                            <strong>{formatMoney(analytics.runRateForecast)}</strong>
                            <small>{analytics.forecastGap >= 0 ? 'Төлөвлөгөөнөөс дээгүүр хаах төлөвтэй' : 'Төлөвлөгөөнөөс хоцрох эрсдэлтэй'}</small>
                        </div>
                        <div className="sales-forecast-item">
                            <span>Plan gap</span>
                            <strong>{`${analytics.gapToTarget >= 0 ? '+' : '-'}${formatMoney(Math.abs(analytics.gapToTarget))}`}</strong>
                            <small>Одоогийн бодит дүнгийн зөрүү</small>
                        </div>
                        <div className="sales-forecast-item">
                            <span>Forecast gap</span>
                            <strong>{`${analytics.forecastGap >= 0 ? '+' : '-'}${formatMoney(Math.abs(analytics.forecastGap))}`}</strong>
                            <small>Сар хаах үеийн таамагласан зөрүү</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Weekday Pattern</h3>
                            <p>Аль гараг хүчтэй, аль гараг сул байгааг харуулна</p>
                        </div>
                    </div>
                    <div className="sales-two-col">
                        <div className="sales-highlight-card">
                            <span>Best day of week</span>
                            <strong>{analytics.bestWeekday?.weekday || '-'}</strong>
                            <small>{analytics.bestWeekday ? formatMoney(analytics.bestWeekday.average) : '-'}</small>
                        </div>
                        <div className="sales-highlight-card">
                            <span>Worst day of week</span>
                            <strong>{analytics.worstWeekday?.weekday || '-'}</strong>
                            <small>{analytics.worstWeekday ? formatMoney(analytics.worstWeekday.average) : '-'}</small>
                        </div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Top Spike / Anomaly</h3>
                            <p>Огцом өссөн эсвэл унасан өдрийг шалгах</p>
                        </div>
                    </div>
                    <div className="sales-highlight-card sales-highlight-card-wide">
                        <span>{analytics.topAnomaly?.dateLabel || '-'}</span>
                        <strong>{analytics.topAnomaly ? formatMoney(analytics.topAnomaly.total) : '-'}</strong>
                        <small>
                            {analytics.topAnomaly
                                ? `${analytics.topAnomaly.deviation >= 0 ? '+' : ''}${formatPercent(analytics.topAnomaly.deviation)} vs өдрийн дундаж`
                                : 'Anomaly илрээгүй'}
                        </small>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal inventory-dashboard-grid">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Суваг бүрийн борлуулалт</h3>
                            <p>Хүргэлт болон салбар тус бүрийн сарын хуримтлагдсан дүн</p>
                        </div>
                    </div>
                    <div className="sales-channel-list">
                        {analytics.channelRows.length ? (
                            analytics.channelRows.map((channel) => (
                                <div key={channel.key} className="sales-channel-row">
                                    <div className="sales-channel-copy">
                                        <strong>{channel.label}</strong>
                                        <small>
                                            {channel.target
                                                ? `Төлөвлөгөө ${formatMoney(channel.target)} • Share ${formatPercent(channel.share)}`
                                                : `Share ${formatPercent(channel.share)}`}
                                        </small>
                                    </div>
                                    <div className="sales-channel-bar-track">
                                        <div
                                            className="sales-channel-bar-fill"
                                            style={{
                                                width: `${channel.target > 0 ? Math.min(channel.achievement, 100) : channel.amount > 0 ? 8 : 0}%`,
                                                background: channel.color,
                                            }}
                                        ></div>
                                    </div>
                                    <div className="sales-channel-values">
                                        <strong>{formatMoney(channel.amount)}</strong>
                                        <small>{channel.achievement ? formatPercent(channel.achievement) : '-'}</small>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Файл оруулсны дараа сувгийн харьцуулалт гарна.</p>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Салбарын эзлэх хувь</h3>
                            <p>Нийт борлуулалтад channel бүр хэдэн хувь эзэлж байгааг pie chart-аар харуулна</p>
                        </div>
                    </div>
                    <div className="sales-share-layout">
                        <div className="sales-share-chart-wrap">
                            <svg viewBox="0 0 42 42" className="payment-donut sales-share-donut" role="img">
                                <circle cx="21" cy="21" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="4.2"></circle>
                                {analytics.channelShareSegments.map((segment) => (
                                    <circle
                                        key={segment.key}
                                        cx="21"
                                        cy="21"
                                        r="15.915"
                                        fill="none"
                                        stroke={segment.color}
                                        strokeWidth="4.2"
                                        strokeDasharray={segment.strokeDasharray}
                                        strokeDashoffset={segment.strokeDashoffset}
                                        strokeLinecap="round"
                                    ></circle>
                                ))}
                            </svg>
                            <div className="payment-donut-center">
                                <span>Нийт</span>
                                <strong>{formatMoney(analytics.monthlyTotal)}</strong>
                            </div>
                        </div>
                        <div className="sales-share-legend">
                            {analytics.channelRows.map((channel) => (
                                <div key={channel.key} className="sales-share-row">
                                    <div className="sales-share-label">
                                        <span className="product-pie-dot" style={{ background: channel.color }}></span>
                                        <strong>{channel.label}</strong>
                                    </div>
                                    <div className="sales-share-values">
                                        <strong>{formatPercent(channel.share)}</strong>
                                        <small>{formatMoney(channel.amount)}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Branch Efficiency</h3>
                            <p>Салбар бүрийн дүн, өдрийн дундаж, биелэлт, нийтэд эзлэх хувь</p>
                        </div>
                    </div>
                    <div className="sales-summary-matrix">
                        <div className="sales-summary-head">Суваг</div>
                        <div className="sales-summary-head">Нийт дүн</div>
                        <div className="sales-summary-head">Төлөвлөгөө</div>
                        <div className="sales-summary-head">Гүйцэтгэл %</div>
                        <div className="sales-summary-head">Өдрийн дундаж</div>
                        <div className="sales-summary-head">Share %</div>
                        {analytics.channelRows.length ? (
                            analytics.channelRows.map((channel) => (
                                <React.Fragment key={channel.key}>
                                    <div className="sales-summary-label">{channel.label}</div>
                                    <div>{formatMoney(channel.amount)}</div>
                                    <div>{channel.target ? formatMoney(channel.target) : '-'}</div>
                                    <div>{channel.achievement ? formatPercent(channel.achievement) : '-'}</div>
                                    <div>{channel.average ? formatMoney(channel.average) : '-'}</div>
                                    <div>{formatPercent(channel.share)}</div>
                                </React.Fragment>
                            ))
                        ) : (
                            <div className="inventory-empty-cell" style={{ gridColumn: '1 / -1' }}>Summary мөртэй файл оруулсны дараа харна.</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Action Panel</h3>
                        <p>Шууд шийдвэр болгох дараагийн алхмууд</p>
                    </div>
                </div>
                <div className="sales-action-list">
                    {analytics.actionPanel.map((item, index) => (
                        <div key={index} className="sales-action-item">
                            <span>{`0${index + 1}`}</span>
                            <p>{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="section-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Өдөр бүрийн борлуулалтын жагсаалт</h3>
                        <p>Excel дээр бүртгэсэн өдөр-өдрийн дүнг салбар бүрээр нь задлаад харуулна</p>
                    </div>
                </div>
                <div className="inventory-table-wrap">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Гараг</th>
                                <th>Огноо</th>
                                {CHANNELS.map((channel) => (
                                    <th key={channel.key}>{channel.label}</th>
                                ))}
                                <th>Нийт</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesRows.length ? (
                                <>
                                    {salesRows.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.weekday || '-'}</td>
                                            <td>{row.dateLabel || '-'}</td>
                                            {CHANNELS.map((channel) => (
                                                <td key={channel.key}>{row.channels[channel.key] ? formatMoney(row.channels[channel.key]) : '-'}</td>
                                            ))}
                                            <td>{formatMoney(row.total)}</td>
                                        </tr>
                                    ))}
                                    <tr className="sales-total-row">
                                        <td colSpan={2}>Нийт</td>
                                        {CHANNELS.map((channel) => (
                                            <td key={channel.key}>
                                                {analytics.channelRows.find((item) => item.key === channel.key)?.amount
                                                    ? formatMoney(analytics.channelRows.find((item) => item.key === channel.key)?.amount)
                                                    : '-'}
                                            </td>
                                        ))}
                                        <td>{formatMoney(analytics.monthlyTotal)}</td>
                                    </tr>
                                </>
                            ) : (
                                <tr>
                                    <td colSpan={CHANNELS.length + 3} className="inventory-empty-cell">Одоогоор борлуулалтын файл оруулаагүй байна.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesRevenue;
