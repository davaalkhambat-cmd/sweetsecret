import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

ChartJS.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = '#1f2937';

export const CHANNEL_COLORS = {
    'И-Март (Хан-Уул)': '#6366f1',
    'Шангри-Ла': '#ec4899',
    'Хүргэлт': '#10b981',
    'УИД салбар': '#f59e0b',
};

export const fmt = (n) => new Intl.NumberFormat('mn-MN').format(Math.round(n));
export const fmtT = (n) => '₮' + fmt(n);
export const fmtShort = (n) => {
    if (n >= 1_000_000) return '₮' + (n / 1_000_000).toFixed(1) + 'М';
    if (n >= 1_000) return '₮' + (n / 1_000).toFixed(0) + 'К';
    return '₮' + fmt(n);
};

const tooltipStyle = {
    backgroundColor: '#0f172a',
    padding: 12,
    borderColor: '#334155',
    borderWidth: 1,
};

/* ---------- Trend chart (stacked area) ---------- */
export function TrendChart({ daily, selectedChannel = 'all' }) {
    const { data, options } = useMemo(() => {
        const labels = daily.map((d) => d.date.slice(5));
        const channels = Object.keys(CHANNEL_COLORS);
        let datasets;
        if (selectedChannel === 'all') {
            datasets = channels.map((c) => ({
                label: c,
                data: daily.map((d) => d[c] || 0),
                backgroundColor: CHANNEL_COLORS[c] + '40',
                borderColor: CHANNEL_COLORS[c],
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 2,
                pointHoverRadius: 5,
            }));
        } else {
            datasets = [{
                label: selectedChannel,
                data: daily.map((d) => d[selectedChannel] || 0),
                backgroundColor: (CHANNEL_COLORS[selectedChannel] || '#6366f1') + '40',
                borderColor: CHANNEL_COLORS[selectedChannel] || '#6366f1',
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 3,
                pointHoverRadius: 6,
            }];
        }
        return {
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        stacked: selectedChannel === 'all',
                        grid: { color: '#1f2937' },
                        ticks: { callback: (v) => fmtShort(v) },
                    },
                    x: { grid: { display: false } },
                },
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: { label: (c) => c.dataset.label + ': ' + fmtT(c.parsed.y) },
                    },
                },
            },
        };
    }, [daily, selectedChannel]);
    return <Line data={data} options={options} />;
}

/* ---------- Donut (channel share) ---------- */
export function DonutChart({ channels }) {
    const { data, options } = useMemo(() => ({
        data: {
            labels: channels.map((c) => c.channel),
            datasets: [{
                data: channels.map((c) => c.sales),
                backgroundColor: channels.map((c) => CHANNEL_COLORS[c.channel] || '#6b7280'),
                borderColor: '#0b0f17',
                borderWidth: 3,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '62%',
            plugins: {
                legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        label: (c) => {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0);
                            return c.label + ': ' + fmtT(c.parsed) + ' (' + ((c.parsed / total) * 100).toFixed(1) + '%)';
                        },
                    },
                },
            },
        },
    }), [channels]);
    return <Doughnut data={data} options={options} />;
}

/* ---------- Receipts + sales combo ---------- */
export function ReceiptsChart({ receipts }) {
    const { data, options } = useMemo(() => ({
        data: {
            labels: receipts.map((d) => d.date.slice(5)),
            datasets: [
                {
                    type: 'bar',
                    label: 'Чекийн тоо',
                    data: receipts.map((d) => d.receipts),
                    backgroundColor: '#6366f160',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
                },
                {
                    type: 'line',
                    label: 'Орлого (₮)',
                    data: receipts.map((d) => d.sales),
                    borderColor: '#ec4899',
                    backgroundColor: '#ec489920',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 3,
                    yAxisID: 'y1',
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { position: 'left', grid: { color: '#1f2937' }, title: { display: true, text: 'Чек', color: '#6366f1' }, beginAtZero: true },
                y1: { position: 'right', grid: { display: false }, title: { display: true, text: 'Орлого', color: '#ec4899' }, ticks: { callback: (v) => fmtShort(v) } },
                x: { grid: { display: false } },
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true } },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        label: (c) => c.dataset.label === 'Орлого (₮)' ? fmtT(c.parsed.y) : c.parsed.y + ' чек',
                    },
                },
            },
        },
    }), [receipts]);
    return <Bar data={data} options={options} />;
}

/* ---------- Channel bar ---------- */
export function ChannelBarChart({ channels }) {
    const { data, options } = useMemo(() => ({
        data: {
            labels: channels.map((c) => c.channel),
            datasets: [{
                label: 'Цэвэр борлуулалт',
                data: channels.map((c) => c.sales),
                backgroundColor: channels.map((c) => (CHANNEL_COLORS[c.channel] || '#6b7280') + 'c0'),
                borderColor: channels.map((c) => CHANNEL_COLORS[c.channel] || '#6b7280'),
                borderWidth: 2,
                borderRadius: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: '#1f2937' }, ticks: { callback: (v) => fmtShort(v) } },
                x: { grid: { display: false } },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: {
                        label: (c) => fmtT(c.parsed.y),
                        afterLabel: (c) => {
                            const ch = channels[c.dataIndex];
                            return [
                                'Үйлчлүүлэгч: ' + ch.receipts,
                                'Бараа: ' + ch.qty + ' ш',
                                'Дундаж чек: ' + fmtT(ch.avg_basket),
                            ];
                        },
                    },
                },
            },
        },
    }), [channels]);
    return <Bar data={data} options={options} />;
}

/* ---------- Weekday chart ---------- */
export function WeekdayChart({ weekday }) {
    const { data, options } = useMemo(() => {
        const wd = [...weekday].sort((a, b) => a.weekday_num - b.weekday_num);
        const maxAvg = Math.max(...wd.map((w) => w.avg_sales_per_day || 0), 1);
        return {
            data: {
                labels: wd.map((w) => w.weekday_mn),
                datasets: [{
                    label: 'Өдрийн дундаж орлого',
                    data: wd.map((w) => w.avg_sales_per_day),
                    backgroundColor: wd.map((w) => {
                        const ratio = (w.avg_sales_per_day || 0) / maxAvg;
                        return `rgba(139, 92, 246, ${0.3 + ratio * 0.6})`;
                    }),
                    borderColor: '#a78bfa',
                    borderWidth: 1,
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: '#1f2937' }, ticks: { callback: (v) => fmtShort(v) } },
                    x: { grid: { display: false } },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (c) => 'Дундаж: ' + fmtT(c.parsed.y),
                            afterLabel: (c) => wd[c.dataIndex].n_days + ' өдрийн дундаж',
                        },
                    },
                },
            },
        };
    }, [weekday]);
    return <Bar data={data} options={options} />;
}

/* ---------- Family horizontal bar ---------- */
export function FamilyChart({ families }) {
    const palette = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];
    const { data, options } = useMemo(() => {
        const fam = families.slice(0, 8);
        return {
            data: {
                labels: fam.map((f) => f.family),
                datasets: [{
                    label: 'Орлого',
                    data: fam.map((f) => f.revenue),
                    backgroundColor: palette.map((c) => c + 'c0'),
                    borderColor: palette,
                    borderWidth: 2,
                    borderRadius: 6,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: '#1f2937' }, ticks: { callback: (v) => fmtShort(v) } },
                    y: { grid: { display: false } },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                            label: (c) => fmtT(c.parsed.x),
                            afterLabel: (c) => fam[c.dataIndex].qty + ' ш борлуулсан',
                        },
                    },
                },
            },
        };
    }, [families]);
    return <Bar data={data} options={options} />;
}

/* ---------- Bundles by channel stacked bar ---------- */
export function BundleChannelChart({ bundlesByChannel, bundles }) {
    const palette = ['#ec4899', '#f472b6', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981'];
    const { data, options } = useMemo(() => {
        const topBundles = bundles.slice(0, 8).map((b) => b.product_name);
        const channels = Object.keys(CHANNEL_COLORS);
        const datasets = topBundles.map((b, i) => ({
            label: b.length > 30 ? b.slice(0, 30) + '…' : b,
            data: channels.map((ch) => {
                const row = bundlesByChannel.find((x) => x.bundle === b && x.channel === ch);
                return row ? row.revenue : 0;
            }),
            backgroundColor: palette[i % palette.length] + 'c0',
            borderColor: palette[i % palette.length],
            borderWidth: 1,
            borderRadius: 4,
        }));
        return {
            data: { labels: channels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { stacked: true, grid: { color: '#1f2937' }, ticks: { callback: (v) => fmtShort(v) } },
                    x: { stacked: true, grid: { display: false } },
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: { label: (c) => c.dataset.label + ': ' + fmtT(c.parsed.y) },
                    },
                },
            },
        };
    }, [bundlesByChannel, bundles]);
    return <Bar data={data} options={options} />;
}

/* ---------- Weekday heatmap (legacy, хэрэглэгдэхгүй) ---------- */
export function Heatmap({ heatmap }) {
    const days = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
    const channels = Object.keys(CHANNEL_COLORS);
    const max = Math.max(...heatmap.map((h) => h.sales), 1);
    return (
        <div className="sd-heatmap">
            <div className="sd-heat-row">
                <div />
                {days.map((d) => <div key={d} className="sd-heat-header">{d}</div>)}
            </div>
            {channels.map((ch) => (
                <div key={ch} className="sd-heat-row">
                    <div className="sd-heat-label">{ch.length > 10 ? ch.slice(0, 10) + '…' : ch}</div>
                    {Array.from({ length: 7 }).map((_, i) => {
                        const cell = heatmap.find((h) => h.channel === ch && h.weekday_num === i);
                        const val = cell ? cell.sales : 0;
                        const intensity = val / max;
                        const bg = `rgba(139, 92, 246, ${0.1 + intensity * 0.75})`;
                        return (
                            <div
                                key={i}
                                className="sd-heat-cell"
                                style={{ background: bg }}
                                title={`${ch} · ${days[i]}: ${fmtT(val)}`}
                            >
                                {val > 0 ? fmtShort(val) : '-'}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

/* ---------- Date heatmap (reference-тэй ижил) ---------- */

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function formatHeatNumber(val) {
    if (!val) return '–';
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'М';
    if (val >= 1_000) return Math.round(val / 1_000) + 'К';
    return String(Math.round(val));
}

/**
 * Огноо × суваг дулааны зураг. `daily` нь [{ date, [channel]: sales, ... }]
 * хэлбэртэй. `selectedChannel` бол 'all' эсвэл нэг суваг — сүүлчийнхийг
 * сонгоход зөвхөн тухайн суваг харагдана.
 */
export function DateHeatmap({ daily, selectedChannel = 'all' }) {
    if (!daily || daily.length === 0) {
        return <div style={{ padding: 20, color: '#64748b', textAlign: 'center' }}>Өгөгдөл алга</div>;
    }
    const dates = daily.map((d) => d.date);
    const channels = selectedChannel === 'all'
        ? Object.keys(CHANNEL_COLORS)
        : [selectedChannel];

    // Max cell value for color scaling
    let max = 1;
    for (const d of daily) {
        for (const c of channels) {
            if ((d[c] || 0) > max) max = d[c] || 0;
        }
    }

    // Row totals + daily totals + grand total
    const rowTotals = {};
    const dayTotals = dates.map(() => 0);
    channels.forEach((c) => { rowTotals[c] = 0; });
    daily.forEach((d, i) => {
        channels.forEach((c) => {
            const v = d[c] || 0;
            rowTotals[c] += v;
            dayTotals[i] += v;
        });
    });
    const maxDayTotal = Math.max(...dayTotals, 1);
    const grandTotal = dayTotals.reduce((s, v) => s + v, 0);

    return (
        <div className="sd-heat-date-wrap">
            <table className="sd-hm-table">
                <thead>
                    <tr>
                        <th className="sd-hm-row-label"></th>
                        {dates.map((d) => (
                            <th key={d}>{d.slice(5).replace('-', '/')}</th>
                        ))}
                        <th className="sd-hm-total-label">Нийт</th>
                    </tr>
                </thead>
                <tbody>
                    {channels.map((ch) => {
                        const color = CHANNEL_COLORS[ch] || '#8b5cf6';
                        const rgb = hexToRgb(color);
                        return (
                            <tr key={ch}>
                                <th className="sd-hm-row-label">{ch}</th>
                                {daily.map((d) => {
                                    const v = d[ch] || 0;
                                    const intensity = max > 0 ? v / max : 0;
                                    const bg = v === 0
                                        ? 'rgba(31,41,55,0.3)'
                                        : `rgba(${rgb}, ${0.15 + intensity * 0.8})`;
                                    return (
                                        <td
                                            key={d.date}
                                            className="sd-hm-cell"
                                            style={{ background: bg }}
                                            title={`${ch} · ${d.date}: ${fmtT(v)}`}
                                        >
                                            {formatHeatNumber(v)}
                                        </td>
                                    );
                                })}
                                <td
                                    className="sd-hm-cell sd-hm-row-total"
                                    title={`${ch} нийт: ${fmtT(rowTotals[ch])}`}
                                >
                                    {formatHeatNumber(rowTotals[ch])}
                                </td>
                            </tr>
                        );
                    })}
                    {channels.length > 1 && (
                        <tr className="sd-hm-day-total-row">
                            <th className="sd-hm-row-label sd-hm-day-label">Өдрийн нийт</th>
                            {dayTotals.map((total, i) => {
                                const intensity = maxDayTotal > 0 ? total / maxDayTotal : 0;
                                const bg = `rgba(167, 139, 250, ${0.2 + intensity * 0.7})`;
                                return (
                                    <td
                                        key={dates[i]}
                                        className="sd-hm-cell sd-hm-day-total"
                                        style={{ background: bg }}
                                        title={`${dates[i]} нийт: ${fmtT(total)}`}
                                    >
                                        {formatHeatNumber(total)}
                                    </td>
                                );
                            })}
                            <td
                                className="sd-hm-cell sd-hm-grand-total"
                                title={`Нийт: ${fmtT(grandTotal)}`}
                            >
                                {formatHeatNumber(grandTotal)}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* ---------- Products table ---------- */
export function ProductsTable({ products, limit = 15 }) {
    const top = products.slice(0, limit);
    const max = top[0]?.revenue || 1;
    return (
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
                    const w = (p.revenue / max) * 100;
                    const name = p.product_name.length > 40 ? p.product_name.slice(0, 40) + '…' : p.product_name;
                    return (
                        <tr key={p.product_name}>
                            <td style={{ color: 'var(--sd-text-dim)' }}>{i + 1}</td>
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
    );
}

/* ---------- Bundles table ---------- */
export function BundlesTable({ bundles }) {
    const max = bundles[0]?.revenue || 1;
    return (
        <table className="sd-table">
            <thead>
                <tr>
                    <th>Багц</th>
                    <th className="sd-num">Ш</th>
                    <th className="sd-num">Орлого</th>
                </tr>
            </thead>
            <tbody>
                {bundles.slice(0, 10).map((b) => {
                    const w = (b.revenue / max) * 100;
                    const name = b.product_name.length > 38 ? b.product_name.slice(0, 38) + '…' : b.product_name;
                    return (
                        <tr key={b.product_name}>
                            <td title={b.product_name}>{name}</td>
                            <td className="sd-num">{b.qty}</td>
                            <td className="sd-num sd-bar-cell">
                                <div className="sd-bar-fill bundle" style={{ width: `${w}%` }} />
                                <span className="sd-bar-text">{fmtT(b.revenue)}</span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/* ---------- Channel detail table ---------- */
export function ChannelDetailTable({ channels }) {
    const total = channels.reduce((s, c) => s + c.sales, 0) || 1;
    return (
        <table className="sd-table">
            <thead>
                <tr>
                    <th>Суваг</th>
                    <th className="sd-num">Дундаж чек</th>
                    <th className="sd-num">Ш/чек</th>
                    <th className="sd-num">Хувь</th>
                </tr>
            </thead>
            <tbody>
                {channels.map((c) => {
                    const color = CHANNEL_COLORS[c.channel] || '#6b7280';
                    const pct = (c.sales / total) * 100;
                    return (
                        <tr key={c.channel}>
                            <td>
                                <span className="sd-badge" style={{ background: color + '30', color }}>
                                    {c.channel}
                                </span>
                            </td>
                            <td className="sd-num">{fmtT(c.avg_basket)}</td>
                            <td className="sd-num">{c.items_per_basket}</td>
                            <td className="sd-num">{pct.toFixed(1)}%</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
