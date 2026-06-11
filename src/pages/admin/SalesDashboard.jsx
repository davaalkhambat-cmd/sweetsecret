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
    FamilyChart,
    BundleChannelChart,
    MonthlyBarChart,
    MonthlyChannelChart,
    ProductsTable,
    BundlesTable,
    ChannelDetailTable,
    CHANNEL_COLORS,
    fmt,
    fmtT,
    fmtShort,
} from '../../components/admin/sales/SalesCharts';
import {
    DateFilter,
    DayHighlight,
    TopFamilyHero,
    SalesPlan,
    MonthCalendars,
    WeekdayBars,
    ProductBreakdown,
    ProductAnalysis,
    buildMonthly,
    MonthlySummaryTable,
    DiscountBox,
} from '../../components/admin/sales/SalesDashboardParts';
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

    const [months, setMonths] = useState([]);
    const [allReports, setAllReports] = useState({});
    const [loadingMonths, setLoadingMonths] = useState(true);
    const [loadingReports, setLoadingReports] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const [selectedPeriod, setSelectedPeriod] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ mode: 'off', start: null, end: null });
    const [syncModalOpen, setSyncModalOpen] = useState(false);

    /* ---------- Loading ---------- */

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

    /* ---------- Derived data ---------- */

    // Pool by period
    const periodLineItems = useMemo(() => {
        if (selectedPeriod === 'all') {
            return months.flatMap((m) => expandCompactItems(allReports[m.yearMonth]?.line_items || []));
        }
        return expandCompactItems(allReports[selectedPeriod]?.line_items || []);
    }, [allReports, months, selectedPeriod]);

    // Date bounds (for date filter limits)
    const dateBounds = useMemo(() => {
        if (!periodLineItems.length) return { min: null, max: null };
        const dates = periodLineItems.map((it) => it.date).filter(Boolean).sort();
        return { min: dates[0], max: dates[dates.length - 1] };
    }, [periodLineItems]);

    // Apply date filter
    const dateFilteredItems = useMemo(() => {
        if (!dateRange.mode || dateRange.mode === 'off') return periodLineItems;
        const s = dateRange.start;
        const e = dateRange.end || dateRange.start;
        if (!s) return periodLineItems;
        return periodLineItems.filter((it) => it.date && it.date >= s && it.date <= e);
    }, [periodLineItems, dateRange]);

    const hasAnyLineItems = dateFilteredItems.length > 0;

    // Aggregated report filtered by channel
    const filteredReport = useMemo(() => {
        if (!hasAnyLineItems) return null;
        return aggregateByChannel(dateFilteredItems, channelFilter);
    }, [dateFilteredItems, channelFilter, hasAnyLineItems]);

    // Period chip values
    const periodChipValues = useMemo(() => {
        const vals = { all: 0 };
        for (const m of months) {
            const items = expandCompactItems(allReports[m.yearMonth]?.line_items || []);
            const filtered = channelFilter === 'all' ? items : items.filter((it) => it.channel === channelFilter);
            const total = filtered.reduce((s, it) => s + (it.net || 0), 0);
            vals[m.yearMonth] = total;
            vals.all += total;
        }
        return vals;
    }, [allReports, months, channelFilter]);

    // Channel chip values
    const channelChipValues = useMemo(() => {
        const vals = { all: 0 };
        for (const c of Object.keys(CHANNEL_COLORS)) vals[c] = 0;
        for (const it of periodLineItems) {
            vals.all += it.net || 0;
            if (vals[it.channel] != null) vals[it.channel] += it.net || 0;
        }
        return vals;
    }, [periodLineItems]);

    // Active channels (only those with sales)
    const activeChannels = useMemo(() => {
        return Object.keys(CHANNEL_COLORS).filter((c) => (channelChipValues[c] || 0) > 0);
    }, [channelChipValues]);

    // Monthly compare data (only when 'all' period)
    const monthlyData = useMemo(() => {
        if (selectedPeriod !== 'all' || months.length < 2) return null;
        return buildMonthly(months, allReports, channelFilter);
    }, [months, allReports, channelFilter, selectedPeriod]);

    // Header sub label
    const dateRangeLabel = useMemo(() => {
        if (!filteredReport) return '';
        const k = filteredReport.kpis;
        if (!k.date_start || !k.date_end) return '';
        return `${k.date_start} → ${k.date_end}`;
    }, [filteredReport]);

    const hasFilter = selectedPeriod !== 'all' || channelFilter !== 'all' || (dateRange.mode && dateRange.mode !== 'off');
    const getPeriodLabel = (p) => p === 'all' ? 'Бүх сар' : formatMonthLabel(p);
    const getChannelLabel = (c) => c === 'all' ? 'Бүх суваг' : c;

    const lastSync = useMemo(() => {
        if (selectedPeriod !== 'all') return allReports[selectedPeriod]?.syncedAt || null;
        // latest across months
        const all = months
            .map((m) => allReports[m.yearMonth]?.syncedAt)
            .filter(Boolean);
        if (!all.length) return null;
        return all.reduce((a, b) => {
            const da = a?.toDate ? a.toDate() : new Date(a);
            const db = b?.toDate ? b.toDate() : new Date(b);
            return db > da ? b : a;
        });
    }, [allReports, months, selectedPeriod]);
    const lastSyncedBy = useMemo(() => {
        if (selectedPeriod !== 'all') return allReports[selectedPeriod]?.syncedBy || null;
        return null;
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
    const topChannel = filteredReport?.channels?.[0];
    const topProduct = filteredReport?.products?.[0];
    const promoFamily = filteredReport?.families?.find((f) => f.family?.includes('Урамшуулал'));
    const planKey = `${selectedPeriod}:${channelFilter}:${dateRange.mode}:${dateRange.start || ''}:${dateRange.end || ''}`;

    return (
        <div className="sales-dashboard">
            <div className="sd-wrap">
                {/* Header */}
                <div className="sd-header">
                    <div>
                        <div className="sd-brand-tag">✦ Sweet Secret · Wettrust · Intimate Wellness</div>
                        <h1><em>Борлуулалт</em> — Дашбоардын тойм</h1>
                        <div className="sd-sub">
                            {getPeriodLabel(selectedPeriod)}
                            {dateRangeLabel ? ` · ${dateRangeLabel}` : ''}
                            {k?.n_days ? ` · ${k.n_days} хоногийн өгөгдөл` : ''}
                        </div>
                    </div>
                    <div className="sd-header-actions">
                        <div className="sd-status-block">
                            <div className="sd-status-dot"></div>
                            <div className="sd-status-info">
                                <div className="sd-upd-label">Шинэчилсэн</div>
                                <div className="sd-upd-date">{formatSyncedAt(lastSync)}</div>
                                {lastSyncedBy?.email && <div className="sd-upd-email">{lastSyncedBy.email}</div>}
                            </div>
                            {canManage && (
                                <button
                                    type="button"
                                    className="sd-btn sd-btn-primary"
                                    onClick={() => setSyncModalOpen(true)}
                                >
                                    🔄 Синк
                                </button>
                            )}
                        </div>
                        <DateFilter
                            value={dateRange}
                            onChange={setDateRange}
                            minDate={dateBounds.min}
                            maxDate={dateBounds.max}
                        />
                    </div>
                </div>

                {loadingMonths && <div className="sd-empty"><p>Ачааллаж байна…</p></div>}
                {!loadingMonths && months.length === 0 && (
                    <div className="sd-empty">
                        <h2>Өгөгдөл байхгүй байна</h2>
                        <p>Google Sheet-ээс эхний синк хийж эхлээрэй.</p>
                        {canManage && (
                            <button
                                type="button"
                                className="sd-btn sd-btn-primary"
                                style={{ marginTop: 14 }}
                                onClick={() => setSyncModalOpen(true)}
                            >
                                🔄 Одоо синк хийх
                            </button>
                        )}
                    </div>
                )}

                {loadError && <div className="sd-error">{loadError}</div>}

                {!loadingMonths && months.length > 0 && (
                    <>
                        {/* Period switcher */}
                        <div className="sd-period-switcher">
                            <span className="sd-period-label">📆 Хугацаа</span>
                            <button
                                type="button"
                                className={`sd-period-btn all-btn ${selectedPeriod === 'all' ? 'active' : ''}`}
                                onClick={() => setSelectedPeriod('all')}
                            >
                                <span className="sd-pb-main">Бүгд</span>
                                <span className="sd-btn-val">{fmtShort(periodChipValues.all || 0)}</span>
                            </button>
                            {[...months].reverse().map((m) => (
                                <button
                                    key={m.yearMonth}
                                    type="button"
                                    className={`sd-period-btn ${selectedPeriod === m.yearMonth ? 'active' : ''}`}
                                    onClick={() => setSelectedPeriod(m.yearMonth)}
                                >
                                    <span className="sd-pb-main">{formatMonthShort(m.yearMonth)}</span>
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
                            <span className="sd-filter-label">Суваг</span>
                            <button
                                type="button"
                                className={`sd-chip ${channelFilter === 'all' ? 'active' : ''}`}
                                onClick={() => setChannelFilter('all')}
                                style={channelFilter === 'all' ? { background: 'linear-gradient(135deg,#6B1839,#4A0F26)' } : undefined}
                            >
                                <span className="sd-chip-dot" style={{ background: '#fff' }} />
                                Бүгд
                                <span className="sd-chip-val">{fmtShort(channelChipValues.all || 0)}</span>
                            </button>
                            {Object.keys(CHANNEL_COLORS).map((c) => {
                                if ((channelChipValues[c] || 0) === 0 && channelFilter !== c) return null;
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

                        {hasFilter && (
                            <div className="sd-filter-banner">
                                <div className="sd-banner-text">
                                    📍 Одоо харж байгаа: <b>{getChannelLabel(channelFilter)}</b> · <b>{getPeriodLabel(selectedPeriod)}</b>
                                    {dateRange.mode !== 'off' && dateRange.start && (
                                        <> · <b>{dateRange.mode === 'single' ? dateRange.start : `${dateRange.start} → ${dateRange.end}`}</b></>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    className="sd-clear-btn"
                                    onClick={() => {
                                        setSelectedPeriod('all');
                                        setChannelFilter('all');
                                        setDateRange({ mode: 'off', start: null, end: null });
                                    }}
                                >
                                    Бүгдийг харах
                                </button>
                            </div>
                        )}

                        {loadingReports && !filteredReport && (
                            <div className="sd-empty"><p>Тайлан ачааллаж байна…</p></div>
                        )}
                        {!loadingReports && !hasAnyLineItems && months.length > 0 && (
                            <div className="sd-error" style={{ marginBottom: 14 }}>
                                ⚠️ Ямар ч line items хадгалагдаагүй байна. Бүх сараа дахин синк хийх шаардлагатай.
                            </div>
                        )}
                    </>
                )}

                {filteredReport && (
                    <>
                        {/* KPIs */}
                        <div className="sd-kpi-grid sd-fade-in">
                            <Kpi cls="k1" label="Нийт цэвэр борлуулалт" value={fmtT(k.total_sales)} sub={`${k.n_days} хоногийн дүн`} />
                            <Kpi cls="k2" label="Үйлчлүүлсэн хүн" value={fmt(k.total_receipts)} sub="чек/баримт" />
                            <Kpi cls="k3" label="Борлуулсан бараа" value={`${fmt(k.total_qty)} ш`} sub="нийт тоо ширхэг" />
                            <Kpi cls="k4" label="Дундаж чек" value={fmtT(k.avg_basket)} sub={`${k.avg_items} бараа/чек`} />
                            <Kpi cls="k5" label="Өдрийн дундаж" value={fmtT(k.avg_daily_sales)} sub={`${k.avg_daily_receipts} чек/өдөр`} />
                        </div>

                        {/* Best/worst day */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">🏆</span> Эрэлттэй өдрүүд
                            <span className="sd-period-chip">{getPeriodLabel(selectedPeriod)}</span>
                        </div>
                        <DayHighlight lineItems={dateFilteredItems} />

                        {/* Top family hero */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">✨</span> Тэргүүлэх ангилал
                            <span className="sd-period-chip">{getPeriodLabel(selectedPeriod)}</span>
                        </div>
                        <TopFamilyHero families={filteredReport.families || []} totalSales={k.total_sales} />

                        {/* Sales plan */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">🎯</span> Борлуулалтын төлөвлөгөө
                            <span className="sd-period-chip">{getPeriodLabel(selectedPeriod)}</span>
                        </div>
                        <SalesPlan planKey={planKey} totalSales={k.total_sales} nDays={k.n_days} />

                        {/* Dynamics */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">📊</span> Борлуулалтын динамик
                            <span className="sd-period-chip">{getChannelLabel(channelFilter)}</span>
                        </div>
                        <div className="sd-grid-2">
                            <div className="sd-card">
                                <h3>Өдрийн борлуулалтын тренд</h3>
                                <div className="sd-desc">Сувгаар задарсан нийт цэвэр орлогын динамик</div>
                                <div className="sd-chart-box tall">
                                    <TrendChart daily={filteredReport.daily} selectedChannel={channelFilter} />
                                </div>
                            </div>
                            <div className="sd-card">
                                <h3>Сувгийн эзлэх хувь</h3>
                                <div className="sd-desc">Нийт орлогын түгэлт</div>
                                <div className="sd-chart-box tall">
                                    <DonutChart channels={filteredReport.channels} />
                                </div>
                            </div>
                        </div>

                        {/* Monthly compare (only when all) */}
                        {monthlyData && monthlyData.length >= 2 && (
                            <>
                                <div className="sd-section-title">
                                    <span className="sd-emoji">📅</span> Сарын харьцуулалт
                                    <span className="sd-period-chip">{getChannelLabel(channelFilter)}</span>
                                </div>
                                <div className="sd-grid-2-eq">
                                    <div className="sd-card">
                                        <h3>Сар бүрийн борлуулалт</h3>
                                        <div className="sd-desc">Нийт цэвэр орлого + өдрийн дундаж</div>
                                        <div className="sd-chart-box">
                                            <MonthlyBarChart monthly={monthlyData} />
                                        </div>
                                    </div>
                                    <div className="sd-card">
                                        <h3>Сар × Суваг</h3>
                                        <div className="sd-desc">Сар бүрд сувгийн задаргаа</div>
                                        <div className="sd-chart-box">
                                            <MonthlyChannelChart monthly={monthlyData} />
                                        </div>
                                    </div>
                                </div>
                                <div className="sd-card" style={{ marginBottom: 16 }}>
                                    <h3>Сарын гол үзүүлэлтүүд</h3>
                                    <div className="sd-desc">Орлого, өдрийн дундаж, өдрийн тоо</div>
                                    <MonthlySummaryTable monthly={monthlyData} />
                                </div>
                            </>
                        )}

                        {/* Product breakdown by month */}
                        {months.length > 1 && (
                            <>
                                <div className="sd-section-title">
                                    <span className="sd-emoji">📋</span> Сар бүрийн бүтээгдэхүүний задаргаа
                                </div>
                                <div className="sd-card">
                                    <ProductBreakdown months={months} reports={allReports} channelFilter={channelFilter} />
                                </div>
                            </>
                        )}

                        {/* Product search */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">🔍</span> Бүтээгдэхүүний шинжилгээ
                        </div>
                        <div className="sd-card">
                            <ProductAnalysis months={months} reports={allReports} channelFilter={channelFilter} />
                        </div>

                        {/* Time patterns */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">🗓️</span> Цаг хугацааны зүй тогтол
                        </div>
                        <div className="sd-card">
                            <h3>Сар бүрийн календар</h3>
                            <div className="sd-desc">Өдөр бүрийн борлуулалтын халуун хүйтэн зураг</div>
                            <MonthCalendars daily={filteredReport.daily} channelFilter={channelFilter} />
                        </div>
                        <div className="sd-grid-2-eq" style={{ marginTop: 16 }}>
                            <div className="sd-card">
                                <h3>Гараг бүрийн дундаж борлуулалт</h3>
                                <div className="sd-desc">Аль гараг хамгийн ашигтай вэ?</div>
                                <WeekdayBars weekday={filteredReport.weekday} />
                            </div>
                            <div className="sd-card">
                                <h3>Топ 15 бүтээгдэхүүн (орлогоор)</h3>
                                <div className="sd-desc">Хамгийн их орлого оруулсан барааны жагсаалт</div>
                                <ProductsTable products={filteredReport.products || []} />
                            </div>
                        </div>

                        {/* Bundle */}
                        {bk && bk.total_bundles_qty > 0 && (
                            <>
                                <div className="sd-section-title">
                                    <span className="sd-emoji">🎁</span> Багцын шинжилгээ
                                </div>
                                <div className="sd-kpi-grid">
                                    <Kpi cls="k5" label="Багцны орлого" value={fmtT(bk.total_bundles_revenue)} sub={`${bk.bundle_share_pct}% нийт орлогын`} />
                                    <Kpi cls="k1" label="Зарагдсан багц" value={`${fmt(bk.total_bundles_qty)} ш`} sub={`${bk.unique_bundles} төрлийн багц`} />
                                    <Kpi cls="k4" label="Дундаж багцын үнэ" value={fmtT(bk.avg_bundle_price)} sub="нэгж багц" />
                                    <Kpi cls="k3" label="Багцны төрөл" value={fmt(bk.unique_bundles)} sub="идэвхтэй SKU" />
                                </div>
                                <div className="sd-grid-2">
                                    <div className="sd-card">
                                        <h3>Топ зарагдсан багцууд</h3>
                                        <div className="sd-desc">Топ 10 багцын жагсаалт</div>
                                        <BundlesTable bundles={filteredReport.bundles || []} />
                                    </div>
                                    <div className="sd-card">
                                        <h3>Багц сувгаар</h3>
                                        <div className="sd-desc">Топ 8 багцын сувгийн задаргаа</div>
                                        <div className="sd-chart-box">
                                            <BundleChannelChart
                                                bundlesByChannel={filteredReport.bundles_by_channel || []}
                                                bundles={filteredReport.bundles || []}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Product family + channel detail + discount */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">📦</span> Бүтээгдэхүүн &amp; Хөнгөлөлт
                        </div>
                        <div className="sd-grid-3">
                            <div className="sd-card">
                                <h3>Бүтээгдэхүүний ангилал</h3>
                                <div className="sd-desc">Брэнд/серийн бүлэг</div>
                                <div className="sd-chart-box">
                                    <FamilyChart families={filteredReport.families || []} />
                                </div>
                            </div>
                            <div className="sd-card">
                                <h3>Сувгийн дэлгэрэнгүй</h3>
                                <div className="sd-desc">Дундаж чек, бараа/чек</div>
                                <ChannelDetailTable channels={filteredReport.channels || []} />
                            </div>
                            <div className="sd-card">
                                <h3>Хөнгөлөлтийн шинжилгээ</h3>
                                <div className="sd-desc">Промо, хямдралын үр нөлөө</div>
                                <DiscountBox kpis={k} />
                            </div>
                        </div>

                        {/* Strategy insights */}
                        <div className="sd-section-title">
                            <span className="sd-emoji">💡</span> Дүгнэлт &amp; Стратеги
                        </div>
                        <div className="sd-card">
                            {topChannel && (
                                <div className="sd-insight">
                                    <b>{topChannel.channel}</b> тэргүүлж байна — нийт орлогын{' '}
                                    <span className="sd-highlight">{((topChannel.sales / (totalFromChannels || 1)) * 100).toFixed(1)}%</span>.
                                </div>
                            )}
                            {topProduct && (
                                <div className="sd-insight">
                                    Топ бараа: <b>{topProduct.product_name.slice(0, 40)}{topProduct.product_name.length > 40 ? '…' : ''}</b> — {fmtT(topProduct.revenue)} ({topProduct.qty} ш).
                                </div>
                            )}
                            {promoFamily && (
                                <div className="sd-insight pink">
                                    <b>Урамшууллын багц</b> орлогын{' '}
                                    <span className="sd-highlight">{((promoFamily.revenue / (k.total_sales || 1)) * 100).toFixed(1)}%</span> бүрдүүлж байна.
                                </div>
                            )}
                            <div className="sd-insight">
                                Дундаж чек {fmtT(k.avg_basket)} — <span className="sd-highlight">cross-sell</span> сайн ({k.avg_items} бараа/чек).
                            </div>
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

function Kpi({ cls, label, value, sub }) {
    return (
        <div className={`sd-kpi ${cls}`}>
            <div className="sd-kpi-label">{label}</div>
            <div className="sd-kpi-value">{value}</div>
            {sub && <div className="sd-kpi-sub">{sub}</div>}
        </div>
    );
}
