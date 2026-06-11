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

ChartJS.defaults.font.family = "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
ChartJS.defaults.color = '#5B504C';
ChartJS.defaults.borderColor = '#F0E4E0';

export const CHANNEL_COLORS = {
    'И-Март (Хан-Уул)': '#6B1839',
    'Шангри-Ла': '#D88FA8',
    'Хүргэлт': '#B5BFA1',
    'УИД салбар': '#D4A574',
    'Pop-up / Expo': '#C9B4D4',
};

export const fmt = (n) => new Intl.NumberFormat('mn-MN').format(Math.round(n));
export const fmtT = (n) => '₮' + fmt(n);
export const fmtShort = (n) => {
    if (n >= 1_000_000) return '₮' + (n / 1_000_000).toFixed(1) + 'М';
    if (n >= 1_000) return '₮' + (n / 1_000).toFixed(0) + 'К';
    return '₮' + fmt(n);
};

const tooltipStyle = {
    backgroundColor: '#2C2C2A',
    titleColor: '#fff',
    bodyColor: '#fff',
    padding: 12,
    borderColor: '#6B1839',
    borderWidth: 1,
    cornerRadius: 8,
    titleFont: { weight: 700 },
};

const gridColor = 'rgba(155, 139, 134, 0.18)';

/* ---------- Trend chart ---------- */
export function TrendChart({ daily, selectedChannel = 'all' }) {
    const { data, options } = useMemo(() => {
        const labels = daily.map((d) => d.date.slice(5));
        const channels = Object.keys(CHANNEL_COLORS).filter((c) =>
            daily.some((d) => (d[c] || 0) > 0)
        );
        let datasets;
        if (selectedChannel === 'all') {
            datasets = channels.map((c) => ({
                label: c,
                data: daily.map((d) => d[c] || 0),
                backgroundColor: CHANNEL_COLORS[c] + '35',
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
                backgroundColor: (CHANNEL_COLORS[selectedChannel] || '#D88FA8') + '40',
                borderColor: CHANNEL_COLORS[selectedChannel] || '#D88FA8',
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
                        grid: { color: gridColor },
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

/* ---------- Donut ---------- */
export function DonutChart({ channels }) {
    const { data, options } = useMemo(() => ({
        data: {
            labels: channels.map((c) => c.channel),
            datasets: [{
                data: channels.map((c) => c.sales),
                backgroundColor: channels.map((c) => CHANNEL_COLORS[c.channel] || '#9B8B86'),
                borderColor: '#FFFFFF',
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

/* ---------- Family horizontal bar ---------- */
export function FamilyChart({ families }) {
    const palette = ['#6B1839', '#D88FA8', '#B5BFA1', '#D4A574', '#C9B4D4', '#A14060', '#A8D4C3', '#EAB4C5'];
    const { data, options } = useMemo(() => {
        const fam = families.slice(0, 8);
        return {
            data: {
                labels: fam.map((f) => f.family),
                datasets: [{
                    label: 'Орлого',
                    data: fam.map((f) => f.revenue),
                    backgroundColor: palette.map((c) => c + 'd0'),
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
                    x: { grid: { color: gridColor }, ticks: { callback: (v) => fmtShort(v) } },
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
    const palette = ['#D88FA8', '#A14060', '#6B1839', '#C9B4D4', '#B5BFA1', '#D4A574', '#A8D4C3', '#EAB4C5'];
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
                    y: { stacked: true, grid: { color: gridColor }, ticks: { callback: (v) => fmtShort(v) } },
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

/* ---------- Monthly compare: bar ---------- */
export function MonthlyBarChart({ monthly }) {
    const { data, options } = useMemo(() => ({
        data: {
            labels: monthly.map((m) => m.label),
            datasets: [
                {
                    type: 'bar',
                    label: 'Нийт орлого',
                    data: monthly.map((m) => m.total),
                    backgroundColor: '#D88FA8c0',
                    borderColor: '#6B1839',
                    borderWidth: 2,
                    borderRadius: 6,
                    yAxisID: 'y',
                },
                {
                    type: 'line',
                    label: 'Өдрийн дундаж',
                    data: monthly.map((m) => m.avgDaily),
                    borderColor: '#7B9168',
                    backgroundColor: '#7B916820',
                    borderWidth: 2.5,
                    tension: 0.3,
                    pointRadius: 4,
                    yAxisID: 'y1',
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: gridColor }, ticks: { callback: (v) => fmtShort(v) }, position: 'left' },
                y1: { grid: { display: false }, ticks: { callback: (v) => fmtShort(v) }, position: 'right' },
                x: { grid: { display: false } },
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true } },
                tooltip: {
                    ...tooltipStyle,
                    callbacks: { label: (c) => c.dataset.label + ': ' + fmtT(c.parsed.y) },
                },
            },
        },
    }), [monthly]);
    return <Bar data={data} options={options} />;
}

/* ---------- Monthly × channel stacked bar ---------- */
export function MonthlyChannelChart({ monthly }) {
    const { data, options } = useMemo(() => {
        const channels = Object.keys(CHANNEL_COLORS);
        const datasets = channels.map((c) => ({
            label: c,
            data: monthly.map((m) => m.channels?.[c] || 0),
            backgroundColor: CHANNEL_COLORS[c] + 'd0',
            borderColor: CHANNEL_COLORS[c],
            borderWidth: 1,
            borderRadius: 4,
        }));
        return {
            data: { labels: monthly.map((m) => m.label), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { stacked: true, grid: { color: gridColor }, ticks: { callback: (v) => fmtShort(v) } },
                    x: { stacked: true, grid: { display: false } },
                },
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } },
                    tooltip: {
                        ...tooltipStyle,
                        callbacks: { label: (c) => c.dataset.label + ': ' + fmtT(c.parsed.y) },
                    },
                },
            },
        };
    }, [monthly]);
    return <Bar data={data} options={options} />;
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
                            <td className="sd-text-dim">{i + 1}</td>
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
                    const color = CHANNEL_COLORS[c.channel] || '#9B8B86';
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
