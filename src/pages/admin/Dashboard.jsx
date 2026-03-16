import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    CalendarRange,
    ChartNoAxesColumn,
    CheckCircle2,
    CloudMoon,
    CloudRain,
    CloudSnow,
    CloudSun,
    CircleDollarSign,
    Clock3,
    MoonStar,
    PencilLine,
    MapPinned,
    RotateCcw,
    RefreshCcw,
    Save,
    ShoppingBag,
    Sun,
    Target,
    TimerReset,
    Truck,
    Users,
    XCircle,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_CENTER = [47.9184, 106.9177];
const RANGE_OPTIONS = [1, 7, 30];
const WEEK_DAY_LABELS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const MONTH_NAMES = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];
const MOTIVATION_QUOTES = [
    'Өнөөдрийн сахилга бат маргаашийн өсөлтийг бүтээнэ.',
    'Жижиг сайжруулалтууд тогтвортой хийгдвэл том үр дүн гардаг.',
    'Хэмжигддэг зүйлс илүү хурдан сайжирдаг.',
    'Шийдвэр гаргах хурд сайн мэдээллээс эхэлдэг.',
    'Өнөөдрийн зөв фокус багийн маргаашийн ачааллыг бууруулна.',
    'Тодорхой зорилттай өдөр илүү ашигтай дуусдаг.',
];
const DEFAULT_WEATHER_COORDS = { latitude: 47.9184, longitude: 106.9177, label: 'Улаанбаатар' };

const deliveryMarkerIcon = divIcon({
    className: 'delivery-marker-wrap',
    html: '<span class="delivery-dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
});

const toMs = (timestamp) => {
    if (!timestamp) return 0;
    if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (typeof timestamp === 'number') return timestamp;
    return 0;
};

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const toItems = (rawItems) => {
    if (!Array.isArray(rawItems)) return [];
    return rawItems.map((item) => ({
        productId: String(item?.productId || item?.id || item?.sku || item?.name || ''),
        name: String(item?.name || ''),
        quantity: Math.max(1, toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1)),
        lineAmount: toNumber(item?.lineAmount ?? item?.subtotal ?? item?.price) * Math.max(1, toNumber(item?.quantity ?? item?.qty ?? item?.count ?? 1)),
    }));
};

const extractBranchName = (data) =>
    String(
        data?.branchName ||
            data?.branch ||
            data?.storeName ||
            data?.store ||
            data?.locationName ||
            data?.location ||
            data?.salbar ||
            'Салбар'
    ).trim();

const normalizeCommerceChannel = (value, isDelivery = false) => {
    if (isDelivery) return 'Хүргэлт';
    const normalized = String(value || '').toLowerCase();
    if (normalized.includes('shangri') || normalized.includes('шан') || normalized.includes('шангри')) {
        return 'Шангри-Ла';
    }
    if (normalized.includes('хан') || normalized.includes('han') || normalized.includes('khan')) {
        return 'Хан-Уул';
    }
    if (normalized.includes('их') || normalized.includes('department') || normalized.includes('delguur') || normalized.includes('дэлгүүр')) {
        return 'Их дэлгүүр';
    }
    return 'Их дэлгүүр';
};

const getPoint = (candidate) => {
    if (!candidate) return null;
    if (Array.isArray(candidate) && candidate.length >= 2) {
        const lat = Number(candidate[0]);
        const lng = Number(candidate[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
    if (typeof candidate === 'object') {
        const lat = Number(candidate.lat ?? candidate.latitude ?? candidate._lat);
        const lng = Number(candidate.lng ?? candidate.lon ?? candidate.longitude ?? candidate._long);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    }
    return null;
};

const extractCoordinates = (data) => {
    const candidates = [
        data?.location,
        data?.coordinates,
        data?.geo,
        data?.deliveryLocation,
        data?.destination,
        data?.shippingAddress?.location,
        data?.shippingAddress?.coordinates,
        data?.shippingAddress?.geo,
        data?.address?.location,
        data?.address?.coordinates,
        data?.address?.geo,
        { lat: data?.lat, lng: data?.lng },
        { lat: data?.latitude, lng: data?.longitude },
    ];

    for (const candidate of candidates) {
        const point = getPoint(candidate);
        if (point) return point;
    }

    return null;
};

const extractDistrict = (data) =>
    String(
        data?.address?.district ||
            data?.shippingAddress?.district ||
            data?.district ||
            data?.region ||
            ''
    ).trim();

const extractAddress = (data) =>
    data?.deliveryAddress ||
    data?.shippingAddress?.fullAddress ||
    data?.shippingAddress?.addressLine ||
    data?.shippingAddress?.text ||
    data?.address?.fullAddress ||
    data?.address?.text ||
    '';

const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;
const formatPercent = (value) => `${(Number(value) || 0) >= 0 ? '+' : ''}${(Number(value) || 0).toFixed(1)}%`;
const formatRate = (value) => `${(Number(value) || 0).toFixed(1)}%`;
const formatCompactMoney = (value) => {
    const numeric = Math.round(value || 0);
    if (numeric >= 1000000) return `₮${(numeric / 1000000).toFixed(1)}M`;
    if (numeric >= 1000) return `₮${Math.round(numeric / 1000)}k`;
    return `₮${numeric}`;
};
const formatMonthLabel = (date) => MONTH_NAMES[date.getMonth()];
const formatMonthPossessive = (date) => `${date.getMonth() + 1}-р сарын`;
const formatShortDate = (date) =>
    `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
const formatPaymentLabel = (value) => {
    const normalized = String(value || '').toLowerCase();
    const labels = {
        bank_transfer: 'Данс',
        qpay: 'QPay',
        storepay: 'Storepay',
        pocket: 'Pocket',
        sono: 'Sono',
        monpay: 'Monpay',
        cash: 'Бэлэн',
        cod: 'Хүргэлт дээр',
    };
    return labels[normalized] || (value ? String(value) : 'Тодорхойгүй');
};
const formatDuration = (minutes) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '-';
    if (minutes < 60) return `${Math.round(minutes)} мин`;
    const hours = Math.floor(minutes / 60);
    const remainMinutes = Math.round(minutes % 60);
    return remainMinutes ? `${hours}ц ${remainMinutes}м` : `${hours}ц`;
};

const getGrowth = (current, previous) => {
    if (previous <= 0) return current <= 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
};

const safeDivide = (numerator, denominator) => (denominator > 0 ? numerator / denominator : 0);

const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseInputDate = (value, endOfDay = false) => {
    if (!value) return 0;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return 0;
    return endOfDay
        ? new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
        : new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
};

const getGreetingMeta = (date) => {
    const hour = date.getHours();
    const month = date.getMonth();

    if (hour >= 5 && hour < 11) {
        return {
            greeting: 'Өглөөний мэнд ☀️',
            caption: 'Өдрийг тайван эхлүүлээд гол тоонуудаа нэг дороос хар.',
            Icon: month >= 10 || month <= 1 ? CloudSnow : CloudSun,
            accent: 'sunrise',
            emoji: '🌤️',
        };
    }

    if (hour >= 11 && hour < 17) {
        return {
            greeting: 'Өдрийн мэнд 🌈',
            caption: 'Ид ачааллын цагаар гүйцэтгэл, орлого, төлөвлөгөөгөө хяна.',
            Icon: month >= 5 && month <= 7 ? Sun : CloudSun,
            accent: 'day',
            emoji: '🌞',
        };
    }

    if (hour >= 17 && hour < 21) {
        return {
            greeting: 'Оройн мэнд 🌇',
            caption: 'Өдрийн үр дүнг нэгтгээд дараагийн шийдвэрээ тодорхойл.',
            Icon: month >= 2 && month <= 4 ? CloudRain : CloudMoon,
            accent: 'evening',
            emoji: '🌆',
        };
    }

    return {
        greeting: 'Оройн амар амгалан 🌙',
        caption: 'Шөнийн нам гүмд маргаашийн төлөвлөгөөгөө цэгцэл.',
        Icon: MoonStar,
        accent: 'night',
        emoji: '✨',
    };
};

const RevenueTrendChart = ({ points, currentLabel, previousLabel, comparisonSummary }) => {
    const [activeIndex, setActiveIndex] = useState(points.length ? points.length - 1 : 0);

    if (!points.length) {
        return <p className="empty-state-text">Трендийн өгөгдөл алга байна.</p>;
    }

    const safeIndex = Math.min(activeIndex, points.length - 1);
    const activePoint = points[safeIndex];
    const chartWidth = 760;
    const chartHeight = 280;
    const padding = { top: 22, right: 18, bottom: 42, left: 50 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const maxValue = Math.max(
        ...points.flatMap((point) => [point.currentValue, point.previousValue]),
        1
    );
    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
    const yFor = (value) => padding.top + innerHeight - (value / maxValue) * innerHeight;
    const xFor = (index) => padding.left + stepX * index;

    const currentLine = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.currentValue)}`)
        .join(' ');
    const previousLine = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(point.previousValue)}`)
        .join(' ');
    const currentArea = `${currentLine} L ${xFor(points.length - 1)} ${padding.top + innerHeight} L ${xFor(0)} ${padding.top + innerHeight} Z`;
    const gridLines = 5;
    const activeX = xFor(safeIndex);
    const activeY = yFor(activePoint.currentValue);

    return (
        <div className="trend-chart-card">
            <div className="trend-chart-header">
                <div>
                    <h3>Тухайн сарын борлуулалтын тренд</h3>
                    <p>{currentLabel} ба {previousLabel} харьцуулалт</p>
                </div>
                <div className="trend-chart-legend">
                    <span><i className="current" />{currentLabel}</span>
                    <span><i className="previous" />{previousLabel}</span>
                </div>
            </div>

            <div className="trend-chart-shell">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="trend-chart-svg" role="img">
                    <defs>
                        <linearGradient id="trendAreaGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(244, 63, 94, 0.35)" />
                            <stop offset="100%" stopColor="rgba(244, 63, 94, 0)" />
                        </linearGradient>
                    </defs>

                    {Array.from({ length: gridLines }, (_, index) => {
                        const y = padding.top + (innerHeight / (gridLines - 1)) * index;
                        const value = Math.round(maxValue - (maxValue / (gridLines - 1)) * index);
                        return (
                            <g key={`grid-${index}`}>
                                <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="trend-grid-line" />
                                <text x={padding.left - 10} y={y + 4} textAnchor="end" className="trend-axis-text">
                                    {formatCompactMoney(value)}
                                </text>
                            </g>
                        );
                    })}

                    <path d={currentArea} fill="url(#trendAreaGradient)" />
                    <path d={previousLine} className="trend-line previous" />
                    <path d={currentLine} className="trend-line current" />

                    {points.map((point, index) => {
                        const barWidth = Math.max(10, innerWidth / Math.max(points.length * 2.5, 12));
                        const x = xFor(index) - barWidth / 2;
                        const y = yFor(point.currentValue);
                        const height = padding.top + innerHeight - y;
                        return (
                            <g key={point.label}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(height, 6)}
                                    rx="8"
                                    className={`trend-bar ${safeIndex === index ? 'active' : ''}`}
                                    onClick={() => setActiveIndex(index)}
                                />
                                <circle
                                    cx={xFor(index)}
                                    cy={yFor(point.currentValue)}
                                    r={safeIndex === index ? 6 : 4}
                                    className="trend-point"
                                    onClick={() => setActiveIndex(index)}
                                />
                                <text x={xFor(index)} y={chartHeight - 14} textAnchor="middle" className="trend-axis-text">
                                    {point.label}
                                </text>
                            </g>
                        );
                    })}

                    <line x1={activeX} x2={activeX} y1={padding.top} y2={padding.top + innerHeight} className="trend-active-line" />
                    <circle cx={activeX} cy={activeY} r="7" className="trend-point-active" />
                </svg>

                <div
                    className="trend-chart-tooltip"
                    style={{
                        left: `${Math.min(72, Math.max(12, (safeIndex / Math.max(points.length - 1, 1)) * 100))}%`,
                    }}
                >
                    <small>{activePoint.fullLabel}</small>
                    <strong>{formatMoney(activePoint.currentValue)}</strong>
                    <span>{currentLabel}</span>
                    <div className="trend-tooltip-divider" />
                    <strong>{formatMoney(activePoint.previousValue)}</strong>
                    <span>{previousLabel}</span>
                    <div className={`trend-tooltip-delta ${activePoint.delta >= 0 ? 'up' : 'down'}`}>
                        {formatPercent(activePoint.delta)}
                    </div>
                </div>
            </div>

            {comparisonSummary?.length ? (
                <div className="trend-summary-grid">
                    {comparisonSummary.map((item) => (
                        <div key={item.label} className="trend-summary-card">
                            <div className="trend-summary-head">
                                <span>{item.label}</span>
                                <div className={`trend-summary-delta ${item.delta >= 0 ? 'up' : 'down'}`}>
                                    {formatPercent(item.delta)}
                                </div>
                            </div>
                            <div className="trend-summary-values">
                                <div className="trend-summary-value-block current">
                                    <small>{currentLabel}</small>
                                    <strong>{item.currentFormatted}</strong>
                                </div>
                                <div className="trend-summary-value-block previous">
                                    <small>{previousLabel}</small>
                                    <strong>{item.previousFormatted}</strong>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

const VisitDeliveryComparisonChart = ({ points }) => {
    if (!points.length) {
        return <p className="empty-state-text">Хандалтын хугацааны өгөгдөл алга байна.</p>;
    }

    const chartWidth = 520;
    const chartHeight = 150;
    const padding = { top: 18, right: 34, bottom: 30, left: 34 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const maxVisits = Math.max(...points.map((point) => point.visits), 1);
    const maxDeliveries = Math.max(...points.map((point) => point.deliveries), 1);
    const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;
    const barWidth = Math.max(10, innerWidth / Math.max(points.length * 1.8, 10));
    const xFor = (index) => padding.left + stepX * index;
    const visitYFor = (value) => padding.top + innerHeight - (value / maxVisits) * innerHeight;
    const deliveryYFor = (value) => padding.top + innerHeight - (value / maxDeliveries) * innerHeight;
    const deliveryLine = points
        .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${deliveryYFor(point.deliveries)}`)
        .join(' ');

    return (
        <div className="visit-chart-shell">
            <div className="visit-axis-label left">Хандалт</div>
            <div className="visit-axis-label right">Хүргэлт</div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="visit-chart-svg" role="img">
                {Array.from({ length: 4 }, (_, index) => {
                    const y = padding.top + (innerHeight / 3) * index;
                    const visitValue = Math.round(maxVisits - (maxVisits / 3) * index);
                    const deliveryValue = Math.round(maxDeliveries - (maxDeliveries / 3) * index);
                    return (
                        <g key={`visit-grid-${index}`}>
                            <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="visit-grid-line" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" className="visit-axis-text">
                                {visitValue}
                            </text>
                            <text x={chartWidth - padding.right + 10} y={y + 4} textAnchor="start" className="visit-axis-text right">
                                {deliveryValue}
                            </text>
                        </g>
                    );
                })}

                {points.map((point, index) => {
                    const x = xFor(index) - barWidth / 2;
                    const y = visitYFor(point.visits);
                    const height = padding.top + innerHeight - y;
                    return (
                        <g key={`visit-bar-${point.key}`}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={Math.max(height, 4)}
                                rx="8"
                                className="visit-chart-bar"
                            />
                            <text x={xFor(index)} y={chartHeight - 14} textAnchor="middle" className="visit-axis-text x">
                                {point.shortLabel}
                            </text>
                        </g>
                    );
                })}

                <path d={deliveryLine} className="visit-chart-line" />
                {points.map((point, index) => (
                    <circle
                        key={`visit-point-${point.key}`}
                        cx={xFor(index)}
                        cy={deliveryYFor(point.deliveries)}
                        r="4"
                        className="visit-chart-point"
                    />
                ))}
            </svg>
        </div>
    );
};

const ProductBreakdownChart = ({
    title,
    subtitle,
    products,
    metricKey,
    totalLabel,
    formatter,
}) => {
    const [expandedProductId, setExpandedProductId] = useState('');

    if (!products.length) {
        return <p className="empty-state-text">Бүтээгдэхүүний өгөгдөл алга байна.</p>;
    }

    const totalValue = products.reduce((sum, product) => sum + product[metricKey], 0);
    const palette = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#f97316', '#64748b'];
    const segments = products.map((product, index) => {
        const previous = products
            .slice(0, index)
            .reduce((sum, current) => sum + (totalValue ? (current[metricKey] / totalValue) * 100 : 0), 0);
        const current = totalValue ? (product[metricKey] / totalValue) * 100 : 0;
        return {
            ...product,
            color: palette[index % palette.length],
            start: previous,
            end: previous + current,
            share: current,
        };
    });

    return (
        <div className="product-mini-card">
            <div className="trend-chart-header">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
            </div>
            <div className="product-pie-layout">
                <div className="product-pie-wrap">
                    <div
                        className="product-pie-chart"
                        style={{
                            background: `conic-gradient(${segments
                                .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
                                .join(', ')})`,
                        }}
                    >
                        <div className="product-pie-center">
                            <span>{totalLabel}</span>
                            <strong>{formatter(totalValue)}</strong>
                        </div>
                    </div>
                </div>
                <div className="product-pie-legend">
                    {segments.map((product, index) => (
                        <div key={`${product.id}-${index}-${metricKey}`} className="product-pie-row">
                            <div className="product-pie-label">
                                <span className="product-pie-dot" style={{ background: product.color }} />
                                <div className="product-pie-thumb">
                                    {product.image ? (
                                        <img src={product.image} alt={product.name} />
                                    ) : (
                                        <span>{product.name.slice(0, 1)}</span>
                                    )}
                                </div>
                                <div className="product-pie-text">
                                    <button
                                        type="button"
                                        className="product-name-toggle"
                                        onClick={() =>
                                            setExpandedProductId((prev) =>
                                                prev === `${product.id}-${metricKey}` ? '' : `${product.id}-${metricKey}`
                                            )
                                        }
                                    >
                                        {product.name}
                                    </button>
                                    {expandedProductId === `${product.id}-${metricKey}` ? (
                                        <div className="product-name-popover">{product.name}</div>
                                    ) : null}
                                    <small>{product.soldQty} ш</small>
                                </div>
                            </div>
                            <div className="product-pie-values">
                                <strong>{formatter(product[metricKey])}</strong>
                                <span>{formatRate(product.share)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ProductBreakdownPanel = ({
    products,
    fromDate,
    toDate,
    onFromChange,
    onToChange,
    onEnableCustomRange,
}) => (
    <div className="product-pie-card">
        <div className="trend-chart-header">
            <div>
                <h3>Top 10 бүтээгдэхүүн</h3>
                <p>Үнийн дүн болон тоо ширхэгээр зэрэг харьцуулна</p>
            </div>
            <div className="product-filter-bar">
                <div className="product-filter-title">
                    <CalendarRange size={16} />
                    <span>Огноо сонгох</span>
                </div>
                <label className="product-filter-field">
                    <small>Эхлэх огноо</small>
                    <input
                        className="dashboard-date-input product-filter-input"
                        type="date"
                        value={fromDate}
                        onFocus={onEnableCustomRange}
                        onChange={(event) => {
                            onEnableCustomRange();
                            onFromChange(event.target.value);
                        }}
                    />
                </label>
                <label className="product-filter-field">
                    <small>Дуусах огноо</small>
                    <input
                        className="dashboard-date-input product-filter-input"
                        type="date"
                        value={toDate}
                        onFocus={onEnableCustomRange}
                        onChange={(event) => {
                            onEnableCustomRange();
                            onToChange(event.target.value);
                        }}
                    />
                </label>
            </div>
        </div>
        <div className="product-breakdown-grid">
            <ProductBreakdownChart
                title="Үнийн дүнгээр"
                subtitle="Revenue contribution"
                products={products}
                metricKey="revenue"
                totalLabel="Нийт дүн"
                formatter={formatMoney}
            />
            <ProductBreakdownChart
                title="Тоо ширхэгээр"
                subtitle="Unit contribution"
                products={products}
                metricKey="soldQty"
                totalLabel="Нийт ширхэг"
                formatter={(value) => `${value} ш`}
            />
        </div>
    </div>
);

const getPlanStorageKey = (mode, selectedMonthValue, fromDate, toDate, nowDate) => {
    if (mode === 'specific_month' && selectedMonthValue) {
        return `month:${selectedMonthValue}`;
    }
    if (mode === 'custom_range') {
        return `range:${fromDate || toInputDate(new Date(nowDate.getFullYear(), nowDate.getMonth(), 1))}:${toDate || toInputDate(nowDate)}`;
    }
    return `month:${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
};

const getPlanRecord = (planTargets, key) => {
    const raw = planTargets?.[key];
    if (!raw) return { value: 0, savedAt: '' };
    if (typeof raw === 'object') {
        return {
            value: toNumber(raw.value),
            savedAt: String(raw.savedAt || ''),
        };
    }
    return {
        value: toNumber(raw),
        savedAt: '',
    };
};

const getVisitStorageKey = (date) =>
    `day:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getVisitStorageKeyFromInput = (value) => {
    const parsed = parseInputDate(value, false);
    return parsed ? getVisitStorageKey(new Date(parsed)) : getVisitStorageKey(new Date());
};

const getVisitRecord = (visitTargets, key) => {
    const raw = visitTargets?.[key];
    if (!raw) return { value: 0, savedAt: '' };
    if (typeof raw === 'object') {
        return {
            value: toNumber(raw.value),
            savedAt: String(raw.savedAt || ''),
        };
    }
    return {
        value: toNumber(raw),
        savedAt: '',
    };
};

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

const getDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const getDisplayUserName = (userProfile, user) => {
    const directName = String(userProfile?.displayName || user?.displayName || '').trim();
    if (directName) return directName.split(/\s+/)[0];
    const emailName = String(userProfile?.email || user?.email || '')
        .split('@')[0]
        ?.trim();
    return emailName ? emailName.split(/[._-]/)[0] : 'Хэрэглэгч';
};

const getWeatherVisualMeta = (code, isDay) => {
    if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Цастай', Icon: CloudSnow };
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Бороотой', Icon: CloudRain };
    if ([1, 2, 3, 45, 48].includes(code)) return { label: 'Үүлэрхэг', Icon: isDay ? CloudSun : CloudMoon };
    if ([95, 96, 99].includes(code)) return { label: 'Аянгатай', Icon: CloudRain };
    return { label: isDay ? 'Нартай' : 'Цэлмэг', Icon: isDay ? Sun : MoonStar };
};

const getClothingAdvice = ({ temperature, precipitation, weatherCode }) => {
    if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
        return 'Цастай өдөр байна, зузаан хүрэм өмсөөд халтиргаатай шүү гэж өөртөө сануулаарай.';
    }
    if (precipitation > 0 || [61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
        return 'Норно шүү, шүхэр эсвэл юүдэнтэй хүрэм авч гараад гутлаа уснаас хамгаалаарай.';
    }
    if (temperature <= -10) {
        return 'Жавартай байна, ороолт бээлий хоёроо өнжөөх өдөр биш байна.';
    }
    if (temperature <= 5) {
        return 'Сэрүүхэн өдөр тул давхарлаж хувцаслаад халуун кофео мартаж болохгүй.';
    }
    if (temperature >= 25) {
        return 'Дулаахан өдөр байна, хөнгөн хувцаслаад ус сайн уугаарай.';
    }
    return 'Тогтуун өдөр байна, нимгэн гадуур хувцастай гарахад яг тохирно.';
};

const normalizeStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['completed', 'paid', 'delivered', 'fulfilled', 'хүргэгдсэн'].includes(normalized)) return 'completed';
    if (['cancelled', 'canceled', 'цуцлагдсан'].includes(normalized)) return 'cancelled';
    if (['returned', 'return', 'refund', 'буцаалт', 'буцаагдсан'].includes(normalized)) return 'returned';
    if (['shipped', 'in-transit', 'хүргэлтэнд'].includes(normalized)) return 'shipped';
    if (['processing', 'packed', 'баталгаажсан'].includes(normalized)) return 'processing';
    return 'pending';
};

const getOutcomeTimestamp = (data) =>
    toMs(
        data?.deliveredAt ||
            data?.completedAt ||
            data?.fulfilledAt ||
            data?.updatedAt
    );

const Dashboard = ({ variant = 'delivery' }) => {
    const { user, userProfile } = useAuth();
    const now = Date.now();
    const todayDate = new Date(now);
    const isCommerce = variant === 'commerce';
    const [orders, setOrders] = useState([]);
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [rangeDays, setRangeDays] = useState(7);
    const [dateFilterMode, setDateFilterMode] = useState('current_month');
    const [selectedMonth, setSelectedMonth] = useState(`${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}`);
    const [customFromDate, setCustomFromDate] = useState(toInputDate(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)));
    const [customToDate, setCustomToDate] = useState(toInputDate(todayDate));
    const [planTargets, setPlanTargets] = useState({});
    const [planDraft, setPlanDraft] = useState('');
    const [isPlanEditorOpen, setIsPlanEditorOpen] = useState(false);
    const [planSaveState, setPlanSaveState] = useState('');
    const [visitTargets, setVisitTargets] = useState({});
    const [visitDraft, setVisitDraft] = useState('');
    const [isVisitEditorOpen, setIsVisitEditorOpen] = useState(false);
    const [visitSaveState, setVisitSaveState] = useState('');
    const [visitRangePreset, setVisitRangePreset] = useState('14');
    const [visitFromDate, setVisitFromDate] = useState(toInputDate(new Date(todayDate.getTime() - 13 * 24 * 60 * 60 * 1000)));
    const [visitToDate, setVisitToDate] = useState(toInputDate(todayDate));
    const [visitInputDate, setVisitInputDate] = useState(toInputDate(todayDate));
    const [adviceRefreshSeed, setAdviceRefreshSeed] = useState(0);
    const [weatherInfo, setWeatherInfo] = useState({
        temperature: null,
        apparentTemperature: null,
        weatherCode: 0,
        precipitation: 0,
        isDay: todayDate.getHours() >= 6 && todayDate.getHours() < 18,
        locationLabel: DEFAULT_WEATHER_COORDS.label,
    });

    const activePlanKey = useMemo(
        () => getPlanStorageKey(dateFilterMode, selectedMonth, customFromDate, customToDate, todayDate),
        [customFromDate, customToDate, dateFilterMode, selectedMonth, todayDate]
    );
    const activeVisitKey = useMemo(() => getVisitStorageKeyFromInput(visitInputDate), [visitInputDate]);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(`${variant}-dashboard-plan-targets`);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                setPlanTargets(parsed);
            }
        } catch (error) {
            console.error('Plan targets read error:', error);
        }
    }, []);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(`${variant}-dashboard-visit-targets`);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object') {
                setVisitTargets(parsed);
            }
        } catch (error) {
            console.error('Visit targets read error:', error);
        }
    }, []);

    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(`${variant}-dashboard-visit-preferences`);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (!parsed || typeof parsed !== 'object') return;
            if (parsed.selectedDate) setVisitInputDate(String(parsed.selectedDate));
            if (parsed.rangePreset) setVisitRangePreset(String(parsed.rangePreset));
            if (parsed.fromDate) setVisitFromDate(String(parsed.fromDate));
            if (parsed.toDate) setVisitToDate(String(parsed.toDate));
        } catch (error) {
            console.error('Visit preferences read error:', error);
        }
    }, [variant]);

    useEffect(() => {
        try {
            window.localStorage.setItem(`${variant}-dashboard-plan-targets`, JSON.stringify(planTargets));
        } catch (error) {
            console.error('Plan targets write error:', error);
        }
    }, [planTargets, variant]);

    useEffect(() => {
        try {
            window.localStorage.setItem(`${variant}-dashboard-visit-targets`, JSON.stringify(visitTargets));
        } catch (error) {
            console.error('Visit targets write error:', error);
        }
    }, [variant, visitTargets]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                `${variant}-dashboard-visit-preferences`,
                JSON.stringify({
                    selectedDate: visitInputDate,
                    rangePreset: visitRangePreset,
                    fromDate: visitFromDate,
                    toDate: visitToDate,
                })
            );
        } catch (error) {
            console.error('Visit preferences write error:', error);
        }
    }, [variant, visitFromDate, visitInputDate, visitRangePreset, visitToDate]);

    const currentPlanRecord = useMemo(
        () => getPlanRecord(planTargets, activePlanKey),
        [activePlanKey, planTargets]
    );
    const currentVisitRecord = useMemo(
        () => getVisitRecord(visitTargets, activeVisitKey),
        [activeVisitKey, visitTargets]
    );
    const currentPlanTarget = currentPlanRecord.value;
    const currentPlanSavedAt = currentPlanRecord.savedAt;
    const currentVisitTarget = currentVisitRecord.value;
    const currentVisitSavedAt = currentVisitRecord.savedAt;

    useEffect(() => {
        setPlanDraft(currentPlanTarget ? String(currentPlanTarget) : '');
        setPlanSaveState('');
        setIsPlanEditorOpen(false);
    }, [activePlanKey, currentPlanTarget]);

    useEffect(() => {
        setVisitDraft(currentVisitTarget ? String(currentVisitTarget) : '');
        setVisitSaveState('');
        setIsVisitEditorOpen(false);
    }, [activeVisitKey, currentVisitTarget]);

    const handleSavePlan = () => {
        setPlanTargets((prev) => ({
            ...prev,
            [activePlanKey]: {
                value: planDraft.replace(/[^\d]/g, ''),
                savedAt: new Date().toISOString(),
            },
        }));
        setPlanSaveState('saved');
        setIsPlanEditorOpen(false);
    };

    const handleCancelPlanEdit = () => {
        setPlanDraft(currentPlanTarget ? String(currentPlanTarget) : '');
        setPlanSaveState('');
        setIsPlanEditorOpen(false);
    };

    const handleSaveVisit = () => {
        setVisitTargets((prev) => ({
            ...prev,
            [activeVisitKey]: {
                value: visitDraft.replace(/[^\d]/g, ''),
                savedAt: new Date().toISOString(),
            },
        }));
        setVisitSaveState('saved');
        setIsVisitEditorOpen(false);
    };

    const handleCancelVisitEdit = () => {
        setVisitDraft(currentVisitTarget ? String(currentVisitTarget) : '');
        setVisitSaveState('');
        setIsVisitEditorOpen(false);
    };

    useEffect(() => {
        const unsubscribers = [
            onSnapshot(
                collection(db, 'orders'),
                (snapshot) => {
                    setOrders(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            const deliveryTypeRaw = String(
                                data.deliveryType || data.shippingMethod || data.fulfillmentType || ''
                            ).toLowerCase();
                            const isPickup =
                                deliveryTypeRaw.includes('pickup') ||
                                deliveryTypeRaw.includes('өөрөө');

                            const createdAtMs = toMs(data.createdAt || data.updatedAt);
                            const outcomeAtMs = getOutcomeTimestamp(data);

                            return {
                                id: docSnap.id,
                                total: toNumber(data.totalAmount ?? data.total ?? data.amount),
                                status: normalizeStatus(data.status),
                                rawStatus: String(data.status || 'pending'),
                                customer: data.customerName || data.userName || data.email || 'Хэрэглэгч',
                                createdAtMs,
                                completedAtMs: outcomeAtMs,
                                items: toItems(data.items),
                                coordinates: extractCoordinates(data),
                                address: extractAddress(data),
                                district: extractDistrict(data),
                                source: String(data.source || ''),
                                paymentMethod: String(data.paymentMethod || ''),
                                deliveryType: String(data.deliveryType || 'delivery'),
                                isDelivery: !isPickup,
                                isPickup,
                            };
                        })
                    );
                    setErrorMessage('');
                },
                (error) => {
                    console.error('Orders snapshot error:', error);
                    setErrorMessage('Dashboard мэдээлэл уншихад алдаа гарлаа.');
                }
            ),
            onSnapshot(
                collection(db, 'sales'),
                (snapshot) => {
                    setSales(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                total: toNumber(data.total ?? data.totalAmount ?? data.amount),
                                status: 'completed',
                                rawStatus: 'completed',
                                customer: data.customerName || 'Walk-in Customer',
                                createdAtMs: toMs(data.createdAt || data.updatedAt),
                                completedAtMs: toMs(data.updatedAt || data.createdAt),
                                items: toItems(data.items),
                                paymentMethod: String(data.paymentMethod || data.payment || 'cash'),
                                branchName: extractBranchName(data),
                                isBranchSale: true,
                            };
                        })
                    );
                },
                (error) => {
                    console.error('Sales snapshot error:', error);
                    if (isCommerce) {
                        setErrorMessage('Салбарын борлуулалтын мэдээлэл уншихад алдаа гарлаа.');
                    }
                }
            ),
            onSnapshot(
                collection(db, 'products'),
                (snapshot) => {
                    setProducts(
                        snapshot.docs.map((docSnap) => ({
                            id: docSnap.id,
                            name: docSnap.data().name || 'Нэргүй бүтээгдэхүүн',
                            image:
                                docSnap.data().image ||
                                docSnap.data().images?.[0] ||
                                '',
                        }))
                    );
                    setLoading(false);
                },
                (error) => {
                    console.error('Products snapshot error:', error);
                    setErrorMessage('Dashboard мэдээлэл уншихад алдаа гарлаа.');
                    setLoading(false);
                }
            ),
        ];

        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, [isCommerce]);

    useEffect(() => {
        let isMounted = true;

        const loadWeather = async (coords = DEFAULT_WEATHER_COORDS) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,is_day,precipitation,weather_code&timezone=auto`
                );
                const payload = await response.json();
                if (!isMounted || !payload?.current) return;
                setWeatherInfo({
                    temperature: Number(payload.current.temperature_2m ?? 0),
                    apparentTemperature: Number(payload.current.apparent_temperature ?? 0),
                    weatherCode: Number(payload.current.weather_code ?? 0),
                    precipitation: Number(payload.current.precipitation ?? 0),
                    isDay: Boolean(payload.current.is_day),
                    locationLabel: coords.label || DEFAULT_WEATHER_COORDS.label,
                });
            } catch (error) {
                console.error('Weather fetch failed:', error);
            }
        };

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    loadWeather({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        label: 'Одоогийн байршил',
                    });
                },
                () => loadWeather(),
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 }
            );
        } else {
            loadWeather();
        }

        return () => {
            isMounted = false;
        };
    }, []);

    const deliveryAnalytics = useMemo(() => {
        const nowDate = new Date(now);
        const dayMs = 24 * 60 * 60 * 1000;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const currentMonthStart = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
        const todayStartMs = startOfToday.getTime();
        const weekStartMs = now - 7 * dayMs;
        const previousWeekStartMs = now - 14 * dayMs;
        const mapRangeStartMs = now - rangeDays * dayMs;
        let selectedStartMs = currentMonthStart.getTime();
        let selectedEndMs = now;
        let comparisonStartMs = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).getTime();
        let comparisonEndMs = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, nowDate.getDate(), 23, 59, 59, 999).getTime();
        let selectedPeriodLabel = `${formatMonthPossessive(nowDate)} 1-${nowDate.getDate()}`;
        let selectedPeriodTitle = isCommerce
            ? `${formatMonthPossessive(nowDate)} үндсэн худалдааны мэдээлэл`
            : `${formatMonthPossessive(nowDate)} борлуулалтын мэдээлэл`;
        let selectedElapsedDays = nowDate.getDate();
        let breakdownDays = nowDate.getDate();
        let selectedMonthDisplay = formatMonthLabel(nowDate);
        let activeFilterLabel = 'Тухайн сар';

        if (dateFilterMode === 'specific_month' && selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
            const previousMonthStart = new Date(year, month - 2, 1);
            const previousMonthEnd = new Date(year, month - 1, 0, 23, 59, 59, 999);
            selectedStartMs = monthStart.getTime();
            selectedEndMs = monthEnd.getTime();
            comparisonStartMs = previousMonthStart.getTime();
            comparisonEndMs = previousMonthEnd.getTime();
            selectedPeriodLabel = `${month}-р сарын 1-${new Date(year, month, 0).getDate()}`;
            selectedPeriodTitle = isCommerce
                ? `${month}-р сарын үндсэн худалдааны мэдээлэл`
                : `${month}-р сарын борлуулалтын мэдээлэл`;
            selectedElapsedDays = new Date(year, month, 0).getDate();
            breakdownDays = selectedElapsedDays;
            selectedMonthDisplay = MONTH_NAMES[month - 1];
            activeFilterLabel = 'Он, сар';
        }

        if (dateFilterMode === 'custom_range') {
            const parsedFrom = parseInputDate(customFromDate, false);
            const parsedTo = parseInputDate(customToDate, true);
            const safeStart = parsedFrom || currentMonthStart.getTime();
            const safeEnd = parsedTo && parsedTo >= safeStart ? parsedTo : now;
            const selectedStartDate = new Date(safeStart);
            const selectedEndDate = new Date(safeEnd);
            const diffDays = Math.max(1, Math.ceil((safeEnd - safeStart + 1) / dayMs));
            selectedStartMs = safeStart;
            selectedEndMs = safeEnd;
            comparisonStartMs = safeStart - diffDays * dayMs;
            comparisonEndMs = safeStart - 1;
            selectedPeriodLabel = `${formatShortDate(selectedStartDate)} - ${formatShortDate(selectedEndDate)}`;
            selectedPeriodTitle = isCommerce
                ? 'Сонгосон хугацааны үндсэн худалдааны мэдээлэл'
                : 'Сонгосон хугацааны борлуулалтын мэдээлэл';
            selectedElapsedDays = diffDays;
            breakdownDays = diffDays;
            selectedMonthDisplay = `${selectedStartDate.getMonth() + 1}-р сар`;
            activeFilterLabel = 'Хугацаа сонгох';
        }

        const deliveryOrders = orders.filter((order) => order.isDelivery);
        const branchSales = sales.filter((sale) => sale.createdAtMs > 0);
        const salesTransactions = branchSales.map((sale) => ({
            ...sale,
            isDelivery: false,
            isPickup: false,
            district: '',
            coordinates: null,
            address: sale.branchName,
        }));
        const baseTransactions = isCommerce ? [...deliveryOrders, ...salesTransactions] : deliveryOrders;
        const inRangeDeliveryOrders = deliveryOrders.filter((order) => order.createdAtMs >= mapRangeStartMs);
        const todaysDeliveries = baseTransactions.filter((item) => item.createdAtMs >= todayStartMs);
        const weekDeliveries = baseTransactions.filter((item) => item.createdAtMs >= weekStartMs);
        const selectedPeriodDeliveries = baseTransactions.filter(
            (item) => item.createdAtMs >= selectedStartMs && item.createdAtMs <= selectedEndMs
        );
        const comparisonPeriodDeliveries = baseTransactions.filter(
            (item) => item.createdAtMs >= comparisonStartMs && item.createdAtMs <= comparisonEndMs
        );
        const selectedPeriodDeliveryOrders = deliveryOrders.filter(
            (item) => item.createdAtMs >= selectedStartMs && item.createdAtMs <= selectedEndMs
        );
        const previousWeekDeliveries = baseTransactions.filter(
            (item) => item.createdAtMs >= previousWeekStartMs && item.createdAtMs < weekStartMs
        );

        const dayBuckets = Array.from({ length: 7 }, (_, index) => {
            const bucketDate = new Date(now - (6 - index) * dayMs);
            bucketDate.setHours(0, 0, 0, 0);
            return {
                key: index,
                label: `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`,
                total: 0,
            };
        });

        const hourBuckets = Array.from({ length: 24 }, (_, hour) => ({
            label: HOUR_LABELS[hour],
            count: 0,
        }));

        const weekdayBuckets = Array.from({ length: 7 }, (_, weekdayIndex) => ({
            label: WEEK_DAY_LABELS[weekdayIndex],
            count: 0,
        }));

        const districtMap = new Map();
        const paymentMap = new Map();
        const productMap = new Map();
        const skuAnalyticsMap = new Map();
        const turnaroundMinutes = [];
        let completedCount = 0;
        let cancelledCount = 0;
        let returnedCount = 0;
        let deliveryRevenue = 0;
        let previousWeekRevenue = 0;

        baseTransactions.forEach((order) => {
            if (order.createdAtMs >= weekStartMs) {
                deliveryRevenue += order.total;
            }

            if (order.createdAtMs >= previousWeekStartMs && order.createdAtMs < weekStartMs) {
                previousWeekRevenue += order.total;
            }

            if (order.createdAtMs >= weekStartMs) {
                const hour = new Date(order.createdAtMs).getHours();
                const weekDay = new Date(order.createdAtMs).getDay();
                hourBuckets[hour].count += 1;
                weekdayBuckets[weekDay].count += 1;
            }

            if (order.createdAtMs >= now - 7 * dayMs) {
                const bucketIndex = Math.min(
                    6,
                    Math.max(0, Math.floor((order.createdAtMs - (now - 7 * dayMs)) / dayMs))
                );
                if (dayBuckets[bucketIndex]) {
                    dayBuckets[bucketIndex].total += order.total;
                }
            }

            if (order.isDelivery) {
                if (order.status === 'completed') completedCount += 1;
                if (order.status === 'cancelled') cancelledCount += 1;
                if (order.status === 'returned') returnedCount += 1;
            }

            if (order.district) {
                districtMap.set(order.district, (districtMap.get(order.district) || 0) + 1);
            }

            const paymentKey = formatPaymentLabel(order.paymentMethod);
            const paymentExisting = paymentMap.get(paymentKey) || {
                label: paymentKey,
                count: 0,
                amount: 0,
            };
            paymentExisting.count += 1;
            paymentExisting.amount += order.total;
            paymentMap.set(paymentKey, paymentExisting);

            order.items.forEach((item) => {
                const key = item.productId || item.name;
                if (!key) return;
                const matchedProduct = products.find(
                    (product) => product.id === key || product.name === item.name
                );
                const existing = productMap.get(key) || {
                    id: key,
                    name: item.name || matchedProduct?.name || 'Тодорхойгүй бүтээгдэхүүн',
                    image: matchedProduct?.image || '',
                    soldQty: 0,
                    revenue: 0,
                };
                existing.soldQty += item.quantity;
                existing.revenue += item.lineAmount || 0;
                if (!existing.image && matchedProduct?.image) {
                    existing.image = matchedProduct.image;
                }
                productMap.set(key, existing);
            });

            if (order.isDelivery && order.completedAtMs > order.createdAtMs && order.status === 'completed') {
                turnaroundMinutes.push((order.completedAtMs - order.createdAtMs) / (1000 * 60));
            }
        });

        selectedPeriodDeliveryOrders.forEach((order) => {
            const normalizedItems = order.items
                .filter((item) => item?.name || item?.productId)
                .map((item) => ({
                    key: item.productId || item.name,
                    name: item.name || 'Тодорхойгүй бүтээгдэхүүн',
                    quantity: item.quantity,
                    lineAmount: item.lineAmount || 0,
                }));

            normalizedItems.forEach((item) => {
                const matchedProduct = products.find(
                    (product) => product.id === item.key || product.name === item.name
                );
                const current = skuAnalyticsMap.get(item.key) || {
                    id: item.key,
                    name: item.name,
                    image: matchedProduct?.image || '',
                    units: 0,
                    revenue: 0,
                    orderCount: 0,
                    companionCounts: new Map(),
                };
                current.units += item.quantity;
                current.revenue += item.lineAmount;
                current.orderCount += 1;
                if (!current.image && matchedProduct?.image) {
                    current.image = matchedProduct.image;
                }

                normalizedItems.forEach((candidate) => {
                    if (candidate.key === item.key) return;
                    current.companionCounts.set(
                        candidate.name,
                        (current.companionCounts.get(candidate.name) || 0) + 1
                    );
                });

                skuAnalyticsMap.set(item.key, current);
            });
        });

        const totalDeliveryOrders = deliveryOrders.length;
        const weeklyOrderCount = weekDeliveries.length;
        const selectedPeriodOrderCount = selectedPeriodDeliveries.length;
        const averageDailyDeliveries = weeklyOrderCount / 7;
        const averageDailySelectedDeliveries = selectedPeriodOrderCount / Math.max(selectedElapsedDays, 1);
        const selectedPeriodRevenue = selectedPeriodDeliveries.reduce((sum, order) => sum + order.total, 0);
        const comparisonPeriodRevenue = comparisonPeriodDeliveries.reduce(
            (sum, order) => sum + order.total,
            0
        );
        const averageOrderValue = selectedPeriodOrderCount
            ? selectedPeriodRevenue / selectedPeriodOrderCount
            : 0;
        const deliveryAverageOrderValue = selectedPeriodDeliveryOrders.length
            ? selectedPeriodDeliveryOrders.reduce((sum, order) => sum + order.total, 0) / selectedPeriodDeliveryOrders.length
            : 0;
        const comparisonOrderCount = comparisonPeriodDeliveries.length;
        const comparisonAverageOrderValue = comparisonOrderCount
            ? comparisonPeriodRevenue / comparisonOrderCount
            : 0;
        const basketValues = selectedPeriodDeliveries.map((order) => order.total);
        const comparisonBasketValues = comparisonPeriodDeliveries.map((order) => order.total);
        const commerceChannelSeed = [
            { name: 'Хүргэлт', revenue: 0, count: 0, color: '#7c3aed' },
            { name: 'Шангри-Ла', revenue: 0, count: 0, color: '#f97316' },
            { name: 'Хан-Уул', revenue: 0, count: 0, color: '#14b8a6' },
            { name: 'Их дэлгүүр', revenue: 0, count: 0, color: '#ec4899' },
        ];
        const commerceChannelMap = new Map(commerceChannelSeed.map((item) => [item.name, { ...item }]));
        selectedPeriodDeliveries.forEach((item) => {
            const channelName = normalizeCommerceChannel(item.branchName, item.isDelivery);
            const current = commerceChannelMap.get(channelName) || { name: channelName, revenue: 0, count: 0, color: '#64748b' };
            current.revenue += item.total;
            current.count += 1;
            commerceChannelMap.set(channelName, current);
        });
        const channelRevenueBreakdownBase = [...commerceChannelMap.values()];
        const totalChannelRevenue = channelRevenueBreakdownBase.reduce((sum, item) => sum + item.revenue, 0);
        const channelRevenueBreakdown = channelRevenueBreakdownBase.map((item) => ({
            ...item,
            share: totalChannelRevenue ? (item.revenue / totalChannelRevenue) * 100 : 0,
        }));
        const topRevenueChannel = [...channelRevenueBreakdown].sort((a, b) => b.revenue - a.revenue)[0] || commerceChannelSeed[0];
        const channelPieSegments = channelRevenueBreakdown
            .map((item, index) => {
                const start = channelRevenueBreakdown
                    .slice(0, index)
                    .reduce((sum, current) => sum + (totalChannelRevenue ? (current.revenue / totalChannelRevenue) * 100 : 0), 0);
                const end = start + (totalChannelRevenue ? (item.revenue / totalChannelRevenue) * 100 : 0);
                return { ...item, share: totalChannelRevenue ? (item.revenue / totalChannelRevenue) * 100 : 0, start, end };
            });
        const peakHour = [...hourBuckets].sort((a, b) => b.count - a.count)[0];
        const peakDay = [...weekdayBuckets].sort((a, b) => b.count - a.count)[0];
        const topHours = [...hourBuckets]
            .filter((bucket) => bucket.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        const topDistricts = [...districtMap.entries()]
            .map(([district, count]) => ({ district, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        const paymentBreakdown = [...paymentMap.values()]
            .sort((a, b) => b.amount - a.amount)
            .map((item, index) => ({
                ...item,
                color: ['#7c3aed', '#db2777', '#2563eb', '#ea580c', '#059669', '#475569'][index % 6],
            }));
        const topProducts = [...productMap.values()]
            .sort((a, b) => b.soldQty - a.soldQty)
            .slice(0, 10);
        const bestProduct = topProducts[0] || null;
        const coordinatesOrders = inRangeDeliveryOrders.filter((order) => Array.isArray(order.coordinates));
        const mapCenter =
            coordinatesOrders.length > 0
                ? [
                      coordinatesOrders.reduce((sum, order) => sum + order.coordinates[0], 0) / coordinatesOrders.length,
                      coordinatesOrders.reduce((sum, order) => sum + order.coordinates[1], 0) / coordinatesOrders.length,
                  ]
                : DEFAULT_CENTER;
        const averageTurnaround =
            turnaroundMinutes.length > 0
                ? turnaroundMinutes.reduce((sum, minutes) => sum + minutes, 0) / turnaroundMinutes.length
                : 0;
        const recommendedTarget = Math.max(
            100000,
            Math.round(
                Math.max(
                    comparisonPeriodRevenue || 0,
                    selectedElapsedDays > 0 ? (selectedPeriodRevenue / selectedElapsedDays) * Math.max(selectedElapsedDays, 30) : 0
                ) * 1.1
            )
        );
        const todayActual = todaysDeliveries.length;
        const maxChartValue = Math.max(...dayBuckets.map((item) => item.total), 1);
        const breakdownBaseDate = new Date(selectedStartMs);
        breakdownBaseDate.setHours(0, 0, 0, 0);
        const selectedDailyBreakdown = Array.from({ length: breakdownDays }, (_, index) => {
            const bucketDate = new Date(breakdownBaseDate.getTime() + index * dayMs);
            const label = `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`;
            const dayStart = bucketDate.getTime();
            const dayEnd = dayStart + dayMs;
            const dayOrders = selectedPeriodDeliveries.filter(
                (order) => order.createdAtMs >= dayStart && order.createdAtMs <= Math.min(dayEnd - 1, selectedEndMs)
            );

            return {
                key: `m-${index}`,
                label,
                orders: dayOrders.length,
                total: dayOrders.reduce((sum, order) => sum + order.total, 0),
            };
        });
        const comparisonBaseDate = new Date(comparisonStartMs);
        comparisonBaseDate.setHours(0, 0, 0, 0);
        const comparisonDailyBreakdown = Array.from({ length: breakdownDays }, (_, index) => {
            const bucketDate = new Date(comparisonBaseDate.getTime() + index * dayMs);
            const dayStart = bucketDate.getTime();
            const dayEnd = dayStart + dayMs;
            const dayOrders = comparisonPeriodDeliveries.filter(
                (order) => order.createdAtMs >= dayStart && order.createdAtMs <= Math.min(dayEnd - 1, comparisonEndMs)
            );

            return {
                key: `p-${index}`,
                label: `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`,
                total: dayOrders.reduce((sum, order) => sum + order.total, 0),
            };
        });
        const dailyBreakdown = dayBuckets.map((item) => ({
            ...item,
            orders: weekDeliveries.filter((order) => {
                const orderDate = new Date(order.createdAtMs);
                return `${orderDate.getMonth() + 1}/${orderDate.getDate()}` === item.label;
            }).length,
        }));
        const trendCurrentLabel =
            dateFilterMode === 'custom_range'
                ? 'Сонгосон хугацаа'
                : selectedMonthDisplay;
        const trendComparisonLabel =
            dateFilterMode === 'custom_range'
                ? 'Өмнөх ижил хугацаа'
                : MONTH_NAMES[comparisonBaseDate.getMonth()];
        const revenueTrendPoints = selectedDailyBreakdown.map((currentDay, index) => {
            const previousDay = comparisonDailyBreakdown[index] || { total: 0, label: '-' };
            return {
                label: currentDay.label.split('/')[1],
                fullLabel: currentDay.label,
                currentValue: currentDay.total,
                previousValue: previousDay.total,
                delta: previousDay.total > 0 ? ((currentDay.total - previousDay.total) / previousDay.total) * 100 : currentDay.total > 0 ? 100 : 0,
            };
        });
        const bestCurrentSalesDay = selectedDailyBreakdown.reduce(
            (best, day) => (day.total > best.total ? day : best),
            { label: '-', total: 0 }
        );
        const bestPreviousSalesDay = comparisonDailyBreakdown.reduce(
            (best, day) => (day.total > best.total ? day : best),
            { label: '-', total: 0 }
        );
        const comparisonSummary = [
            {
                label: isCommerce ? 'Борлуулалтын тоо' : 'Хүргэлтийн тоо',
                currentFormatted: selectedPeriodOrderCount.toLocaleString(),
                previousFormatted: comparisonOrderCount.toLocaleString(),
                delta: getGrowth(selectedPeriodOrderCount, comparisonOrderCount),
            },
            {
                label: isCommerce ? 'Борлуулалтын дүн' : 'Хүргэлтийн дүн',
                currentFormatted: formatMoney(selectedPeriodRevenue),
                previousFormatted: formatMoney(comparisonPeriodRevenue),
                delta: getGrowth(selectedPeriodRevenue, comparisonPeriodRevenue),
            },
            {
                label: 'Дундаж сагсны хэмжээ',
                currentFormatted: formatMoney(averageOrderValue),
                previousFormatted: formatMoney(comparisonAverageOrderValue),
                delta: getGrowth(averageOrderValue, comparisonAverageOrderValue),
            },
            {
                label: 'Хамгийн өндөр борлуулалт',
                currentFormatted: formatMoney(basketValues.length ? Math.max(...basketValues) : 0),
                previousFormatted: formatMoney(comparisonBasketValues.length ? Math.max(...comparisonBasketValues) : 0),
                delta: getGrowth(
                    basketValues.length ? Math.max(...basketValues) : 0,
                    comparisonBasketValues.length ? Math.max(...comparisonBasketValues) : 0
                ),
            },
            {
                label: 'Хамгийн бага борлуулалт',
                currentFormatted: formatMoney(basketValues.length ? Math.min(...basketValues) : 0),
                previousFormatted: formatMoney(comparisonBasketValues.length ? Math.min(...comparisonBasketValues) : 0),
                delta: getGrowth(
                    basketValues.length ? Math.min(...basketValues) : 0,
                    comparisonBasketValues.length ? Math.min(...comparisonBasketValues) : 0
                ),
            },
            {
                label: 'Хамгийн их борлуулалттай гариг',
                currentFormatted: `${bestCurrentSalesDay.label} • ${formatCompactMoney(bestCurrentSalesDay.total)}`,
                previousFormatted: `${bestPreviousSalesDay.label} • ${formatCompactMoney(bestPreviousSalesDay.total)}`,
                delta: getGrowth(bestCurrentSalesDay.total, bestPreviousSalesDay.total),
            },
        ];
        const paymentTotal = paymentBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const paymentSegments = paymentBreakdown
            .map((item, index) => {
                const previous = paymentBreakdown
                    .slice(0, index)
                    .reduce((sum, current) => sum + (paymentTotal ? (current.amount / paymentTotal) * 100 : 0), 0);
                const current = paymentTotal ? (item.amount / paymentTotal) * 100 : 0;
                return `${item.color} ${previous}% ${previous + current}%`;
            })
            .join(', ');
        const topSkuInsights = [...skuAnalyticsMap.values()]
            .map((item) => {
                const bundleCandidate = [...item.companionCounts.entries()].sort((a, b) => b[1] - a[1])[0];
                return {
                    ...item,
                    attachRate: safeDivide(item.orderCount * 100, selectedPeriodDeliveryOrders.length),
                    averageOrderValueImpact: deliveryAverageOrderValue > 0 ? (item.revenue / Math.max(item.orderCount, 1) / deliveryAverageOrderValue - 1) * 100 : 0,
                    bundlePotential: bundleCandidate
                        ? {
                              name: bundleCandidate[0],
                              frequency: bundleCandidate[1],
                          }
                        : null,
                };
            })
            .sort((a, b) => {
                if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
                return b.revenue - a.revenue;
            })
            .slice(0, 5);

        return {
            meta: {
                monthLabel: selectedMonthDisplay,
                monthTitle: selectedPeriodTitle,
                monthRangeLabel: selectedPeriodLabel,
                elapsedDays: selectedElapsedDays,
                activeFilterLabel,
                scopeLabel: isCommerce ? 'үндсэн худалдаа' : 'delivery',
            },
            totals: {
                today: todaysDeliveries.length,
                week: weeklyOrderCount,
                month: selectedPeriodOrderCount,
                revenue: deliveryRevenue,
                monthRevenue: selectedPeriodRevenue,
                averageOrderValue,
                averageDailyDeliveries,
                averageDailyMonthDeliveries: averageDailySelectedDeliveries,
                wowOrdersGrowth: getGrowth(weeklyOrderCount, previousWeekDeliveries.length),
                wowRevenueGrowth: getGrowth(deliveryRevenue, previousWeekRevenue),
                monthOrdersGrowth: getGrowth(selectedPeriodOrderCount, comparisonPeriodDeliveries.length),
                monthRevenueGrowth: getGrowth(selectedPeriodRevenue, comparisonPeriodRevenue),
            },
            quality: {
                maxBasket: basketValues.length ? Math.max(...basketValues) : 0,
                minBasket: basketValues.length ? Math.min(...basketValues) : 0,
                avgBasket: averageOrderValue,
                topProduct: bestProduct,
                topProducts,
            },
            time: {
                peakHour,
                peakDay,
                averageTurnaround,
                trend: dailyBreakdown.map((item) => ({
                    ...item,
                    percent: Math.max(8, Math.round((item.total / maxChartValue) * 100)),
                })),
                topHours,
                dailyBreakdown,
                monthDailyBreakdown: selectedDailyBreakdown,
                comparisonDailyBreakdown,
                revenueTrendPoints,
                trendCurrentLabel,
                trendPreviousLabel: trendComparisonLabel,
                comparisonSummary,
            },
            performance: {
                successRate: totalDeliveryOrders ? (completedCount / totalDeliveryOrders) * 100 : 0,
                cancelRate: totalDeliveryOrders ? (cancelledCount / totalDeliveryOrders) * 100 : 0,
                returnRate: totalDeliveryOrders ? (returnedCount / totalDeliveryOrders) * 100 : 0,
                averageTurnaround,
            },
            sales: {
                paymentBreakdown,
                paymentSegments,
                topBranches: channelRevenueBreakdown.filter((item) => item.name !== 'Хүргэлт'),
                channelRevenueBreakdown,
                channelPieSegments,
                totalChannelRevenue,
                topRevenueChannel,
            },
            deliveryOps: {
                topSkuInsights,
                deliveryAverageOrderValue,
            },
            geography: {
                topDistricts,
                coordinatesOrders,
                mapCenter,
            },
            plan: {
                target: currentPlanTarget,
                recommendedTarget,
                actual: selectedPeriodRevenue,
                achievement: currentPlanTarget ? (selectedPeriodRevenue / currentPlanTarget) * 100 : 0,
            },
            strategy: {
                pushProduct: bestProduct?.name || 'Өгөгдөл дутуу',
                promoWindow: peakHour?.label || '-',
                addCapacity: averageTurnaround > 90 || selectedPeriodRevenue > (currentPlanTarget || recommendedTarget),
            },
        };
    }, [currentPlanTarget, customFromDate, customToDate, dateFilterMode, isCommerce, now, orders, products, rangeDays, sales, selectedMonth]);

    const heroStats = [
        {
            title: isCommerce ? `${deliveryAnalytics.meta.monthLabel} борлуулалтын тоо` : `${deliveryAnalytics.meta.monthLabel} хүргэлт`,
            value: deliveryAnalytics.totals.month.toLocaleString(),
            change: formatPercent(deliveryAnalytics.totals.monthOrdersGrowth),
            isUp: deliveryAnalytics.totals.monthOrdersGrowth >= 0,
            icon: isCommerce ? <ShoppingBag size={22} color="#0f766e" /> : <Truck size={22} color="#b45309" />,
        },
        {
            title: `${deliveryAnalytics.meta.monthLabel} орлого`,
            value: formatMoney(deliveryAnalytics.totals.monthRevenue),
            change: formatPercent(deliveryAnalytics.totals.monthRevenueGrowth),
            isUp: deliveryAnalytics.totals.monthRevenueGrowth >= 0,
            icon: <CircleDollarSign size={22} color={isCommerce ? '#b45309' : '#047857'} />,
        },
        {
            title: 'Дундаж сагсны хэмжээ',
            value: formatMoney(deliveryAnalytics.totals.averageOrderValue),
            change: isCommerce ? `${deliveryAnalytics.meta.monthLabel} нийт AOV` : `${deliveryAnalytics.meta.monthLabel} AOV`,
            isUp: true,
            icon: <ShoppingBag size={22} color={isCommerce ? '#c2410c' : '#2563eb'} />,
        },
        {
            title: 'Өдрийн дундаж борлуулалтын дүн',
            value: formatMoney(
                deliveryAnalytics.meta.elapsedDays > 0
                    ? deliveryAnalytics.totals.monthRevenue / deliveryAnalytics.meta.elapsedDays
                    : 0
            ),
            change: `${deliveryAnalytics.meta.elapsedDays} хоногийн дундаж`,
            isUp: true,
            icon: <ChartNoAxesColumn size={22} color="#0f766e" />,
        },
        {
            title: 'Target achievement',
            value: deliveryAnalytics.plan.target ? formatRate(deliveryAnalytics.plan.achievement) : 'Төлөвлөгөө оруулна уу',
            change: deliveryAnalytics.plan.target
                ? `${formatMoney(deliveryAnalytics.plan.actual)} / ${formatMoney(deliveryAnalytics.plan.target)}`
                : `Санал: ${formatMoney(deliveryAnalytics.plan.recommendedTarget)}`,
            isUp: deliveryAnalytics.plan.target ? deliveryAnalytics.plan.achievement >= 100 : true,
            icon: <Target size={22} color="#7c3aed" />,
        },
    ];

    const topPaymentMethod = deliveryAnalytics.sales.paymentBreakdown[0];
    const topPaymentShare = topPaymentMethod
        ? (topPaymentMethod.amount /
              Math.max(
                  1,
                  deliveryAnalytics.sales.paymentBreakdown.reduce((sum, item) => sum + item.amount, 0)
              )) *
          100
        : 0;
    const visitComparisonAnalytics = useMemo(() => {
        const dayMs = 24 * 60 * 60 * 1000;
        const safeToday = new Date(todayDate);
        safeToday.setHours(0, 0, 0, 0);
        let endMs = parseInputDate(visitToDate, true) || safeToday.getTime() + dayMs - 1;
        let startMs = parseInputDate(visitFromDate, false) || (safeToday.getTime() - 13 * dayMs);

        if (visitRangePreset !== 'custom') {
            const presetDays = Number(visitRangePreset) || 14;
            endMs = safeToday.getTime() + dayMs - 1;
            startMs = safeToday.getTime() - (presetDays - 1) * dayMs;
        }

        if (endMs < startMs) {
            endMs = startMs + dayMs - 1;
        }

        const totalDays = Math.max(1, Math.ceil((endMs - startMs + 1) / dayMs));
        const points = Array.from({ length: totalDays }, (_, index) => {
            const date = new Date(startMs + index * dayMs);
            date.setHours(0, 0, 0, 0);
            const key = getDateKey(date);
            const visitRecord = getVisitRecord(visitTargets, `day:${key}`);
            const dayStart = date.getTime();
            const dayEnd = dayStart + dayMs - 1;
            const deliveries = orders.filter(
                (order) => order.isDelivery && order.createdAtMs >= dayStart && order.createdAtMs <= dayEnd
            ).length;

            return {
                key,
                shortLabel: `${date.getMonth() + 1}/${date.getDate()}`,
                fullLabel: formatShortDate(date),
                visits: visitRecord.value,
                deliveries,
            };
        });

        const previousStartMs = startMs - totalDays * dayMs;
        const previousEndMs = startMs - 1;
        const previousPoints = Array.from({ length: totalDays }, (_, index) => {
            const date = new Date(previousStartMs + index * dayMs);
            date.setHours(0, 0, 0, 0);
            const key = getDateKey(date);
            const visitRecord = getVisitRecord(visitTargets, `day:${key}`);
            const dayStart = date.getTime();
            const dayEnd = dayStart + dayMs - 1;
            const deliveries = orders.filter(
                (order) => order.isDelivery && order.createdAtMs >= dayStart && order.createdAtMs <= dayEnd
            ).length;
            return { visits: visitRecord.value, deliveries };
        });

        const totalVisits = points.reduce((sum, item) => sum + item.visits, 0);
        const totalDeliveries = points.reduce((sum, item) => sum + item.deliveries, 0);
        const previousTotalVisits = previousPoints.reduce((sum, item) => sum + item.visits, 0);
        const previousTotalDeliveries = previousPoints.reduce((sum, item) => sum + item.deliveries, 0);
        const avgVisits = safeDivide(totalVisits, points.length);
        const avgDeliveries = safeDivide(totalDeliveries, points.length);
        const previousAvgVisits = safeDivide(previousTotalVisits, previousPoints.length);
        const previousAvgDeliveries = safeDivide(previousTotalDeliveries, previousPoints.length);
        const conversionRate = safeDivide(totalDeliveries * 100, totalVisits);
        const previousConversionRate = safeDivide(previousTotalDeliveries * 100, previousTotalVisits);
        const bestDay = points.reduce(
            (best, item) => (item.visits + item.deliveries > best.visits + best.deliveries ? item : best),
            points[0] || { fullLabel: '-', visits: 0, deliveries: 0 }
        );
        const advice =
            conversionRate >= 10
                ? 'Хандалтаас хүргэлт рүү хөрвөлт сайн байна. Одоо өндөр хандалттай өдрүүд дээр top SKU болон bundle саналуудаа түлхэх нь илүү өгөөжтэй.'
                : avgVisits > 0 && avgDeliveries === 0
                    ? 'Хандалт орж байгаа ч хүргэлт болж хувирахгүй байна. Checkout friction, хүргэлтийн үнэ, hero offer-оо эхэлж шалгах хэрэгтэй.'
                    : totalVisits === 0
                        ? 'Энэ хугацаанд хандалтын тоо оруулаагүй тул conversion зөвлөгөө хараахан гарсангүй.'
                        : 'Хандалт ба хүргэлтийн зөрүү өндөр байна. Өндөр хандалттай өдрүүд дээр promotion, free-delivery босго, top SKU pin хийх нь conversion өсгөнө.';

        return {
            points,
            totalVisits,
            totalDeliveries,
            avgVisits,
            avgDeliveries,
            conversionRate,
            avgVisitGrowth: getGrowth(avgVisits, previousAvgVisits),
            avgDeliveryGrowth: getGrowth(avgDeliveries, previousAvgDeliveries),
            conversionGrowth: getGrowth(conversionRate, previousConversionRate),
            bestDay,
            advice,
            rangeLabel:
                visitRangePreset === 'custom'
                    ? `${visitFromDate || formatShortDate(new Date(startMs))} - ${visitToDate || formatShortDate(new Date(endMs))}`
                    : `Сүүлийн ${totalDays} хоног`,
        };
    }, [orders, todayDate, visitFromDate, visitRangePreset, visitTargets, visitToDate]);

    const strategicCards = [
        {
            title: 'Бүтээгдэхүүн түлхэх',
            note: `${isCommerce
                ? `${deliveryAnalytics.strategy.pushProduct} нь хүргэлт болон салбаруудын нийлбэр дүнгээр хамгийн өндөр эргэлттэй SKU байна. Энэ бүтээгдэхүүнийг бүх сувгийн hero placement, bundle санал болон кассын upsell дээр зэрэг түлхвэл нийт орлого илүү хурдан өснө.`
                : `${deliveryAnalytics.strategy.pushProduct} одоогийн хугацаанд delivery сувгийн хамгийн өндөр эргэлттэй SKU байна. Энэ бүтээгдэхүүнийг нүүр, сториз болон bundle санал дээр түлхэж, орлогын өсөлтийг хурдан авах нь оновчтой.`} ${
                [
                    'Эхний ээлжид hero banner, pinned story, кассын санал дээр зэрэг байршуул.',
                    'Энэ SKU дээр богино хугацааны offer тавибал хамгийн хурдан revenue lift өгнө.',
                    'Top performer тул сурталчилгааны төсвийн эхний хэсгийг энэ бүтээгдэхүүн дээр төвлөрүүлэх нь зөв.',
                ][(adviceRefreshSeed + 0) % 3]
            }`,
        },
        {
            title: 'Promotion цаг',
            note: `${deliveryAnalytics.time.peakDay?.label || '-'} гарагийн ${deliveryAnalytics.strategy.promoWindow} орчим хамгийн өндөр ачаалал ажиглагдаж байна. Promotion-оо энэ peak window-оос 30-45 минутын өмнө эхлүүлбэл ${isCommerce ? 'хүргэлт болон салбарын нийт хөрвөлт' : 'хөрвөлт'} өсөх магадлал өндөр. ${
                [
                    'Push notification болон story post-оо энэ цагаас өмнө зэрэг явуулбал илүү үр дүнтэй.',
                    'Peak-ээс өмнөх богино flash offer нь хэрэглэгчийн шийдвэрийг хурдлуулна.',
                    'Маркетингийн spend-ээ тархаах биш яг энэ time slot дээр төвлөрүүлэх нь зөв.',
                ][(adviceRefreshSeed + 1) % 3]
            }`,
        },
        {
            title: 'Сагсны дүн өсгөх',
            note: `Дундаж сагсны хэмжээ ${formatMoney(deliveryAnalytics.totals.averageOrderValue)} байгаа тул ${formatMoney(
                deliveryAnalytics.quality.maxBasket
            )}-ийн дээд түвшинд ойртуулах upsell, 2 дахь бүтээгдэхүүний хөнгөлөлт, free-delivery босго ашиглах нь зохимжтой. ${
                [
                    'Bundle бүтэцтэй санал нь шууд AOV өсгөх хамгийн цэвэр арга байна.',
                    'Нэмэлт бүтээгдэхүүний санал checkout дээр гарч ирдэг байх нь хэрэгтэй.',
                    'Free-delivery threshold-ийг AOV-оос бага зэрэг дээгүүр тогтоовол сагсны дүн өснө.',
                ][(adviceRefreshSeed + 2) % 3]
            }`,
        },
        {
            title: 'Төлбөрийн бодлого',
            note: `${topPaymentMethod
                ? `${topPaymentMethod.label} төлбөр нийт payment revenue-ийн ${formatRate(
                      topPaymentShare
                  )}-ийг бүрдүүлж байна. Энэ сувгийг checkout дээр default болгох эсвэл тухайн аргаар төлбөр хийх урамшуулал санал болговол drop-off буурах боломжтой.`
                : 'Төлбөрийн төрлүүдийн өгөгдөл нэмэгдмэгц хамгийн их ашиглагддаг аргыг checkout-д давуу байршуулж хөрвөлтийг өсгөх зөвлөмж гаргана.'} ${
                [
                    'Checkout-ийн эхний сонголтыг хамгийн их хэрэглэгддэг аргаар эхлүүлэх нь friction бууруулна.',
                    'Төлбөрийн алхмыг багасгах жижиг UX өөрчлөлт хамгийн өндөр нөлөөтэй байж болно.',
                    'Тухайн payment method дээр жижиг incentive өгөхөд хөрвөлт мэдэгдэхүйц өсөх боломжтой.',
                ][(adviceRefreshSeed + 3) % 3]
            }`,
        },
        {
            title: 'Өсөлтийн удирдлага',
            note: `${deliveryAnalytics.meta.monthLabel} орлого ${formatMoney(
                deliveryAnalytics.totals.monthRevenue
            )}, өмнөх харьцуулалтаас ${formatPercent(
                deliveryAnalytics.totals.monthRevenueGrowth
            )} өөрчлөгдсөн байна. ${
                deliveryAnalytics.strategy.addCapacity
                    ? isCommerce
                        ? 'Эрэлт өсөх дохио ажиглагдаж байгаа тул peak өдөр хүргэлтийн slot болон борлуулалт өндөртэй салбарын нөөцийг зэрэг нэмэх нь борлуулалт алдах эрсдэлийг бууруулна.'
                        : 'Эрэлт өсөх дохио ажиглагдаж байгаа тул peak өдөр courier слот, бэлтгэлийн нөөцөө урьдчилан нэмэх нь борлуулалт алдах эрсдэлийг бууруулна.'
                    : isCommerce
                        ? 'Одоогийн гүйцэтгэлийн түвшинд багтаамж хүрэлцээтэй тул эхний ээлжид топ салбар болон хүргэлтийн сувгийн хамтарсан promotion, basket expansion дээр төвлөрөх нь илүү өгөөжтэй.'
                        : 'Одоогийн гүйцэтгэлийн түвшинд багтаамж хүрэлцээтэй тул эхний ээлжид promotion болон basket expansion дээр төвлөрөх нь илүү өгөөжтэй.'
            } ${
                [
                    'Тиймээс одоогийн долоо хоногийн action plan-аа сувгийн гүйцэтгэлтэй уялдуулж шинэчлэх нь зөв.',
                    'Ийм нөхцөлд хамгийн сайн алхам нь өндөр өгөөжтэй суваг дээр илүү нөөц төвлөрүүлэх явдал байна.',
                    'Дараагийн шийдвэрийг capacity биш conversion improvement дээр төвлөрүүлбэл илүү ашигтай харагдаж байна.',
                ][(adviceRefreshSeed + 4) % 3]
            }`,
        },
    ];

    const greetingMeta = getGreetingMeta(todayDate);
    const greetingName = getDisplayUserName(userProfile, user);
    const weatherMeta = getWeatherVisualMeta(weatherInfo.weatherCode, weatherInfo.isDay);
    const WeatherIcon = weatherMeta.Icon;
    const clothingAdvice = getClothingAdvice(weatherInfo);

    return (
        <div className={`dashboard-container ${isCommerce ? 'commerce-dashboard-theme' : 'delivery-dashboard-theme'}`}>
            <div className={`dashboard-greeting-card ${greetingMeta.accent} ${isCommerce ? 'commerce-greeting' : ''}`}>
                <div className={`weather-scene ${greetingMeta.accent}`}>
                    <div className="weather-scene-glow" />
                    <div className="weather-scene-body" />
                    <div className="weather-scene-cloud cloud-one" />
                    <div className="weather-scene-cloud cloud-two" />
                    <div className="weather-scene-stars">
                        <span />
                        <span />
                        <span />
                        <span />
                    </div>
                </div>
                <div className="dashboard-greeting-visual">
                    <div className="weather-widget-chip">
                        <WeatherIcon size={22} />
                        <span>{weatherMeta.label}</span>
                    </div>
                    <div className="weather-hero-temp">
                        <strong>{weatherInfo.temperature === null ? '--' : `${Math.round(weatherInfo.temperature)}°`}</strong>
                        <span>{weatherInfo.locationLabel}</span>
                    </div>
                    <div className="weather-hero-meta">
                        <small>Мэдрэгдэх нь {weatherInfo.apparentTemperature === null ? '--' : `${Math.round(weatherInfo.apparentTemperature)}°`}</small>
                        <small>Тунадас {weatherInfo.precipitation?.toFixed ? weatherInfo.precipitation.toFixed(1) : '0.0'} мм</small>
                    </div>
                </div>
                <div className="dashboard-greeting-copy">
                    <span className="greeting-kicker">{todayDate.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}</span>
                    <h1>{`${greetingMeta.greeting}, ${greetingName}`}</h1>
                    <p>{greetingMeta.caption}</p>
                    <div className="greeting-quote">
                        <small>Өнөөдрийн хувцаслах зөвлөгөө</small>
                        <strong>{greetingMeta.emoji} {clothingAdvice}</strong>
                    </div>
                </div>
            </div>

            <div className="section-card dashboard-filter-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Хугацааны сонголт</h3>
                        <p>Тухайн сар, он-сар, эсвэл өөрийн сонгосон хугацаагаар dashboard-ийг шүүнэ</p>
                    </div>
                </div>
                <div className="dashboard-filter-grid">
                    <select
                        className="form-select dashboard-filter-input"
                        value={dateFilterMode}
                        onChange={(event) => setDateFilterMode(event.target.value)}
                    >
                        <option value="current_month">Тухайн сар</option>
                        <option value="specific_month">Он, сар</option>
                        <option value="custom_range">Хугацаа сонгох</option>
                    </select>

                    {dateFilterMode === 'specific_month' ? (
                        <input
                            className="dashboard-filter-input dashboard-date-input"
                            type="month"
                            value={selectedMonth}
                            onChange={(event) => setSelectedMonth(event.target.value)}
                        />
                    ) : null}

                    {dateFilterMode === 'custom_range' ? (
                        <>
                            <input
                                className="dashboard-filter-input dashboard-date-input"
                                type="date"
                                value={customFromDate}
                                onChange={(event) => setCustomFromDate(event.target.value)}
                            />
                            <input
                                className="dashboard-filter-input dashboard-date-input"
                                type="date"
                                value={customToDate}
                                onChange={(event) => setCustomToDate(event.target.value)}
                            />
                        </>
                    ) : null}
                </div>
                <div className="dashboard-filter-summary">
                    <span className="dashboard-filter-chip">{deliveryAnalytics.meta.activeFilterLabel}</span>
                    <strong>{deliveryAnalytics.meta.monthRangeLabel}</strong>
                </div>
            </div>

            <div className="dashboard-header">
                <h1>{deliveryAnalytics.meta.monthTitle}</h1>
                <p>
                    {isCommerce
                        ? `${deliveryAnalytics.meta.monthRangeLabel}-ны хүргэлт болон 3 салбарын нийлбэр гүйцэтгэл, орлого, төлбөр, стратегийн дохиог нэг дэлгэц дээр харуулна.`
                        : `${deliveryAnalytics.meta.monthRangeLabel}-ны delivery гүйцэтгэл, орлого, төлбөр, стратегийн дохиог нэг дэлгэц дээр харуулна.`}
                </p>
            </div>

            <div className="section-card plan-entry-card">
                <div className="section-heading-row">
                    <div>
                        <h3>Төлөвлөгөө оруулах</h3>
                        <p>{deliveryAnalytics.meta.monthRangeLabel} хугацааны орлогын төлөвлөгөөг энд оруулна</p>
                    </div>
                    <div className="plan-entry-actions">
                        {currentPlanSavedAt ? (
                            <div className="plan-saved-note">
                                <span>Сүүлд хадгалсан</span>
                                <strong>{formatSavedAt(currentPlanSavedAt)}</strong>
                            </div>
                        ) : null}
                        {currentPlanTarget ? (
                            <button
                                type="button"
                                className="plan-secondary-btn"
                                onClick={() => {
                                    setPlanDraft(String(currentPlanTarget));
                                    setPlanSaveState('');
                                    setIsPlanEditorOpen((prev) => !prev);
                                }}
                            >
                                <PencilLine size={16} />
                                <span>{isPlanEditorOpen ? 'Хаах' : 'Засах'}</span>
                            </button>
                        ) : null}
                    </div>
                </div>
                <div className="plan-entry-grid">
                    <div className="target-hint-card">
                        <span>Санал болгосон орлогын target</span>
                        <strong>{formatMoney(deliveryAnalytics.plan.recommendedTarget)}</strong>
                        <small>Өмнөх ижил хугацаа болон одоогийн pace дээр суурилсан benchmark</small>
                    </div>
                    <div className="plan-summary-card">
                        <span>Хадгалсан төлөвлөгөө</span>
                        <strong>
                            {currentPlanTarget ? formatMoney(currentPlanTarget) : 'Оруулаагүй'}
                        </strong>
                        <small>
                            {planSaveState === 'saved'
                                ? `Төлөвлөгөө хадгалагдлаа${currentPlanSavedAt ? ` • ${formatSavedAt(currentPlanSavedAt)}` : ''}`
                                : 'Сонгосон хугацаанд харгалзах target'}
                        </small>
                    </div>
                    <div className="plan-summary-card accent">
                        <span>Одоогийн гүйцэтгэл</span>
                        <strong>
                            {deliveryAnalytics.plan.target
                                ? `${formatMoney(deliveryAnalytics.plan.actual)} / ${formatMoney(deliveryAnalytics.plan.target)}`
                                : `${formatMoney(deliveryAnalytics.plan.actual)} / -`}
                        </strong>
                        <small>
                            {deliveryAnalytics.plan.target
                                ? formatRate(deliveryAnalytics.plan.achievement)
                                : 'Achievement тооцоолохын тулд төлөвлөгөө оруулна уу'}
                        </small>
                    </div>
                </div>

                {isPlanEditorOpen || !currentPlanTarget ? (
                    <div className="plan-editor-panel">
                        <label className="target-input-group">
                            <span>Төлөвлөгөөт орлогын дүн</span>
                            <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                className="dashboard-date-input target-number-input plan-entry-input"
                                value={planDraft}
                                placeholder={`${deliveryAnalytics.plan.recommendedTarget}`}
                                onChange={(event) => {
                                    setPlanDraft(event.target.value.replace(/[^\d]/g, ''));
                                    setPlanSaveState('');
                                }}
                            />
                        </label>
                        <div className="plan-editor-footer">
                            <span className="plan-editor-note">
                                Төлөвлөгөөг зөвхөн `Хадгалах` дарсны дараа dashboard дээр тооцно.
                            </span>
                            <div className="plan-editor-buttons">
                                {currentPlanTarget ? (
                                    <button type="button" className="plan-secondary-btn" onClick={handleCancelPlanEdit}>
                                        Цуцлах
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="plan-primary-btn"
                                    onClick={handleSavePlan}
                                >
                                    <Save size={16} />
                                    <span>Хадгалах</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {errorMessage && (
                <div className="dashboard-alert">
                    <AlertTriangle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="stats-grid">
                {heroStats.map((stat) => (
                    <div key={stat.title} className="stat-card">
                        <div className="stat-icon">{stat.icon}</div>
                        <div className="stat-info">
                            <span className="stat-title">{stat.title}</span>
                            <h3 className="stat-value">{stat.value}</h3>
                            <div className={`stat-change ${stat.isUp ? 'up' : 'down'}`}>
                                {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                <span>{stat.change}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="analytics-top-grid">
                <div className="section-card compact-trend-card">
                    <RevenueTrendChart
                        points={deliveryAnalytics.time.revenueTrendPoints}
                        currentLabel={deliveryAnalytics.time.trendCurrentLabel}
                        previousLabel={deliveryAnalytics.time.trendPreviousLabel}
                        comparisonSummary={deliveryAnalytics.time.comparisonSummary}
                    />
                </div>

                <div className="section-card compact-products-card">
                    <ProductBreakdownPanel
                        products={deliveryAnalytics.quality.topProducts}
                        fromDate={customFromDate}
                        toDate={customToDate}
                        onFromChange={setCustomFromDate}
                        onToChange={setCustomToDate}
                        onEnableCustomRange={() => setDateFilterMode('custom_range')}
                    />
                </div>
            </div>

            {!isCommerce ? (
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Top SKU for delivery</h3>
                            <p>Attach rate болон bundle potential-тайгаар delivery дээр хамгийн их хөрвөдөг SKU-г ялгана</p>
                        </div>
                    </div>
                    <div className="delivery-sku-list">
                        {deliveryAnalytics.deliveryOps.topSkuInsights.length ? (
                            deliveryAnalytics.deliveryOps.topSkuInsights.map((item, index) => (
                                <div key={`${item.id}-${index}`} className="delivery-sku-card">
                                    <div className="delivery-sku-head">
                                        <div className="delivery-sku-label">
                                            <div className="product-pie-thumb delivery-sku-thumb">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} />
                                                ) : (
                                                    <span>{item.name.slice(0, 1)}</span>
                                                )}
                                            </div>
                                            <div className="delivery-sku-copy">
                                                <strong>{item.name}</strong>
                                                <small>{item.units} ш • {item.orderCount} order</small>
                                            </div>
                                        </div>
                                        <div className="delivery-sku-value">
                                            <strong>{formatMoney(item.revenue)}</strong>
                                            <span>{formatRate(item.attachRate)} attach rate</span>
                                        </div>
                                    </div>
                                    <div className="delivery-sku-meta">
                                        <div>
                                            <small>Bundle potential</small>
                                            <strong>
                                                {item.bundlePotential
                                                    ? `${item.bundlePotential.name} • ${item.bundlePotential.frequency} хамт авалт`
                                                    : 'Хамт авалтын өгөгдөл бага'}
                                            </strong>
                                        </div>
                                        <div>
                                            <small>AOV impact</small>
                                            <strong>{formatPercent(item.averageOrderValueImpact)}</strong>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">SKU-level delivery conversion өгөгдөл алга байна.</p>
                        )}
                    </div>
                </div>
            ) : null}

            {isCommerce ? (
                <div className="section-card commerce-channel-section">
                    <div className="section-heading-row">
                        <div>
                            <h3>Сувгийн орлогын харьцуулалт</h3>
                            <p>Хүргэлт, Шангри-Ла, Хан-Уул, Их дэлгүүрийн орлогыг нэг дороос харуулна</p>
                        </div>
                    </div>
                    <div className="commerce-channel-layout">
                        <div className="commerce-channel-pie-card">
                            <div
                                className="product-pie-chart commerce-channel-pie"
                                style={{
                                    background: `conic-gradient(${deliveryAnalytics.sales.channelPieSegments
                                        .map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`)
                                        .join(', ')})`,
                                }}
                            >
                                <div className="product-pie-center">
                                    <span>Нийт орлого</span>
                                    <strong>{formatMoney(deliveryAnalytics.sales.totalChannelRevenue)}</strong>
                                </div>
                            </div>
                            <small className="commerce-channel-highlight">
                                Тэргүүлэгч суваг: <strong>{deliveryAnalytics.sales.topRevenueChannel.name}</strong>
                            </small>
                        </div>

                        <div className="commerce-channel-bars">
                            {deliveryAnalytics.sales.channelRevenueBreakdown.map((channel) => (
                                <div key={channel.name} className="commerce-channel-row">
                                    <div className="commerce-channel-row-head">
                                        <div className="commerce-channel-label">
                                            <span
                                                className="payment-legend-dot"
                                                style={{ background: channel.color }}
                                            />
                                            <strong>{channel.name}</strong>
                                        </div>
                                        <span>{formatMoney(channel.revenue)}</span>
                                    </div>
                                    <div className="commerce-channel-bar">
                                        <span
                                            style={{
                                                width: `${
                                                    deliveryAnalytics.sales.totalChannelRevenue > 0
                                                        ? (channel.revenue / deliveryAnalytics.sales.totalChannelRevenue) * 100
                                                        : 0
                                                }%`,
                                                background: channel.color,
                                            }}
                                        />
                                    </div>
                                    <small>{channel.count} гүйлгээ • {formatRate(channel.share)}</small>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="dashboard-sections dashboard-sections-equal">
                <div className="section-card payment-sales-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Борлуулалт ба төлбөр</h3>
                            <p>{isCommerce ? 'Хүргэлт болон салбаруудын төлбөрийн бүтцийг pie chart-аар харуулна' : 'Төлбөрийн бүтцийг pie chart-аар хурдан харуулна'}</p>
                        </div>
                    </div>
                    <div className="payment-filter-bar">
                        <div className="payment-filter-title">Огноо сонгох</div>
                        <label className="payment-filter-field">
                            <small>Эхлэх огноо</small>
                            <input
                                className="product-filter-input payment-filter-input"
                                type="date"
                                value={customFromDate}
                                onChange={(event) => {
                                    setDateFilterMode('custom_range');
                                    setCustomFromDate(event.target.value);
                                }}
                            />
                        </label>
                        <label className="payment-filter-field">
                            <small>Дуусах огноо</small>
                            <input
                                className="product-filter-input payment-filter-input"
                                type="date"
                                value={customToDate}
                                onChange={(event) => {
                                    setDateFilterMode('custom_range');
                                    setCustomToDate(event.target.value);
                                }}
                            />
                        </label>
                    </div>
                    <div className="payment-panel payment-panel-standalone">
                        <div className="payment-donut-wrap">
                            <div
                                className="payment-donut"
                                style={{
                                    background: deliveryAnalytics.sales.paymentBreakdown.length
                                        ? `conic-gradient(${deliveryAnalytics.sales.paymentSegments})`
                                        : '#e2e8f0',
                                }}
                                >
                                    <div className="payment-donut-center">
                                        <span>Payment</span>
                                        <strong>{deliveryAnalytics.sales.paymentBreakdown.length}</strong>
                                </div>
                            </div>
                        </div>
                        <div className="payment-legend">
                            {deliveryAnalytics.sales.paymentBreakdown.length ? (
                                deliveryAnalytics.sales.paymentBreakdown.map((item) => (
                                    <div key={item.label} className="payment-legend-row">
                                        <div className="payment-legend-label">
                                            <span className="payment-legend-dot" style={{ background: item.color }} />
                                            <small>{item.label}</small>
                                        </div>
                                        <div className="payment-legend-value">
                                            <strong>{formatMoney(item.amount)}</strong>
                                            <span>{item.count} {isCommerce ? 'гүйлгээ' : 'order'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-text">Төлбөрийн мэдээлэл алга байна.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Стратегийн AI зөвлөгөө</h3>
                            <p>Dashboard-ын өгөгдлөөс борлуулалт өсгөх AI recommendation</p>
                        </div>
                        <button
                            type="button"
                            className="ai-refresh-btn"
                            onClick={() => setAdviceRefreshSeed((prev) => prev + 1)}
                        >
                            <RefreshCcw size={15} />
                            <span>Дахин шинэчлэх</span>
                        </button>
                    </div>
                    <div className="strategy-grid">
                        {strategicCards.map((card, index) => (
                            <div key={card.title} className="strategy-card">
                                <span>{`0${index + 1}`}</span>
                                <strong>{card.title}</strong>
                                <p>{card.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {!isCommerce ? (
                <div className="section-card visit-compare-card compact-visit-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Сайтын хандалт vs хүргэлт</h3>
                            <p>{visitComparisonAnalytics.rangeLabel} хугацааны conversion summary</p>
                        </div>
                        <div className="visit-range-controls">
                            <select
                                className="form-select dashboard-filter-input visit-range-select"
                                value={visitRangePreset}
                                onChange={(event) => setVisitRangePreset(event.target.value)}
                            >
                                <option value="7">7 хоног</option>
                                <option value="14">14 хоног</option>
                                <option value="30">1 сар</option>
                                <option value="custom">Хугацаа сонгох</option>
                            </select>
                            {visitRangePreset === 'custom' ? (
                                <>
                                    <input
                                        className="dashboard-filter-input dashboard-date-input visit-range-date"
                                        type="date"
                                        value={visitFromDate}
                                        onChange={(event) => setVisitFromDate(event.target.value)}
                                    />
                                    <input
                                        className="dashboard-filter-input dashboard-date-input visit-range-date"
                                        type="date"
                                        value={visitToDate}
                                        onChange={(event) => setVisitToDate(event.target.value)}
                                    />
                                </>
                            ) : null}
                        </div>
                    </div>

                    <div className="visit-bottom-layout">
                        <div className="visit-chart-card compact">
                            <div className="visit-chart-header">
                                <div className="visit-chart-legend">
                                    <span><i className="visits" />Сайт хандалт</span>
                                    <span><i className="deliveries" />Хүргэлт</span>
                                </div>
                                <div className="visit-chart-highlight">
                                    <small>Идэвхтэй өдөр</small>
                                    <strong>{visitComparisonAnalytics.bestDay.fullLabel}</strong>
                                </div>
                            </div>
                            <VisitDeliveryComparisonChart points={visitComparisonAnalytics.points} />
                        </div>

                        <div className="visit-bottom-side">
                                <div className="visit-compare-grid compact">
                                    <div className="visit-compare-metric">
                                    <span>Дундаж хандалт</span>
                                    <small className="visit-metric-term">Average Visits</small>
                                    <strong>{Math.round(visitComparisonAnalytics.avgVisits).toLocaleString()}</strong>
                                    <small>{formatPercent(visitComparisonAnalytics.avgVisitGrowth)}</small>
                                </div>
                                <div className="visit-compare-metric accent">
                                    <span>Дундаж хүргэлт</span>
                                    <small className="visit-metric-term">Average Deliveries</small>
                                    <strong>{visitComparisonAnalytics.avgDeliveries.toFixed(1)}</strong>
                                    <small>{formatPercent(visitComparisonAnalytics.avgDeliveryGrowth)}</small>
                                </div>
                                <div className="visit-compare-metric">
                                    <span>Хөрвөлт</span>
                                    <small className="visit-metric-term">Conversion Rate</small>
                                    <strong>{visitComparisonAnalytics.totalVisits ? formatRate(visitComparisonAnalytics.conversionRate) : '-'}</strong>
                                    <small>{formatPercent(visitComparisonAnalytics.conversionGrowth)}</small>
                                </div>
                            </div>

                            <div className="visit-insight-card compact">
                                <strong>AI зөвлөгөө</strong>
                                <p>{visitComparisonAnalytics.advice}</p>
                            </div>

                            <div className="visit-entry-inline">
                                <div className="visit-entry-copy">
                                    <strong>Хандалт оруулах</strong>
                                    <small>
                                        {currentVisitSavedAt
                                            ? `Сүүлд хадгалсан • ${formatSavedAt(currentVisitSavedAt)}`
                                            : 'Өдөр бүрийн хандалтаа хадгална'}
                                    </small>
                                    <small>
                                        {currentVisitTarget
                                            ? `${visitInputDate} • ${currentVisitTarget.toLocaleString()} хандалт хадгалсан`
                                            : `${visitInputDate} • хадгалсан утга алга`}
                                    </small>
                                </div>
                                <div className="visit-entry-controls">
                                    <input
                                        type="date"
                                        className="dashboard-date-input visit-inline-input"
                                        value={visitInputDate}
                                        onChange={(event) => setVisitInputDate(event.target.value)}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        inputMode="numeric"
                                        className="dashboard-date-input visit-inline-input"
                                        value={visitDraft}
                                        placeholder="Хандалт"
                                        onChange={(event) => {
                                            setVisitDraft(event.target.value.replace(/[^\d]/g, ''));
                                            setVisitSaveState('');
                                        }}
                                    />
                                    <button type="button" className="plan-primary-btn compact" onClick={handleSaveVisit}>
                                        <Save size={15} />
                                        <span>Хадгалах</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Dashboard;
