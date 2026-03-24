import React, { useEffect, useMemo, useState } from 'react';
import {
    Search,
    Eye,
    Download,
    Filter,
    Plus,
    X,
    CheckCircle2,
    Clock,
    Truck,
    PackageCheck,
    AlertCircle,
    Calendar,
    ChevronDown,
    MapPin,
    User,
    Phone,
    Trash2,
    SearchIcon,
    ShoppingCart,
    MapPinned,
    Tags,
    Facebook,
    Instagram,
    Globe,
    MessageCircle,
    Wallet,
    CreditCard,
    Star,
    ArrowLeft,
    ArrowRight,
    Mail,
    ShoppingBag,
    ShieldCheck,
    Target,
    TrendingUp,
    ChartNoAxesColumn,
    Sparkles,
    CircleDollarSign,
} from 'lucide-react';
import {
    collection,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    serverTimestamp,
    addDoc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
    pending: { label: 'Хүлээгдэж буй', color: '#C2410C', icon: <Clock size={16} />, class: 'pending' },
    processing: { label: 'Баталгаажсан', color: '#1D4ED8', icon: <CheckCircle2 size={16} />, class: 'processing' },
    shipped: { label: 'Хүргэлтэнд', color: '#15803D', icon: <Truck size={16} />, class: 'shipped' },
    completed: { label: 'Хүргэгдсэн', color: '#059669', icon: <PackageCheck size={16} />, class: 'completed' },
    cancelled: { label: 'Цуцлагдсан', color: '#DC2626', icon: <AlertCircle size={16} />, class: 'cancelled' },
};

const DEFAULT_DAILY_TARGET = 1500000;
const DAILY_TARGET_STORAGE_KEY = 'sweet-secret-orders-daily-target';
const DAILY_NEWS_STORAGE_KEY = 'sweet-secret-orders-daily-news';
const DAILY_REPORT_DELIVERY_FEE = 10000;

const calculateSubtotalAmount = (items = []) =>
    items.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

const getDiscountAmountValue = (items = [], discount, discountType) => {
    const subtotal = calculateSubtotalAmount(items);
    if (discountType === 'percent') {
        return (subtotal * (Number(discount) || 0)) / 100;
    }
    return Number(discount) || 0;
};

const itemCountLabel = (count) => `${count} захиалга`;
const SELLER_AVATARS = ['👩🏻', '👩🏽', '👩🏾', '👩🏼', '👩🏿', '👩'];

const getSavedDeliveryFee = (order) => {
    if ((order?.deliveryType || 'delivery') !== 'delivery') return 0;
    const deliveryFee = Number(order?.deliveryFee);
    return Number.isFinite(deliveryFee) ? deliveryFee : 0;
};

const allocateAmountByWeight = (weights = [], totalAmount = 0) => {
    const normalizedTotal = Math.round(Number(totalAmount) || 0);
    if (!weights.length || normalizedTotal === 0) {
        return weights.map(() => 0);
    }

    const totalWeight = weights.reduce((sum, weight) => sum + (Number(weight) || 0), 0);
    if (totalWeight <= 0) {
        const base = Math.trunc(normalizedTotal / weights.length);
        const remainder = normalizedTotal - (base * weights.length);
        return weights.map((_, index) => base + (index < remainder ? 1 : 0));
    }

    const allocations = weights.map((weight, index) => {
        const raw = (normalizedTotal * (Number(weight) || 0)) / totalWeight;
        const floorValue = Math.floor(raw);
        return {
            index,
            floorValue,
            fraction: raw - floorValue,
        };
    });

    let remainder = normalizedTotal - allocations.reduce((sum, item) => sum + item.floorValue, 0);
    allocations
        .sort((a, b) => b.fraction - a.fraction)
        .forEach((item) => {
            if (remainder <= 0) return;
            item.floorValue += 1;
            remainder -= 1;
        });

    return allocations
        .sort((a, b) => a.index - b.index)
        .map((item) => item.floorValue);
};

const MONGOLIAN_MONTHS = [
    '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
    '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар'
];

const MONGOLIAN_WEEKDAYS = [
    'Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'
];

const DAILY_MOTIVATION_MESSAGES = [
    'Өнөөдрийн борлуулалтандаа амжилт. Тодорхой, хурдан ажиллаарай.',
    'Өнөөдрийн борлуулалтандаа амжилт. Захиалга бүрийг цэгцтэй хаагаарай.',
    'Өнөөдрийн борлуулалтандаа амжилт. Харилцагч бүрт итгэлтэй санал өгөөрэй.',
    'Өнөөдрийн борлуулалтандаа амжилт. Өдрийн хэмнэлээ сайн бариарай.',
    'Өнөөдрийн борлуулалтандаа амжилт. Сайн эхэлбэл өдөр цэгцтэй явна.',
    'Өнөөдрийн борлуулалтандаа амжилт. Жижиг шийдвэр бүр үр дүн авчирна.',
    'Өнөөдрийн борлуулалтандаа амжилт. Өнөөдрийн зорилгоо тайван, нягт гүйцээгээрэй.',
];

const buildPieCallouts = (items = []) => {
    const total = items.reduce((sum, item) => sum + (Number(item.share) || 0), 0);
    if (!total) return [];

    let currentAngle = -90;
    return items.map((item) => {
        const sliceAngle = ((Number(item.share) || 0) / total) * 360;
        const midAngle = currentAngle + sliceAngle / 2;
        const radians = (midAngle * Math.PI) / 180;
        const centerX = 110;
        const centerY = 68;
        const radiusX = 66;
        const radiusY = 42;
        currentAngle += sliceAngle;

        return {
            ...item,
            anchorX: centerX + Math.cos(radians) * radiusX,
            anchorY: centerY + Math.sin(radians) * radiusY,
            align: Math.cos(radians) >= 0 ? 'right' : 'left',
        };
    });
};

const getSellerAvatar = (seed = '', index = 0) => {
    const source = String(seed || index);
    const hash = [...source].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return SELLER_AVATARS[hash % SELLER_AVATARS.length];
};

const escapeRegExp = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderHighlightedText = (value, query) => {
    const text = String(value ?? '');
    const normalizedQuery = String(query || '').trim();
    if (!normalizedQuery) return text;

    const matcher = new RegExp(`(${escapeRegExp(normalizedQuery)})`, 'ig');
    const parts = text.split(matcher);
    const lowerQuery = normalizedQuery.toLowerCase();

    return parts.map((part, index) => (
        part.toLowerCase() === lowerQuery
            ? <mark key={`${part}-${index}`} className="orders-search-highlight">{part}</mark>
            : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
    ));
};

const Orders = () => {
    const { user: currentUser, isAdmin } = useAuth();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
    const [dailyTarget, setDailyTarget] = useState(DEFAULT_DAILY_TARGET);
    const [dailyTargetDraft, setDailyTargetDraft] = useState(String(DEFAULT_DAILY_TARGET));
    const [dailyTargetSaved, setDailyTargetSaved] = useState(true);
    const [isDailyTargetEditing, setIsDailyTargetEditing] = useState(false);
    const [weatherSummary, setWeatherSummary] = useState('Цаг агаар уншиж байна...');
    const [dailyNews, setDailyNews] = useState('');
    const [dailyNewsDraft, setDailyNewsDraft] = useState('');
    const [isDailyNewsEditing, setIsDailyNewsEditing] = useState(false);

    // New Order Form State with Structured Address
    const [newOrder, setNewOrder] = useState({
        customerName: '',
        phoneNumber: '',
        email: '',
        address: {
            zone: 'Улаанбаатар',
            city: 'Улаанбаатар',
            district: '',
            khoroo: '',
            fullAddress: '',
            additionalInfo: '',
        },
        items: [],
        status: 'pending',
        deliveryType: 'delivery',
        paymentMethod: 'bank_transfer',
        deliveryFee: 10000,
        discount: 0,
        discountType: 'amount', // 'amount' or 'percent'
        source: '',
    });

    const SOURCE_OPTIONS = [
        { key: 'facebook', label: 'Facebook', icon: <Facebook size={14} /> },
        { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} /> },
        { key: 'website', label: 'Веб сайт', icon: <Globe size={14} /> },
        { key: 'phone', label: 'Утас', icon: <Phone size={14} /> },
        { key: 'banana', label: 'Banana Mall', icon: <ShoppingBag size={14} /> },
        { key: 'shoppy', label: 'Shoppy', icon: <ShoppingBag size={14} /> },
        { key: 'contracted', label: 'Гэрээт', icon: <ShieldCheck size={14} /> },
        { key: 'other', label: 'Бусад', icon: <MessageCircle size={14} /> },
    ];

    const PAYMENT_METHODS = [
        { key: 'bank_transfer', label: 'Данс' },
        { key: 'qpay', label: 'QPay' },
        { key: 'storepay', label: 'Storepay' },
        { key: 'pocket', label: 'Pocket' },
        { key: 'sono', label: 'Sono' },
        { key: 'monpay', label: 'Monpay' },
    ];

    const UB_LOCATIONS = {
        'Баянгол': Array.from({ length: 25 }, (_, i) => `${i + 1}-р хороо`),
        'Баянзүрх': Array.from({ length: 30 }, (_, i) => `${i + 1}-р хороо`),
        'Сонгинохайрхан': Array.from({ length: 43 }, (_, i) => `${i + 1}-р хороо`),
        'Сүхбаатар': Array.from({ length: 20 }, (_, i) => `${i + 1}-р хороо`),
        'Хан-Уул': Array.from({ length: 21 }, (_, i) => `${i + 1}-р хороо`),
        'Чингэлтэй': Array.from({ length: 19 }, (_, i) => `${i + 1}-р хороо`),
        'Багануур': Array.from({ length: 5 }, (_, i) => `${i + 1}-р хороо`),
        'Багахангай': Array.from({ length: 2 }, (_, i) => `${i + 1}-р хороо`),
        'Налайх': Array.from({ length: 8 }, (_, i) => `${i + 1}-р хороо`),
    };

    const AIMAGS = [
        'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган', 'Говь-Алтай', 'Говьсүмбэр', 'Дархан-Уул', 'Дорнод', 'Дорноговь', 'Дундговь', 'Завхан', 'Орхон', 'Өвөрхангай', 'Өмнөговь', 'Сүхбаатар', 'Сэлэнгэ', 'Төв', 'Увс', 'Ховд', 'Хөвсгөл', 'Хэнтий'
    ];

    // Product Search State
    const [productSearch, setProductSearch] = useState('');
    const [isProductListOpen, setIsProductListOpen] = useState(false);

    useEffect(() => {
        const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            setOrders(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
            setLoading(false);
        });

        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            setProducts(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        });

        return () => { unsubOrders(); unsubProducts(); unsubUsers(); };
    }, []);

    useEffect(() => {
        try {
            const storedTarget = window.localStorage.getItem(DAILY_TARGET_STORAGE_KEY);
            if (storedTarget) {
                const parsedTarget = Number(JSON.parse(storedTarget));
                if (Number.isFinite(parsedTarget) && parsedTarget > 0) {
                    setDailyTarget(parsedTarget);
                    setDailyTargetDraft(String(parsedTarget));
                }
            }
        } catch (error) {
            console.error('Daily target read error:', error);
        }
    }, []);

    useEffect(() => {
        try {
            const storedNews = JSON.parse(window.localStorage.getItem(DAILY_NEWS_STORAGE_KEY) || '{}');
            const todayKey = new Date().toISOString().slice(0, 10);
            const todayNews = storedNews[todayKey] || '';
            setDailyNews(todayNews);
            setDailyNewsDraft(todayNews);
        } catch (error) {
            console.error('Daily news read error:', error);
        }
    }, []);

    useEffect(() => {
        try {
            window.localStorage.setItem(DAILY_TARGET_STORAGE_KEY, JSON.stringify(dailyTarget));
        } catch (error) {
            console.error('Daily target write error:', error);
        }
    }, [dailyTarget]);

    useEffect(() => {
        let isMounted = true;

        const weatherCodeMap = {
            0: 'Цэлмэг',
            1: 'Бага зэрэг үүлэрхэг',
            2: 'Үүлэрхэг',
            3: 'Бүрхэг',
            45: 'Манантай',
            48: 'Манантай',
            51: 'Шиврээ',
            53: 'Шиврээ',
            55: 'Шиврээ',
            61: 'Бороо',
            63: 'Бороо',
            65: 'Ширүүн бороо',
            71: 'Цастай',
            73: 'Цастай',
            75: 'Цастай',
            80: 'Аадар',
            81: 'Аадар',
            82: 'Ширүүн аадар',
            95: 'Аянгатай',
        };

        const loadWeather = async () => {
            try {
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=47.9184&longitude=106.9177&current=temperature_2m,weather_code&timezone=Asia%2FUlaanbaatar'
                );
                const data = await response.json();
                const temperature = Math.round(data?.current?.temperature_2m ?? 0);
                const weatherLabel = weatherCodeMap[data?.current?.weather_code] || 'Тогтуун';
                if (isMounted) {
                    setWeatherSummary(`${weatherLabel} • ${temperature}°C`);
                }
            } catch (error) {
                if (isMounted) setWeatherSummary('Улаанбаатар • Цаг агааргүй');
            }
        };

        loadWeather();

        return () => {
            isMounted = false;
        };
    }, []);

    const filteredOrders = useMemo(() => orders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.phoneNumber || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        const matchesSource = sourceFilter === 'all' || o.source === sourceFilter;
        const matchesPayment = paymentFilter === 'all' || o.paymentMethod === paymentFilter;

        let matchesDate = true;
        if (o.createdAt) {
            const orderTimestamp = o.createdAt.toMillis();
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                if (orderTimestamp < start) matchesDate = false;
            }
            if (endDate && matchesDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                if (orderTimestamp > end) matchesDate = false;
            }
        }

        return matchesSearch && matchesStatus && matchesSource && matchesPayment && matchesDate;
    }), [orders, searchTerm, statusFilter, sourceFilter, paymentFilter, startDate, endDate]);

    const stats = useMemo(() => ({
        totalCount: orders.length,
        pendingCount: orders.filter(o => o.status === 'pending').length,
        processingCount: orders.filter(o => o.status === 'processing').length,
        totalRevenue: orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
    }), [orders]);

    const todaysPerformance = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const todaysOrders = orders.filter((order) => {
            if (!order.createdAt) return false;
            const createdAt = new Date(order.createdAt.toMillis());
            return createdAt >= startOfDay && createdAt <= endOfDay;
        });

        const merchandiseSubtotal = todaysOrders.reduce(
            (sum, order) => sum + calculateSubtotalAmount(order.items || []),
            0
        );
        const totalDiscount = todaysOrders.reduce(
            (sum, order) => sum + getDiscountAmountValue(order.items || [], order.discount, order.discountType),
            0
        );
        const totalDelivery = todaysOrders.reduce((sum, order) => {
            return sum + getSavedDeliveryFee(order);
        }, 0);
        const totalSales = todaysOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        const totalOrders = todaysOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        const progress = dailyTarget > 0 ? (totalSales / dailyTarget) * 100 : 0;
        const gapAmount = Math.abs(dailyTarget - totalSales);

        const paymentColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];
        const sourceColors = ['#1d4ed8', '#db2777', '#0f766e', '#ea580c', '#7c3aed', '#0891b2', '#16a34a', '#64748b'];

        const paymentBreakdown = PAYMENT_METHODS.map((method, index) => {
            const amount = todaysOrders
                .filter((order) => order.paymentMethod === method.key)
                .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
            const share = totalSales > 0 ? (amount / totalSales) * 100 : 0;
            return {
                ...method,
                amount,
                share,
                color: paymentColors[index % paymentColors.length],
            };
        }).sort((a, b) => b.amount - a.amount);

        const sourceBreakdown = SOURCE_OPTIONS.map((source, index) => {
            const count = todaysOrders.filter((order) => order.source === source.key).length;
            const share = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
            return {
                ...source,
                count,
                share,
                color: sourceColors[index % sourceColors.length],
            };
        }).sort((a, b) => b.count - a.count);

        const buildPieSegments = (items) => {
            const total = items.reduce((sum, item) => sum + (item.share || 0), 0);
            if (total <= 0) return 'conic-gradient(#e2e8f0 0% 100%)';

            let current = 0;
            const segments = items
                .filter((item) => item.share > 0)
                .map((item) => {
                    const start = current;
                    current += item.share;
                    return `${item.color} ${start}% ${current}%`;
                });

            return `conic-gradient(${segments.join(', ')})`;
        };

        const visiblePaymentBreakdown = paymentBreakdown.filter((item) => item.amount > 0);
        const visibleSourceBreakdown = sourceBreakdown.filter((item) => item.count > 0);
        const topProductsMap = new Map();

        todaysOrders.forEach((order) => {
            const orderItems = order.items || [];
            const orderSubtotal = calculateSubtotalAmount(orderItems);
            const orderDiscount = getDiscountAmountValue(orderItems, order.discount, order.discountType);
            const orderDelivery = getSavedDeliveryFee(order);
            const itemSubtotals = orderItems.map((item) => (Number(item.quantity) || 0) * (Number(item.price) || 0));
            const itemWeights = orderSubtotal > 0
                ? itemSubtotals
                : orderItems.map(() => 1);
            const allocatedDeliveries = allocateAmountByWeight(itemWeights, orderDelivery);
            const allocatedDiscounts = allocateAmountByWeight(itemWeights, orderDiscount);

            orderItems.forEach((item, index) => {
                const key = item.id || item.code || item.name;
                const current = topProductsMap.get(key) || {
                    key,
                    name: item.name || 'Бүтээгдэхүүн',
                    quantity: 0,
                    revenue: 0,
                    delivery: 0,
                    discount: 0,
                    payable: 0,
                };
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const itemSubtotal = itemSubtotals[index] || (quantity * price);
                const allocatedDelivery = allocatedDeliveries[index] || 0;
                const allocatedDiscount = allocatedDiscounts[index] || 0;

                current.quantity += quantity;
                current.revenue += itemSubtotal;
                current.delivery += allocatedDelivery;
                current.discount += allocatedDiscount;
                current.payable += itemSubtotal + allocatedDelivery - allocatedDiscount;
                topProductsMap.set(key, current);
            });
        });

        const productBreakdown = [...topProductsMap.values()]
            .sort((a, b) => b.payable - a.payable)
            .map((item) => ({
                ...item,
                share: totalSales > 0 ? (item.payable / totalSales) * 100 : 0,
            }));
        const topProducts = productBreakdown.slice(0, 5);

        let progressTone = 'neutral';
        if (progress >= 100) progressTone = 'success';
        else if (progress >= 80) progressTone = 'good';
        else if (progress >= 50) progressTone = 'warning';

        return {
            totalSales,
            merchandiseSubtotal,
            totalDelivery,
            totalDiscount,
            totalOrders,
            averageOrderValue,
            target: dailyTarget,
            progress,
            progressTone,
            gapAmount,
            isTargetMet: totalSales >= dailyTarget,
            paymentBreakdown,
            visiblePaymentBreakdown,
            paymentChartStyle: buildPieSegments(paymentBreakdown),
            sourceBreakdown,
            visibleSourceBreakdown,
            sourceChartStyle: buildPieSegments(sourceBreakdown),
            productBreakdown,
            topProducts,
        };
    }, [dailyTarget, orders]);

    const monthlyTopSellers = useMemo(() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const sellerMap = new Map();

        orders.forEach((order) => {
            if (!order.createdAt || !order.createdBy) return;
            const createdAt =
                typeof order.createdAt?.toMillis === 'function'
                    ? new Date(order.createdAt.toMillis())
                    : new Date(order.createdAt);
            if (Number.isNaN(createdAt.getTime()) || createdAt < monthStart || createdAt > monthEnd) return;

            const sellerKey = order.createdBy;
            const matchedUser = users.find((user) => user.uid === sellerKey || user.id === sellerKey);
            const current = sellerMap.get(sellerKey) || {
                key: sellerKey,
                name: matchedUser?.displayName || matchedUser?.email || 'Ажилтан',
                photoURL: matchedUser?.photoURL || '',
                totalSales: 0,
                orderCount: 0,
            };

            current.totalSales += Number(order.totalAmount) || 0;
            current.orderCount += 1;
            sellerMap.set(sellerKey, current);
        });

        const rankedSellers = [...sellerMap.values()]
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 2);
        const topSellerTotal = rankedSellers.reduce((sum, seller) => sum + seller.totalSales, 0);

        return rankedSellers.map((seller) => ({
            ...seller,
            share: topSellerTotal > 0 ? (seller.totalSales / topSellerTotal) * 100 : 0,
        }));
    }, [orders, users]);

    const selectedCustomerPaymentInsights = useMemo(() => {
        if (!selectedOrder) return null;

        const customerOrders = orders.filter((order) =>
            (selectedOrder.userId && order.userId === selectedOrder.userId) ||
            (selectedOrder.phoneNumber && order.phoneNumber === selectedOrder.phoneNumber) ||
            (selectedOrder.email && selectedOrder.email !== '' && order.email === selectedOrder.email)
        );

        const totalAmount = customerOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        const paymentRows = PAYMENT_METHODS.map((method) => {
            const amount = customerOrders
                .filter((order) => order.paymentMethod === method.key)
                .reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
            const share = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
            return {
                ...method,
                amount,
                share,
            };
        }).sort((a, b) => b.amount - a.amount);

        const preferredMethod = paymentRows[0] || null;
        const secondaryMethod = paymentRows[1] || null;
        const recommendation = preferredMethod && preferredMethod.amount > 0
            ? preferredMethod.share >= 55
                ? `${preferredMethod.label}-ийг түрүүлж санал болго.`
                : secondaryMethod && secondaryMethod.amount > 0
                    ? `${preferredMethod.label} эсвэл ${secondaryMethod.label} хоёрын аль нэгийг санал болго.`
                    : `${preferredMethod.label}-ийг санал болго.`
            : 'Төлбөрийн түүх хангалтгүй байна.';

        return {
            customerOrdersCount: customerOrders.length,
            totalAmount,
            paymentRows,
            preferredMethod,
            recommendation,
        };
    }, [orders, selectedOrder]);

    const getMembershipTier = (userRecord) => {
        if (!userRecord) return null;
        const tier = userRecord.tier || userRecord.role === 'customer' ? 'Pink' : null;
        // Simple logic if tier isn't explicitly set: Use Pink as default for customers
        return userRecord.membershipTier || tier || 'Pink';
    };

    const renderMembershipTier = (tier) => {
        if (!tier) return null;
        const colors = {
            'Pink': { bg: '#FFF1F2', text: '#FF85A1', border: '#FFE4E6' },
            'Glow': { bg: '#FFFBEB', text: '#D97706', border: '#FEF3C7' },
            'Rouge': { bg: '#FEF2F2', text: '#991B1B', border: '#FEE2E2' },
            'Diamond': { bg: '#F8FAFC', text: '#0F172A', border: '#F1F5F9' }
        };
        const style = colors[tier] || colors['Pink'];
        return (
            <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`,
                fontWeight: 700,
                textTransform: 'uppercase',
                marginLeft: '8px'
            }}>
                {tier}
            </span>
        );
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.uid || 'admin'
            });
            if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus });
        } catch (error) {
            console.error("Update status error:", error);
            alert("Алдаа гарлаа.");
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!isAdmin) return alert("Зөвхөн админ устгах эрхтэй.");
        if (!window.confirm("Та энэ захиалгыг устгахдаа итгэлтэй байна уу?")) return;

        try {
            await deleteDoc(doc(db, 'orders', orderId));
            alert("Захиалга амжилттай устгагдлаа.");
        } catch (error) {
            console.error("Delete order error:", error);
            alert("Устгах үед алдаа гарлаа.");
        }
    };

    const searchableProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
    }, [products, productSearch]);

    const getItemImage = (item) => {
        if (item.image) return item.image;
        // Fallback to searching in products list by id or name
        const p = products.find(prod => prod.id === item.id || prod.name === item.name);
        return p?.image || p?.images?.[0] || 'https://placehold.co/100x100?text=Beauty';
    };

    const addProductToOrder = (prod) => {
        const existing = newOrder.items.find(i => i.id === prod.id);
        if (existing) {
            setNewOrder({
                ...newOrder,
                items: newOrder.items.map(i => i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i)
            });
        } else {
            setNewOrder({
                ...newOrder,
                items: [...newOrder.items, {
                    id: prod.id,
                    name: prod.name,
                    image: prod.image || prod.images?.[0] || '',
                    code: prod.code || prod.sku || '',
                    price: prod.price || prod.salePrice,
                    quantity: 1
                }]
            });
        }
        setProductSearch('');
        setIsProductListOpen(false);
    };

    const calculateSubtotal = (items) => calculateSubtotalAmount(items);
    const calculateTotal = (items, fee, discount, discountType = 'amount') => {
        const subtotal = calculateSubtotal(items);
        let discountValue = Number(discount) || 0;
        if (discountType === 'percent') {
            discountValue = (subtotal * (Number(discount) || 0)) / 100;
        }
        return subtotal + (Number(fee) || 0) - discountValue;
    };

    const getDiscountAmount = (items, discount, discountType) => {
        return getDiscountAmountValue(items, discount, discountType);
    };

    // Number Formatting Helpers
    const formatNumberInput = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = val.toString().replace(/[^0-9]/g, '');
        if (num === '') return '';
        return parseInt(num).toLocaleString();
    };

    const parseNumberInput = (val) => {
        if (!val) return 0;
        const num = val.toString().replace(/[^0-9]/g, '');
        return num === '' ? 0 : parseInt(num);
    };

    const formatCurrency = (value) => `₮${(Number(value) || 0).toLocaleString()}`;

    const handleDailyTargetSave = () => {
        const nextTarget = parseNumberInput(dailyTargetDraft);
        if (!nextTarget) {
            setDailyTarget(DEFAULT_DAILY_TARGET);
            setDailyTargetDraft(String(DEFAULT_DAILY_TARGET));
            setDailyTargetSaved(true);
            setIsDailyTargetEditing(false);
            return;
        }
        setDailyTarget(nextTarget);
        setDailyTargetDraft(String(nextTarget));
        setDailyTargetSaved(true);
        setIsDailyTargetEditing(false);
    };

    const handleDailyNewsSave = () => {
        const nextNews = String(dailyNewsDraft || '').trim();
        const todayKey = new Date().toISOString().slice(0, 10);
        try {
            const storedNews = JSON.parse(window.localStorage.getItem(DAILY_NEWS_STORAGE_KEY) || '{}');
            storedNews[todayKey] = nextNews;
            window.localStorage.setItem(DAILY_NEWS_STORAGE_KEY, JSON.stringify(storedNews));
        } catch (error) {
            console.error('Daily news write error:', error);
        }
        setDailyNews(nextNews);
        setDailyNewsDraft(nextNews);
        setIsDailyNewsEditing(false);
    };

    const paymentChartItems = todaysPerformance.visiblePaymentBreakdown.length
        ? todaysPerformance.visiblePaymentBreakdown
        : todaysPerformance.paymentBreakdown.slice(0, 3);

    const sourceChartItems = todaysPerformance.visibleSourceBreakdown.length
        ? todaysPerformance.visibleSourceBreakdown
        : todaysPerformance.sourceBreakdown.slice(0, 3);

    const paymentCallouts = useMemo(() => buildPieCallouts(paymentChartItems), [paymentChartItems]);
    const sourceCallouts = useMemo(() => buildPieCallouts(sourceChartItems), [sourceChartItems]);

    const todayMeta = useMemo(() => {
        const now = new Date();
        return {
            dateLabel: `${now.getFullYear()} оны ${MONGOLIAN_MONTHS[now.getMonth()]} ${now.getDate()}`,
            weekdayLabel: MONGOLIAN_WEEKDAYS[now.getDay()],
        };
    }, []);

    const activeStaffLabel = useMemo(() => {
        const matchedUser = users.find((user) => user.uid === currentUser?.uid || user.id === currentUser?.uid);
        return (
            matchedUser?.displayName ||
            currentUser?.displayName ||
            matchedUser?.name ||
            matchedUser?.email ||
            currentUser?.email ||
            'Тодорхойгүй'
        );
    }, [currentUser, users]);

    const greetingName = useMemo(() => {
        const baseName = String(activeStaffLabel || '').trim();
        if (!baseName || baseName === 'Тодорхойгүй') return 'Танд';
        return baseName.split(' ')[0] || baseName;
    }, [activeStaffLabel]);

    const dailyMotivation = useMemo(() => {
        const now = new Date();
        const dayIndex = now.getDay();
        return DAILY_MOTIVATION_MESSAGES[dayIndex] || DAILY_MOTIVATION_MESSAGES[0];
    }, []);

    const handleDownloadDailySummaryPdf = () => {
        const paymentRows = (todaysPerformance.visiblePaymentBreakdown.length
            ? todaysPerformance.visiblePaymentBreakdown
            : todaysPerformance.paymentBreakdown.slice(0, 3))
            .map((item) => `
                <tr>
                    <td>${item.label}</td>
                    <td>${formatCurrency(item.amount)}</td>
                    <td>${item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</td>
                </tr>
            `)
            .join('');

        const sourceRows = (todaysPerformance.visibleSourceBreakdown.length
            ? todaysPerformance.visibleSourceBreakdown
            : todaysPerformance.sourceBreakdown.slice(0, 3))
            .map((item) => `
                <tr>
                    <td>${item.label}</td>
                    <td>${item.count} захиалга</td>
                    <td>${item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</td>
                </tr>
            `)
            .join('');

        const productRows = (todaysPerformance.productBreakdown.length
            ? todaysPerformance.productBreakdown
            : [{ name: 'Өнөөдөр хүргэлтийн бүтээгдэхүүнгүй', quantity: 0, revenue: 0, share: 0 }])
            .map((item) => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}ш</td>
                    <td>${formatCurrency(item.revenue)}</td>
                    <td>${item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</td>
                </tr>
            `)
            .join('');

        const printWindow = window.open('', '_blank', 'width=980,height=760');
        if (!printWindow) return;

        printWindow.document.write(`
            <html lang="mn">
                <head>
                    <title>Өдрийн нэгтгэл</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
                        h1 { margin: 0 0 8px; font-size: 28px; }
                        .meta { color: #475569; margin-bottom: 24px; }
                        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
                        .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #fff; }
                        .label { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
                        .value { font-size: 18px; font-weight: 700; }
                        .note { border: 1px solid #fde68a; background: #fffbeb; border-radius: 14px; padding: 14px; margin-bottom: 18px; }
                        .section { margin-bottom: 18px; }
                        .section h2 { font-size: 15px; margin: 0 0 10px; text-transform: uppercase; color: #334155; }
                        table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
                        th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
                        th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
                        tr:last-child td { border-bottom: none; }
                        .total { margin-top: 20px; padding: 14px 16px; border-radius: 14px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; }
                        .total span { color: rgba(255,255,255,0.8); text-transform: uppercase; font-size: 12px; }
                        .total strong { font-size: 22px; }
                        @media print { body { margin: 20px; } }
                    </style>
                </head>
                <body>
                    <h1>Өдрийн нэгтгэл</h1>
                    <div class="meta">${todayMeta.dateLabel} • ${todayMeta.weekdayLabel} • ${weatherSummary}</div>

                    <div class="grid">
                        <div class="card"><div class="label">Нийт борлуулалт</div><div class="value">${formatCurrency(todaysPerformance.totalSales)}</div></div>
                        <div class="card"><div class="label">Нийт захиалга</div><div class="value">${todaysPerformance.totalOrders}</div></div>
                        <div class="card"><div class="label">Дундаж сагс</div><div class="value">${formatCurrency(todaysPerformance.averageOrderValue)}</div></div>
                        <div class="card"><div class="label">Гүйцэтгэл</div><div class="value">${Math.round(todaysPerformance.progress)}%</div></div>
                        <div class="card"><div class="label">Ажилласан ажилтан</div><div class="value">${activeStaffLabel}</div></div>
                        <div class="card"><div class="label">Өдрийн зорилго</div><div class="value">${formatCurrency(todaysPerformance.target)}</div></div>
                    </div>

                    <div class="note">${todaysPerformance.isTargetMet
                        ? `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} давсан байна`
                        : `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} дутуу байна`}</div>

                    <div class="section">
                        <h2>Төлбөрийн хуваалт</h2>
                        <table><thead><tr><th>Төлбөр</th><th>Дүн</th><th>Share</th></tr></thead><tbody>${paymentRows}</tbody></table>
                    </div>

                    <div class="section">
                        <h2>Сувгийн задаргаа</h2>
                        <table><thead><tr><th>Суваг</th><th>Тоо</th><th>Share</th></tr></thead><tbody>${sourceRows}</tbody></table>
                    </div>

                    <div class="section">
                        <h2>Бүтээгдэхүүний задаргаа</h2>
                        <table><thead><tr><th>Бүтээгдэхүүн</th><th>Тоо</th><th>Дүн</th><th>Share</th></tr></thead><tbody>${productRows}</tbody></table>
                    </div>

                    <div class="total"><span>Нийт үнийн дүн</span><strong>${formatCurrency(todaysPerformance.totalSales)}</strong></div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (newOrder.items.length === 0) return alert("Бараа сонгоно уу.");
        if (!newOrder.source) return alert("Захиалгын суваг сонгоно уу.");

        try {
            const totalAmount = calculateTotal(newOrder.items, newOrder.deliveryFee, newOrder.discount, newOrder.discountType);
            await addDoc(collection(db, 'orders'), {
                ...newOrder,
                totalAmount,
                createdAt: serverTimestamp(),
                entryType: 'admin_manual',
                createdBy: currentUser?.uid || 'admin'
            });
            setIsAddModalOpen(false);
            setNewOrder({
                customerName: '', phoneNumber: '', email: '',
                address: { zone: 'Улаанбаатар', city: 'Улаанбаатар', district: '', khoroo: '', fullAddress: '', additionalInfo: '' },
                items: [], status: 'pending', deliveryType: 'delivery', paymentMethod: 'bank_transfer',
                deliveryFee: 10000, discount: 0, discountType: 'amount', source: ''
            });
        } catch (error) {
            console.error("Submit order error:", error);
            alert("Алдаа гарлаа.");
        }
    };

    return (
        <div className="admin-page orders-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Захиалга Удирдах</h1>
                    <p>Нийт {stats.totalCount} захиалга бүртгэлтэй</p>
                </div>
                <div className="header-actions">
                    <button className="export-btn" onClick={() => setIsDailySummaryOpen(true)}>
                        <Download size={18} />
                        <span>Өдрийн нэгтгэл</span>
                    </button>
                    <button className="staff-btn-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={18} />Захиалга шивэх</button>
                </div>
            </div>

            <section className="store-performance-intro">
                <div className="store-performance-greeting">
                    <span>Сайн уу, {greetingName}</span>
                    <p>{dailyMotivation}</p>
                </div>
            </section>

            <section className="daily-news-board">
                <div className="daily-news-board__header">
                    <div>
                        <span>Өнөөдрийн мэдээ</span>
                        <strong>Борлуулалтын менежерийн самбар</strong>
                    </div>
                    {isDailyNewsEditing ? (
                        <button type="button" className="daily-news-board__action" onClick={handleDailyNewsSave}>
                            Хадгалах
                        </button>
                    ) : (
                        <button type="button" className="daily-news-board__action" onClick={() => setIsDailyNewsEditing(true)}>
                            Засах
                        </button>
                    )}
                </div>
                {isDailyNewsEditing ? (
                    <textarea
                        className="daily-news-board__editor"
                        value={dailyNewsDraft}
                        onChange={(e) => setDailyNewsDraft(e.target.value)}
                        placeholder="Өнөөдрийн мэдээллээ энд оруулна уу..."
                    />
                ) : (
                    <p className={`daily-news-board__content${dailyNews ? '' : ' is-empty'}`}>
                        {dailyNews || 'Өнөөдрийн мэдээлэл ороогүй байна.'}
                    </p>
                )}
            </section>

            <section className="store-performance-panel">
                <div className="store-performance-header">
                    <div>
                        <span className="store-performance-kicker">Өнөөдрийн дэлгүүрийн гүйцэтгэл</span>
                        <div className="store-performance-meta">
                            <span>{todayMeta.dateLabel}</span>
                            <span>{todayMeta.weekdayLabel}</span>
                            <span>{weatherSummary}</span>
                        </div>
                    </div>
                </div>

                <div className="store-performance-grid">
                    <div className="performance-summary-card performance-summary-card--hero">
                        <div className="performance-summary-topline">
                            <div>
                                <span>Нийт борлуулалт</span>
                                <strong>{formatCurrency(todaysPerformance.totalSales)}</strong>
                            </div>
                            <div className="performance-summary-icon">
                                <CircleDollarSign size={20} />
                            </div>
                        </div>
                        <div className="performance-progress-meta">
                            <span>Гүйцэтгэл</span>
                            <strong>{Math.round(todaysPerformance.progress)}%</strong>
                        </div>
                        <div className={`performance-progress-track performance-progress-track--${todaysPerformance.progressTone}`}>
                            <span
                                className={`performance-progress-fill performance-progress-fill--${todaysPerformance.progressTone}`}
                                style={{ width: `${Math.min(todaysPerformance.progress, 100)}%` }}
                            />
                        </div>
                        <p className="performance-progress-note">
                            {todaysPerformance.isTargetMet
                                ? `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} давсан байна`
                                : `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} дутуу байна`}
                        </p>
                    </div>

                    <div className="performance-summary-card">
                        <span>Нийт захиалга</span>
                        <strong>{todaysPerformance.totalOrders}</strong>
                        <small>Өнөөдөр бүртгэгдсэн захиалгын тоо</small>
                        <div className="performance-mini-icon"><ShoppingBag size={16} /></div>
                    </div>

                    <div className="performance-summary-card">
                        <span>Дундаж сагс (AOV)</span>
                        <strong>{formatCurrency(todaysPerformance.averageOrderValue)}</strong>
                        <small>Нэг захиалгад ногдох дундаж дүн</small>
                        <div className="performance-mini-icon"><ChartNoAxesColumn size={16} /></div>
                    </div>

                    <div className="performance-summary-card">
                        <span>Өдрийн зорилго</span>
                        {isDailyTargetEditing ? (
                            <button
                                type="button"
                                className="performance-target-inline is-editing"
                                onClick={() => setIsDailyTargetEditing(true)}
                            >
                                <span>₮</span>
                                <input
                                    id="daily-target-input"
                                    type="text"
                                    value={formatNumberInput(dailyTargetDraft)}
                                    readOnly={false}
                                    onChange={(e) => {
                                        setDailyTargetDraft(e.target.value);
                                        setDailyTargetSaved(false);
                                    }}
                                    onFocus={() => setIsDailyTargetEditing(true)}
                                    autoFocus
                                />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="performance-target-display"
                                onClick={() => setIsDailyTargetEditing(true)}
                            >
                                {formatCurrency(dailyTarget)}
                            </button>
                        )}
                        <small>Configurable өдөр тутмын борлуулалтын target</small>
                        <div className="performance-target-footer">
                            <div className="performance-mini-icon"><Target size={16} /></div>
                            {isDailyTargetEditing ? (
                                <button type="button" className="target-corner-save-btn" onClick={handleDailyTargetSave}>
                                    Хадгалах
                                </button>
                            ) : (
                                <button type="button" className="target-corner-save-btn" onClick={() => setIsDailyTargetEditing(true)}>
                                    Засах
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="performance-summary-card">
                        <span>Гүйцэтгэл</span>
                        <strong>{Math.round(todaysPerformance.progress)}%</strong>
                        <small>{todaysPerformance.isTargetMet ? 'Өдрийн борлуулалтын төлөвлөгөөг давсан' : 'Өдрийн борлуулалтын төлөвлөгөөнд дөхөж байна'}</small>
                        <div className="performance-mini-icon"><TrendingUp size={16} /></div>
                    </div>
                </div>

                <div className="performance-secondary-grid">
                    <div className="performance-summary-card performance-summary-card--chart">
                        <div className="performance-chart-header">
                            <div>
                                <span>Нийт төлбөрийн хуваалт</span>
                                <strong>{formatCurrency(todaysPerformance.totalSales)}</strong>
                            </div>
                        </div>
                        <div className="performance-chart-layout">
                            <div className="performance-pie-chart-panel">
                                <div
                                    className="performance-pie-chart"
                                    style={{ background: todaysPerformance.paymentChartStyle }}
                                >
                                    <div className="performance-pie-chart__center">Төлбөр</div>
                                </div>
                                {paymentCallouts.map((item) => (
                                    <div
                                        key={item.key}
                                        className={`performance-pie-callout performance-pie-callout--${item.align}`}
                                        style={{ left: `${item.anchorX}px`, top: `${item.anchorY}px` }}
                                    >
                                        <span className="performance-pie-callout-dot" style={{ background: item.color }} />
                                        <div className="performance-pie-callout-copy">
                                            <strong>{item.label}</strong>
                                            <span>{formatCurrency(item.amount)}</span>
                                            <small>{item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="performance-summary-card performance-summary-card--chart">
                        <div className="performance-chart-header">
                            <div>
                                <span>Захиалгын суваг</span>
                                <strong>{todaysPerformance.totalOrders}</strong>
                            </div>
                        </div>
                        <div className="performance-chart-layout">
                            <div className="performance-pie-chart-panel">
                                <div
                                    className="performance-pie-chart"
                                    style={{ background: todaysPerformance.sourceChartStyle }}
                                >
                                    <div className="performance-pie-chart__center">Суваг</div>
                                </div>
                                {sourceCallouts.map((item) => (
                                    <div
                                        key={item.key}
                                        className={`performance-pie-callout performance-pie-callout--${item.align}`}
                                        style={{ left: `${item.anchorX}px`, top: `${item.anchorY}px` }}
                                    >
                                        <span className="performance-pie-callout-dot" style={{ background: item.color }} />
                                        <div className="performance-pie-callout-copy">
                                            <strong>{item.label}</strong>
                                            <span>{itemCountLabel(item.count)}</span>
                                            <small>{item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="performance-summary-card performance-summary-card--products">
                        <div className="performance-chart-header">
                            <div>
                                <span>Top 5 бүтээгдэхүүн</span>
                                <strong>{todaysPerformance.topProducts.length || 0}</strong>
                            </div>
                        </div>
                        <div className="store-top-products-card-list">
                            {(todaysPerformance.topProducts.length ? todaysPerformance.topProducts : [{ key: 'empty', name: 'Өнөөдөр борлуулалтгүй', quantity: 0 }]).map((product, index) => (
                                <div key={product.key} className="store-top-product-row">
                                    <div className="store-top-product-rank">{index + 1}</div>
                                    <div className="store-top-product-content">
                                        <strong>{product.name}</strong>
                                        <small>{product.quantity}ш гарсан</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sales-leaderboard">
                    <div className="sales-leaderboard-header">
                        <div>
                            <span>Сарын борлуулалтын лидер</span>
                            <strong>Top 2 борлуулагч</strong>
                        </div>
                        <small>{MONGOLIAN_MONTHS[new Date().getMonth()]}-ийн борлуулалтын дүн</small>
                    </div>

                    <div className="sales-leaderboard-grid">
                        {(monthlyTopSellers.length ? monthlyTopSellers : [
                            { key: 'empty-1', name: 'Одоогоор бүртгэлгүй', totalSales: 0, orderCount: 0, share: 0 },
                            { key: 'empty-2', name: 'Одоогоор бүртгэлгүй', totalSales: 0, orderCount: 0, share: 0 },
                        ]).map((seller, index) => (
                            <div key={seller.key} className={`sales-leader-card sales-leader-card--${index === 0 ? 'primary' : 'secondary'}`}>
                                <div className="sales-leader-rank">
                                    <span>{index === 0 ? '👑' : '✨'}</span>
                                    <strong>#{index + 1}</strong>
                                </div>
                                <div className="sales-leader-profile">
                                    <div className="sales-leader-avatar">
                                        <span>{getSellerAvatar(seller.key || seller.name, index)}</span>
                                    </div>
                                    <div className="sales-leader-meta">
                                        <strong>{seller.name}</strong>
                                        <span>{seller.orderCount} захиалга шивсэн</span>
                                    </div>
                                </div>
                                <div className="sales-leader-amount">
                                    <span>Сарын борлуулалт</span>
                                    <strong>{formatCurrency(seller.totalSales)}</strong>
                                    <div className="sales-leader-share">
                                        <div className="sales-leader-share-topline">
                                            <span>Орлогын share</span>
                                            <strong>{seller.share.toFixed(seller.share % 1 === 0 ? 0 : 1)}%</strong>
                                        </div>
                                        <div className="sales-leader-share-track">
                                            <span style={{ width: `${seller.share}%` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="orders-filter-toolbar">
                <div className="search-box orders-filter-search">
                    <Search size={18} />
                    <input type="text" placeholder="ID, Нэр, Утас..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>

                <div className="orders-filter-controls">
                    <div className="filter-item">
                        <label>Төлөв</label>
                        <select className="form-select orders-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="all">Бүх төлөв</option>
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>Суваг</label>
                        <select className="form-select orders-filter-select" value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                            <option value="all">Бүх суваг</option>
                            {SOURCE_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>Төлбөр</label>
                        <select className="form-select orders-filter-select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                            <option value="all">Бүх төлбөр</option>
                            {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                    </div>

                    <div className="filter-item orders-filter-dates">
                        <label>Хугацаа</label>
                        <div className="orders-date-range">
                            <div className="orders-date-field">
                                <Calendar size={14} />
                                <input
                                    type="date"
                                    className="form-input orders-date-input"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <span className="orders-date-separator">-</span>
                            <div className="orders-date-field">
                                <Calendar size={14} />
                                <input
                                    type="date"
                                    className="form-input orders-date-input"
                                    value={endDate}
                                    min={startDate}
                                    max={startDate ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)).toISOString().split('T')[0] : undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {(startDate || endDate || statusFilter !== 'all' || sourceFilter !== 'all' || paymentFilter !== 'all') && (
                        <button
                            className="orders-filter-reset"
                            onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('all'); setSourceFilter('all'); setPaymentFilter('all'); }}
                        >
                            Арилгах
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Хэрэглэгч</th>
                            <th>Дүн</th>
                            <th>Огноо</th>
                            <th>Суваг</th>
                            <th>Төлбөр</th>
                            <th>Төлөв</th>
                            <th>Үйлдэл</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>Уншиж байна...</td></tr> :
                            filteredOrders.map(order => (
                                <tr key={order.id}>
                                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                        {renderHighlightedText(`#${order.id.slice(-6).toUpperCase()}`, searchTerm)}
                                    </td>
                                    <td>
                                        <div className="customer-cell">
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <strong>{renderHighlightedText(order.customerName || 'Зочин', searchTerm)}</strong>
                                                {(() => {
                                                    const userDoc = users.find(u => u.uid === order.userId || u.phoneNumber === order.phoneNumber || u.email === order.email);
                                                    return renderMembershipTier(getMembershipTier(userDoc));
                                                })()}
                                                {(() => {
                                                    // Determine if it's the first purchase
                                                    // This is a heuristic: check if there are other orders with same identifier before this one's date
                                                    const sameCustomerOrders = orders.filter(o =>
                                                        (o.userId && o.userId === order.userId) ||
                                                        (o.phoneNumber && o.phoneNumber === order.phoneNumber) ||
                                                        (o.email && o.email === order.email && o.email !== '')
                                                    );

                                                    const isFirst = sameCustomerOrders.length === 1 && sameCustomerOrders[0].id === order.id;
                                                    // Or better, if we have a flag, but if not, this works for demo
                                                    if (isFirst) {
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '8px', color: '#EAB308' }} title="Шинэ хэрэглэгч">
                                                                <Star size={12} fill="#EAB308" />
                                                                <span style={{ fontSize: '10px', fontWeight: 600 }}>Шинэ</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <span className="email">{renderHighlightedText(order.phoneNumber || order.email, searchTerm)}</span>
                                        </div>
                                    </td>
                                    <td><strong>₮{(Number(order.totalAmount) || 0).toLocaleString()}</strong></td>
                                    <td><div className="date-cell"><Calendar size={14} style={{ marginRight: '5px', opacity: 0.6 }} />{order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString() : '-'}</div></td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#666' }}>
                                            {SOURCE_OPTIONS.find(s => s.key === order.source)?.icon}
                                            <span>{SOURCE_OPTIONS.find(s => s.key === order.source)?.label || 'Veb sait'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#444' }}>
                                            {PAYMENT_METHODS.find(m => m.key === order.paymentMethod)?.label || 'Данс'}
                                        </span>
                                    </td>
                                    <td><span className={`status-pill ${STATUS_CONFIG[order.status]?.class || ''}`}>{STATUS_CONFIG[order.status]?.label || order.status}</span></td>
                                    <td className="actions-cell">
                                        <button className="action-icon view" title="Харах" onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}><Eye size={18} /></button>
                                        {isAdmin && (
                                            <button className="action-icon delete" title="Устгах" onClick={() => handleDeleteOrder(order.id)} style={{ color: '#DC2626' }}><Trash2 size={18} /></button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>

            {/* Enhanced Add Order Modal */}
            {isAddModalOpen && (
                <div className="staff-confirm-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="staff-role-modal order-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div><h3>Шинэ захиалга бүртгэх</h3><p>Хэрэглэгч болон барааны мэдээллийг нарийвчлан оруулна уу.</p></div>
                            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmitOrder} style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '10px' }}>
                            <div className="modal-section-title"><User size={18} style={{ marginRight: 8 }} /> Үйлчлүүлэгч ба суваг</div>
                            <div className="address-grid">
                                <div className="form-group">
                                    <label>Үйлчлүүлэгчийн нэр *</label>
                                    <input className="form-input" type="text" value={newOrder.customerName} onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Утасны дугаар *</label>
                                    <input className="form-input" type="tel" value={newOrder.phoneNumber} onChange={e => setNewOrder({ ...newOrder, phoneNumber: e.target.value })} required />
                                </div>
                                <div className="form-group-full">
                                    <label>Захиалгын суваг сонгох *</label>
                                    <div className="source-selector-grid">
                                        {SOURCE_OPTIONS.map(opt => (
                                            <button
                                                key={opt.key}
                                                type="button"
                                                className={`source-chip ${newOrder.source === opt.key ? 'active' : ''}`}
                                                style={!newOrder.source ? { borderColor: '#ffa39e' } : {}}
                                                onClick={() => setNewOrder({ ...newOrder, source: opt.key })}
                                            >
                                                {opt.icon}
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {!newOrder.source && <p style={{ fontSize: '0.75rem', color: '#ff4d4f', marginTop: '4px' }}>Захиалгын суваг сонгоно уу</p>}
                                </div>
                            </div>

                            <div className="modal-section-title"><MapPinned size={18} style={{ marginRight: 8 }} /> Хүргэлтийн мэдээлэл</div>
                            <div className="address-grid">
                                <div className="form-group-full">
                                    <label>Хүргэлтийн бүс</label>
                                    <select
                                        className="form-select"
                                        value={newOrder.address.zone}
                                        onChange={e => {
                                            const newZone = e.target.value;
                                            setNewOrder({
                                                ...newOrder,
                                                address: {
                                                    ...newOrder.address,
                                                    zone: newZone,
                                                    city: newZone === 'Улаанбаатар' ? 'Улаанбаатар' : '',
                                                    district: '',
                                                    khoroo: ''
                                                }
                                            });
                                        }}
                                    >
                                        <option value="Улаанбаатар">Улаанбаатар</option>
                                        <option value="Орон нутаг">Орон нутаг</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Хот / Аймаг *</label>
                                    {newOrder.address.zone === 'Улаанбаатар' ? (
                                        <select className="form-select" value={newOrder.address.city} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, city: e.target.value } })}>
                                            <option value="Улаанбаатар">Улаанбаатар</option>
                                        </select>
                                    ) : (
                                        <select className="form-select" value={newOrder.address.city} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, city: e.target.value } })}>
                                            <option value="">Аймаг сонгох</option>
                                            {AIMAGS.map(a => <option key={a} value={a}>{a}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Сум / Дүүрэг *</label>
                                    {newOrder.address.city === 'Улаанбаатар' ? (
                                        <select
                                            className="form-select"
                                            value={newOrder.address.district}
                                            onChange={e => setNewOrder({
                                                ...newOrder,
                                                address: {
                                                    ...newOrder.address,
                                                    district: e.target.value,
                                                    khoroo: '' // Reset khoroo when district changes
                                                }
                                            })}
                                            required
                                        >
                                            <option value="">Дүүрэг сонгох</option>
                                            {Object.keys(UB_LOCATIONS).map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    ) : (
                                        <input className="form-input" type="text" value={newOrder.address.district} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, district: e.target.value } })} placeholder="Сум/Дүүрэг оруулах" required />
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Баг / Хороо *</label>
                                    {newOrder.address.city === 'Улаанбаатар' && newOrder.address.district ? (
                                        <select
                                            className="form-select"
                                            value={newOrder.address.khoroo}
                                            onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, khoroo: e.target.value } })}
                                            required
                                        >
                                            <option value="">Хороо сонгох</option>
                                            {UB_LOCATIONS[newOrder.address.district].map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    ) : (
                                        <input className="form-input" type="text" value={newOrder.address.khoroo} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, khoroo: e.target.value } })} placeholder="Баг/Хороо оруулах" required />
                                    )}
                                </div>
                                <div className="form-group-full">
                                    <label>Хүргэлтийн хаяг *</label>
                                    <input className="form-input" type="text" value={newOrder.address.fullAddress} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, fullAddress: e.target.value } })} placeholder="Дэлгэрэнгүй хаяг оруулах" required />
                                </div>
                                <div className="form-group-full">
                                    <label>Нэмэлт мэдээлэл</label>
                                    <textarea className="form-textarea" rows="2" value={newOrder.address.additionalInfo} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, additionalInfo: e.target.value } })} placeholder="Хүргэлтийн үед анхаарах зүйлс..." />
                                </div>
                            </div>

                            <div className="modal-section-title"><ShoppingCart size={18} style={{ marginRight: 8 }} /> Бараа бүтээгдэхүүн</div>
                            <div className="product-search-container">
                                <label>Бараа хайх</label>
                                <div className="input-with-icon">
                                    <SearchIcon size={16} className="field-icon" />
                                    <input
                                        className="form-input"
                                        type="text"
                                        placeholder="Бүтээгдэхүүний нэрээр хайх..."
                                        value={productSearch}
                                        onFocus={() => setIsProductListOpen(true)}
                                        onChange={e => setProductSearch(e.target.value)}
                                    />
                                    {isProductListOpen && productSearch && (
                                        <div className="search-results-dropdown">
                                            {searchableProducts.length > 0 ? searchableProducts.map(p => (
                                                <div key={p.id} className="search-result-item" onClick={() => addProductToOrder(p)}>
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        <img src={getItemImage(p)} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} />
                                                        <div>
                                                            <div><strong>{p.name}</strong></div>
                                                            <div className="p-stock">Үлдэгдэл: {p.stock || 0} ш</div>
                                                        </div>
                                                    </div>
                                                    <div className="p-price">₮{(p.price || p.salePrice).toLocaleString()}</div>
                                                </div>
                                            )) : <div className="search-result-item" style={{ justifyContent: 'center', color: '#999' }}>Ийм бүтээгдэхүүн олдсонгүй</div>}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="order-items-editor" style={{ marginTop: '15px' }}>
                                {newOrder.items.length === 0 ? <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>Захиалгад бараа нэмээгүй байна</p> :
                                    newOrder.items.map(item => (
                                        <div key={item.id} className="added-item-row">
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <img src={getItemImage(item)} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                                                <div>
                                                    <strong>{item.name}</strong>
                                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                                        {item.quantity} x ₮{item.price.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <input type="number" min="1" value={item.quantity} onChange={e => setNewOrder({ ...newOrder, items: newOrder.items.map(i => i.id === item.id ? { ...i, quantity: Number(e.target.value) } : i) })} style={{ width: 60, padding: '4px 8px' }} />
                                                <button type="button" onClick={() => setNewOrder({ ...newOrder, items: newOrder.items.filter(i => i.id !== item.id) })} style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            <div className="pricing-summary-grid">
                                <div className="pricing-field">
                                    <label>Нийт үнийн дүн</label>
                                    <input className="form-input" type="text" value={`₮${calculateSubtotal(newOrder.items).toLocaleString()}`} readOnly />
                                </div>
                                <div className="pricing-field">
                                    <label><Truck size={14} /> Хүргэлтийн төлбөр</label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={formatNumberInput(newOrder.deliveryFee)}
                                        onChange={e => setNewOrder({ ...newOrder, deliveryFee: parseNumberInput(e.target.value) })}
                                    />
                                </div>
                                <div className="pricing-field">
                                    <label>
                                        <Tags size={14} /> Хөнгөлөлт
                                        <select
                                            value={newOrder.discountType}
                                            onChange={e => setNewOrder({ ...newOrder, discountType: e.target.value })}
                                            className="discount-type-mini-select"
                                        >
                                            <option value="amount">₮</option>
                                            <option value="percent">%</option>
                                        </select>
                                    </label>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={newOrder.discountType === 'amount' ? formatNumberInput(newOrder.discount) : newOrder.discount}
                                        onChange={e => {
                                            const val = newOrder.discountType === 'amount' ? parseNumberInput(e.target.value) : e.target.value;
                                            setNewOrder({ ...newOrder, discount: val });
                                        }}
                                    />
                                </div>
                                <div className="pricing-field" style={{ gridColumn: 'span 2' }}>
                                    <label><CreditCard size={14} /> Төлбөрийн нөхцөл</label>
                                    <select
                                        className="form-select"
                                        value={newOrder.paymentMethod}
                                        onChange={e => setNewOrder({ ...newOrder, paymentMethod: e.target.value })}
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m.key} value={m.key}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="order-summary-consolidated">
                                    <div className="summary-line">
                                        <span>Нийт үнийн дүн:</span>
                                        <strong>₮{calculateSubtotal(newOrder.items).toLocaleString()}</strong>
                                    </div>
                                    <div className="summary-line">
                                        <span>Хүргэлт:</span>
                                        <strong>+ ₮{newOrder.deliveryFee.toLocaleString()}</strong>
                                    </div>
                                    {newOrder.discount > 0 && (
                                        <div className="summary-line discount">
                                            <span>Хөнгөлөлт {newOrder.discountType === 'percent' ? `(${newOrder.discount}%)` : ''}:</span>
                                            <strong>- ₮{getDiscountAmount(newOrder.items, newOrder.discount, newOrder.discountType).toLocaleString()}</strong>
                                        </div>
                                    )}
                                    <div className="final-total-box">
                                        <span className="total-label">Төлөх дүн:</span>
                                        <span className="total-value">₮{calculateTotal(newOrder.items, newOrder.deliveryFee, newOrder.discount, newOrder.discountType).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Болих</button>
                                <button type="submit" className="btn-save">Захиалга бүртгэх</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDailySummaryOpen && (
                <div className="staff-confirm-overlay" onClick={() => setIsDailySummaryOpen(false)}>
                    <div className="staff-role-modal order-modal daily-summary-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
                        <div className="modal-header">
                            <div className="daily-summary-header-copy">
                                <h3>Өдрийн нэгтгэл</h3>
                                <p className="daily-summary-header-date">{todayMeta.dateLabel}</p>
                                <p className="daily-summary-header-meta">{todayMeta.weekdayLabel} • {weatherSummary}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsDailySummaryOpen(false)}><X size={20} /></button>
                        </div>

                        <div className="daily-summary-report">
                            <div className="daily-summary-topline">
                                <div className="daily-summary-metric">
                                    <span>Нийт борлуулалт</span>
                                    <strong>{formatCurrency(todaysPerformance.totalSales)}</strong>
                                </div>
                                <div className="daily-summary-metric">
                                    <span>Нийт захиалга</span>
                                    <strong>{todaysPerformance.totalOrders}</strong>
                                </div>
                                <div className="daily-summary-metric">
                                    <span>Дундаж сагс</span>
                                    <strong>{formatCurrency(todaysPerformance.averageOrderValue)}</strong>
                                </div>
                                <div className="daily-summary-metric">
                                    <span>Гүйцэтгэл</span>
                                    <strong>{Math.round(todaysPerformance.progress)}%</strong>
                                </div>
                                <div className="daily-summary-metric">
                                    <span>Ажилласан ажилтан</span>
                                    <strong>{activeStaffLabel}</strong>
                                </div>
                            </div>

                            <div className="daily-summary-insight daily-summary-insight--plan">
                                <span>Өдрийн тайлбар</span>
                                <p>
                                    {todaysPerformance.isTargetMet
                                        ? `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} давсан байна`
                                        : `Өдрийн борлуулалтын төлөвлөгөөнөөс ${formatCurrency(todaysPerformance.gapAmount)} дутуу байна`}
                                </p>
                            </div>

                            <div className="daily-summary-grid">
                                <div className="daily-summary-section daily-summary-section--compact daily-summary-section--payment">
                                    <div className="sidebar-section-title">Төлбөрийн хуваалт</div>
                                    <div className="payment-history-list">
                                        {(todaysPerformance.visiblePaymentBreakdown.length ? todaysPerformance.visiblePaymentBreakdown : todaysPerformance.paymentBreakdown.slice(0, 3)).map((item) => (
                                            <div key={item.key} className="payment-history-row">
                                                <div className="payment-history-row-main">
                                                    <div>
                                                        <strong>{item.label}</strong>
                                                        <span>{formatCurrency(item.amount)}</span>
                                                    </div>
                                                    <div className="payment-history-share">{item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="daily-summary-section daily-summary-section--compact daily-summary-section--source">
                                    <div className="sidebar-section-title">Сувгийн задаргаа</div>
                                    <div className="payment-history-list">
                                        {(todaysPerformance.visibleSourceBreakdown.length ? todaysPerformance.visibleSourceBreakdown : todaysPerformance.sourceBreakdown.slice(0, 3)).map((item) => (
                                            <div key={item.key} className="payment-history-row">
                                                <div className="payment-history-row-main">
                                                    <div>
                                                        <strong>{item.label}</strong>
                                                        <span>{item.count} захиалга</span>
                                                    </div>
                                                    <div className="payment-history-share">{item.share.toFixed(item.share % 1 === 0 ? 0 : 1)}%</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="daily-summary-section daily-summary-section--product">
                                <div className="sidebar-section-title">Бүтээгдэхүүний задаргаа</div>
                                <div className="daily-report-table">
                                    <div className="daily-report-head">
                                        <span>Бүтээгдэхүүн</span>
                                        <span>Тоо</span>
                                        <span>Дүн</span>
                                        <span>Share</span>
                                    </div>
                                    {(todaysPerformance.productBreakdown.length ? todaysPerformance.productBreakdown : [{ key: 'empty', name: 'Өнөөдөр хүргэлтийн бүтээгдэхүүнгүй', quantity: 0, revenue: 0, share: 0 }]).map((product) => (
                                        <div key={product.key} className="daily-report-row">
                                            <span className="daily-report-product">{product.name}</span>
                                            <span>{product.quantity}ш</span>
                                            <span className="daily-report-amount">
                                                <strong>{formatCurrency(product.revenue || 0)}</strong>
                                            </span>
                                            <span>{product.share.toFixed(product.share % 1 === 0 ? 0 : 1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="daily-financial-summary">
                                <div className="daily-financial-ledger">
                                    <div className="daily-financial-line">
                                        <span>Үндсэн дүн</span>
                                        <strong>{formatCurrency(todaysPerformance.merchandiseSubtotal)}</strong>
                                    </div>
                                    <div className="daily-financial-line">
                                        <span>Хүргэлтийн дүн</span>
                                        <strong>+ {formatCurrency(todaysPerformance.totalDelivery)}</strong>
                                    </div>
                                    <div className="daily-financial-line daily-financial-line--discount">
                                        <span>Хөнгөлөлт</span>
                                        <strong>- {formatCurrency(todaysPerformance.totalDiscount)}</strong>
                                    </div>
                                    <div className="daily-financial-total">
                                        <span>Төлөх дүн</span>
                                        <strong>{formatCurrency(todaysPerformance.totalSales)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions" style={{ paddingTop: 0 }}>
                                <button type="button" className="btn-cancel" onClick={() => setIsDailySummaryOpen(false)}>Хаах</button>
                                <button type="button" className="btn-save" onClick={handleDownloadDailySummaryPdf}>PDF татах</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Details Modal (Previous Implementation Maintained) */}
            {isDetailsOpen && selectedOrder && (
                <div className="staff-confirm-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="order-modal-new" onClick={e => e.stopPropagation()}>
                        <div className="order-modal-header-new">
                            <div className="order-header-left">
                                <div className="order-header-id">
                                    <button className="back-btn-new" onClick={() => setIsDetailsOpen(false)}><ArrowLeft size={20} /></button>
                                    <h2>Захиалга #{selectedOrder.id.slice(-8).toUpperCase()}</h2>
                                </div>
                                <div className="order-header-badges">
                                    <span className={`status-pill ${STATUS_CONFIG[selectedOrder.status]?.class || ''}`} style={{ margin: 0 }}>
                                        {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                                    </span>
                                    {selectedOrder.deliveryType === 'delivery' && (
                                        <span className="status-pill shipped" style={{ margin: 0, background: '#FEF3C7', color: '#D97706', borderColor: '#FCD34D' }}>
                                            Хүргэлт хүлээгдэж буй
                                        </span>
                                    )}
                                    <div className="order-header-date">
                                        <Calendar size={14} />
                                        {selectedOrder.createdAt ? new Date(selectedOrder.createdAt.toMillis()).toLocaleString() : '-'}
                                    </div>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailsOpen(false)}><X size={24} /></button>
                        </div>

                        <div className="order-modal-body-new">
                            <div className="order-main-content">
                                <div className="content-card">
                                    <div className="items-table-new">
                                        <div className="items-thead">
                                            <span>Бүтээгдэхүүн</span>
                                            <span></span>
                                            <span>Код</span>
                                            <span>Тоо</span>
                                            <span>Үнэ</span>
                                            <span></span>
                                        </div>
                                        <div className="items-scroll-area-new">
                                            {(selectedOrder.items || []).map((item, idx) => (
                                                <div key={idx} className="item-row-new">
                                                    <img src={getItemImage(item)} alt="" className="item-img-new" />
                                                    <span className="item-name-new">{item.name}</span>
                                                    <span className="item-code-new">{item.code || '-'}</span>
                                                    <span className="item-qty-new">{item.quantity}</span>
                                                    <span className="item-price-new">₮{item.price.toLocaleString()}</span>
                                                    <ArrowRight size={16} style={{ color: '#cbd5e1' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pricing-breakdown-new">
                                        <div className="pricing-line-item">
                                            <span>Нийт үнийн дүн</span>
                                            <strong>₮{calculateSubtotal(selectedOrder.items || []).toLocaleString()}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="content-card">
                                    <div className="sidebar-section-title"><Wallet size={16} /> Борлуулалтын суваг</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Суваг</span>
                                        <span style={{ color: '#6366f1', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }}></div>
                                            {SOURCE_OPTIONS.find(s => s.key === selectedOrder.source)?.label || selectedOrder.source || 'Website'}
                                        </span>
                                    </div>
                                </div>

                                <div className="content-card">
                                    <div className="sidebar-section-title"><CreditCard size={16} /> Төлбөрийн мэдээлэл</div>
                                    <div className="info-display-list">
                                        <div className="info-display-item" style={{ justifyContent: 'space-between' }}>
                                            <span>Төлбөрийн хэрэгсэл</span>
                                            <span className="payment-method-badge">{PAYMENT_METHODS.find(m => m.key === selectedOrder.paymentMethod)?.label || selectedOrder.paymentMethod || 'Данс'}</span>
                                        </div>
                                        <div className="info-display-item" style={{ justifyContent: 'space-between' }}>
                                            <span>Захиалгын үнийн дүн</span>
                                            <span>₮{calculateSubtotal(selectedOrder.items || []).toLocaleString()}</span>
                                        </div>
                                        <div className="info-display-item" style={{ justifyContent: 'space-between' }}>
                                            <span>Хүргэлтийн үнийн дүн</span>
                                            <span>₮{(selectedOrder.deliveryFee || 0).toLocaleString()}</span>
                                        </div>
                                        {selectedOrder.discount > 0 && (
                                            <div className="info-display-item" style={{ justifyContent: 'space-between', color: '#DC2626' }}>
                                                <span>Хөнгөлөлт {selectedOrder.discountType === 'percent' ? `(${selectedOrder.discount}%)` : ''}</span>
                                                <span>- ₮{getDiscountAmount(selectedOrder.items || [], selectedOrder.discount, selectedOrder.discountType).toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="pricing-line-item final" style={{ paddingBottom: 0 }}>
                                            <span>Нийт үнийн дүн</span>
                                            <span>{formatCurrency(selectedOrder.totalAmount || 0)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="content-card">
                                    <div className="payment-intelligence-header">
                                        <div>
                                            <div className="sidebar-section-title" style={{ marginBottom: 6 }}>
                                                <Sparkles size={16} /> Төлбөрийн түүх
                                            </div>
                                            <p>
                                                {selectedCustomerPaymentInsights?.customerOrdersCount || 0} захиалгын
                                                {selectedCustomerPaymentInsights?.totalAmount
                                                    ? ` ${formatCurrency(selectedCustomerPaymentInsights.totalAmount)}`
                                                    : ''} дүн дээр тулгуурлав
                                            </p>
                                        </div>
                                        {selectedCustomerPaymentInsights?.preferredMethod?.amount > 0 && (
                                            <div className="payment-recommendation-pill">
                                                Санал болгох: {selectedCustomerPaymentInsights.preferredMethod.label}
                                            </div>
                                        )}
                                    </div>

                                    <div className="payment-history-list">
                                        {(selectedCustomerPaymentInsights?.paymentRows || PAYMENT_METHODS).map((method) => {
                                            const amount = method.amount || 0;
                                            const share = method.share || 0;
                                            return (
                                                <div key={method.key} className="payment-history-row">
                                                    <div className="payment-history-row-main">
                                                        <div>
                                                            <strong>{method.label}</strong>
                                                            <span>{formatCurrency(amount)}</span>
                                                        </div>
                                                        <div className="payment-history-share">{share.toFixed(share % 1 === 0 ? 0 : 1)}%</div>
                                                    </div>
                                                    <div className="payment-share-bar">
                                                        <span style={{ width: `${Math.max(share, amount > 0 ? 6 : 0)}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="payment-insight-card">
                                        <div className="payment-insight-card-top">
                                            <span>Төлбөрийн recommendation</span>
                                            <strong>{selectedCustomerPaymentInsights?.preferredMethod?.label || 'Тодорхойгүй'}</strong>
                                        </div>
                                        <p>{selectedCustomerPaymentInsights?.recommendation || 'Төлбөрийн түүх хангалтгүй байна.'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="order-sidebar-content">
                                <div className="sidebar-card">
                                    <div className="status-dropdown-group">
                                        <div className="modern-select-box">
                                            <select
                                                className="modern-select"
                                                value={selectedOrder.status}
                                                onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                                            >
                                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                                    <option key={key} value={key}>{cfg.label}</option>
                                                ))}
                                            </select>
                                            <div className="status-icon-badge" style={{ background: '#10b981' }}>
                                                <CheckCircle2 size={20} />
                                            </div>
                                        </div>

                                        <div className="sidebar-section-title" style={{ marginTop: '10px', marginBottom: '8px' }}><Truck size={16} /> Хүргэлтийн төлөв</div>
                                        <div className="modern-select-box">
                                            <select className="modern-select" defaultValue="pending">
                                                <option value="pending">Хүлээгдэж буй</option>
                                                <option value="processing">Бэлтгэгдэж буй</option>
                                                <option value="shipped">Хүргэлтэнд</option>
                                                <option value="delivered">Хүргэгдсэн</option>
                                            </select>
                                            <div className="status-icon-badge" style={{ background: '#3b82f6' }}>
                                                <Truck size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-section-title">Захиалагч</div>
                                    <div className="info-display-list">
                                        <div className="info-display-item">
                                            <User size={16} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <strong>{selectedOrder.customerName || 'Зочин'}</strong>
                                                {(() => {
                                                    const userDoc = users.find(u => u.uid === selectedOrder.userId || u.phoneNumber === selectedOrder.phoneNumber || u.email === selectedOrder.email);
                                                    return renderMembershipTier(getMembershipTier(userDoc));
                                                })()}
                                                {(() => {
                                                    const sameCustomerOrders = orders.filter(o =>
                                                        (o.userId && o.userId === selectedOrder.userId) ||
                                                        (o.phoneNumber && o.phoneNumber === selectedOrder.phoneNumber) ||
                                                        (o.email && o.email === selectedOrder.email && o.email !== '')
                                                    );
                                                    const isFirst = sameCustomerOrders.length === 1 && sameCustomerOrders[0].id === selectedOrder.id;
                                                    if (isFirst) {
                                                        return (
                                                            <div className="first-order-badge" style={{ scale: '0.8' }}>
                                                                <Star size={12} fill="#EAB308" />
                                                                <span>Шинэ</span>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                        <div className="info-display-item">
                                            <Phone size={16} />
                                            <span>{selectedOrder.phoneNumber || '-'}</span>
                                        </div>
                                        <div className="info-display-item">
                                            <Mail size={16} />
                                            <span>{selectedOrder.email || 'Бүртгэлгүй'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-section-title">Хүргэлтийн хаяг</div>
                                    <div className="info-display-list">
                                        <div className="info-display-item" style={{ flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Хүргэлтийн бүс: {selectedOrder.address?.zone || 'Улаанбаатар'}</span>
                                            <span style={{ marginTop: '5px' }}>
                                                {selectedOrder.address?.city} {selectedOrder.address?.district}-р хороо
                                                <br />
                                                {selectedOrder.address?.khoroo} {selectedOrder.address?.fullAddress}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="sidebar-card">
                                    <div className="sidebar-section-title">Нэмэлт мэдээлэл</div>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                                        {selectedOrder.address?.additionalInfo || 'Нэмэлт мэдээлэл байхгүй'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
