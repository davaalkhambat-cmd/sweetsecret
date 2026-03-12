import React, { useEffect, useMemo, useState } from 'react';
import {
    TrendingUp,
    Users,
    ShoppingBag,
    ArrowUpRight,
    ArrowDownRight,
    CircleDollarSign,
    AlertTriangle,
    MapPinned,
    Truck,
    Clock3,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';

const WEEK_DAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
const DEFAULT_CENTER = [47.9184, 106.9177];
const RANGE_OPTIONS = [7, 14, 31];

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
        const cleaned = value.replace(/[^\d.-]/g, '');
        const parsed = Number(cleaned);
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

const extractAddress = (data) =>
    data?.deliveryAddress ||
    data?.shippingAddress?.fullAddress ||
    data?.shippingAddress?.addressLine ||
    data?.shippingAddress?.text ||
    data?.address?.fullAddress ||
    data?.address?.text ||
    '';

const formatPercent = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;

const getGrowth = (current, previous) => {
    if (previous <= 0) return current <= 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
};

const normalizeStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (['completed', 'paid', 'delivered', 'fulfilled', 'хүргэгдсэн'].includes(normalized)) return 'completed';
    if (['pending', 'new', 'хүлээгдэж буй'].includes(normalized)) return 'pending';
    if (['processing', 'packed', 'баталгаажсан'].includes(normalized)) return 'processing';
    if (['shipped', 'in-transit', 'хүргэлтэнд'].includes(normalized)) return 'shipped';
    return 'pending';
};

const Dashboard = () => {
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [mapRangeDays, setMapRangeDays] = useState(7);

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
                            const isPickup = deliveryTypeRaw.includes('pickup') || deliveryTypeRaw.includes('өөрөө');

                            return {
                                id: docSnap.id,
                                total: toNumber(data.totalAmount ?? data.total ?? data.amount),
                                status: data.status || 'pending',
                                customer: data.customerName || data.userName || data.email || 'Хэрэглэгч',
                                createdAtMs: toMs(data.createdAt || data.updatedAt),
                                items: toItems(data.items),
                                coordinates: extractCoordinates(data),
                                address: extractAddress(data),
                                isDelivery: !isPickup,
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
                collection(db, 'users'),
                (snapshot) => {
                    setUsers(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                role: String(data.role || '').toLowerCase(),
                            };
                        })
                    );
                },
                (error) => {
                    console.error('Users snapshot error:', error);
                    setErrorMessage('Dashboard мэдээлэл уншихад алдаа гарлаа.');
                }
            ),
            onSnapshot(
                collection(db, 'products'),
                (snapshot) => {
                    setProducts(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                name: data.name || 'Нэргүй бүтээгдэхүүн',
                                stock: toNumber(data.stock),
                                status: String(data.status || '').toLowerCase(),
                            };
                        })
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

    const analytics = useMemo(() => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const currentStart = now - 7 * dayMs;
        const previousStart = now - 14 * dayMs;

        let currentSales = 0;
        let previousSales = 0;
        let currentOrders = 0;
        let previousOrders = 0;
        const totalSalesAll = orders.reduce((sum, order) => sum + order.total, 0);
        const averageBasketValue = orders.length ? totalSalesAll / orders.length : 0;

        const dailySales = Array.from({ length: 7 }, (_, index) => {
            const start = now - (6 - index) * dayMs;
            return {
                key: index,
                label: WEEK_DAYS[new Date(start).getDay() === 0 ? 6 : new Date(start).getDay() - 1],
                start,
                end: start + dayMs,
                total: 0,
            };
        });

        orders.forEach((order) => {
            if (!order.createdAtMs) return;

            if (order.createdAtMs >= currentStart) {
                currentOrders += 1;
                currentSales += order.total;
            } else if (order.createdAtMs >= previousStart) {
                previousOrders += 1;
                previousSales += order.total;
            }

            dailySales.forEach((day) => {
                if (order.createdAtMs >= day.start && order.createdAtMs < day.end) {
                    day.total += order.total;
                }
            });
        });

        const maxDaily = Math.max(...dailySales.map((day) => day.total), 1);
        const chartData = dailySales.map((day) => ({
            ...day,
            percent: Math.max(8, Math.round((day.total / maxDaily) * 100)),
        }));

        const activeProducts = products.filter((product) => product.status !== 'inactive').length;
        const lowStockCount = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
        const outOfStockCount = products.filter((product) => product.stock <= 0).length;
        const customerCount = users.filter((user) => !['admin', 'manager'].includes(user.role)).length;
        const productNameMap = new Map(products.map((product) => [String(product.id), product.name]));
        const soldProductMap = new Map();

        orders.forEach((order) => {
            order.items.forEach((item) => {
                const key = item.productId || item.name;
                if (!key) return;
                const existing = soldProductMap.get(key) || {
                    id: key,
                    name: item.name || productNameMap.get(String(key)) || 'Тодорхойгүй бүтээгдэхүүн',
                    soldQty: 0,
                };
                existing.soldQty += item.quantity;
                soldProductMap.set(key, existing);
            });
        });

        const topSoldProducts = [...soldProductMap.values()]
            .sort((a, b) => b.soldQty - a.soldQty)
            .slice(0, 5);

        const topStockProducts = [...products]
            .sort((a, b) => b.stock - a.stock)
            .slice(0, 5);

        const recentOrders = [...orders]
            .sort((a, b) => b.createdAtMs - a.createdAtMs)
            .slice(0, 6);

        return {
            currentSales,
            currentOrders,
            averageBasketValue,
            salesGrowth: getGrowth(currentSales, previousSales),
            orderGrowth: getGrowth(currentOrders, previousOrders),
            productCount: products.length,
            activeProducts,
            lowStockCount,
            outOfStockCount,
            customerCount,
            chartData,
            recentOrders,
            topSoldProducts,
            topStockProducts,
        };
    }, [orders, products, users]);

    const deliveryInsights = useMemo(() => {
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const fromMs = now - mapRangeDays * dayMs;

        const ordersInRange = orders.filter((order) => order.createdAtMs && order.createdAtMs >= fromMs);
        const deliveriesWithCoords = ordersInRange.filter(
            (order) => order.isDelivery && Array.isArray(order.coordinates)
        );

        const uniqueCustomerCount = new Set(deliveriesWithCoords.map((order) => `${order.customer}-${order.id}`)).size;
        const averageDeliveryValue = deliveriesWithCoords.length
            ? deliveriesWithCoords.reduce((sum, order) => sum + order.total, 0) / deliveriesWithCoords.length
            : 0;

        const center =
            deliveriesWithCoords.length > 0
                ? [
                      deliveriesWithCoords.reduce((sum, order) => sum + order.coordinates[0], 0) /
                          deliveriesWithCoords.length,
                      deliveriesWithCoords.reduce((sum, order) => sum + order.coordinates[1], 0) /
                          deliveriesWithCoords.length,
                  ]
                : DEFAULT_CENTER;

        const recentDeliveries = [...deliveriesWithCoords]
            .sort((a, b) => b.createdAtMs - a.createdAtMs)
            .slice(0, 8);

        return {
            fromMs,
            deliveriesWithCoords,
            center,
            uniqueCustomerCount,
            averageDeliveryValue,
            recentDeliveries,
        };
    }, [orders, mapRangeDays]);

    const stats = [
        {
            title: '7 хоногийн борлуулалт',
            value: formatMoney(analytics.currentSales),
            change: formatPercent(analytics.salesGrowth),
            isUp: analytics.salesGrowth >= 0,
            icon: <TrendingUp size={22} color="#10b981" />,
        },
        {
            title: '7 хоногийн захиалга',
            value: analytics.currentOrders.toLocaleString(),
            change: formatPercent(analytics.orderGrowth),
            isUp: analytics.orderGrowth >= 0,
            icon: <ShoppingBag size={22} color="#3b82f6" />,
        },
        {
            title: 'Дундаж сагсны үнэ',
            value: formatMoney(analytics.averageBasketValue),
            change: orders.length ? `${orders.length} нийт захиалга` : 'өгөгдөл алга',
            isUp: true,
            icon: <CircleDollarSign size={22} color="#f59e0b" />,
        },
        {
            title: 'Нийт хэрэглэгч',
            value: analytics.customerCount.toLocaleString(),
            change: `${analytics.productCount} бараа`,
            isUp: true,
            icon: <Users size={22} color="#8b5cf6" />,
        },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Хянах самбар</h1>
                <p>Сүүлийн 7 хоногийн бизнесийн гол үзүүлэлтүүд</p>
            </div>

            {errorMessage && (
                <div className="dashboard-alert">
                    <AlertTriangle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="stats-grid">
                {stats.map((stat) => (
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

            <div className="section-card delivery-map-card">
                <div className="delivery-map-header">
                    <div>
                        <h3>Хүргэлтийн байршлын газрын зураг</h3>
                        <p>
                            Сүүлийн {mapRangeDays} хоногийн координаттай хүргэлтийн захиалгууд
                        </p>
                    </div>
                    <div className="range-switch">
                        {RANGE_OPTIONS.map((days) => (
                            <button
                                key={days}
                                type="button"
                                className={`range-btn ${mapRangeDays === days ? 'active' : ''}`}
                                onClick={() => setMapRangeDays(days)}
                            >
                                {days} хоног
                            </button>
                        ))}
                    </div>
                </div>

                <div className="delivery-map-grid">
                    <div className="delivery-map-canvas">
                        <MapContainer center={deliveryInsights.center} zoom={11} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {deliveryInsights.deliveriesWithCoords.map((order) => (
                                <Marker key={order.id} position={order.coordinates} icon={deliveryMarkerIcon}>
                                    <Tooltip direction="top" offset={[0, -8]}>{order.customer}</Tooltip>
                                    <Popup>
                                        <div style={{ minWidth: '180px' }}>
                                            <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                                            <p style={{ margin: '6px 0' }}>{order.customer}</p>
                                            <p style={{ margin: '6px 0' }}>{formatMoney(order.total)}</p>
                                            <p style={{ margin: '6px 0' }}>
                                                {new Date(order.createdAtMs).toLocaleDateString('mn-MN')}
                                            </p>
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
                                <Truck size={16} />
                                <div>
                                    <span>Хүргэлтийн тоо</span>
                                    <strong>{deliveryInsights.deliveriesWithCoords.length}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <MapPinned size={16} />
                                <div>
                                    <span>Байршлын цэг</span>
                                    <strong>{deliveryInsights.deliveriesWithCoords.length}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <Users size={16} />
                                <div>
                                    <span>Хүргэсэн хэрэглэгч</span>
                                    <strong>{deliveryInsights.uniqueCustomerCount}</strong>
                                </div>
                            </div>
                            <div className="delivery-kpi">
                                <CircleDollarSign size={16} />
                                <div>
                                    <span>Дундаж хүргэлтийн дүн</span>
                                    <strong>{formatMoney(deliveryInsights.averageDeliveryValue)}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="delivery-list">
                            <h4>
                                <Clock3 size={14} />
                                <span>Сүүлийн хүргэлтүүд</span>
                            </h4>
                            {deliveryInsights.recentDeliveries.length ? (
                                deliveryInsights.recentDeliveries.map((order) => (
                                    <div key={order.id} className="delivery-row">
                                        <div>
                                            <p>#{order.id.slice(0, 6).toUpperCase()}</p>
                                            <small>{order.customer}</small>
                                        </div>
                                        <div>
                                            <p>{formatMoney(order.total)}</p>
                                            <small>{new Date(order.createdAtMs).toLocaleDateString('mn-MN')}</small>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state-text">
                                    Сонгосон хугацаанд координаттай хүргэлтийн өгөгдөл алга байна.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="section-card">
                    <h3>7 хоногийн борлуулалтын тренд</h3>
                    <div className="mock-chart-container">
                        {analytics.chartData.map((point) => (
                            <div key={point.key} className="chart-column">
                                <div className="chart-value">{point.total ? `₮${Math.round(point.total / 1000)}k` : '₮0'}</div>
                                <div className="chart-bar" style={{ height: `${point.percent}%` }}></div>
                                <div className="chart-label">{point.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-card">
                    <h3>Барааны нөөцийн төлөв</h3>
                    <div className="inventory-grid">
                        <div className="inventory-item">
                            <span className="inventory-label">Идэвхтэй бараа</span>
                            <strong>{analytics.activeProducts}</strong>
                        </div>
                        <div className="inventory-item warning">
                            <span className="inventory-label">Low stock (≤5)</span>
                            <strong>{analytics.lowStockCount}</strong>
                        </div>
                        <div className="inventory-item danger">
                            <span className="inventory-label">Out of stock</span>
                            <strong>{analytics.outOfStockCount}</strong>
                        </div>
                        <div className="inventory-item">
                            <span className="inventory-label">Нийт бараа</span>
                            <strong>{analytics.productCount}</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="section-card">
                    <h3>Хамгийн их зарагдсан 5 бүтээгдэхүүн</h3>
                    <div className="ranking-list">
                        {analytics.topSoldProducts.length ? (
                            analytics.topSoldProducts.map((product, index) => (
                                <div className="ranking-row" key={`${product.id}-${index}`}>
                                    <div className="ranking-left">
                                        <span className="ranking-index">#{index + 1}</span>
                                        <span className="ranking-name">{product.name}</span>
                                    </div>
                                    <strong>{product.soldQty} ш</strong>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Зарагдсан бүтээгдэхүүний өгөгдөл алга байна.</p>
                        )}
                    </div>
                </div>

                <div className="section-card">
                    <h3>Хамгийн их үлдэгдэлтэй 5 бүтээгдэхүүн</h3>
                    <div className="ranking-list">
                        {analytics.topStockProducts.length ? (
                            analytics.topStockProducts.map((product, index) => (
                                <div className="ranking-row" key={`${product.id}-${index}`}>
                                    <div className="ranking-left">
                                        <span className="ranking-index">#{index + 1}</span>
                                        <span className="ranking-name">{product.name}</span>
                                    </div>
                                    <strong>{product.stock} ш</strong>
                                </div>
                            ))
                        ) : (
                            <p className="empty-state-text">Үлдэгдлийн өгөгдөл алга байна.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Захиалга</th>
                            <th>Хэрэглэгч</th>
                            <th>Дүн</th>
                            <th>Огноо</th>
                            <th>Төлөв</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={5}>Уншиж байна...</td>
                            </tr>
                        ) : analytics.recentOrders.length ? (
                            analytics.recentOrders.map((order) => {
                                const statusClass = normalizeStatus(order.status);
                                return (
                                    <tr key={order.id}>
                                        <td>#{order.id.slice(0, 6).toUpperCase()}</td>
                                        <td>{order.customer}</td>
                                        <td>{formatMoney(order.total)}</td>
                                        <td>
                                            {order.createdAtMs
                                                ? new Date(order.createdAtMs).toLocaleDateString('mn-MN')
                                                : '-'}
                                        </td>
                                        <td>
                                            <span className={`status-pill ${statusClass}`}>
                                                {String(order.status || 'pending')}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5}>Одоогоор захиалгын мэдээлэл алга байна.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Dashboard;
