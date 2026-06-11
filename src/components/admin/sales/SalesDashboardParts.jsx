import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CHANNEL_COLORS, fmt, fmtT, fmtShort } from './SalesCharts';

const WEEKDAY_MN = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const WEEKDAY_BUSINESS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function formatMongolianDate(yyyyMmDd) {
    if (!yyyyMmDd) return '';
    const [y, m, d] = yyyyMmDd.split('-');
    return `${y}-${m}-${d}`;
}

function formatMonthShort(yearMonth) {
    if (!yearMonth) return '';
    const [, m] = yearMonth.split('-');
    return `${Number(m)}-р сар`;
}

/* ============================================================
   DATE FILTER (popover: off / single / range / shortcuts)
   ============================================================ */
export function DateFilter({ value, onChange, minDate, maxDate }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const mode = value.mode || 'off';
    const isActive = mode !== 'off';
    const triggerLabel = useMemo(() => {
        if (mode === 'single' && value.start) return formatMongolianDate(value.start);
        if (mode === 'range' && value.start && value.end) {
            return `${formatMongolianDate(value.start)} → ${formatMongolianDate(value.end)}`;
        }
        return 'Огнооны шүүлт';
    }, [mode, value]);

    const setMode = (m) => {
        if (m === 'off') onChange({ mode: 'off', start: null, end: null });
        else if (m === 'single') {
            const d = value.start || maxDate || '';
            onChange({ mode: 'single', start: d, end: d });
        } else {
            const start = value.start || minDate || '';
            const end = value.end || maxDate || '';
            onChange({ mode: 'range', start, end });
        }
    };

    const applyShortcut = (key) => {
        if (!maxDate) return;
        const max = new Date(maxDate + 'T00:00:00Z');
        if (key === 'today') {
            const d = maxDate;
            onChange({ mode: 'single', start: d, end: d });
        } else if (key === '7d') {
            const s = new Date(max);
            s.setUTCDate(s.getUTCDate() - 6);
            onChange({ mode: 'range', start: s.toISOString().slice(0, 10), end: maxDate });
        } else if (key === '30d') {
            const s = new Date(max);
            s.setUTCDate(s.getUTCDate() - 29);
            onChange({ mode: 'range', start: s.toISOString().slice(0, 10), end: maxDate });
        } else if (key === 'thismonth') {
            const y = max.getUTCFullYear();
            const m = max.getUTCMonth();
            const first = new Date(Date.UTC(y, m, 1));
            onChange({ mode: 'range', start: first.toISOString().slice(0, 10), end: maxDate });
        }
    };

    return (
        <div className={`sd-date-wrap ${open ? 'open' : ''}`} ref={ref}>
            <button
                type="button"
                className={`sd-date-trigger ${isActive ? 'active' : ''}`}
                onClick={() => setOpen((v) => !v)}
            >
                <span>📅</span>
                <span>{triggerLabel}</span>
                <span className="sd-caret">▼</span>
            </button>
            {open && (
                <div className="sd-date-pop">
                    <div className="sd-pop-section">
                        <div className="sd-pop-label">Горим</div>
                        <div className="sd-date-mode">
                            <button type="button" className={mode === 'off' ? 'active' : ''} onClick={() => setMode('off')}>Бүгд</button>
                            <button type="button" className={mode === 'single' ? 'active' : ''} onClick={() => setMode('single')}>Нэг өдөр</button>
                            <button type="button" className={mode === 'range' ? 'active' : ''} onClick={() => setMode('range')}>Хугацаа</button>
                        </div>
                    </div>
                    {mode !== 'off' && (
                        <div className="sd-pop-section">
                            <div className="sd-pop-label">Огноо сонгох</div>
                            <div className="sd-date-inputs">
                                <input
                                    type="date"
                                    min={minDate}
                                    max={maxDate}
                                    value={value.start || ''}
                                    onChange={(e) => {
                                        const s = e.target.value;
                                        onChange({ ...value, mode, start: s, end: mode === 'single' ? s : (value.end || s) });
                                    }}
                                />
                                {mode === 'range' && (
                                    <>
                                        <span className="sd-sep">→</span>
                                        <input
                                            type="date"
                                            min={minDate}
                                            max={maxDate}
                                            value={value.end || ''}
                                            onChange={(e) => onChange({ ...value, mode, end: e.target.value })}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    {mode !== 'off' && (
                        <div className="sd-pop-section">
                            <div className="sd-pop-label">Хурдан сонголт</div>
                            <div className="sd-date-shortcuts">
                                <div className="sd-date-chip" onClick={() => applyShortcut('today')}>Сүүлийн өдөр</div>
                                <div className="sd-date-chip" onClick={() => applyShortcut('7d')}>7 хоног</div>
                                <div className="sd-date-chip" onClick={() => applyShortcut('30d')}>30 хоног</div>
                                <div className="sd-date-chip" onClick={() => applyShortcut('thismonth')}>Энэ сар</div>
                            </div>
                        </div>
                    )}
                    {isActive && (
                        <div className="sd-pop-section">
                            <button type="button" className="sd-date-clear" onClick={() => setMode('off')}>✕ Арилгах</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   DAY HIGHLIGHT (best/worst sales day)
   ============================================================ */
export function DayHighlight({ lineItems }) {
    const { best, worst } = useMemo(() => {
        const byDate = new Map();
        for (const it of lineItems) {
            if (!it.date) continue;
            if (!byDate.has(it.date)) byDate.set(it.date, { date: it.date, sales: 0, qty: 0, receipts: new Set() });
            const d = byDate.get(it.date);
            d.sales += it.net || 0;
            d.qty += it.qty || 0;
            d.receipts.add(`${it.receiptIndex}@${it.channel}`);
        }
        const arr = [...byDate.values()].map((d) => ({
            date: d.date,
            sales: d.sales,
            qty: d.qty,
            receipts: d.receipts.size,
        }));
        if (!arr.length) return { best: null, worst: null };
        arr.sort((a, b) => b.sales - a.sales);
        return { best: arr[0], worst: arr[arr.length - 1] };
    }, [lineItems]);

    if (!best || !worst) return null;
    const bestWeekday = WEEKDAY_MN[new Date(best.date + 'T00:00:00Z').getUTCDay()];
    const worstWeekday = WEEKDAY_MN[new Date(worst.date + 'T00:00:00Z').getUTCDay()];

    return (
        <div className="sd-day-highlight">
            <div className="sd-day-card best">
                <div className="sd-day-pill">🏆 Хамгийн идэвхтэй</div>
                <div className="sd-day-label">Хамгийн өндөр борлуулалт</div>
                <div className="sd-day-value">{fmtT(best.sales)}</div>
                <div className="sd-day-date">📅 <b>{formatMongolianDate(best.date)}</b> · {bestWeekday}</div>
                <div className="sd-day-meta">{best.receipts} чек · {best.qty} ширхэг</div>
            </div>
            <div className="sd-day-card worst">
                <div className="sd-day-pill">📉 Хамгийн нам</div>
                <div className="sd-day-label">Хамгийн бага борлуулалт</div>
                <div className="sd-day-value">{fmtT(worst.sales)}</div>
                <div className="sd-day-date">📅 <b>{formatMongolianDate(worst.date)}</b> · {worstWeekday}</div>
                <div className="sd-day-meta">{worst.receipts} чек · {worst.qty} ширхэг</div>
            </div>
        </div>
    );
}

/* ============================================================
   TOP FAMILY HERO (top 3 families)
   ============================================================ */
export function TopFamilyHero({ families, totalSales }) {
    const top3 = families.slice(0, 3);
    if (!top3.length) return null;
    return (
        <div className="sd-top-fam-grid">
            {top3.map((f, i) => {
                const pct = totalSales ? (f.revenue / totalSales) * 100 : 0;
                const cls = ['f1', 'f2', 'f3'][i];
                const rankLabel = ['№1 ТЭРГҮҮЛЭГЧ', '№2 ДЭД', '№3 ГУРАВ'][i];
                return (
                    <div key={f.family} className={`sd-fam-card ${cls}`}>
                        <div>
                            <div className="sd-fam-pill">{rankLabel}</div>
                            <div className="sd-fam-name">{f.family}</div>
                        </div>
                        <div>
                            <div className="sd-fam-value">
                                {fmtT(f.revenue)}
                                <span className="sd-fam-share">{pct.toFixed(1)}%</span>
                            </div>
                            <div className="sd-fam-meta"><b>{fmt(f.qty)}</b> ширхэг борлуулсан</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   SALES PLAN (target + progress + stats)
   ============================================================ */
export function SalesPlan({ planKey, totalSales, nDays }) {
    const storageKey = `sd-plan:${planKey}`;
    const [targetStr, setTargetStr] = useState(() => {
        if (typeof window === 'undefined') return '';
        return localStorage.getItem(storageKey) || '';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setTargetStr(localStorage.getItem(storageKey) || '');
    }, [storageKey]);

    const target = Number(targetStr.replace(/[^0-9]/g, '')) || 0;
    const pct = target > 0 ? (totalSales / target) * 100 : 0;
    const cappedPct = Math.min(pct, 100);
    const remaining = Math.max(target - totalSales, 0);
    const dailyAvg = nDays ? totalSales / nDays : 0;
    const dailyNeeded = remaining > 0 && nDays ? remaining / Math.max(1, nDays) : 0;

    const handleChange = (e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setTargetStr(raw);
        if (typeof window !== 'undefined') localStorage.setItem(storageKey, raw);
    };

    return (
        <div className="sd-plan-card">
            <div className="sd-plan-top">
                <div>
                    <h3>Зорилт ба гүйцэтгэл</h3>
                    <p>
                        Энэ хугацаанд хүрэх зорилтоо тогтоогоод гүйцэтгэлийн прогрессыг шалгаарай.
                        <b> {fmt(nDays)}</b> өдрийн өгөгдөл харуулж байна.
                    </p>
                </div>
                <div className="sd-plan-input-wrap">
                    <div className="sd-pl-label">Зорилт (₮)</div>
                    <input
                        type="text"
                        className="sd-plan-input"
                        placeholder="0"
                        value={targetStr ? new Intl.NumberFormat('mn-MN').format(target) : ''}
                        onChange={handleChange}
                    />
                </div>
            </div>

            {target > 0 ? (
                <>
                    <div className="sd-progress-wrap">
                        <div
                            className={`sd-progress-bar ${pct >= 100 ? 'over' : ''}`}
                            style={{ width: `${cappedPct}%` }}
                        >
                            {pct >= 8 && `${pct.toFixed(1)}%`}
                        </div>
                    </div>
                    <div className="sd-progress-text">
                        <span><b>{fmtT(totalSales)}</b> биелсэн</span>
                        <span><b>{fmtT(target)}</b> зорилт</span>
                    </div>

                    <div className="sd-plan-stats">
                        <PlanStat cls={pct >= 100 ? 'success' : pct >= 70 ? 'warning' : 'danger'}
                            label="Биелэлт" value={`${pct.toFixed(1)}%`}
                            sub={pct >= 100 ? '✓ Зорилт давсан' : pct >= 70 ? '⚠️ Зорилгад ойртож байна' : '⚠ Хоцорч байна'} />
                        <PlanStat cls={remaining === 0 ? 'success' : ''}
                            label="Үлдсэн дүн" value={fmtT(remaining)}
                            sub={remaining > 0 ? 'Зорилт хүртэлх' : '✓ Биелсэн'} />
                        <PlanStat label="Өдрийн дундаж" value={fmtT(dailyAvg)} sub={`${fmt(nDays)} өдөр`} />
                        <PlanStat label="Өдөрт хэрэгтэй" value={dailyNeeded > 0 ? fmtT(dailyNeeded) : '—'} sub="үлдсэнд хүрэхэд" />
                    </div>
                </>
            ) : (
                <div className="sd-empty" style={{ padding: '24px 16px' }}>
                    <p>💡 Зорилгоо оруулаад прогрессоо хянаарай.</p>
                </div>
            )}
        </div>
    );
}

function PlanStat({ cls = '', label, value, sub }) {
    return (
        <div className={`sd-plan-stat ${cls}`}>
            <div className="sd-ps-label">{label}</div>
            <div className="sd-ps-value">{value}</div>
            {sub && <div className="sd-ps-sub">{sub}</div>}
        </div>
    );
}

/* ============================================================
   MONTH CALENDAR (per-day heatmap by month)
   ============================================================ */
export function MonthCalendars({ daily, channelFilter }) {
    const byMonth = useMemo(() => {
        const map = new Map();
        for (const d of daily) {
            const ym = d.date.slice(0, 7);
            if (!map.has(ym)) map.set(ym, []);
            let total = 0;
            if (channelFilter === 'all') {
                for (const k of Object.keys(d)) {
                    if (k !== 'date') total += d[k] || 0;
                }
            } else {
                total = d[channelFilter] || 0;
            }
            map.get(ym).push({ date: d.date, total });
        }
        return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
    }, [daily, channelFilter]);

    if (!byMonth.length) return <div className="sd-empty">Өгөгдөл алга</div>;

    const allValues = byMonth.flatMap(([, items]) => items.map((i) => i.total)).filter((v) => v > 0);
    const max = allValues.length ? Math.max(...allValues) : 1;

    return (
        <div className="sd-month-cal-grid">
            {byMonth.map(([ym, items]) => {
                const monthTotal = items.reduce((s, i) => s + i.total, 0);
                const [y, m] = ym.split('-').map(Number);
                const firstDay = new Date(Date.UTC(y, m - 1, 1));
                const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
                const firstWeekday = (firstDay.getUTCDay() + 6) % 7; // Mon=0
                const byDate = new Map(items.map((i) => [i.date, i.total]));

                return (
                    <div key={ym} className="sd-month-cal">
                        <div className="sd-mc-head">
                            <div className="sd-mc-name">{formatMonthShort(ym)}</div>
                            <div className="sd-mc-total">{fmtShort(monthTotal)}</div>
                        </div>
                        <div className="sd-mc-weekdays">
                            {['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням'].map((d) => <div key={d}>{d}</div>)}
                        </div>
                        <div className="sd-mc-days">
                            {Array.from({ length: firstWeekday }).map((_, i) => (
                                <div key={`e-${i}`} className="sd-mc-day empty" />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const dayNum = i + 1;
                                const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                const v = byDate.get(dateStr) || 0;
                                const tier = v === 0 ? 'no-sale' : tierFor(v, max);
                                return (
                                    <div
                                        key={dateStr}
                                        className={`sd-mc-day ${tier}`}
                                        title={`${dateStr}: ${fmtT(v)}`}
                                    >
                                        <span className="sd-d-num">{dayNum}</span>
                                        {v > 0 && <span className="sd-d-val">{fmtShort(v).replace('₮', '')}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function tierFor(v, max) {
    const r = v / max;
    if (r >= 0.85) return 't6';
    if (r >= 0.65) return 't5';
    if (r >= 0.45) return 't4';
    if (r >= 0.3) return 't3';
    if (r >= 0.15) return 't2';
    return 't1';
}

/* ============================================================
   WEEKDAY BARS (horizontal)
   ============================================================ */
export function WeekdayBars({ weekday }) {
    if (!weekday?.length) return <div className="sd-empty">Өгөгдөл алга</div>;
    const sorted = [...weekday].sort((a, b) => a.weekday_num - b.weekday_num);
    const max = Math.max(...sorted.map((w) => w.avg_sales_per_day || 0), 1);
    const highest = sorted.reduce((a, b) => (b.avg_sales_per_day > (a?.avg_sales_per_day || 0) ? b : a), null);
    const lowest = sorted.reduce((a, b) => (a == null || b.avg_sales_per_day < a.avg_sales_per_day ? b : a), null);

    return (
        <div className="sd-weekday-bars">
            {sorted.map((w) => {
                const pct = (w.avg_sales_per_day / max) * 100;
                const isHigh = highest && w.weekday_num === highest.weekday_num;
                const isLow = lowest && w.weekday_num === lowest.weekday_num && w.weekday_num !== highest?.weekday_num;
                return (
                    <div key={w.weekday_num} className="sd-wd-row">
                        <div className="sd-wd-name">{w.weekday_mn}</div>
                        <div className="sd-wd-bar-track">
                            <div
                                className={`sd-wd-bar-fill ${isHigh ? 'highest' : ''} ${isLow ? 'lowest' : ''}`}
                                style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                        </div>
                        <div className="sd-wd-meta">
                            <div className="sd-wd-val">{fmtShort(w.avg_sales_per_day)}</div>
                            <div className="sd-wd-sub">{w.n_days} өдөр · {w.receipts} чек</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   PRODUCT BREAKDOWN (collapsible months → top products)
   ============================================================ */
export function ProductBreakdown({ months, reports, channelFilter }) {
    const [openMonth, setOpenMonth] = useState(null);
    const [sort, setSort] = useState('revenue'); // 'revenue' | 'qty'

    const monthRows = useMemo(() => {
        return months.map((m) => {
            const r = reports[m.yearMonth];
            if (!r) return null;
            const items = r.line_items || [];
            const filtered = channelFilter === 'all' ? items : items.filter((it) => it.c === channelFilter);
            const map = new Map();
            let total = 0, qty = 0;
            const receipts = new Set();
            for (const it of filtered) {
                total += it.n || 0;
                qty += it.q || 0;
                receipts.add(`${it.r}@${it.c}@${it.d}`);
                const key = it.pn || '—';
                if (!map.has(key)) map.set(key, { product_name: key, qty: 0, revenue: 0 });
                const p = map.get(key);
                p.qty += it.q || 0;
                p.revenue += it.n || 0;
            }
            const products = [...map.values()].sort((a, b) =>
                sort === 'revenue' ? b.revenue - a.revenue : b.qty - a.qty
            );
            return { yearMonth: m.yearMonth, total, qty, receipts: receipts.size, products };
        }).filter(Boolean);
    }, [months, reports, channelFilter, sort]);

    return (
        <>
            <div className="sd-pb-controls">
                <div className="sd-pb-sort-label">Эрэмбэлэх:</div>
                <div className="sd-pb-sort">
                    <button className={sort === 'revenue' ? 'active' : ''} onClick={() => setSort('revenue')}>Орлогоор</button>
                    <button className={sort === 'qty' ? 'active' : ''} onClick={() => setSort('qty')}>Тоогоор</button>
                </div>
            </div>
            {monthRows.map((row) => {
                const open = openMonth === row.yearMonth;
                const top = row.products.slice(0, 12);
                const maxVal = top[0] ? (sort === 'revenue' ? top[0].revenue : top[0].qty) : 1;
                return (
                    <div key={row.yearMonth} className={`sd-pb-month ${open ? 'open' : ''}`}>
                        <div
                            className="sd-pb-month-head"
                            onClick={() => setOpenMonth(open ? null : row.yearMonth)}
                        >
                            <div className="sd-pb-mo-name">{formatMonthShort(row.yearMonth)}</div>
                            <div className="sd-pb-mo-metrics">
                                <div className="sd-pb-m"><b>{fmtT(row.total)}</b><span>Орлого</span></div>
                                <div className="sd-pb-m"><b>{fmt(row.qty)}</b><span>Бараа</span></div>
                                <div className="sd-pb-m"><b>{fmt(row.receipts)}</b><span>Чек</span></div>
                            </div>
                            <div className="sd-pb-caret">▼</div>
                        </div>
                        {open && (
                            <div className="sd-pb-detail">
                                <table className="sd-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Бүтээгдэхүүн</th>
                                            <th className="sd-num">Ш</th>
                                            <th className="sd-num">Орлого</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {top.map((p, i) => {
                                            const v = sort === 'revenue' ? p.revenue : p.qty;
                                            const w = (v / maxVal) * 100;
                                            const name = p.product_name.length > 40 ? p.product_name.slice(0, 40) + '…' : p.product_name;
                                            return (
                                                <tr key={p.product_name}>
                                                    <td className="sd-pb-rank">{i + 1}</td>
                                                    <td title={p.product_name}>{name}</td>
                                                    <td className="sd-num">{p.qty}</td>
                                                    <td className="sd-num sd-bar-cell">
                                                        <div className="sd-bar-fill" style={{ width: `${w}%` }} />
                                                        <span className="sd-bar-text">{fmtT(p.revenue)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
}

/* ============================================================
   PRODUCT ANALYSIS (search + monthly bars)
   ============================================================ */
export function ProductAnalysis({ months, reports, channelFilter }) {
    const [query, setQuery] = useState('');
    const [monthFilter, setMonthFilter] = useState('all');

    const productIndex = useMemo(() => {
        // unique product names across all months (filtered by channel)
        const set = new Set();
        for (const m of months) {
            const r = reports[m.yearMonth];
            if (!r) continue;
            for (const it of (r.line_items || [])) {
                if (channelFilter !== 'all' && it.c !== channelFilter) continue;
                if (it.pn) set.add(it.pn);
            }
        }
        return [...set];
    }, [months, reports, channelFilter]);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return productIndex.filter((p) => p.toLowerCase().includes(q));
    }, [query, productIndex]);

    const monthRows = useMemo(() => {
        if (!matches.length) return [];
        const interestMonths = monthFilter === 'all' ? months : months.filter((m) => m.yearMonth === monthFilter);
        return interestMonths.map((m) => {
            const r = reports[m.yearMonth];
            if (!r) return { yearMonth: m.yearMonth, qty: 0, revenue: 0 };
            let qty = 0, revenue = 0;
            for (const it of (r.line_items || [])) {
                if (channelFilter !== 'all' && it.c !== channelFilter) continue;
                if (!matches.includes(it.pn)) continue;
                qty += it.q || 0;
                revenue += it.n || 0;
            }
            return { yearMonth: m.yearMonth, qty, revenue };
        });
    }, [matches, months, reports, monthFilter, channelFilter]);

    const totalQty = monthRows.reduce((s, r) => s + r.qty, 0);
    const totalRev = monthRows.reduce((s, r) => s + r.revenue, 0);
    const avg = totalQty ? totalRev / totalQty : 0;
    const maxRev = Math.max(...monthRows.map((r) => r.revenue), 1);

    const matchedProducts = useMemo(() => {
        if (!matches.length) return [];
        const map = new Map();
        const interestMonths = monthFilter === 'all' ? months : months.filter((m) => m.yearMonth === monthFilter);
        for (const m of interestMonths) {
            const r = reports[m.yearMonth];
            if (!r) continue;
            for (const it of (r.line_items || [])) {
                if (channelFilter !== 'all' && it.c !== channelFilter) continue;
                if (!matches.includes(it.pn)) continue;
                const key = it.pn;
                if (!map.has(key)) map.set(key, { name: key, qty: 0, revenue: 0 });
                const p = map.get(key);
                p.qty += it.q || 0;
                p.revenue += it.n || 0;
            }
        }
        return [...map.values()].sort((a, b) => b.revenue - a.revenue);
    }, [matches, months, reports, monthFilter, channelFilter]);

    return (
        <>
            <div className="sd-psearch-row">
                <div className="sd-psearch-wrap">
                    <span className="sd-psearch-icon">🔍</span>
                    <input
                        type="text"
                        className="sd-psearch-input"
                        placeholder="Бүтээгдэхүүн хайх… (жш: Tea Tree, Rainbow, Intime, багц)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button type="button" className="sd-psearch-clear" onClick={() => setQuery('')}>✕</button>
                    )}
                </div>
                <select
                    className="sd-psearch-month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                >
                    <option value="all">Бүх сар</option>
                    {months.map((m) => (
                        <option key={m.yearMonth} value={m.yearMonth}>{formatMonthShort(m.yearMonth)}</option>
                    ))}
                </select>
            </div>

            {!query && (
                <div className="sd-empty" style={{ padding: '24px 16px' }}>
                    Бүтээгдэхүүний нэрийг бичээд хайна уу — сараар задарсан тоо, орлого харагдана.
                </div>
            )}

            {query && !matches.length && (
                <div className="sd-empty" style={{ padding: '24px 16px' }}>
                    Тохирох бүтээгдэхүүн олдсонгүй.
                </div>
            )}

            {matches.length > 0 && (
                <>
                    <div className="sd-pa-kpis">
                        <div className="sd-kpi k2">
                            <div className="sd-kpi-label">Нийт удаа</div>
                            <div className="sd-kpi-value">{fmt(totalQty)}</div>
                            <div className="sd-kpi-sub">сонгосон хугацаанд</div>
                        </div>
                        <div className="sd-kpi k1">
                            <div className="sd-kpi-label">Нийт орлого</div>
                            <div className="sd-kpi-value">{fmtT(totalRev)}</div>
                            <div className="sd-kpi-sub">дундаж: {fmtT(avg)}</div>
                        </div>
                        <div className="sd-kpi k5">
                            <div className="sd-kpi-label">Бүтээгдэхүүний төрөл</div>
                            <div className="sd-kpi-value">{fmt(matches.length)}</div>
                            <div className="sd-kpi-sub">тохирсон нэр</div>
                        </div>
                    </div>

                    <div className="sd-pa-sub-title">📅 Сараар задаргаа</div>
                    <div className="sd-pa-bars">
                        {monthRows.map((row) => {
                            const w = (row.revenue / maxRev) * 100;
                            return (
                                <div key={row.yearMonth} className="sd-pa-bar-row">
                                    <div className="sd-pa-bar-label">{formatMonthShort(row.yearMonth)}</div>
                                    <div className="sd-pa-bar-track">
                                        <div className="sd-pa-bar-fill" style={{ width: `${Math.max(w, 1)}%` }} />
                                    </div>
                                    <div className="sd-pa-bar-val">
                                        <b>{fmtT(row.revenue)}</b>
                                        <span>{fmt(row.qty)} ширхэг</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="sd-pa-sub-title">🎯 Тохирсон бүтээгдэхүүнүүд ({matchedProducts.length})</div>
                    <div className="sd-pa-list">
                        {matchedProducts.slice(0, 30).map((p) => (
                            <div key={p.name} className="sd-pa-item">
                                <div className="sd-pa-item-name">{p.name}</div>
                                <div className="sd-pa-item-val">
                                    {fmt(p.qty)} ш · <b>{fmtT(p.revenue)}</b>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}

/* ============================================================
   MONTHLY COMPARE — derived data for monthly bar / channel chart
   ============================================================ */
export function buildMonthly(months, reports, channelFilter) {
    return months.map((m) => {
        const r = reports[m.yearMonth];
        const items = r?.line_items || [];
        const filtered = channelFilter === 'all' ? items : items.filter((it) => it.c === channelFilter);
        let total = 0;
        const days = new Set();
        const channelsMap = {};
        for (const it of filtered) {
            total += it.n || 0;
            if (it.d) days.add(it.d);
            const c = it.c || 'Бусад';
            channelsMap[c] = (channelsMap[c] || 0) + (it.n || 0);
        }
        const nDays = days.size || 1;
        return {
            yearMonth: m.yearMonth,
            label: formatMonthShort(m.yearMonth),
            total,
            avgDaily: total / nDays,
            nDays,
            channels: channelsMap,
        };
    });
}

export function MonthlySummaryTable({ monthly }) {
    return (
        <table className="sd-table">
            <thead>
                <tr>
                    <th>Сар</th>
                    <th className="sd-num">Нийт орлого</th>
                    <th className="sd-num">Өдрийн дундаж</th>
                    <th className="sd-num">Өдрийн тоо</th>
                </tr>
            </thead>
            <tbody>
                {monthly.map((m) => (
                    <tr key={m.yearMonth}>
                        <td>{m.label}</td>
                        <td className="sd-num">{fmtT(m.total)}</td>
                        <td className="sd-num">{fmtT(m.avgDaily)}</td>
                        <td className="sd-num">{m.nDays}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ============================================================
   DISCOUNT BOX (redesigned for light theme)
   ============================================================ */
export function DiscountBox({ kpis }) {
    if (!kpis) return null;
    const gross = kpis.total_sales + kpis.total_discount;
    return (
        <div>
            <div className="sd-disc-row">
                <span className="sd-disc-label">Нийт хөнгөлөлт</span>
                <span className="sd-disc-value">{fmtT(kpis.total_discount)}</span>
            </div>
            <div className="sd-disc-bar-track">
                <div className="sd-disc-bar-fill" style={{ width: `${Math.min(kpis.discount_rate, 100)}%` }} />
            </div>
            <div className="sd-disc-hint">
                Хямдралын хувь: <b>{kpis.discount_rate}%</b> бохир орлогоос
            </div>
            <div className="sd-disc-summary">
                <div>• Бохир борлуулалт: <b>{fmtT(gross)}</b></div>
                <div>• Хөнгөлсөн: <b>{fmtT(kpis.total_discount)}</b></div>
                <div>• Цэвэр орлого: <b className="net">{fmtT(kpis.total_sales)}</b></div>
            </div>
        </div>
    );
}
