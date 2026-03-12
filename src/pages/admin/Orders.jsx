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
        deliveryFee: 5000,
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

    const calculateSubtotal = (items) => items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const calculateTotal = (items, fee, discount, discountType = 'amount') => {
        const subtotal = calculateSubtotal(items);
        let discountValue = Number(discount) || 0;
        if (discountType === 'percent') {
            discountValue = (subtotal * (Number(discount) || 0)) / 100;
        }
        return subtotal + (Number(fee) || 0) - discountValue;
    };

    const getDiscountAmount = (items, discount, discountType) => {
        const subtotal = calculateSubtotal(items);
        if (discountType === 'percent') {
            return (subtotal * (Number(discount) || 0)) / 100;
        }
        return Number(discount) || 0;
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
                deliveryFee: 5000, discount: 0, discountType: 'amount', source: ''
            });
        } catch (error) {
            console.error("Submit order error:", error);
            alert("Алдаа гарлаа.");
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Захиалга Удирдах</h1>
                    <p>Нийт {stats.totalCount} захиалга бүртгэлтэй</p>
                </div>
                <div className="header-actions">
                    <button className="export-btn"><Download size={18} /><span>Тайлан (Excel)</span></button>
                    <button className="staff-btn-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={18} />Захиалга шивэх</button>
                </div>
            </div>

            <div className="orders-stats-grid">
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#EFF6FF', color: '#1D4ED8' }}><PackageCheck size={22} /></div>
                    <div className="order-stat-info"><span>Нийт захиалга</span><h3>{stats.totalCount}</h3></div>
                </div>
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#FFF7ED', color: '#C2410C' }}><Clock size={22} /></div>
                    <div className="order-stat-info"><span>Хүлээгдэж буй</span><h3>{stats.pendingCount}</h3></div>
                </div>
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}><Truck size={22} /></div>
                    <div className="order-stat-info"><span>Нийт борлуулалт</span><h3>₮{stats.totalRevenue.toLocaleString()}</h3></div>
                </div>
            </div>

            <div className="table-filters" style={{ marginBottom: '25px', gap: '15px', alignItems: 'flex-end' }}>
                <div className="search-box" style={{ flex: 2 }}>
                    <Search size={18} />
                    <input type="text" placeholder="ID, Нэр, Утас..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="filter-group" style={{ flex: 3, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="filter-item">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#666', textTransform: 'uppercase' }}>Төлөв</label>
                        <div style={{ position: 'relative' }}>
                            <select className="form-select" style={{ width: '140px', padding: '10px 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="all">Бүх төлөв</option>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="filter-item">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#666', textTransform: 'uppercase' }}>Суваг</label>
                        <div style={{ position: 'relative' }}>
                            <select className="form-select" style={{ width: '140px', padding: '10px 12px' }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
                                <option value="all">Бүх суваг</option>
                                {SOURCE_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="filter-item">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#666', textTransform: 'uppercase' }}>Төлбөр</label>
                        <div style={{ position: 'relative' }}>
                            <select className="form-select" style={{ width: '140px', padding: '10px 12px' }} value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
                                <option value="all">Бүх төлбөр</option>
                                {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="filter-item">
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#666', textTransform: 'uppercase' }}>Хугацаа (Эхлэх - Дуусах)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ width: '150px', padding: '10px 12px', paddingLeft: '35px' }}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            </div>
                            <span style={{ color: '#999' }}>-</span>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ width: '150px', padding: '10px 12px', paddingLeft: '35px' }}
                                    value={endDate}
                                    min={startDate}
                                    max={startDate ? new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + 1)).toISOString().split('T')[0] : undefined}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                                <Calendar size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            </div>
                            {(startDate || endDate || statusFilter !== 'all' || sourceFilter !== 'all' || paymentFilter !== 'all') && (
                                <button
                                    className="btn-text-only"
                                    onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('all'); setSourceFilter('all'); setPaymentFilter('all'); }}
                                    style={{ color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, padding: '5px' }}
                                >
                                    Арилгах
                                </button>
                            )}
                        </div>
                    </div>
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
                                    <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{order.id.slice(-6).toUpperCase()}</td>
                                    <td>
                                        <div className="customer-cell">
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <strong>{order.customerName || 'Зочин'}</strong>
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
                                            <span className="email">{order.phoneNumber || order.email}</span>
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
                            <div className="modal-section-title"><User size={18} style={{ marginRight: 8 }} /> Үйлчлүүлэгч & Суваг</div>
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
                                    <select className="form-select" value={newOrder.address.zone} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, zone: e.target.value } })}>
                                        <option>Улаанбаатар</option>
                                        <option>Орон нутаг</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Хот / Аймаг *</label>
                                    <input className="form-input" type="text" value={newOrder.address.city} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, city: e.target.value } })} required />
                                </div>
                                <div className="form-group">
                                    <label>Сум / Дүүрэг *</label>
                                    <input className="form-input" type="text" value={newOrder.address.district} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, district: e.target.value } })} placeholder="Сум/Дүүрэг сонгох" required />
                                </div>
                                <div className="form-group">
                                    <label>Баг / Хороо *</label>
                                    <input className="form-input" type="text" value={newOrder.address.khoroo} onChange={e => setNewOrder({ ...newOrder, address: { ...newOrder.address, khoroo: e.target.value } })} placeholder="Баг/Хороо сонгох" required />
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
                                                    <div><div><strong>{p.name}</strong></div><div className="p-stock">Үлдэгдэл: {p.stock || 0} ш</div></div>
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
                                            <div><strong>{item.name}</strong><span style={{ fontSize: '0.85rem', color: '#666', marginLeft: 10 }}>{item.quantity} x ₮{item.price.toLocaleString()}</span></div>
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
                                            <span>Бүтээгдэхүүний код</span>
                                            <span>Тоо ширхэг</span>
                                            <span>Үнэ</span>
                                            <span></span>
                                        </div>
                                        <div className="items-scroll-area-new">
                                            {(selectedOrder.items || []).map((item, idx) => (
                                                <div key={idx} className="item-row-new">
                                                    <img src={item.image || 'https://placehold.co/100x100?text=Beauty'} alt="" className="item-img-new" />
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
                                            <span>₮{(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                                        </div>
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
