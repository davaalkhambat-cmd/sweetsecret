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
    const { user: currentUser } = useAuth();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
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
        source: '',
    });

    const SOURCE_OPTIONS = [
        { key: 'facebook', label: 'Facebook', icon: <Facebook size={14} /> },
        { key: 'instagram', label: 'Instagram', icon: <Instagram size={14} /> },
        { key: 'website', label: 'Веб сайт', icon: <Globe size={14} /> },
        { key: 'phone', label: 'Утас', icon: <Phone size={14} /> },
        { key: 'other', label: 'Бусад', icon: <MessageCircle size={14} /> },
    ];

    const PAYMENT_METHODS = [
        { key: 'cash', label: 'Бэлэн' },
        { key: 'bank_transfer', label: 'Данс' },
        { key: 'qpay', label: 'QPay' },
        { key: 'storepay', label: 'Storepay' },
        { key: 'pocket', label: 'Pocket' },
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

        return () => { unsubOrders(); unsubProducts(); };
    }, []);

    const filteredOrders = useMemo(() => orders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.phoneNumber || '').includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    }), [orders, searchTerm, statusFilter]);

    const stats = useMemo(() => ({
        totalCount: orders.length,
        pendingCount: orders.filter(o => o.status === 'pending').length,
        processingCount: orders.filter(o => o.status === 'processing').length,
        totalRevenue: orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
    }), [orders]);

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
                    id: prod.id, name: prod.name,
                    price: prod.price || prod.salePrice, quantity: 1
                }]
            });
        }
        setProductSearch('');
        setIsProductListOpen(false);
    };

    const calculateSubtotal = (items) => items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const calculateTotal = (items, fee, discount) => calculateSubtotal(items) + (Number(fee) || 0) - (Number(discount) || 0);

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (newOrder.items.length === 0) return alert("Бараа сонгоно уу.");
        if (!newOrder.source) return alert("Захиалгын суваг сонгоно уу.");

        try {
            const totalAmount = calculateTotal(newOrder.items, newOrder.deliveryFee, newOrder.discount);
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
                deliveryFee: 5000, discount: 0, source: ''
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

            <div className="table-filters" style={{ marginBottom: '20px' }}>
                <div className="search-box">
                    <Search size={18} />
                    <input type="text" placeholder="ID, Нэр, Утас..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select className="form-select" style={{ width: '180px', padding: '8px 12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="all">Бүх төлөв</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                    </select>
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
                                    <td><div className="customer-cell"><strong>{order.customerName || 'Зочин'}</strong><span className="email">{order.phoneNumber || order.email}</span></div></td>
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
                                        <button className="action-icon view" onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}><Eye size={18} /></button>
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
                                <div className="pricing-field"><label>Дэд дүн</label><input className="form-input" type="text" value={`₮${calculateSubtotal(newOrder.items).toLocaleString()}`} readOnly /></div>
                                <div className="pricing-field"><label><Truck size={14} /> Хүргэлтийн төлбөр</label><input className="form-input" type="number" value={newOrder.deliveryFee} onChange={e => setNewOrder({ ...newOrder, deliveryFee: Number(e.target.value) })} /></div>
                                <div className="pricing-field"><label><Tags size={14} /> Хөнгөлөлт (₮)</label><input className="form-input" type="number" value={newOrder.discount} onChange={e => setNewOrder({ ...newOrder, discount: Number(e.target.value) })} /></div>
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
                                <div className="final-total-box"><span className="total-label">Нийт дүн:</span><span className="total-value">₮{calculateTotal(newOrder.items, newOrder.deliveryFee, newOrder.discount).toLocaleString()}</span></div>
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
                    <div className="staff-role-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div><h3>Захиалгын дэлгэрэнгүй</h3><p>ID: #{selectedOrder.id}</p></div>
                            <button className="close-btn" onClick={() => setIsDetailsOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="order-details-content">
                            <div className="delivery-info-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <div>
                                    <h4 style={{ marginBottom: '10px' }}>Хэрэглэгчийн мэдээлэл</h4>
                                    <p><User size={14} /> {selectedOrder.customerName || 'Зочин'}</p>
                                    <p><Phone size={14} /> {selectedOrder.phoneNumber || '-'}</p>
                                    <p><MapPin size={14} /> {selectedOrder.address?.fullAddress || selectedOrder.deliveryAddress || 'Хаяггүй'}</p>
                                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#666' }}>
                                        <p><Tags size={14} /> Суваг: {selectedOrder.source || 'Veb sait'}</p>
                                        <p><CreditCard size={14} /> Төлбөр: {PAYMENT_METHODS.find(m => m.key === selectedOrder.paymentMethod)?.label || selectedOrder.paymentMethod || 'Тодорхойгүй'}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}><h4>Төлөв өөрчлөх</h4><div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>{Object.entries(STATUS_CONFIG).map(([key, cfg]) => <div key={key} className={`status-step ${selectedOrder.status === key ? 'active' : ''}`} onClick={() => handleUpdateStatus(selectedOrder.id, key)}>{cfg.icon}<span>{cfg.label}</span></div>)}</div></div>
                            </div>
                            <div className="order-items-listing" style={{ marginTop: '20px' }}>
                                <h4>Захиалсан бараанууд</h4>
                                <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '15px' }}>
                                    {(selectedOrder.items || []).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}><span>{item.name} x {item.quantity}</span><strong>₮{(item.price * item.quantity).toLocaleString()}</strong></div>
                                    ))}
                                    <div style={{ textAlign: 'right', marginTop: '15px', fontSize: '1.2rem' }}><span style={{ fontSize: '0.9rem', color: '#666' }}>Нийт: </span><strong>₮{(selectedOrder.totalAmount || 0).toLocaleString()}</strong></div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-actions"><button className="btn-cancel" onClick={() => setIsDetailsOpen(false)}>Хаах</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
