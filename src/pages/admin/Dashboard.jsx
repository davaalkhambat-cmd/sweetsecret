import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    ChartNoAxesColumn,
    CheckCircle2,
    CircleDollarSign,
    Clock3,
    MapPinned,
    RotateCcw,
    ShoppingBag,
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

const DEFAULT_CENTER = [47.9184, 106.9177];
const RANGE_OPTIONS = [1, 7, 30];
const WEEK_DAY_LABELS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`);
const MONTH_NAMES = ['1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар', '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'];

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
const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatRate = (value) => `${value.toFixed(1)}%`;
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

const Dashboard = () => {
    const now = Date.now();
    const todayDate = new Date(now);
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
                                createdAtMs: toMs(data.createdAt || data.updatedAt),
                                items: toItems(data.items),
                                customer: data.customerName || 'Walk-in Customer',
                            };
                        })
                    );
                },
                (error) => {
                    console.error('Sales snapshot error:', error);
                    setErrorMessage('Offline sales мэдээлэл уншихад алдаа гарлаа.');
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
        let selectedPeriodTitle = `${formatMonthPossessive(nowDate)} борлуулалтын мэдээлэл`;
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
            selectedPeriodTitle = `${month}-р сарын борлуулалтын мэдээлэл`;
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
            selectedPeriodTitle = 'Сонгосон хугацааны борлуулалтын мэдээлэл';
            selectedElapsedDays = diffDays;
            breakdownDays = diffDays;
            selectedMonthDisplay = `${selectedStartDate.getMonth() + 1}-р сар`;
            activeFilterLabel = 'Хугацаа сонгох';
        }

        const deliveryOrders = orders.filter((order) => order.isDelivery);
        const offlineSales = sales.filter((sale) => sale.createdAtMs > 0);
        const inRangeDeliveryOrders = deliveryOrders.filter((order) => order.createdAtMs >= mapRangeStartMs);
        const todaysDeliveries = deliveryOrders.filter((order) => order.createdAtMs >= todayStartMs);
        const weekDeliveries = deliveryOrders.filter((order) => order.createdAtMs >= weekStartMs);
        const selectedPeriodDeliveries = deliveryOrders.filter(
            (order) => order.createdAtMs >= selectedStartMs && order.createdAtMs <= selectedEndMs
        );
        const comparisonPeriodDeliveries = deliveryOrders.filter(
            (order) => order.createdAtMs >= comparisonStartMs && order.createdAtMs <= comparisonEndMs
        );
        const previousWeekDeliveries = deliveryOrders.filter(
            (order) => order.createdAtMs >= previousWeekStartMs && order.createdAtMs < weekStartMs
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
        const turnaroundMinutes = [];
        let completedCount = 0;
        let cancelledCount = 0;
        let returnedCount = 0;
        let deliveryRevenue = 0;
        let previousWeekRevenue = 0;

        deliveryOrders.forEach((order) => {
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

            if (order.status === 'completed') completedCount += 1;
            if (order.status === 'cancelled') cancelledCount += 1;
            if (order.status === 'returned') returnedCount += 1;

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

            if (order.completedAtMs > order.createdAtMs && order.status === 'completed') {
                turnaroundMinutes.push((order.completedAtMs - order.createdAtMs) / (1000 * 60));
            }
        });

        const totalDeliveryOrders = deliveryOrders.length;
        const weeklyOrderCount = weekDeliveries.length;
        const selectedPeriodOrderCount = selectedPeriodDeliveries.length;
        const averageDailyDeliveries = weeklyOrderCount / 7;
        const averageDailySelectedDeliveries = selectedPeriodOrderCount / Math.max(selectedElapsedDays, 1);
        const totalSalesRevenue =
            weekDeliveries.reduce((sum, order) => sum + order.total, 0) +
            offlineSales
                .filter((sale) => sale.createdAtMs >= weekStartMs)
                .reduce((sum, sale) => sum + sale.total, 0);
        const selectedPeriodRevenue = selectedPeriodDeliveries.reduce((sum, order) => sum + order.total, 0);
        const comparisonPeriodRevenue = comparisonPeriodDeliveries.reduce(
            (sum, order) => sum + order.total,
            0
        );
        const averageOrderValue = selectedPeriodOrderCount
            ? selectedPeriodRevenue / selectedPeriodOrderCount
            : 0;
        const basketValues = selectedPeriodDeliveries.map((order) => order.total);
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
            .slice(0, 5);
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
        const autoTarget = Math.max(10, Math.round(averageDailyDeliveries * 1.15));
        const todayActual = todaysDeliveries.length;
        const deliveryRevenueShare = totalSalesRevenue > 0 ? (deliveryRevenue / totalSalesRevenue) * 100 : 0;
        const profitabilityMix = [
            {
                label: 'Delivery',
                value: weekDeliveries.reduce((sum, order) => sum + order.total, 0),
            },
            {
                label: 'Offline',
                value: offlineSales
                    .filter((sale) => sale.createdAtMs >= weekStartMs)
                    .reduce((sum, sale) => sum + sale.total, 0),
            },
        ];
        const bestOrderType = [...profitabilityMix].sort((a, b) => b.value - a.value)[0];
        const recentDeliveries = [...weekDeliveries]
            .sort((a, b) => b.createdAtMs - a.createdAtMs)
            .slice(0, 6);
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
        const dailyBreakdown = dayBuckets.map((item) => ({
            ...item,
            orders: weekDeliveries.filter((order) => {
                const orderDate = new Date(order.createdAtMs);
                return `${orderDate.getMonth() + 1}/${orderDate.getDate()}` === item.label;
            }).length,
        }));
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

        return {
            meta: {
                monthLabel: selectedMonthDisplay,
                monthTitle: selectedPeriodTitle,
                monthRangeLabel: selectedPeriodLabel,
                elapsedDays: selectedElapsedDays,
                activeFilterLabel,
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
            },
            performance: {
                successRate: totalDeliveryOrders ? (completedCount / totalDeliveryOrders) * 100 : 0,
                cancelRate: totalDeliveryOrders ? (cancelledCount / totalDeliveryOrders) * 100 : 0,
                returnRate: totalDeliveryOrders ? (returnedCount / totalDeliveryOrders) * 100 : 0,
                averageTurnaround,
            },
            sales: {
                revenueShare: deliveryRevenueShare,
                deliveryRevenue,
                offlineRevenue: profitabilityMix.find((item) => item.label === 'Offline')?.value || 0,
                growthTrend: getGrowth(deliveryRevenue, previousWeekRevenue),
                bestOrderType,
                paymentBreakdown,
                paymentSegments,
            },
            geography: {
                topDistricts,
                coordinatesOrders,
                mapCenter,
            },
            plan: {
                target: autoTarget,
                actual: todayActual,
                achievement: autoTarget ? (todayActual / autoTarget) * 100 : 0,
            },
            strategy: {
                pushProduct: bestProduct?.name || 'Өгөгдөл дутуу',
                promoWindow: peakHour?.label || '-',
                addCapacity: averageTurnaround > 90 || todayActual > autoTarget,
                profitableType: bestOrderType?.label || '-',
            },
            recentDeliveries,
        };
    }, [customFromDate, customToDate, dateFilterMode, now, orders, products, rangeDays, sales, selectedMonth]);

    const heroStats = [
        {
            title: `${deliveryAnalytics.meta.monthLabel} хүргэлт`,
            value: deliveryAnalytics.totals.month.toLocaleString(),
            change: formatPercent(deliveryAnalytics.totals.monthOrdersGrowth),
            isUp: deliveryAnalytics.totals.monthOrdersGrowth >= 0,
            icon: <Truck size={22} color="#b45309" />,
        },
        {
            title: `${deliveryAnalytics.meta.monthLabel} орлого`,
            value: formatMoney(deliveryAnalytics.totals.monthRevenue),
            change: formatPercent(deliveryAnalytics.totals.monthRevenueGrowth),
            isUp: deliveryAnalytics.totals.monthRevenueGrowth >= 0,
            icon: <CircleDollarSign size={22} color="#047857" />,
        },
        {
            title: 'Өдрийн дундаж хүргэлт',
            value: deliveryAnalytics.totals.averageDailyMonthDeliveries.toFixed(1),
            change: `${deliveryAnalytics.meta.elapsedDays} хоногийн дундаж`,
            isUp: true,
            icon: <ShoppingBag size={22} color="#2563eb" />,
        },
        {
            title: 'Target achievement',
            value: formatRate(deliveryAnalytics.plan.achievement),
            change: `${deliveryAnalytics.plan.actual}/${deliveryAnalytics.plan.target} өнөөдөр`,
            isUp: deliveryAnalytics.plan.achievement >= 100,
            icon: <Target size={22} color="#7c3aed" />,
        },
    ];

    const strategicCards = [
        {
            title: 'Түлхэх бүтээгдэхүүн',
            value: deliveryAnalytics.strategy.pushProduct,
            note: 'Delivery-ээр хамгийн их эргэлттэй SKU',
        },
        {
            title: 'Promotion хийх цаг',
            value: deliveryAnalytics.strategy.promoWindow,
            note: 'Peak hour эхлэхээс 30-60 минутын өмнө идэвхжүүлэх',
        },
        {
            title: 'Capacity шийдвэр',
            value: deliveryAnalytics.strategy.addCapacity ? 'Нэмэх шаардлагатай' : 'Одоогийн багтаамж хүрэлцээтэй',
            note: 'Дундаж turnaround болон өнөөдрийн target-аас тооцсон',
        },
        {
            title: 'Ашигтай order type',
            value: deliveryAnalytics.strategy.profitableType,
            note: 'Сүүлийн 7 хоногийн revenue contribution',
        },
    ];

    return (
        <div className="dashboard-container">
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
                <p>{deliveryAnalytics.meta.monthRangeLabel}-ны delivery гүйцэтгэл, орлого, төлбөр, стратегийн дохиог нэг дэлгэц дээр харуулна.</p>
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

            <div className="delivery-summary-grid">
                <div className="section-card summary-card-feature">
                    <div className="section-heading-row">
                        <div>
                            <h3>Үндсэн KPI snapshot</h3>
                            <p>Менежментийн daily/weekly review-д хамгийн түрүүнд харах тоонууд</p>
                        </div>
                    </div>
                    <div className="mini-kpi-grid">
                        <div className="mini-kpi">
                            <span>Өнөөдрийн хүргэлт</span>
                            <strong>{deliveryAnalytics.totals.today}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>Өдрийн дундаж хүргэлт</span>
                            <strong>{deliveryAnalytics.totals.averageDailyMonthDeliveries.toFixed(1)}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>{deliveryAnalytics.meta.monthLabel} хүргэлтийн тоо</span>
                            <strong>{deliveryAnalytics.totals.month}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>{deliveryAnalytics.meta.monthLabel} орлого</span>
                            <strong>{formatMoney(deliveryAnalytics.totals.monthRevenue)}</strong>
                        </div>
                    </div>
                </div>

                <div className="section-card target-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Төлөвлөгөө vs Гүйцэтгэл</h3>
                            <p>Target нь trailing 7-day average дээр суурилсан auto benchmark</p>
                        </div>
                    </div>
                    <div className="target-progress-wrap">
                        <div className="target-progress-bar">
                            <span style={{ width: `${Math.min(deliveryAnalytics.plan.achievement, 100)}%` }} />
                        </div>
                        <div className="target-progress-meta">
                            <strong>{formatRate(deliveryAnalytics.plan.achievement)}</strong>
                            <span>{deliveryAnalytics.plan.actual} бодит / {deliveryAnalytics.plan.target} зорилт</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Захиалгын чанарын үзүүлэлт</h3>
                            <p>Basket quality болон түлхэх SKU-г ялгана</p>
                        </div>
                    </div>
                    <div className="mini-kpi-grid quality-grid">
                        <div className="mini-kpi">
                            <span>Хамгийн өндөр сагс</span>
                            <strong>{formatMoney(deliveryAnalytics.quality.maxBasket)}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>Хамгийн бага сагс</span>
                            <strong>{formatMoney(deliveryAnalytics.quality.minBasket)}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>Дундаж сагс</span>
                            <strong>{formatMoney(deliveryAnalytics.quality.avgBasket)}</strong>
                        </div>
                        <div className="mini-kpi">
                            <span>Хамгийн их зарагдсан</span>
                            <strong>{deliveryAnalytics.quality.topProduct?.name || '-'}</strong>
                        </div>
                    </div>
                    <div className="product-showcase-list">
                        {deliveryAnalytics.quality.topProducts.length ? (
                            deliveryAnalytics.quality.topProducts.map((product, index) => (
                                <div className="product-showcase-row" key={`${product.id}-${index}`}>
                                    <div className="product-showcase-left">
                                        <span className="ranking-index">#{index + 1}</span>
                                        <div className="product-showcase-thumb">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} />
                                            ) : (
                                                <span>{product.name.slice(0, 1)}</span>
                                            )}
                                        </div>
                                        <div className="product-showcase-meta">
                                            <span className="ranking-name">{product.name}</span>
                                            <small>{formatMoney(product.revenue)}</small>
                                        </div>
                                    </div>
                                    <strong>{product.soldQty} ш</strong>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Top бүтээгдэхүүний өгөгдөл алга байна.</p>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Гүйцэтгэлийн үзүүлэлт</h3>
                            <p>Operational health болон service level</p>
                        </div>
                    </div>
                    <div className="performance-grid">
                        <div className="performance-item success">
                            <CheckCircle2 size={18} />
                            <div>
                                <span>Амжилттай хүргэлт</span>
                                <strong>{formatRate(deliveryAnalytics.performance.successRate)}</strong>
                            </div>
                        </div>
                        <div className="performance-item danger">
                            <XCircle size={18} />
                            <div>
                                <span>Цуцлагдсан</span>
                                <strong>{formatRate(deliveryAnalytics.performance.cancelRate)}</strong>
                            </div>
                        </div>
                        <div className="performance-item warn">
                            <RotateCcw size={18} />
                            <div>
                                <span>Буцаалт</span>
                                <strong>{formatRate(deliveryAnalytics.performance.returnRate)}</strong>
                            </div>
                        </div>
                        <div className="performance-item neutral">
                            <TimerReset size={18} />
                            <div>
                                <span>Дундаж хүргэлтийн хугацаа</span>
                                <strong>{formatDuration(deliveryAnalytics.performance.averageTurnaround)}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Цаг хугацааны анализ</h3>
                            <p>Delivery demand curve болон ажиллах хуваарийн суурь</p>
                        </div>
                    </div>
                    <div className="mock-chart-container">
                        {deliveryAnalytics.time.trend.map((point) => (
                            <div key={point.key} className="chart-column">
                                <div className="chart-value">{point.total ? `₮${Math.round(point.total / 1000)}k` : '₮0'}</div>
                                <div className="chart-bar" style={{ height: `${point.percent}%` }} />
                                <div className="chart-label">{point.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="time-insight-row">
                        <div className="time-highlight-card">
                            <span>Хамгийн их захиалга ордог цаг</span>
                            <strong>{deliveryAnalytics.time.peakHour?.label || '-'}</strong>
                            <small>Promotion болон rider scheduling-ийн үндсэн slot</small>
                        </div>
                        <div className="top-hours-strip">
                            {deliveryAnalytics.time.topHours.length ? (
                                deliveryAnalytics.time.topHours.map((bucket, index) => (
                                    <div
                                        key={bucket.label}
                                        className={`hour-chip ${index === 0 ? 'active' : ''}`}
                                    >
                                        <span>{index === 0 ? 'Top slot' : `Top ${index + 1}`}</span>
                                        <strong>{bucket.label}</strong>
                                        <small>{bucket.count} захиалга</small>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-text">Цагийн ангиллын өгөгдөл алга байна.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Борлуулалт ба төлбөр</h3>
                            <p>Delivery contribution, суваг харьцуулалт, payment split</p>
                        </div>
                    </div>
                    <div className="sales-mix-grid">
                        <div className="sales-mix-item">
                            <span>Delivery revenue share</span>
                            <strong>{formatRate(deliveryAnalytics.sales.revenueShare)}</strong>
                        </div>
                        <div className="sales-mix-item">
                            <span>Delivery revenue</span>
                            <strong>{formatMoney(deliveryAnalytics.sales.deliveryRevenue)}</strong>
                        </div>
                        <div className="sales-mix-item">
                            <span>Offline revenue</span>
                            <strong>{formatMoney(deliveryAnalytics.sales.offlineRevenue)}</strong>
                        </div>
                        <div className="sales-mix-item">
                            <span>Growth trend</span>
                            <strong>{formatPercent(deliveryAnalytics.sales.growthTrend)}</strong>
                        </div>
                    </div>
                    <div className="sales-analysis-layout">
                        <div className="comparison-stack">
                            <div className="comparison-row">
                                <span>Delivery</span>
                                <div className="comparison-bar">
                                    <span
                                        style={{
                                            width: `${
                                                deliveryAnalytics.sales.deliveryRevenue + deliveryAnalytics.sales.offlineRevenue > 0
                                                    ? (deliveryAnalytics.sales.deliveryRevenue /
                                                          (deliveryAnalytics.sales.deliveryRevenue + deliveryAnalytics.sales.offlineRevenue)) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                                <strong>{formatMoney(deliveryAnalytics.sales.deliveryRevenue)}</strong>
                            </div>
                            <div className="comparison-row">
                                <span>Offline</span>
                                <div className="comparison-bar muted">
                                    <span
                                        style={{
                                            width: `${
                                                deliveryAnalytics.sales.deliveryRevenue + deliveryAnalytics.sales.offlineRevenue > 0
                                                    ? (deliveryAnalytics.sales.offlineRevenue /
                                                          (deliveryAnalytics.sales.deliveryRevenue + deliveryAnalytics.sales.offlineRevenue)) *
                                                      100
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>
                                <strong>{formatMoney(deliveryAnalytics.sales.offlineRevenue)}</strong>
                            </div>
                        </div>

                        <div className="payment-panel">
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
                                                <span
                                                    className="payment-legend-dot"
                                                    style={{ background: item.color }}
                                                />
                                                <small>{item.label}</small>
                                            </div>
                                            <div className="payment-legend-value">
                                                <strong>{formatMoney(item.amount)}</strong>
                                                <span>{item.count} order</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-state-text">Төлбөрийн мэдээлэл алга байна.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="section-card">
                <div className="section-heading-row">
                    <div>
                        <h3>{deliveryAnalytics.meta.monthLabel} өдөр өдрийн хүргэлт</h3>
                        <p>{deliveryAnalytics.meta.monthRangeLabel}-ны хүргэлтийн тоо болон дүн</p>
                    </div>
                </div>
                <div className="daily-table-wrap">
                    <table className="daily-breakdown-table">
                        <thead>
                            <tr>
                                <th>Огноо</th>
                                <th>Хүргэлтийн тоо</th>
                                <th>Хүргэлтийн дүн</th>
                                <th>Өдрийн хувь</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliveryAnalytics.time.monthDailyBreakdown.map((day) => (
                                <tr key={day.key}>
                                    <td>{day.label}</td>
                                    <td>{day.orders}</td>
                                    <td>{formatMoney(day.total)}</td>
                                    <td>{deliveryAnalytics.totals.monthRevenue > 0 ? formatRate((day.total / deliveryAnalytics.totals.monthRevenue) * 100) : '0.0%'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="section-card delivery-map-card">
                <div className="delivery-map-header">
                    <div>
                        <h3>Байршлын анализ</h3>
                        <p>Delivery heat map болон дүүргийн эрэлт</p>
                    </div>
                    <div className="range-switch">
                        {RANGE_OPTIONS.map((days) => (
                            <button
                                key={days}
                                type="button"
                                className={`range-btn ${rangeDays === days ? 'active' : ''}`}
                                onClick={() => setRangeDays(days)}
                            >
                                {days === 1 ? 'Өдөр' : `${days} хоног`}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="delivery-map-grid">
                    <div className="delivery-map-canvas">
                        <MapContainer center={deliveryAnalytics.geography.mapCenter} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {deliveryAnalytics.geography.coordinatesOrders.map((order) => (
                                <Marker key={order.id} position={order.coordinates} icon={deliveryMarkerIcon}>
                                    <Tooltip direction="top" offset={[0, -8]}>{order.customer}</Tooltip>
                                    <Popup>
                                        <div style={{ minWidth: '180px' }}>
                                            <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                                            <p style={{ margin: '6px 0' }}>{order.customer}</p>
                                            <p style={{ margin: '6px 0' }}>{formatMoney(order.total)}</p>
                                            <p style={{ margin: '6px 0' }}>{order.district || '-'}</p>
                                            {order.address ? <p style={{ margin: '6px 0' }}>{order.address}</p> : null}
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>

                    <div className="delivery-side">
                        <div className="delivery-kpis">
                            <div className="delivery-kpi">
                                <MapPinned size={16} />
                                <div>
                                    <span>Координаттай хүргэлт</span>
                                    <strong>{deliveryAnalytics.geography.coordinatesOrders.length}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <Users size={16} />
                                <div>
                                    <span>Тэргүүлэгч дүүрэг</span>
                                    <strong>{deliveryAnalytics.geography.topDistricts[0]?.district || '-'}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <ChartNoAxesColumn size={16} />
                                <div>
                                    <span>Хамгийн их захиалга</span>
                                    <strong>{deliveryAnalytics.geography.topDistricts[0]?.count || 0}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <Clock3 size={16} />
                                <div>
                                    <span>Сонгосон хугацаа</span>
                                    <strong>{rangeDays === 1 ? 'Өдөр' : `${rangeDays} хоног`}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="delivery-list">
                            <h4>
                                <MapPinned size={14} />
                                <span>Top дүүргүүд</span>
                            </h4>
                            {deliveryAnalytics.geography.topDistricts.length ? (
                                deliveryAnalytics.geography.topDistricts.map((item) => (
                                    <div key={item.district} className="delivery-row">
                                        <div>
                                            <p>{item.district}</p>
                                            <small>Захиалгын тоо</small>
                                        </div>
                                        <div>
                                            <p>{item.count}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-text">Дүүргийн өгөгдөл алга байна.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections dashboard-sections-equal">
                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Стратегийн мэдээлэл</h3>
                            <p>Dashboard-аас шууд гаргах шийдвэрийн санал</p>
                        </div>
                    </div>
                    <div className="strategy-grid">
                        {strategicCards.map((card) => (
                            <div key={card.title} className="strategy-card">
                                <span>{card.title}</span>
                                <strong>{card.value}</strong>
                                <small>{card.note}</small>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-card">
                    <div className="section-heading-row">
                        <div>
                            <h3>Сүүлийн хүргэлтүүд</h3>
                            <p>Execution-level follow-up шаардлагатай order-уудыг хурдан шалгана</p>
                        </div>
                    </div>
                    <div className="delivery-list recent-delivery-list">
                        {loading ? (
                            <p className="empty-state-text">Уншиж байна...</p>
                        ) : deliveryAnalytics.recentDeliveries.length ? (
                            deliveryAnalytics.recentDeliveries.map((order) => (
                                <div key={order.id} className="delivery-row">
                                    <div>
                                        <p>#{order.id.slice(0, 6).toUpperCase()}</p>
                                        <small>{order.customer}</small>
                                    </div>
                                    <div>
                                        <p>{formatMoney(order.total)}</p>
                                        <small>{order.rawStatus}</small>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Сүүлийн хүргэлтийн өгөгдөл алга байна.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
