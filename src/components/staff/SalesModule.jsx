import React, { useState } from 'react';
import { Plus, ShoppingCart, Trash2, Search, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const SalesModule = () => {
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Example products list - in real app, these would come from Firestore
    const products = [
        { id: '1', name: 'Premium Face Oil', price: 45000 },
        { id: '2', name: 'Night Repair Serum', price: 85000 },
        { id: '3', name: 'Hydrating Mist', price: 28000 },
        { id: '4', name: 'Silk Cleansing Balm', price: 52000 },
    ];

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmitSale = async (e) => {
        e.preventDefault();
        if (cart.length === 0) return;

        setIsProcessing(true);
        try {
            const saleData = {
                customerName: customerName || 'Walk-in Customer',
                items: cart,
                total: total,
                createdAt: serverTimestamp(),
                status: 'completed'
            };

            await addDoc(collection(db, 'sales'), saleData);

            setSuccessMessage('Борлуулалт амжилттай бүртгэгдлээ!');
            setCart([]);
            setCustomerName('');

            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error recording sale:', error);
            alert('Борлуулалт бүртгэхэд алдаа гарлаа.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="sales-module">
            <div className="module-grid">
                {/* Product Selection */}
                <div className="products-selection">
                    <div className="search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Бүтээгдэхүүн хайх..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="products-grid-mini">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="mini-product-card" onClick={() => addToCart(product)}>
                                <div className="p-info">
                                    <span className="p-name">{product.name}</span>
                                    <span className="p-price">{product.price.toLocaleString()}₮</span>
                                </div>
                                <button className="add-btn"><Plus size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Checkout Section */}
                <div className="checkout-panel">
                    <div className="panel-header">
                        <h3><ShoppingCart size={18} /> Сагс</h3>
                        {successMessage && <div className="success-toast"><CheckCircle2 size={16} /> {successMessage}</div>}
                    </div>

                    <div className="cart-items">
                        {cart.length === 0 ? (
                            <div className="empty-cart">Сагс хоосон байна</div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="cart-row">
                                    <div className="item-name">
                                        <span>{item.name}</span>
                                        <small>{item.price.toLocaleString()}₮</small>
                                    </div>
                                    <div className="qty-controls">
                                        <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                    </div>
                                    <div className="item-total">
                                        {(item.price * item.quantity).toLocaleString()}₮
                                    </div>
                                    <button className="remove-btn" onClick={() => removeFromCart(item.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <form className="checkout-form" onSubmit={handleSubmitSale}>
                        <div className="input-group">
                            <label>Хэрэглэгчийн нэр (заавал биш)</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Нэр оруулах..."
                            />
                        </div>
                        <div className="summary">
                            <div className="summary-row total">
                                <span>Нийт дүн:</span>
                                <span>{total.toLocaleString()}₮</span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="complete-btn"
                            disabled={cart.length === 0 || isProcessing}
                        >
                            {isProcessing ? 'Боловсруулж байна...' : 'Борлуулалт дуусгах'}
                        </button>
                    </form>
                </div>
            </div>

            <style aria-hidden="true">{`
                .sales-module {
                    padding: 20px;
                }
                .module-grid {
                    display: grid;
                    grid-template-columns: 1fr 400px;
                    gap: 30px;
                }
                .search-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: #f8f9fa;
                    padding: 10px 15px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    border: 1px solid #eee;
                }
                .search-bar input {
                    border: none;
                    background: transparent;
                    width: 100%;
                    outline: none;
                }
                .products-grid-mini {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                    gap: 15px;
                }
                .mini-product-card {
                    background: #fff;
                    border: 1px solid #eee;
                    padding: 15px;
                    border-radius: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .mini-product-card:hover {
                    border-color: #2563EB;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
                }
                .p-info {
                    display: flex;
                    flex-direction: column;
                }
                .p-name {
                    font-weight: 600;
                    font-size: 0.9rem;
                }
                .p-price {
                    font-size: 0.8rem;
                    color: #666;
                }
                .add-btn {
                    background: #f0f7ff;
                    color: #2563EB;
                    border: none;
                    width: 28px;
                    height: 28px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .checkout-panel {
                    background: #fff;
                    border: 1px solid #eee;
                    border-radius: 20px;
                    padding: 25px;
                    height: fit-content;
                    position: sticky;
                    top: 20px;
                }
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .success-toast {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    background: #ecfdf5;
                    color: #059669;
                    padding: 5px 10px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                }
                .cart-items {
                    min-height: 200px;
                    max-height: 400px;
                    overflow-y: auto;
                    margin-bottom: 25px;
                }
                .empty-cart {
                    text-align: center;
                    color: #999;
                    padding: 40px 0;
                }
                .cart-row {
                    display: grid;
                    grid-template-columns: 1fr auto 80px auto;
                    align-items: center;
                    gap: 15px;
                    padding: 12px 0;
                    border-bottom: 1px solid #f8f9fa;
                }
                .item-name span {
                    display: block;
                    font-size: 0.9rem;
                    font-weight: 500;
                }
                .item-name small {
                    display: block;
                    color: #888;
                }
                .qty-controls {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: #f8f9fa;
                    padding: 4px;
                    border-radius: 8px;
                }
                .qty-controls button {
                    border: none;
                    background: transparent;
                    width: 20px;
                    height: 20px;
                    cursor: pointer;
                }
                .item-total {
                    font-weight: 600;
                    font-size: 0.9rem;
                    text-align: right;
                }
                .remove-btn {
                    color: #ef4444;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }

                .checkout-form {
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .input-group label {
                    display: block;
                    font-size: 0.8rem;
                    color: #666;
                    margin-bottom: 5px;
                }
                .input-group input {
                    width: 100%;
                    padding: 10px 15px;
                    border: 1px solid #eee;
                    border-radius: 10px;
                    margin-bottom: 20px;
                }
                .summary {
                    margin-bottom: 20px;
                }
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                }
                .total {
                    font-size: 1.2rem;
                    font-weight: 700;
                    color: #2D2424;
                }
                .complete-btn {
                    width: 100%;
                    background: #2D2424;
                    color: #fff;
                    border: none;
                    padding: 15px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .complete-btn:hover:not(:disabled) {
                    background: #2563EB;
                }
                .complete-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @media (max-width: 768px) {
                    .module-grid {
                        grid-template-columns: 1fr;
                    }
                    .checkout-panel {
                        position: static;
                    }
                }
            `}</style>
        </div>
    );
};

export default SalesModule;
