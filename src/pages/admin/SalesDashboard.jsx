import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../config/roles';
import {
    listSalesReportMonths,
    getSalesReport,
    deleteSalesReport,
} from '../../utils/sales/salesSheetSync';
import { aggregateByChannel, expandCompactItems } from '../../utils/sales/aggregateSales';
import SyncModal from '../../components/admin/sales/SyncModal';
import {
    TrendChart,
    DonutChart,
    ReceiptsChart,
    ChannelBarChart,
    WeekdayChart,
    FamilyChart,
    BundleChannelChart,
    Heatmap,
    DateHeatmap,
    ProductsTable,
    BundlesTable,
    ChannelDetailTable,
    CHANNEL_COLORS,
    fmt,
    fmtT,
    fmtShort,
} from '../../components/admin/sales/SalesCharts';
import './SalesDashboard.css';

function formatMonthShort(yearMonth) {
    if (!yearMonth) return '';
    const [, m] = yearMonth.split('-');
    return `${Number(m)}-р сар`;
}

function formatMonthLabel(yearMonth) {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-');
    return `${y} оны ${Number(m)}-р сар`;
}

function formatSyncedAt(ts) {
    if (!ts) return '—';
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return new Intl.DateTimeFormat('mn-MN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        }).format(d);
    } catch {
        return '—';
    }
}

export default function SalesDashboard() {
    const { user, hasPermission } = useAuth();
    const canManage = hasPermission(PERMISSIONS.MANAGE_FINANCE);
    const canView = hasPermission(PERMISSIONS.VIEW_FINANCE);

    const [months, setMonths] = useState([]);          // { yearMonth, totalSales, syncedAt, ... }
    const [allReports, setAllReports] = useState({});  // { yearMonth: fullReport }
    const [loadingMonths, setLoadingMonths] = useState(true);
    const [loadingReports, setLoadingReports] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const [selectedPeriod, setSelectedPeriod] = useState('all');   // 'all' | yearMonth
    const [channelFilter, setChannelFilter] = useState('all');
    const [syncModalOpen, setSyncModalOpen] = useState(false);

    /* ----------- Loading ----------- */

    const loadMonths = async () => {
        setLoadingMonths(true);
        setLoadError(null);
        try {
            const list = await listSalesReportMonths();
            setMonths(list);
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoadingMonths(false);
        }
    };

    const loadAllReports = async (list) => {
        if (!list?.length) { setAllReports({}); return; }
        setLoadingReports(true);
        try {
            const entries = await Promise.all(list.map(async (m) => {
                const r = await getSalesReport(m.yearMonth);
                return [m.yearMonth, r];
            }));
            setAllReports(Object.fromEntries(entries));
        } catch (e) {
            setLoadError(e.message);
        } finally {
            setLoadingReports(false);
        }
    };

    useEffect(() => {
        if (canView) loadMonths();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canView]);

    useEffect(() => {
        if (months.length > 0) loadAllReports(months);
        else setAllReports({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [months]);

    const handleSynced = async () => {
        await loadMonths();
    };

    const handleDeleteMonth = async (yearMonth, e) => {
        e.stopPropagation();
        if (!window.confirm(`${formatMonthLabel(yearMonth)}-ын өгөгдлийг Firestore-оос устгах уу?`)) return;
        try {
            await deleteSalesReport(yearMonth);
            if (selectedPeriod === yearMonth) setSelectedPeriod('all');
            await loadMonths();
        } catch (err) {
            setLoadError(`Устгах амжилтгүй: ${err.message}`);
        }
    };

    /* ----------- Derived data ----------- */

    // Line items pool (based on selectedPeriod)
    const activeLineItems = useMemo(() => {
        if (selectedPeriod === 'all') {
            return months.flatMap((m) => expandCompactItems(allReports[m.yearMonth]?.line_items || []));
        }
        return expandCompactItems(allReports[selectedPeriod]?.line_items || []);
    }, [allReports, months, selectedPeriod]);

    const hasAnyLineItems = activeLineItems.length > 0;

    // Filtered aggregation based on (selectedPeriod, channelFilter)
    const filteredReport = useMemo(() => {
        if (!hasAnyLineItems) return null;
        return aggregateByChannel(activeLineItems, channelFilter);
    }, [activeLineItems, channelFilter, hasAnyLineItems]);

    // Period chip values — total for each period filtered by current channel
    const periodChipValues = useMemo(() => {
        const vals = { all: 0 };
        for (const m of months) {
            const items = expandCompactItems(allReports[m.yearMonth]?.line_items || []);
            const filtered = channelFilter === 'all'
                ? items
                : items.filter((it) => it.channel === channelFilter);
            const total = filtered.reduce((s, it) => s + (it.net || 0), 0);
            vals[m.yearMonth] = total;
            vals.all += total;
        }
        return vals;
    }, [allReports, months, channelFilter]);

    // Channel chip values — total for each channel filtered by current period
    const channelChipValues = useMemo(() => {
        const vals = { all: 0 };
        for (const c of Object.keys(CHANNEL_COLORS)) vals[c] = 0;
        for (const it of activeLineItems) {
            vals.all += it.net || 0;
            if (vals[it.channel] != null) vals[it.channel] += it.net || 0;
        }
        return vals;
    }, [activeLineItems]);

    // Date range label for sub-header
    const dateRangeLabel = useMemo(() => {
        if (!filteredReport) return '';
        const k = filteredReport.kpis;
        if (!k.date_start || !k.date_end) return '';
        return `${k.date_start} → ${k.date_end}`;
    }, [filteredReport]);

    const topProduct = filteredReport?.products?.[0];
    const topChannel = filteredReport?.channels?.[0];
    const promoFamily = filteredReport?.families?.find((f) => f.family?.includes('Урамшуулал'));
    const weekdayBest = useMemo(() => {
        if (!filteredReport?.weekday) return null;
        return filteredReport.weekday.reduce((a, b) => (b.avg_sales_per_day > (a?.avg_sales_per_day || 0) ? b : a), null);
    }, [filteredReport]);
    const weekdayWorst = useMemo(() => {
        if (!filteredReport?.weekday) return null;
        return filteredReport.weekday.reduce((a, b) => (a == null || b.avg_sales_per_day < a.avg_sales_per_day ? b : a), null);
    }, [filteredReport]);

    const hasFilter = selectedPeriod !== 'all' || channelFilter !== 'all';
    const getPeriodLabel = (p) => p === 'all' ? 'Бүх сар' : formatMonthLabel(p);
    const getChannelLabel = (c) => c === 'all' ? 'Бүх суваг' : c;

    const lastSync = useMemo(() => {
        const r = selectedPeriod !== 'all' ? allReports[selectedPeriod] : null;
        return r?.syncedAt || null;
    }, [allReports, selectedPeriod]);
    const lastSyncedBy = useMemo(() => {
        const r = selectedPeriod !== 'all' ? allReports[selectedPeriod] : null;
        return r?.syncedBy || null;
    }, [allReports, selectedPeriod]);

    if (!canView) {
        return (
            <div className="sales-dashboard">
                <div className="sd-wrap">
                    <div className="sd-empty">
                        <h2>Хандалт хориглогдсон</h2>
                        <p>Энэ хуудсыг үзэхийн тулд санхүүгийн модулийн үзэх эрх шаардлагатай.</p>
                    </div>
                </div>
            </div>
        );
    }

    const k = filteredReport?.kpis;
    const bk = filteredReport?.bundle_kpis;
    const totalFromChannels = filteredReport?.channels?.reduce((s, c) => s + c.sales, 0) || 0;

    return (
        <div className="sales-dashboard">
            <div className="sd-wrap">
                {/* Header */}
                <div className="sd-header">
                    <div>
                        <div className="sd-brand-tag">WETTRUST · SWEETSECRET</div>
                        <h1>Борлуулалтын дашбоард</h1>
                        <div className="sd-sub">
                            {getPeriodLabel(selectedPeriod)}
                            {dateRangeLabel ? ` · ${dateRangeLabel}` : ''}
                            {k?.n_days ? ` · ${k.n_days} хоногийн өгөгдөл` : ''}
                        </div>
                    </div>
                    <div className="sd-header-actions">
                        {lastSync && (
                            <div>
                                <div className="sd-updated-label">Сүүлд шинэчилсэн</div>
                                <div className="sd-updated-value">{formatSyncedAt(lastSync)}</div>
                                {lastSyncedBy?.email && (
                                    <div style={{ fontSize: 11 }}>{lastSyncedBy.email}</div>
                                )}
                            </div>
                        )}
                        {canManage && (
                            <button
                                type="button"
                                className="sd-btn sd-btn-primary"
                                onClick={() => setSyncModalOpen(true)}
                            >
                                🔄 Синк / тохируулах
                            </button>
                        )}
                    </div>
                </div>

                {/* Empty / loading states */}
                {loadingMonths && <div className="sd-empty"><p>Ачааллаж байна…</p></div>}
                {!loadingMonths && months.length === 0 && (
                    <div className="sd-empty">
                        <h2>Өгөгдөл байхгүй байна</h2>
                        <p>Google Sheet-ээс эхний синк хийж эхлээрэй.</p>
                        {canManage ? (
                            <button
                                type="button"
                                className="sd-btn sd-btn-primary"
                                style={{ marginTop: 14 }}
                                onClick={() => setSyncModalOpen(true)}
                            >
                                🔄 Одоо синк хийх
                            </button>
                        ) : (
                            <p style={{ marginTop: 14 }}>
                                Финанс / админ эрхтэй хүмүүс синк хийж чадна.
                            </p>
                        )}
                    </div>
                )}

                {loadError && <div className="sd-error">{loadError}</div>}

                {!loadingMonths && months.length > 0 && (
                    <>
                        {/* Period switcher — "Цаг хугацаа" */}
                        <div className="sd-period-switcher">
                            <span className="sd-period-label">Цаг хугацаа:</span>
                            <button
                                type="button"
                                className={`sd-period-btn all-btn ${selectedPeriod === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedPeriod('all')}
                            >
                                Бүгд
                                <span className="sd-btn-val">{fmtShort(periodChipValues.all || 0)}</span>
                            </button>
                            {[...months].reverse().map((m) => (
                                <button
                                    key={m.yearMonth}
                                    type="button"
                                    className={`sd-period-btn ${selectedPeriod === m.yearMonth ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod(m.yearMonth)}
                                >
                                    {formatMonthShort(m.yearMonth)}
                                    <span className="sd-btn-val">{fmtShort(periodChipValues[m.yearMonth] || 0)}</span>
                                    {canManage && (
                                        <button
                                            type="button"
                                            className="sd-period-del"
                                            onClick={(e) => handleDeleteMonth(m.yearMonth, e)}
                                            title="Устгах"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Channel filter */}
                        <div className="sd-channel-filter">
                            <span className="sd-filter-label">Суваг:</span>
                            <button
                                type="button"
                                className={`sd-chip ${channelFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setChannelFilter('all')}
                                style={channelFilter === 'all' ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : undefined}
                            >
                                <span className="sd-chip-dot" style={{ background: '#fff' }} />
                                Бүгд
                                <span className="sd-chip-val">{fmtShort(channelChipValues.all || 0)}</span>
                            </button>
                            {Object.keys(CHANNEL_COLORS).map((c) => {
                                const active = channelFilter === c;
                                const color = CHANNEL_COLORS[c];
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`sd-chip ${active ? 'active' : ''}`}
                                        onClick={() => setChannelFilter(c)}
                                        style={active ? { background: color } : undefined}
                                    >
                                        <span className="sd-chip-dot" style={{ background: color }} />
                                        {c}
                                        <span className="sd-chip-val">{fmtShort(channelChipValues[c] || 0)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Current-view banner */}
                        {hasFilter && (
                            <div className="sd-filter-banner">
                                <div className="sd-banner-text">
                                    📍 Одоо харж байгаа: <b>{getChannelLabel(channelFilter)}</b> · <b>{getPeriodLabel(selectedPeriod)}</b>
                                </div>
                                <button
                                    type="button"
                                    className="sd-clear-btn"
                                    onClick={() => { setSelectedPeriod('all'); setChannelFilter('all'); }}
                                >
                                    Бүгдийг харах
                                </button>
                            </div>
                        )}

                        {/* Loading / empty line items warning */}
                        {loadingReports && !filteredReport && (
                            <div className="sd-empty"><p>Тайлан ачааллаж байна…</p></div>
                        )}
                        {!loadingReports && !hasAnyLineItems && months.length > 0 && (
                            <div className="sd-error" style={{ marginBottom: 14 }}>
                                ⚠️ Ямар ч line items хадгалагдаагүй байна. Глобал суваг/хугацааны филтер ажиллах бол
                                дашбоард дээр &quot;🔄 Синк / тохируулах&quot; товч дарж бүх сараа дахин синк хийгээрэй.
                            </div>
                        )}
                    </>
                )}

                {/* Main dashboard */}
                {filteredReport && (
                    <>
                        {/* KPIs */}
                        <div className="sd-kpi-grid">
                            <Kpi cls="k1" label="Нийт цэвэр борлуулалт" value={fmtT(k.total_sales)} sub={`${k.n_days} хоногийн дүн`} />
                            <Kpi cls="k2" label="Үйлчлүүлсэн хүний тоо" value={fmt(k.total_receipts)} sub="чек/баримт" />
                            <Kpi cls="k3" label="Борлуулсан бараа" value={`${fmt(k.total_qty)} ш`} sub="нийт тоо ширхэг" />
                            <Kpi cls="k4" label="Дундаж чек" value={fmtT(k.avg_basket)} sub={`${k.avg_items} бараа/чек`} />
                            <Kpi cls="k5" label="Өдрийн дундаж орлого" value={fmtT(k.avg_daily_sales)} sub={`${k.avg_daily_receipts} чек/өдөр`} />
                        </div>

                        {/* Section 1: Dynamics */}
                        <div className="sd-section-title"><span className="sd-emoji">📊</span> Борлуулалтын динамик</div>
                        <div className="sd-grid-2">
                            <Card title="Өдрийн борлуулалтын тренд" desc="Сувгаар задарсан нийт цэвэр орлогын динамик">
                                <div className="sd-chart-box">
                                    <TrendChart daily={filteredReport.daily} selectedChannel={channelFilter} />
                                </div>
                            </Card>
                            <Card title="Сувгийн эзлэх хувь" desc="Нийт орлогын түгэлт">
                                <div className="sd-chart-box">
                                    <DonutChart channels={filteredReport.channels} />
                                </div>
                            </Card>
                        </div>
                        <div className="sd-grid-2-eq">
                            <Card title="Үйлчлүүлэгчийн тоо (өдрөөр)" desc="Чекийн тоо — замын хөдөлгөөн">
                                <div className="sd-chart-box">
                                    <ReceiptsChart receipts={filteredReport.receipts} />
                                </div>
                            </Card>
                            <Card title="Сувгийн гүйцэтгэлийн харьцуулалт" desc="Орлого, бараа, үйлчлүүлэгчийн нийт тоо">
                                <div className="sd-chart-box">
                                    <ChannelBarChart channels={filteredReport.channels} />
                                </div>
                            </Card>
                        </div>

                        {/* Section 2: Time */}
                        <div className="sd-section-title"><span className="sd-emoji">🗓️</span> Цаг хугацааны зүй тогтол</div>
                        <Card
                            title={channelFilter === 'all' ? 'Суваг × Өдөр — дулааны зураг' : `${channelFilter} — өдрийн дулааны зураг`}
                            desc="Өдөр бүр суваг тус бүрт хэдэн төгрөгийн борлуулалт болсныг харуулна"
                        >
                            <DateHeatmap daily={filteredReport.daily} selectedChannel={channelFilter} />
                        </Card>
                        <div className="sd-grid-2-eq">
                            <Card title="Гараг бүрийн дундаж борлуулалт" desc="Аль гараг хамгийн ашигтай вэ?">
                                <div className="sd-chart-box small">
                                    <WeekdayChart weekday={filteredReport.weekday} />
                                </div>
                                {weekdayBest && weekdayWorst && weekdayBest.avg_sales_per_day > 0 && weekdayWorst.avg_sales_per_day > 0 && (
                                    <div className="sd-insight">
                                        <b>{weekdayBest.weekday_mn}</b> гараг хамгийн идэвхтэй (дундаж {fmtT(weekdayBest.avg_sales_per_day)}),{' '}
                                        <b>{weekdayWorst.weekday_mn}</b>-оос{' '}
                                        <span className="sd-highlight">
                                            {(((weekdayBest.avg_sales_per_day - weekdayWorst.avg_sales_per_day) / weekdayWorst.avg_sales_per_day) * 100).toFixed(0)}% илүү
                                        </span>{' '}
                                        орлого авчирдаг.
                                    </div>
                                )}
                            </Card>
                            <Card title="Сувгийн гүйцэтгэл" desc="Хамгийн идэвхтэй гараг + суваг">
                                <Heatmap heatmap={filteredReport.heatmap} />
                            </Card>
                        </div>

                        {/* Section 3: Bundle */}
                        {bk && bk.total_bundles_qty > 0 && (
                            <>
                                <div className="sd-section-title"><span className="sd-emoji">🎁</span> Багцын шинжилгээ</div>
                                <div className="sd-kpi-grid">
                                    <Kpi cls="k5" label="Багцны орлого" value={fmtT(bk.total_bundles_revenue)} sub={`${bk.bundle_share_pct}% нийт орлогын`} />
                                    <Kpi cls="k1" label="Зарагдсан багц" value={`${fmt(bk.total_bundles_qty)} ш`} sub={`${bk.unique_bundles} төрлийн багц`} />
                                    <Kpi cls="k4" label="Дундаж багцын үнэ" value={fmtT(bk.avg_bundle_price)} sub="нэгж багц" />
                                    <Kpi cls="k3" label="Багцны төрөл" value={fmt(bk.unique_bundles)} sub="идэвхтэй SKU" />
                                </div>
                                <div className="sd-grid-2">
                                    <Card title="Топ зарагдсан багцууд">
                                        <BundlesTable bundles={filteredReport.bundles || []} />
                                    </Card>
                                    <Card title="Багц сувгаар" desc="Топ 8 багцын сувгийн задаргаа">
                                        <div className="sd-chart-box">
                                            <BundleChannelChart
                                                bundlesByChannel={filteredReport.bundles_by_channel || []}
                                                bundles={filteredReport.bundles || []}
                                            />
                                        </div>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* Section 4: Products */}
                        <div className="sd-section-title"><span className="sd-emoji">📦</span> Бүтээгдэхүүн &amp; Ангилал</div>
                        <div className="sd-grid-2">
                            <Card title="Топ 15 бүтээгдэхүүн (орлогоор)" desc="Хамгийн их мөнгө оруулж буй бараанууд">
                                <ProductsTable products={filteredReport.products || []} />
                            </Card>
                            <Card title="Бүтээгдэхүүний ангилал" desc="Брэнд/серийн бүлэг">
                                <div className="sd-chart-box">
                                    <FamilyChart families={filteredReport.families || []} />
                                </div>
                            </Card>
                        </div>

                        {/* Section 5: Summary */}
                        <div className="sd-grid-3">
                            <Card title="Сувгийн дэлгэрэнгүй" desc="Дундаж чек, бараа/чек">
                                <ChannelDetailTable channels={filteredReport.channels || []} />
                            </Card>
                            <Card title="Гол дүгнэлт" desc="Өгөгдлөөс гарсан стратеги санаа">
                                {topChannel && (
                                    <Insight>
                                        <b>{topChannel.channel}</b> тэргүүлж байна — нийт орлогын{' '}
                                        <span className="sd-highlight">{((topChannel.sales / (totalFromChannels || 1)) * 100).toFixed(1)}%</span>.
                                    </Insight>
                                )}
                                {topProduct && (
                                    <Insight>
                                        Топ бараа: <b>{topProduct.product_name.slice(0, 30)}…</b> — {fmtT(topProduct.revenue)} ({topProduct.qty} ш).
                                    </Insight>
                                )}
                                {promoFamily && (
                                    <Insight>
                                        <b>Урамшууллын багц</b> орлогын{' '}
                                        <span className="sd-highlight">{((promoFamily.revenue / (k.total_sales || 1)) * 100).toFixed(1)}%</span> бүрдүүлж байна.
                                    </Insight>
                                )}
                                <Insight>
                                    Дундаж чек {fmtT(k.avg_basket)} — <span className="sd-highlight">cross-sell</span> сайн ({k.avg_items} бараа/чек).
                                </Insight>
                            </Card>
                            <Card title="Хөнгөлөлт" desc="Промо, хямдралын үр нөлөө">
                                <DiscountBox kpis={k} />
                            </Card>
                        </div>

                        <div className="sd-footer">
                            Sweet Secret · Wettrust · Борлуулалтын дашбоард
                            {k?.date_start ? ` · ${k.date_start} – ${k.date_end}` : ''}
                        </div>
                    </>
                )}
            </div>

            {syncModalOpen && (
                <SyncModal
                    user={user}
                    onClose={() => setSyncModalOpen(false)}
                    onSynced={handleSynced}
                />
            )}
        </div>
    );
}

/* ---------- helpers ---------- */

function Kpi({ cls, label, value, sub }) {
    return (
        <div className={`sd-kpi ${cls}`}>
            <div className="sd-kpi-label">{label}</div>
            <div className="sd-kpi-value">{value}</div>
            {sub && <div className="sd-kpi-sub">{sub}</div>}
        </div>
    );
}

function Card({ title, desc, children }) {
    return (
        <div className="sd-card">
            {title && <h3>{title}</h3>}
            {desc && <div className="sd-desc">{desc}</div>}
            {children}
        </div>
    );
}

function Insight({ children }) {
    return (
        <div style={{ padding: '10px 0', borderBottom: '1px solid var(--sd-border)', fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' }}>
            → {children}
        </div>
    );
}

function DiscountBox({ kpis }) {
    if (!kpis) return null;
    const gross = kpis.total_sales + kpis.total_discount;
    return (
        <div>
            <div style={{ padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>Нийт хөнгөлөлт</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#fbbf24' }}>{fmtT(kpis.total_discount)}</span>
                </div>
                <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden', margin: '8px 0' }}>
                    <div style={{ height: '100%', width: `${kpis.discount_rate}%`, background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                    Хямдралын хувь: <b style={{ color: '#fbbf24' }}>{kpis.discount_rate}%</b> бохир орлогоос
                </div>
            </div>
            <div style={{ borderTop: '1px solid var(--sd-border)', paddingTop: 12, marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.7 }}>
                <div>• Бохир борлуулалт: <b>{fmtT(gross)}</b></div>
                <div>• Хөнгөлсөн: <b>{fmtT(kpis.total_discount)}</b></div>
                <div>• Цэвэр орлого: <b style={{ color: '#34d399' }}>{fmtT(kpis.total_sales)}</b></div>
            </div>
        </div>
    );
}
