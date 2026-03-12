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
    Phone,
    Copy,
    Trash2,
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

    // New Order Form State
    const [newOrder, setNewOrder] = useState({
        customerName: '',
        phoneNumber: '',
        email: '',
        deliveryAddress: '',
        items: [], // { id, name, price, quantity }
        status: 'pending',
        deliveryType: 'delivery', // 'delivery' | 'pickup'
        paymentMethod: 'bank_transfer',
    });

    // Temp state for adding items to new order
    const [selectedProduct, setSelectedProduct] = useState('');
    const [itemQty, setItemQty] = useState(1);

    useEffect(() => {
        // Fetch Orders
        const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsubOrders = onSnapshot(qOrders, (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));
            setOrders(list);
            setLoading(false);
        });

        // Fetch Products for selection
        const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
            setProducts(snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })));
        });

        return () => {
            unsubOrders();
            unsubProducts();
        };
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch =
                o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.phoneNumber || '').includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        return {
            totalCount: orders.length,
            pendingCount: orders.filter(o => o.status === 'pending').length,
            processingCount: orders.filter(o => o.status === 'processing').length,
            totalRevenue: orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
        };
    }, [orders]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateDoc(doc(db, 'orders', orderId), {
                status: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.uid || 'admin'
            });
            if (selectedOrder && selectedOrder.id === orderId) {
                setSelectedOrder({ ...selectedOrder, status: newStatus });
            }
        } catch (error) {
            console.error("Update status error:", error);
            alert("Төлөв өөрчлөхөд алдаа гарлаа.");
        }
    };

    const addItemToNewOrder = () => {
        if (!selectedProduct) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;

        const existing = newOrder.items.find(i => i.id === prod.id);
        if (existing) {
            setNewOrder({
                ...newOrder,
                items: newOrder.items.map(i =>
                    i.id === prod.id ? { ...i, quantity: i.quantity + itemQty } : i
                )
            });
        } else {
            setNewOrder({
                ...newOrder,
                items: [...newOrder.items, {
                    id: prod.id,
                    name: prod.name,
                    price: prod.price || prod.salePrice,
                    quantity: itemQty
                }]
            });
        }
        setSelectedProduct('');
        setItemQty(1);
    };

    const removeItemFromNewOrder = (id) => {
        setNewOrder({
            ...newOrder,
            items: newOrder.items.filter(i => i.id !== id)
        });
    };

    const calculateTotal = (items) => {
        return items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    };

    const handleSubmitOrder = async (e) => {
        e.preventDefault();
        if (newOrder.items.length === 0) {
            alert("Дор хаяж нэг бараа сонгоно уу.");
            return;
        }

        try {
            const totalAmount = calculateTotal(newOrder.items);
            await addDoc(collection(db, 'orders'), {
                ...newOrder,
                totalAmount,
                createdAt: serverTimestamp(),
                source: 'admin_manual',
                createdBy: currentUser?.uid || 'admin'
            });
            setIsAddModalOpen(false);
            setNewOrder({
                customerName: '', phoneNumber: '', email: '',
                deliveryAddress: '', items: [], status: 'pending',
                deliveryType: 'delivery', paymentMethod: 'bank_transfer'
            });
        } catch (error) {
            console.error("Submit order error:", error);
            alert("Захиалга бүртгэхэд алдаа гарлаа.");
        }
    };

    const getStatusLabel = (status) => STATUS_CONFIG[status]?.label || status;

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Захиалга Удирдах</h1>
                    <p>Нийт {stats.totalCount} захиалга бүртгэлтэй байна</p>
                </div>
                <div className="header-actions">
                    <button className="export-btn">
                        <Download size={18} />
                        <span>Тайлан (Excel)</span>
                    </button>
                    <button className="staff-btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <Plus size={18} />
                        Захиалга шивэх
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="orders-stats-grid">
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                        <PackageCheck size={22} />
                    </div>
                    <div className="order-stat-info">
                        <span>Нийт захиалга</span>
                        <h3>{stats.totalCount}</h3>
                    </div>
                </div>
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#FFF7ED', color: '#C2410C' }}>
                        <Clock size={22} />
                    </div>
                    <div className="order-stat-info">
                        <span>Хүлээгдэж буй</span>
                        <h3>{stats.pendingCount}</h3>
                    </div>
                </div>
                <div className="order-stat-card">
                    <div className="order-stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
                        <Truck size={22} />
                    </div>
                    <div className="order-stat-info">
                        <span>Нийт борлуулалт</span>
                        <h3>₮{stats.totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="table-filters" style={{ marginBottom: '20px' }}>
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="ID, Нэр, Утас..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select
                        className="form-select"
                        style={{ width: '180px', padding: '8px 12px' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Бүх төлөв</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
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
                            <th>Төлөв</th>
                            <th>Үйлдэл</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Уншиж байна...</td></tr>
                        ) : filteredOrders.map((order) => (
                            <tr key={order.id}>
                                <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>#{order.id.slice(-6).toUpperCase()}</td>
                                <td>
                                    <div className="customer-cell">
                                        <strong>{order.customerName || 'Зочин'}</strong>
                                        <span className="email">{order.phoneNumber || order.email}</span>
                                    </div>
                                </td>
                                <td>
                                    <strong>₮{(Number(order.totalAmount) || 0).toLocaleString()}</strong>
                                </td>
                                <td>
                                    <div className="date-cell">
                                        <Calendar size={14} style={{ marginRight: '5px', opacity: 0.6 }} />
                                        {order.createdAt ? new Date(order.createdAt.toMillis()).toLocaleDateString() : '-'}
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-pill ${STATUS_CONFIG[order.status]?.class || ''}`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    <button
                                        className="action-icon view"
                                        onClick={() => { setSelectedOrder(order); setIsDetailsOpen(true); }}
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Order Modal */}
            {isAddModalOpen && (
                <div className="staff-confirm-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="staff-role-modal order-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Шинэ захиалга бүртгэх</h3>
                                <p>Борлуулалт эсвэл хүргэлтийн захиалгыг гараар шивэх.</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitOrder}>
                            <div className="role-form-grid">
                                <div>
                                    <label>Хэрэглэгчийн нэр</label>
                                    <input
                                        type="text"
                                        value={newOrder.customerName}
                                        onChange={e => setNewOrder({ ...newOrder, customerName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label>Утасны дугаар</label>
                                    <input
                                        type="tel"
                                        value={newOrder.phoneNumber}
                                        onChange={e => setNewOrder({ ...newOrder, phoneNumber: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group-full">
                                    <label>Хүргэлтийн хаяг</label>
                                    <textarea
                                        rows="2"
                                        value={newOrder.deliveryAddress}
                                        onChange={e => setNewOrder({ ...newOrder, deliveryAddress: e.target.value })}
                                    />
                                </div>

                                <div className="form-group-full">
                                    <label>Бараа нэмэх</label>
                                    <div className="product-selector-row">
                                        <select
                                            className="form-select"
                                            value={selectedProduct}
                                            onChange={e => setSelectedProduct(e.target.value)}
                                        >
                                            <option value="">Бараа сонгох...</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} - ₮{p.price?.toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            min="1"
                                            value={itemQty}
                                            onChange={e => setItemQty(Number(e.target.value))}
                                            placeholder="Тоо"
                                        />
                                        <button type="button" className="staff-btn-primary" onClick={addItemToNewOrder}>
                                            Нэмэх
                                        </button>
                                    </div>

                                    <div className="order-items-editor">
                                        {newOrder.items.length === 0 ? (
                                            <p style={{ textAlign: 'center', color: '#999', padding: '10px' }}>Бараа нэмээгүй байна</p>
                                        ) : (
                                            newOrder.items.map(item => (
                                                <div key={item.id} className="added-item-row">
                                                    <div>
                                                        <strong>{item.name}</strong>
                                                        <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '10px' }}>
                                                            {item.quantity} x ₮{item.price.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <button type="button" onClick={() => removeItemFromNewOrder(item.id)} style={{ color: '#DC2626' }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="order-summary-box">
                                        <span className="total-label">Нийт дүн:</span>
                                        <span className="total-value">₮{calculateTotal(newOrder.items).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsAddModalOpen(false)}>Болих</button>
                                <button type="submit" className="btn-save">
                                    Захиалга үүсгэх
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Order Details Modal */}
            {isDetailsOpen && selectedOrder && (
                <div className="staff-confirm-overlay" onClick={() => setIsDetailsOpen(false)}>
                    <div className="staff-role-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Захиалгын дэлгэрэнгүй</h3>
                                <p>ID: #{selectedOrder.id}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailsOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="order-details-content">
                            <div className="delivery-info-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <div>
                                    <h4 style={{ marginBottom: '10px' }}>Хэрэглэгчийн мэдээлэл</h4>
                                    <p><User size={14} /> {selectedOrder.customerName || 'Зочин'}</p>
                                    <p><Phone size={14} /> {selectedOrder.phoneNumber || '-'}</p>
                                    <p><MapPin size={14} /> {selectedOrder.deliveryAddress || 'Хаяггүй'}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <h4>Төлөв өөрчлөх</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                            <div
                                                key={key}
                                                className={`status-step ${selectedOrder.status === key ? 'active' : ''}`}
                                                onClick={() => handleUpdateStatus(selectedOrder.id, key)}
                                            >
                                                {cfg.icon}
                                                <span>{cfg.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="order-items-listing" style={{ marginTop: '20px' }}>
                                <h4>Захиалсан бараанууд</h4>
                                <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '15px' }}>
                                    {(selectedOrder.items || []).map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                            <span>{item.name} x {item.quantity}</span>
                                            <strong>₮{(item.price * item.quantity).toLocaleString()}</strong>
                                        </div>
                                    ))}
                                    <div style={{ textAlign: 'right', marginTop: '15px', fontSize: '1.2rem' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>Нийт: </span>
                                        <strong>₮{(selectedOrder.totalAmount || 0).toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setIsDetailsOpen(false)}>Хаах</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
