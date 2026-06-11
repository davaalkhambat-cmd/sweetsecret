import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CHANNEL_COLORS, fmt, fmtT, fmtShort } from './SalesCharts';

const WEEKDAY_MN_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const WEEKDAY_BUSINESS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function formatMonthShort(yearMonth) {
    if (!yearMonth) return '';
    const [, m] = yearMonth.split('-');
    return `${Number(m)}-р сар`;
}

function fmtDateLabel(dateStr) {
    const dt = new Date(dateStr + 'T00:00:00');
    const wd = WEEKDAY_MN_SHORT[dt.getDay()];
    const md = (dt.getMonth() + 1) + '/' + dt.getDate();
    return `${md} ${wd}`;
}

function shortName(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

/** Calendar days in month for plan (last month = days through latest data) */
function getMonthDays(yearMonth, latestDateInMonth) {
    if (!yearMonth) return 30;
    const [y, m] = yearMonth.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (latestDateInMonth) {
        const latest = new Date(latestDateInMonth + 'T00:00:00Z');
        const today = new Date();
        // If the month is the latest (data still flowing in this calendar month) — use latest data day as proxy for "active days"
        // Otherwise use full days in month
        const isCurrentMonth = latest.getUTCFullYear() === today.getUTCFullYear() && latest.getUTCMonth() + 1 === Number(m);
        if (isCurrentMonth) {
            return latest.getUTCDate();
        }
    }
    return daysInMonth;
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
        if (mode === 'single' && value.start) return value.start;
        if (mode === 'range' && value.start && value.end) return `${value.start} → ${value.end}`;
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
            onChange({ mode: 'single', start: maxDate, end: maxDate });
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
            <button type="button" className={`sd-date-trigger ${isActive ? 'active' : ''}`} onClick={() => setOpen((v) => !v)}>
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
   DAY HIGHLIGHT (best/worst sales day, HTML-style)
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

    if (!best || !worst) {
        return <div className="sd-empty" style={{ padding: '24px 16px' }}>Энэ хугацаанд өгөгдөл алга</div>;
    }

    return (
        <div className="sd-day-highlight">
            <div className="sd-day-card best">
                <div className="sd-day-pill">🏆 Онц өдөр</div>
                <div className="sd-day-label">Хамгийн өндөр борлуулалттай өдөр</div>
                <div className="sd-day-value">{fmtT(best.sales)}</div>
                <div className="sd-day-date">📅 <b>{fmtDateLabel(best.date)}</b> · {best.date}</div>
                <div className="sd-day-meta">
                    {best.receipts} чек · {best.qty} ш бараа · дундаж чек {fmtT(Math.round(best.sales / Math.max(best.receipts, 1)))}
                </div>
            </div>
            <div className="sd-day-card worst">
                <div className="sd-day-pill">⚠ Сул өдөр</div>
                <div className="sd-day-label">Хамгийн бага борлуулалттай өдөр</div>
                <div className="sd-day-value">{fmtT(worst.sales)}</div>
                <div className="sd-day-date">📅 <b>{fmtDateLabel(worst.date)}</b> · {worst.date}</div>
                <div className="sd-day-meta">
                    {worst.receipts} чек · {worst.qty} ш бараа · дундаж чек {fmtT(Math.round(worst.sales / Math.max(worst.receipts, 1)))}
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   TOP FAMILY HERO (medal labels)
   ============================================================ */
export function TopFamilyHero({ families, totalSales }) {
    const top3 = (families || []).filter((f) => f.revenue > 0).slice(0, 3);
    if (!top3.length) {
        return <div className="sd-empty" style={{ padding: '24px 16px' }}>Энэ хугацаанд ангилалын өгөгдөл алга</div>;
    }
    const labels = ['🥇 Тэргүүлэгч', '🥈 Хоёрдугаарт', '🥉 Гуравт'];
    return (
        <div className="sd-top-fam-grid">
            {top3.map((f, i) => {
                const share = totalSales ? ((f.revenue / totalSales) * 100).toFixed(1) : '0.0';
                const cls = ['f1', 'f2', 'f3'][i];
                return (
                    <div key={f.family} className={`sd-fam-card ${cls}`}>
                        <div>
                            <div className="sd-fam-pill">{labels[i]} ангилал</div>
                            <div className="sd-fam-name">{f.family}</div>
                        </div>
                        <div>
                            <div className="sd-fam-value">
                                {fmtT(f.revenue)}
                                <span className="sd-fam-share">{share}%</span>
                            </div>
                            <div className="sd-fam-meta">{fmt(f.qty)} ш зарагдсан · нийт борлуулалтын <b>{share}%</b></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ============================================================
   SEASONAL RECOMMENDATIONS (Mongolian calendar)
   ============================================================ */
const SEASONAL = {
    1: { events: 'Шинэ жилийн дараах үе — баярын дараах сэргээлт, хүйтний оргил.', mindset: 'Өөрийгөө сэргээх, тайвшрах, цэвэрлэгээ хийх хандлага.', demand: 'mid',
        focus: ['Цайруулах багц — баярын дараах арьс арчилгаа', 'Эмэгтэйн угаалгын фоам (Tea Tree, innergarm)', 'Rainbow Refresh цуврал', 'Чийгшүүлэгч / лубрикант (хүйтэн улирал)'],
        bundle: '«Сэргээлт / Detox» багц — угаалга + чийгшүүлэгч + цайруулах.', cta: 'Баярын дараах тайвшрал, өөрийгөө хайрлах сэдвээр контент гаргаж, угаалга-чийгшүүлэгчийн багцыг түлхэх.' },
    2: { events: 'Сар шинэ (Цагаан сар) ба Гэгээн Валентины баяр (2/14) — бэлэг өгөх оргил.', mindset: 'Бэлэг авах, романтик, гэр бүл/хосдоо анхаарал.', demand: 'peak',
        focus: ['Романтик багц / Тооёхон багц', 'Лубрикант, Intimate дотуур бүтээгдэхүүн', 'Бэлгийн ангилал (Intimate Toys)', 'Premium бэлгийн иж бүрдэл'],
        bundle: '«Хайрын багц» — лубрикант + intimate + гоёмсог баглаа.', cta: 'Валентин болон Сар шинийн бэлгийн багцыг урьдчилан бэлдэж, хосуудад зориулсан кампанит ажил явуулах.' },
    3: { events: 'Олон улсын эмэгтэйчүүдийн баяр (3/8) — эмэгтэйчүүдэд бэлэг өгөх хамгийн том өдөр.', mindset: 'Эгч/ээж/найзууддаа бэлэг, өөрийгөө эрхлүүлэх.', demand: 'peak',
        focus: ['Self-love / бэлгийн багц', 'Premium эмэгтэйн арчилгаа', 'Цайруулах багц', 'Гоёмсог баглаатай иж бүрдэл'],
        bundle: '«Эгчдээ бэлэг / Self-love» багц — арчилгаа + цайруулах + романтик.', cta: '3/8-ны өмнө 1-2 долоо хоногт бэлгийн багцыг онцолж, «эмэгтэйдээ хайраа илэрхийл» мессежтэй кампанит ажил хийх.' },
    4: { events: 'Хавар, шинэ эхлэл — цэвэрлэгээ, эрүүл мэндийн refresh.', mindset: 'Шинэчлэл, эрүүл ахуй, сэргэг байх.', demand: 'mid',
        focus: ['Эмэгтэйн угаалга/фоам', 'Нэг удаагийн цэвэрлэгээний gel (Inner disposable)', 'Rainbow цуврал', 'Хувийн ариун цэврийн бүтээгдэхүүн'],
        bundle: '«Хаврын цэвэрлэгээ» багц — угаалга + нэг удаагийн арчилгаа.', cta: 'Хавар = эрүүл ахуйн шинэчлэл сэдвээр өдөр тутмын арчилгааны багцыг түлхэх.' },
    5: { events: 'Хавар дуусч, дулаарал — идэвх, гадаа гарах эхлэл.', mindset: 'Идэвхтэй, сэргэг, аялалын өмнөх бэлтгэл.', demand: 'mid',
        focus: ['Fresh цэвэрлэгээний нойтон салфетка', 'Нэг удаагийн угаалга', 'Чийгшүүлэгч', 'Travel-size бүтээгдэхүүн'],
        bundle: '«Fresh & Active» багц — нойтон салфетка + нэг удаагийн gel.', cta: 'Дулаарч буй улиралд сэргэг, явдал-найрсаг бүтээгдэхүүнээ онцлох.' },
    6: { events: 'Хүүхдийн баяр (6/1), зуны амралт эхэлж, Наадам ойртоно.', mindset: 'Аялал, гадаа байх, эрүүл ахуйг замдаа авч явах.', demand: 'high',
        focus: ['Нэг удаагийн эмэгтэйн цэвэрлэгээ (аяллын)', 'Цэвэрлэгээний нойтон салфетка', 'Travel-size угаалга', 'Лубрикант (аялал) ба Trial Kit'],
        bundle: '«Аяллын / Travel» багц — нэг удаагийн gel + салфетка + жижиг хэмжээний угаалга.', cta: '«Хөдөө явахдаа бэлэн бай» сэдвээр аяллын жижиг хэмжээт багцыг идэвхтэй шахах — энэ улиралд эрэлт өндөр.' },
    7: { events: 'Наадам (7/11-13), зуслан, аялал жуулчлалын оргил.', mindset: 'Баяр наадам, аялал, гадаа.', demand: 'high',
        focus: ['Нэг удаагийн цэвэрлэгээ', 'Refresh салфетка', 'Travel kit', 'Хувийн эрүүл ахуйн жижиг хэрэгсэл'],
        bundle: '«Наадмын аяллын» багц — авсаархан эрүүл ахуйн иж бүрдэл.', cta: 'Наадмын өмнө аяллын багцыг онлайнаар урьдчилан захиалгаар түлхэх.' },
    8: { events: 'Зуны төгсгөл, амралтын улирал.', mindset: 'Амралт, сэргэлэн, чийгшил.', demand: 'mid',
        focus: ['Чийгшүүлэгч', 'Угаалга/фоам', 'Refresh цуврал'],
        bundle: '«Зуны сэргэлэн» багц.', cta: 'Зуны эцэст чийгшил, сэргэг байдлыг онцлох.' },
    9: { events: 'Намар, сургууль/ажлын шинэ улирал — дэглэмд эргэн орох.', mindset: 'Шинэ дэглэм, эрүүл зуршил, тогтвортой байх.', demand: 'mid',
        focus: ['Өдөр тутмын угаалга/фоам', 'Эмэгтэйн арчилгааны routine', 'Багцалсан үнэ'],
        bundle: '«Намрын routine» багц — сар бүрийн арчилгааны иж бүрдэл.', cta: '«Эрүүл зуршлаа шинэчил» сэдвээр захиалгат/subscription санааг таниулах.' },
    10: { events: 'Намар, хүйтрэлт эхэлнэ.', mindset: 'Дулаан, чийгшил, арчилгаа.', demand: 'mid',
        focus: ['Чийгшүүлэгч / Warming Rainbow', 'Угаалга', 'Лубрикант (хүйтэн улирал)'],
        bundle: '«Дулаан арчилгаа» багц.', cta: 'Хүйтрэлттэй уялдуулан чийгшил, дулаан мэдрэмжийн бүтээгдэхүүнийг онцлох.' },
    11: { events: 'Худалдааны улирал (Black Friday / 11.11) — хямдралын кампанит ажил.', mindset: 'Хямдрал хайх, урьдчилж бэлэг авах.', demand: 'high',
        focus: ['Багц бүтээгдэхүүн (хямдралтай)', 'Бэлгийн иж бүрдэл (Шинэ жилд бэлдэх)', 'Premium-ийг урамшуулалтай'],
        bundle: '«Black Friday / урамшуулал» багц — хосолсон үнэтэй иж бүрдэл.', cta: '11 сард томоохон урамшуулал зарлаж, Шинэ жилийн бэлгийн эрэлтийг урьдчилж барих.' },
    12: { events: 'Шинэ жилийн бэлгийн оргил, баярын улирал.', mindset: 'Бэлэг өгөх, баярын онцгой иж бүрдэл.', demand: 'peak',
        focus: ['Шинэ жилийн бэлгийн багц', 'Романтик / premium иж бүрдэл', 'Гоёмсог баглаа боодол'],
        bundle: '«Шинэ жилийн бэлэг» багц — premium + романтик.', cta: '12 сард бэлгийн багцыг онцолж, баглаа боодол, хүргэлтийн саадгүй байдлыг сурталчлах.' },
};
const DEMAND_LABEL = { peak: ['Онцгой өндөр', 'peak'], high: ['Өндөр', 'high'], mid: ['Дунд', 'mid'] };

function SeasonalBlock({ yearMonth }) {
    if (!yearMonth) return null;
    const mNum = parseInt(yearMonth.split('-')[1], 10);
    const s = SEASONAL[mNum];
    if (!s) return null;
    const nextNum = mNum === 12 ? 1 : mNum + 1;
    const sNext = SEASONAL[nextNum];
    const dem = DEMAND_LABEL[s.demand] || ['Дунд', 'mid'];
    return (
        <div className="sd-plan-block season">
            <h4>🗓️ {mNum}-р сар — улирлын зөвлөмж</h4>
            <div className="sd-season-line"><b>📌 Үйл явдал:</b> {s.events}</div>
            <div className="sd-season-line"><b>🧠 Хэрэглэгчийн сэтгэлзүй:</b> {s.mindset}</div>
            <div className="sd-season-line">
                <b>📈 Худалдан авах эрэлт:</b> <span className={`sd-season-demand ${dem[1]}`}>{dem[0]}</span>
            </div>
            <div className="sd-season-line"><b>🎯 Илүү шахах бүтээгдэхүүн:</b></div>
            <ul className="sd-pl-list">
                {s.focus.map((f, i) => <li key={i}><span className="sd-pl-name">{f}</span></li>)}
            </ul>
            <div className="sd-season-cta">
                💡 <b>Багцын санаа:</b> {s.bundle}<br />
                📣 <b>Уриалга:</b> {s.cta}
            </div>
            {sNext && (
                <div className="sd-season-next">
                    <b>Дараагийн сар ({nextNum}-р сар):</b> {sNext.events} → {sNext.bundle}
                </div>
            )}
        </div>
    );
}

/* ============================================================
   PLAN ANALYSIS (missing / top / weekday / seasonal)
   ============================================================ */
function PlanAnalysis({ selectedPeriod, months, reports, currentReport }) {
    // Selected month products
    const selProds = useMemo(() => {
        const r = reports[selectedPeriod];
        if (!r) return [];
        const map = new Map();
        for (const it of (r.line_items || [])) {
            const key = (it.pn || '').trim();
            if (!key) continue;
            if (!map.has(key)) map.set(key, { name: key, qty: 0, revenue: 0 });
            const p = map.get(key);
            p.qty += it.q || 0;
            p.revenue += it.n || 0;
        }
        return [...map.values()];
    }, [selectedPeriod, reports]);

    // Previous months (chronologically before selectedPeriod)
    const prevMonths = useMemo(() => {
        return months.map((m) => m.yearMonth).filter((ym) => ym < selectedPeriod).sort();
    }, [months, selectedPeriod]);

    // Previous months aggregate: name -> { c (months count), q, r }
    const prevAgg = useMemo(() => {
        const agg = {};
        for (const ym of prevMonths) {
            const r = reports[ym];
            if (!r) continue;
            const monthMap = new Map();
            for (const it of (r.line_items || [])) {
                const key = (it.pn || '').trim();
                if (!key) continue;
                if (!monthMap.has(key)) monthMap.set(key, { qty: 0, revenue: 0 });
                const p = monthMap.get(key);
                p.qty += it.q || 0;
                p.revenue += it.n || 0;
            }
            for (const [name, p] of monthMap) {
                const e = agg[name] || (agg[name] = { c: 0, q: 0, r: 0 });
                e.c += 1;
                e.q += p.qty;
                e.r += p.revenue;
            }
        }
        return agg;
    }, [prevMonths, reports]);

    const selMap = useMemo(() => Object.fromEntries(selProds.map((p) => [p.name, p])), [selProds]);

    // A) Missing strong products
    const missing = useMemo(() => {
        if (!prevMonths.length) return [];
        const threshold = Math.max(1, Math.ceil(prevMonths.length * 0.5));
        const out = [];
        for (const [name, e] of Object.entries(prevAgg)) {
            if (e.c >= threshold && !selMap[name]) {
                out.push({
                    name,
                    avgQty: e.q / e.c,
                    avgRev: e.r / e.c,
                    unit: e.q > 0 ? e.r / e.q : 0,
                });
            }
        }
        out.sort((a, b) => b.avgRev - a.avgRev);
        return out.slice(0, 5);
    }, [prevAgg, prevMonths, selMap]);
    const missingPotential = missing.reduce((s, m) => s + m.avgRev, 0);

    // B) Top 5 this month with growth indicators
    const topThis = useMemo(() => {
        const prevAvgQ = {};
        for (const [n, e] of Object.entries(prevAgg)) prevAvgQ[n] = e.q / e.c;
        return [...selProds].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((p) => {
            const pa = prevAvgQ[p.name];
            let badge = null;
            if (pa === undefined && prevMonths.length > 0) badge = { cls: 'new', text: '✨ ШИНЭ' };
            else if (pa && pa > 0) {
                const mult = p.qty / pa;
                if (mult >= 1.3) badge = { cls: 'rocket', text: `🚀 ${mult.toFixed(1)}×` };
                else if (mult <= 0.7) badge = { cls: 'down', text: `↓ ${mult.toFixed(1)}×` };
                else badge = { cls: 'flat', text: '→ тогтвортой' };
            }
            return { ...p, badge };
        });
    }, [selProds, prevAgg, prevMonths]);

    // C) Best weekday (from current report)
    const weekdayInsight = useMemo(() => {
        const wk = currentReport?.weekday || [];
        if (!wk.length) return null;
        const totalWk = wk.reduce((s, w) => s + w.sales, 0);
        const byAvg = [...wk].sort((a, b) => b.avg_sales_per_day - a.avg_sales_per_day);
        const best = byAvg[0];
        const worst = byAvg[byAvg.length - 1];
        const share = totalWk > 0 ? (best.sales / totalWk) * 100 : 0;
        const prevWdIdx = ((best.weekday_num) + 6) % 7;
        const prevWd = WEEKDAY_BUSINESS[prevWdIdx];
        return { best, worst, share, prevWd };
    }, [currentReport]);

    return (
        <>
            {missing.length > 0 && (
                <div className="sd-plan-block warn">
                    <h4>🔍 Алга байгаа хүчтэй бүтээгдэхүүн</h4>
                    <div className="sd-pb-intro">
                        Эдгээр нь өмнөх саруудад тогтмол зарагдаж байсан ч <b>{formatMonthShort(selectedPeriod)}-д хараахан гараагүй</b> байна.
                        Сэргээж чадвал дунджаар <b>{fmtT(missingPotential)}</b> нэмэлт орлого боломжтой.
                    </div>
                    <ul className="sd-pl-list">
                        {missing.map((m) => (
                            <li key={m.name}>
                                <span className="sd-pl-name">{shortName(m.name, 42)}</span>
                                <span className="sd-pl-meta">— өмнө дунджаар <b>{m.avgQty.toFixed(1)} ш</b> · <b>{fmtT(m.avgRev)}</b></span>
                                <span className="sd-pl-unit">(нэгж {fmtT(Math.round(m.unit))})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {topThis.length > 0 && (
                <div className="sd-plan-block good">
                    <h4>🚀 Энэ сард сайн явж буй бүтээгдэхүүн</h4>
                    <div className="sd-pb-intro">
                        Орлогоор тэргүүлэгч топ 5{prevMonths.length ? ' — өсөлтийн илтгэлцүүр (өмнөх саруудтай харьцуулсан) ба ШИНЭ нэрсийн хамт' : ''}.
                    </div>
                    <ul className="sd-pl-list">
                        {topThis.map((p) => (
                            <li key={p.name}>
                                {p.badge && <span className={`sd-pl-badge ${p.badge.cls}`}>{p.badge.text}</span>}
                                <span className="sd-pl-name">{shortName(p.name, 40)}</span>
                                <span className="sd-pl-meta">— <b>{p.qty} ш</b> · <b>{fmtT(p.revenue)}</b></span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {weekdayInsight && (
                <div className="sd-plan-block info">
                    <h4>📅 Хамгийн их орлоготой өдөр</h4>
                    <div className="sd-pb-intro">
                        Түүхэн дунджаар <b>{weekdayInsight.best.weekday_mn}</b> хамгийн өндөр (нийт орлогын <b>{weekdayInsight.share.toFixed(0)}%</b>),
                        {' '}<b>{weekdayInsight.worst.weekday_mn}</b> хамгийн бага. Маркетинг, SMS сануулга, акцийг
                        {' '}<b>{weekdayInsight.best.weekday_mn}</b> болон өмнөх өдөр (<b>{weekdayInsight.prevWd}</b>) идэвхжүүлэхийг зөвлөж байна.
                    </div>
                </div>
            )}

            <SeasonalBlock yearMonth={selectedPeriod} />
        </>
    );
}

/* ============================================================
   SALES PLAN (per-month target, progress, deep analysis)
   ============================================================ */
export function SalesPlan({ selectedPeriod, dateActive, kpis, months, reports, currentReport, latestDate }) {
    const isPerMonth = selectedPeriod && selectedPeriod !== 'all' && !dateActive;
    const storageKey = `sweetsecret_target_${selectedPeriod}`;
    const [targetStr, setTargetStr] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setTargetStr(localStorage.getItem(storageKey) || '');
    }, [storageKey]);

    const handleChange = (e) => {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        setTargetStr(raw);
        if (typeof window !== 'undefined') localStorage.setItem(storageKey, raw);
    };

    if (dateActive) {
        return (
            <div className="sd-plan-card">
                <div className="sd-plan-hint">
                    📅 Огнооны шүүлт идэвхтэй байна. Зорилт <b>сар тус бүрд</b> тавигдана —
                    дээрх "Хугацаа" мөрнөөс <b>1-р сар / 2-р сар / 3-р сар / 4-р сар</b> аль нэгийг сонгоно уу.
                </div>
            </div>
        );
    }

    if (!isPerMonth) {
        return (
            <div className="sd-plan-card">
                <div className="sd-plan-hint">
                    🎯 Зорилт <b>сар тус бүрд</b> хадгалагдана. Дээрх "Хугацаа" мөрнөөс тодорхой сараа сонгоно уу.
                </div>
            </div>
        );
    }

    const target = Number(targetStr.replace(/[^0-9]/g, '')) || 0;
    const actual = kpis.total_sales;
    const totalDays = getMonthDays(selectedPeriod, latestDate);
    const activeDays = kpis.n_days;
    const remainingDays = Math.max(0, totalDays - activeDays);
    const completion = target > 0 ? (actual / target) * 100 : 0;
    const shortage = Math.max(0, target - actual);
    const needed = remainingDays > 0 ? shortage / remainingDays : 0;
    const avgDaily = kpis.avg_daily_sales;
    const isOver = completion >= 100;
    const progressPct = Math.min(100, completion);
    const statClass = isOver ? 'success' : (completion >= 70 ? '' : (completion >= 40 ? 'warning' : 'danger'));

    return (
        <div className="sd-plan-card">
            <div className="sd-plan-top">
                <div>
                    <h3>{formatMonthShort(selectedPeriod)} — зорилт &amp; биелэлт</h3>
                    <p>Дээрх <b>"Хугацаа"</b> мөрөнд сар сонгоод зорилтоо доорх <b>оруулна</b>. Зорилт сар тус бүрд тусдаа хадгалагдана.</p>
                </div>
                <div className="sd-plan-input-wrap">
                    <div className="sd-pl-label">{formatMonthShort(selectedPeriod)} зорилт (₮)</div>
                    <input
                        type="text"
                        className="sd-plan-input"
                        placeholder="0"
                        value={targetStr ? new Intl.NumberFormat('mn-MN').format(target) : ''}
                        onChange={handleChange}
                        inputMode="numeric"
                    />
                </div>
            </div>

            {target > 0 ? (
                <>
                    <div className="sd-progress-wrap">
                        <div className={`sd-progress-bar ${isOver ? 'over' : ''}`} style={{ width: `${progressPct}%` }}>
                            {progressPct >= 8 && `${completion.toFixed(1)}%`}
                        </div>
                    </div>
                    <div className="sd-progress-text">
                        <span><b>{fmtT(actual)}</b> бодит дүн</span>
                        <span><b>{fmtT(target)}</b> зорилт</span>
                    </div>
                    <div className="sd-plan-stats">
                        <div className={`sd-plan-stat ${statClass}`}>
                            <div className="sd-ps-label">Биелэлт</div>
                            <div className="sd-ps-value">{completion.toFixed(1)}%</div>
                            <div className="sd-ps-sub">{fmtT(actual)} / {fmtT(target)}</div>
                        </div>
                        <div className="sd-plan-stat">
                            <div className="sd-ps-label">{isOver ? 'Илүү биелэгдсэн' : 'Дутах'}</div>
                            <div className="sd-ps-value">{fmtT(isOver ? actual - target : shortage)}</div>
                            <div className="sd-ps-sub">{remainingDays === 0 ? 'Хугацаа дууссан' : `${remainingDays} хоног үлдсэн`}</div>
                        </div>
                        <div className="sd-plan-stat">
                            <div className="sd-ps-label">Өдрийн дундаж</div>
                            <div className="sd-ps-value">{fmtT(avgDaily)}</div>
                            <div className="sd-ps-sub">{activeDays} идэвхтэй өдөр</div>
                        </div>
                        <div className="sd-plan-stat">
                            <div className="sd-ps-label">Шаардлагатай</div>
                            <div className="sd-ps-value">{remainingDays > 0 && !isOver ? fmtT(needed) : '—'}</div>
                            <div className="sd-ps-sub">{remainingDays > 0 && !isOver ? 'өдөрт хүртэх дүн' : (isOver ? 'зорилт биелсэн' : 'хугацаа дууссан')}</div>
                        </div>
                    </div>
                    <div className="sd-plan-status">
                        {isOver ? (
                            <>{formatMonthShort(selectedPeriod)}-ын зорилт <b>{completion.toFixed(1)}%</b> биелсэн 🎉 — зорилтоос <b>{fmtT(actual - target)}</b> илүү.</>
                        ) : (
                            <>
                                {formatMonthShort(selectedPeriod)}-ын зорилт <b>{completion.toFixed(1)}%</b> биелсэн. Дутуу: <b>{fmtT(shortage)}</b>.
                                {remainingDays > 0
                                    ? <> Үлдсэн <b>{remainingDays}</b> хоногт өдөрт <b>{fmtT(needed)}</b> зарвал зорилтод хүрнэ.</>
                                    : <> Хугацаа дууссан.</>
                                }
                            </>
                        )}
                    </div>
                </>
            ) : (
                <div className="sd-plan-hint">
                    💡 <b>{formatMonthShort(selectedPeriod)}-ын зорилтыг</b> дээрх талбарт оруулаад Enter дарна уу — биелэлтийн график &amp; дэлгэрэнгүй гарч ирнэ.
                </div>
            )}

            <PlanAnalysis
                selectedPeriod={selectedPeriod}
                months={months}
                reports={reports}
                currentReport={currentReport}
            />
        </div>
    );
}

/* ============================================================
   MONTH CALENDAR — Period filter-аас үл хамаарна, бүх сарыг үргэлж
   зэрэгцүүлэн харуулна. Зөвхөн channel filter-ыг дагана.
   ============================================================ */
export function MonthCalendars({ months, reports, channelFilter }) {
    const monthsToShow = useMemo(() => {
        const out = [];
        const sortedMonths = [...months].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
        for (const m of sortedMonths) {
            const r = reports[m.yearMonth];
            const items = r?.line_items || [];
            const filtered = channelFilter === 'all' ? items : items.filter((it) => it.c === channelFilter);
            const dayMap = new Map();
            const receiptKeys = new Map(); // date -> Set
            for (const it of filtered) {
                if (!it.d) continue;
                dayMap.set(it.d, (dayMap.get(it.d) || 0) + (it.n || 0));
                if (!receiptKeys.has(it.d)) receiptKeys.set(it.d, new Set());
                receiptKeys.get(it.d).add(`${it.r}@${it.c}`);
            }
            const [y, mo] = m.yearMonth.split('-').map(Number);
            const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
            // For current/partial month — use last day with data; for past months — full month
            const sortedDates = [...dayMap.keys()].sort();
            const lastDataDay = sortedDates.length
                ? Number(sortedDates[sortedDates.length - 1].slice(8))
                : 0;
            const isCurrentMonth = (() => {
                const now = new Date();
                return y === now.getUTCFullYear() && mo === now.getUTCMonth() + 1;
            })();
            const daysToRender = isCurrentMonth && lastDataDay > 0 ? lastDataDay : daysInMonth;

            const monthTotal = [...dayMap.values()].reduce((s, v) => s + v, 0);
            const recCounts = new Map();
            for (const [d, set] of receiptKeys) recCounts.set(d, set.size);

            out.push({
                yearMonth: m.yearMonth,
                year: y,
                month: mo,
                daysToRender,
                dayMap,
                recCounts,
                monthTotal,
            });
        }
        return out;
    }, [months, reports, channelFilter]);

    if (!monthsToShow.length) return <div className="sd-empty">Өгөгдөл алга</div>;

    // Global max across all months — colors comparable
    let globalMax = 0;
    for (const m of monthsToShow) {
        for (const v of m.dayMap.values()) {
            if (v > globalMax) globalMax = v;
        }
    }
    const tier = (val) => {
        if (!val || val <= 0) return 'no-sale';
        const pct = globalMax > 0 ? val / globalMax : 0;
        if (pct < 0.15) return 't1';
        if (pct < 0.30) return 't2';
        if (pct < 0.50) return 't3';
        if (pct < 0.70) return 't4';
        if (pct < 0.88) return 't5';
        return 't6';
    };

    const wkLabels = ['Д', 'М', 'Л', 'П', 'Б', 'Бя', 'Н'];

    return (
        <div className="sd-month-cal-grid">
            {monthsToShow.map((m) => {
                const firstDay = new Date(Date.UTC(m.year, m.month - 1, 1));
                const firstWk = (firstDay.getUTCDay() + 6) % 7; // Mon=0..Sun=6

                return (
                    <div key={m.yearMonth} className="sd-month-cal">
                        <div className="sd-mc-head">
                            <div className="sd-mc-name">{m.month}-р сар</div>
                            <div className="sd-mc-total">{fmtShort(m.monthTotal)}</div>
                        </div>
                        <div className="sd-mc-weekdays">
                            {wkLabels.map((w, i) => <div key={i}>{w}</div>)}
                        </div>
                        <div className="sd-mc-days">
                            {Array.from({ length: firstWk }).map((_, i) => (
                                <div key={`e-${i}`} className="sd-mc-day empty" />
                            ))}
                            {Array.from({ length: m.daysToRender }).map((_, i) => {
                                const dayNum = i + 1;
                                const dateStr = `${m.year}-${String(m.month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                const v = m.dayMap.get(dateStr) || 0;
                                const recs = m.recCounts.get(dateStr) || 0;
                                const t = tier(v);
                                const tooltip = v > 0
                                    ? `${dateStr} — ${fmtT(v)}${recs ? ' · ' + recs + ' чек' : ''}`
                                    : `${dateStr}: борлуулалт алга`;
                                return (
                                    <div key={dateStr} className={`sd-mc-day ${t}`} title={tooltip}>
                                        <span className="sd-d-num">{dayNum}</span>
                                        <span className="sd-d-val">{v > 0 ? fmtShort(v).replace('₮', '') : '0'}</span>
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

/* ============================================================
   WEEKDAY BARS
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
   PRODUCT BREAKDOWN (tab-based — one month at a time)
   ============================================================ */
export function ProductBreakdown({ months, reports, channelFilter }) {
    const monthList = useMemo(() => months.map((m) => m.yearMonth).sort(), [months]);
    const [selectedMonth, setSelectedMonth] = useState(() => monthList[monthList.length - 1] || null);
    const [sort, setSort] = useState('qty');

    useEffect(() => {
        if (!selectedMonth && monthList.length) setSelectedMonth(monthList[monthList.length - 1]);
        else if (selectedMonth && !monthList.includes(selectedMonth)) {
            setSelectedMonth(monthList[monthList.length - 1] || null);
        }
    }, [monthList, selectedMonth]);

    const monthData = useMemo(() => {
        if (!selectedMonth) return null;
        const r = reports[selectedMonth];
        if (!r) return null;
        const items = r.line_items || [];
        const filtered = channelFilter === 'all' ? items : items.filter((it) => it.c === channelFilter);
        const map = new Map();
        let totalRev = 0, totalQty = 0;
        const receipts = new Set();
        for (const it of filtered) {
            totalRev += it.n || 0;
            totalQty += it.q || 0;
            receipts.add(`${it.r}@${it.c}@${it.d}`);
            const key = it.pn || '—';
            if (!map.has(key)) map.set(key, { product_name: key, qty: 0, revenue: 0 });
            const p = map.get(key);
            p.qty += it.q || 0;
            p.revenue += it.n || 0;
        }
        const products = [...map.values()].sort((a, b) =>
            sort === 'qty' ? b.qty - a.qty : b.revenue - a.revenue
        );
        const totalReceipts = receipts.size;
        const avgBasket = totalReceipts ? Math.round(totalRev / totalReceipts) : 0;
        return { totalRev, totalQty, totalReceipts, avgBasket, products };
    }, [selectedMonth, reports, channelFilter, sort]);

    if (!monthList.length) {
        return <div className="sd-empty">Өгөгдөл алга</div>;
    }

    return (
        <>
            <div className="sd-pb-controls">
                <div className="sd-pb-months">
                    {monthList.map((ym) => (
                        <button
                            key={ym}
                            type="button"
                            className={selectedMonth === ym ? 'active' : ''}
                            onClick={() => setSelectedMonth(ym)}
                        >
                            {formatMonthShort(ym)}
                        </button>
                    ))}
                </div>
                <div className="sd-pb-sort-wrap" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="sd-pb-sort-label">Эрэмбэлэх:</div>
                    <div className="sd-pb-sort">
                        <button type="button" className={sort === 'qty' ? 'active' : ''} onClick={() => setSort('qty')}>📊 Тоогоор</button>
                        <button type="button" className={sort === 'revenue' ? 'active' : ''} onClick={() => setSort('revenue')}>💰 Орлогоор</button>
                    </div>
                </div>
            </div>

            {monthData && (
                <div className="sd-pb-month open">
                    <div className="sd-pb-month-head static">
                        <div className="sd-pb-mo-name">{formatMonthShort(selectedMonth)}</div>
                        <div className="sd-pb-mo-metrics">
                            <div className="sd-pb-m"><b>{fmt(monthData.totalQty)}</b><span>ширхэг</span></div>
                            <div className="sd-pb-m"><b>{fmtT(monthData.totalRev)}</b><span>орлого</span></div>
                            <div className="sd-pb-m"><b>{fmt(monthData.totalReceipts)}</b><span>чек</span></div>
                            <div className="sd-pb-m"><b>{fmtT(monthData.avgBasket)}</b><span>дундаж чек</span></div>
                        </div>
                    </div>
                    <div className="sd-pb-detail">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Бүтээгдэхүүн</th>
                                    <th className="sd-num">Тоо</th>
                                    <th className="sd-num">Нэгж үнэ</th>
                                    <th className="sd-num">Нийт орлого</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthData.products.map((p, i) => {
                                    const share = monthData.totalQty > 0 ? ((p.qty / monthData.totalQty) * 100).toFixed(1) : '0.0';
                                    const unit = p.qty > 0 ? Math.round(p.revenue / p.qty) : 0;
                                    const name = p.product_name.length > 44 ? p.product_name.slice(0, 44) + '…' : p.product_name;
                                    return (
                                        <tr key={p.product_name}>
                                            <td className="sd-pb-rank">{i + 1}</td>
                                            <td title={p.product_name}>{name}</td>
                                            <td className="sd-num">
                                                {p.qty}
                                                <span className="sd-pb-share">{share}%</span>
                                            </td>
                                            <td className="sd-num sd-pb-unit">{unit > 0 ? fmtT(unit) : '—'}</td>
                                            <td className="sd-num sd-pb-rev">{fmtT(p.revenue)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );
}

/* ============================================================
   PRODUCT ANALYSIS (with suggest dropdown + quick chips)
   ============================================================ */
const PA_QUICK_CHIPS = ['Rainbow', 'Tea Tree', 'Intime', 'Innergarm', 'Inner', "Let's inclear", 'багц', 'Цайруулах'];

export function ProductAnalysis({ months, reports, channelFilter }) {
    const [query, setQuery] = useState('');
    const [monthFilter, setMonthFilter] = useState('all');
    const [showSuggest, setShowSuggest] = useState(false);
    const wrapRef = useRef(null);

    // Build name → total_qty index across all months (channel-filtered)
    const productIndex = useMemo(() => {
        const map = new Map();
        for (const m of months) {
            const r = reports[m.yearMonth];
            if (!r) continue;
            for (const it of (r.line_items || [])) {
                if (channelFilter !== 'all' && it.c !== channelFilter) continue;
                if (!it.pn) continue;
                map.set(it.pn, (map.get(it.pn) || 0) + (it.q || 0));
            }
        }
        return map;
    }, [months, reports, channelFilter]);

    const productNames = useMemo(() => [...productIndex.keys()], [productIndex]);

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return productNames.filter((p) => p.toLowerCase().includes(q));
    }, [query, productNames]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return productNames
            .filter((n) => n.toLowerCase().includes(q))
            .sort((a, b) => (productIndex.get(b) || 0) - (productIndex.get(a) || 0))
            .slice(0, 8);
    }, [query, productNames, productIndex]);

    // Close suggest on outside click
    useEffect(() => {
        if (!showSuggest) return;
        const onDoc = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggest(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [showSuggest]);

    const handleQueryChange = (val) => {
        setQuery(val);
        setShowSuggest(!!val.trim());
    };
    const pickSuggestion = (name) => {
        setQuery(name);
        setShowSuggest(false);
    };
    const toggleChip = (c) => {
        if (query.trim().toLowerCase() === c.toLowerCase()) {
            setQuery('');
            setShowSuggest(false);
        } else {
            setQuery(c);
            setShowSuggest(false);
        }
    };

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
                <div className="sd-psearch-wrap" ref={wrapRef}>
                    <span className="sd-psearch-icon">🔍</span>
                    <input
                        type="text"
                        className="sd-psearch-input"
                        placeholder="Бүтээгдэхүүн хайх… (жш: Tea Tree, Rainbow, Intime, багц)"
                        value={query}
                        onChange={(e) => handleQueryChange(e.target.value)}
                        onFocus={() => { if (query.trim()) setShowSuggest(true); }}
                        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setShowSuggest(false); }}
                    />
                    {query && (
                        <button type="button" className="sd-psearch-clear" onClick={() => { setQuery(''); setShowSuggest(false); }}>✕</button>
                    )}
                    {showSuggest && suggestions.length > 0 && (
                        <div className="sd-psearch-suggest">
                            {suggestions.map((name) => (
                                <div key={name} className="sd-paS-item" onClick={() => pickSuggestion(name)}>
                                    <span className="sd-paS-name">{name}</span>
                                    <span className="sd-paS-meta">{fmt(productIndex.get(name) || 0)} ш</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <select className="sd-psearch-month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                    <option value="all">Бүх сар</option>
                    {months.map((m) => (
                        <option key={m.yearMonth} value={m.yearMonth}>{formatMonthShort(m.yearMonth)}</option>
                    ))}
                </select>
            </div>

            <div className="sd-pa-chips">
                <span className="sd-pb-sort-label" style={{ alignSelf: 'center' }}>Түргэн хайлт:</span>
                {PA_QUICK_CHIPS.map((c) => {
                    const active = query.trim().toLowerCase() === c.toLowerCase();
                    return (
                        <button
                            key={c}
                            type="button"
                            className={`sd-pa-chip ${active ? 'active' : ''}`}
                            onClick={() => toggleChip(c)}
                        >
                            {c}
                        </button>
                    );
                })}
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
   MONTHLY COMPARE helpers
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
   DISCOUNT BOX (champagne)
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
                Хувь: <b>{kpis.discount_rate}%</b> бохир орлогоос
            </div>
            <div className="sd-disc-summary">
                <div>• Бохир: <b>{fmtT(gross)}</b></div>
                <div>• Хөнгөлсөн: <b>{fmtT(kpis.total_discount)}</b></div>
                <div>• Цэвэр: <b className="net">{fmtT(kpis.total_sales)}</b></div>
            </div>
        </div>
    );
}

/* ============================================================
   INSIGHTS BOX (7 strategy blocks)
   ============================================================ */
export function InsightsBox({ report, monthly, channelFilter, selectedPeriod }) {
    if (!report) return null;
    const k = report.kpis;
    const channels = report.channels || [];
    const products = report.products || [];
    const families = report.families || [];
    const bkpis = report.bundle_kpis || {};
    const totalSales = k.total_sales || 0;
    const channelLabel = channelFilter === 'all' ? 'Бүх суваг' : channelFilter;
    const periodLabel = selectedPeriod === 'all' ? 'Бүх сар' : formatMonthShort(selectedPeriod);

    const blocks = [];

    // 1) Performance overview
    blocks.push(
        <div key="overview" className="sd-plan-block neutral">
            <h4>📊 Гүйцэтгэлийн тойм</h4>
            <div className="sd-pb-intro">
                Хамрах хүрээ: <b>{channelLabel}</b> · <b>{periodLabel}</b> · <b>{k.n_days}</b> идэвхтэй хоног.
            </div>
            <div className="sd-ins-metrics">
                <div className="sd-ins-metric"><div className="sd-im-v">{fmtT(totalSales)}</div><div className="sd-im-l">Нийт орлого</div></div>
                <div className="sd-ins-metric"><div className="sd-im-v">{fmt(k.total_receipts)}</div><div className="sd-im-l">Чек</div></div>
                <div className="sd-ins-metric"><div className="sd-im-v">{fmt(k.total_qty)}</div><div className="sd-im-l">Бараа (ш)</div></div>
                <div className="sd-ins-metric"><div className="sd-im-v">{fmtT(k.avg_basket)}</div><div className="sd-im-l">Дундаж чек</div></div>
                <div className="sd-ins-metric"><div className="sd-im-v">{fmtT(k.avg_daily_sales)}</div><div className="sd-im-l">Өдрийн дундаж</div></div>
                <div className="sd-ins-metric"><div className="sd-im-v">{k.avg_items || 0}</div><div className="sd-im-l">Бараа/чек</div></div>
            </div>
        </div>
    );

    // 2) Channel concentration (only when all)
    if (channelFilter === 'all' && channels.length > 0) {
        const total = channels.reduce((s, c) => s + c.sales, 0) || 1;
        const sorted = [...channels].sort((a, b) => b.sales - a.sales);
        const top1 = sorted[0];
        const top1share = (top1.sales / total) * 100;
        const top2share = sorted.slice(0, 2).reduce((s, c) => s + c.sales, 0) / total * 100;
        const premium = [...channels].sort((a, b) => b.avg_basket - a.avg_basket)[0];
        const concRisk = top2share >= 60;
        blocks.push(
            <div key="channels" className="sd-plan-block info">
                <h4>📡 Сувгийн төвлөрөл ба үр ашиг</h4>
                <div className="sd-pb-intro">
                    <b>{top1.channel}</b> тэргүүлэгч суваг — нийт орлогын <b>{top1share.toFixed(1)}%</b>.
                    Эхний 2 суваг хамтдаа <b>{top2share.toFixed(0)}%</b>
                    {concRisk ? <> — <b>төвлөрлийн эрсдэл өндөр</b>, сувгаа төрөлжүүлэх нь зүйтэй.</> : <> — харьцангуй тэнцвэртэй.</>}
                </div>
                {premium && (
                    <div className="sd-pb-intro">
                        Хамгийн өндөр дундаж чектэй (premium) суваг: <b>{premium.channel}</b> — {fmtT(premium.avg_basket)}.
                    </div>
                )}
            </div>
        );
    }

    // 3) Product & family concentration (Pareto)
    if (products.length > 0) {
        const top5 = products.slice(0, 5);
        const top5rev = top5.reduce((s, p) => s + p.revenue, 0);
        const top5share = totalSales > 0 ? (top5rev / totalSales) * 100 : 0;
        const topP = products[0];
        let famNode = null;
        if (families.length > 0) {
            const f = families[0];
            const fshare = totalSales > 0 ? (f.revenue / totalSales) * 100 : 0;
            famNode = <> Тэргүүлэх ангилал: <b>{f.family}</b> ({fshare.toFixed(1)}%).</>;
        }
        blocks.push(
            <div key="pareto" className="sd-plan-block good">
                <h4>🧴 Бүтээгдэхүүн ба ангиллын төвлөрөл</h4>
                <div className="sd-pb-intro">
                    Топ 5 бүтээгдэхүүн нийт орлогын <b>{top5share.toFixed(0)}%</b>-ийг бүрдүүлэв (Парето хамаарал).
                    Топ бараа: <b>{shortName(topP.product_name, 40)}</b> — {fmtT(topP.revenue)}.{famNode}
                </div>
                <div className="sd-pb-intro">
                    {top5share >= 50
                        ? 'Орлого цөөн бүтээгдэхүүнд төвлөрсөн — эдгээрийн нөөц тасрахаас сэргийлж, дагалдах (cross-sell) санал бэлдэх.'
                        : 'Орлого харьцангуй тархсан — тогтвортой бүтэц.'}
                </div>
            </div>
        );
    }

    // 4) Price, basket, discount
    {
        const discRate = k.discount_rate || 0;
        const discHealth = discRate < 10 ? 'эрүүл түвшин ✅' : (discRate < 15 ? 'зохистой' : 'өндөр — ашигт ажиллагаандаа анхаар ⚠');
        const items = k.avg_items || 0;
        blocks.push(
            <div key="basket" className="sd-plan-block neutral">
                <h4>💳 Үнэ, сагс ба хөнгөлөлт</h4>
                <div className="sd-pb-intro">
                    Дундаж чек <b>{fmtT(k.avg_basket)}</b> (нэг чекд {items} бараа). Хөнгөлөлтийн хувь <b>{discRate}%</b> — {discHealth}.
                </div>
                <div className="sd-pb-intro">
                    {items < 2
                        ? 'Нэг чекд дунджаар 2-оос бага бараа — багц/нэмэлт саналаар сагсны хэмжээг өсгөх боломж.'
                        : 'Сагсны хэмжээ эрүүл — багцаар цаашид өсгөх боломжтой.'}
                </div>
            </div>
        );
    }

    // 5) Bundle penetration
    if (bkpis.total_bundles_revenue !== undefined) {
        const bshare = bkpis.bundle_share_pct || 0;
        const lowBundle = bshare < 20;
        blocks.push(
            <div key="bundle" className={`sd-plan-block ${lowBundle ? 'warn' : 'good'}`}>
                <h4>🎁 Багцын нэвтрэлт</h4>
                <div className="sd-pb-intro">
                    Багц нийт орлогын <b>{bshare}%</b>-ийг бүрдүүлэв (
                    {((bkpis.total_bundles_revenue || 0) / 1_000_000).toFixed(1)}М · {bkpis.unique_bundles || 0} төрөл).
                    {' '}{lowBundle
                        ? 'Багцын эзлэх хувь бага — багцлалт, иж бүрдлийн саналыг идэвхжүүлбэл дундаж чек өснө.'
                        : 'Багц сайн ажиллаж байна — улирлын шинэ багцаар өргөтгөх.'}
                </div>
            </div>
        );
    }

    // 6) Trend (only when all period & 2+ months)
    if (selectedPeriod === 'all' && Array.isArray(monthly) && monthly.length >= 2) {
        const arr = monthly.filter((m) => m.total > 0);
        if (arr.length >= 2) {
            const g = arr[0].total > 0 ? (arr[arr.length - 1].total / arr[0].total - 1) * 100 : 0;
            const best = arr.reduce((a, b) => (b.avgDaily > a.avgDaily ? b : a));
            blocks.push(
                <div key="trend" className="sd-plan-block info">
                    <h4>📈 Чиг хандлага</h4>
                    <div className="sd-pb-intro">
                        {arr[0].label}-аас {arr[arr.length - 1].label} хүртэл орлого
                        {' '}<b>{Math.abs(g).toFixed(0)}%</b> {g >= 0 ? 'өссөн' : 'буурсан'}.
                        Өдрийн дунджаар хамгийн хүчтэй сар: <b>{best.label}</b> ({fmtT(best.avgDaily)}/өдөр).
                    </div>
                </div>
            );
        }
    }

    // 7) Strategy recommendations
    const recs = [];
    if (channelFilter === 'all' && channels.length > 1) {
        const total = channels.reduce((s, c) => s + c.sales, 0) || 1;
        const sorted = [...channels].sort((a, b) => b.sales - a.sales);
        if (sorted.slice(0, 2).reduce((s, c) => s + c.sales, 0) / total >= 0.6) {
            recs.push('Сул сувгуудыг (Оффис, Pop-up/Expo) идэвхжүүлж, орлогын төвлөрлийг бууруулах.');
        }
    }
    if ((bkpis.bundle_share_pct || 0) < 25) recs.push('Багц/иж бүрдлийн саналыг нэмэгдүүлж дундаж чекийг өсгөх.');
    if ((k.avg_items || 0) < 2) recs.push('Кассын үед дагалдах бараа санал болгож (cross-sell) нэг чекний барааг өсгөх.');
    if ((k.discount_rate || 0) >= 12) recs.push('Хөнгөлөлтийн бодлогоо хянаж, ашгийн маржаа хамгаалах.');
    recs.push('Онлайн сувгийн эзлэх хувийг өсгөх (хүргэлт + олон нийтийн контент, vlog).');
    recs.push('Топ бүтээгдэхүүний нөөцийг тогтмол хангаж, борлуулалтын тасралтаас сэргийлэх.');
    blocks.push(
        <div key="strategy" className="sd-plan-block season">
            <h4>🚀 Стратегийн зөвлөмж</h4>
            <ul className="sd-pl-list">
                {recs.slice(0, 5).map((r, i) => <li key={i}><span className="sd-pl-name">{r}</span></li>)}
            </ul>
        </div>
    );

    return <>{blocks}</>;
}
