import React, { useEffect, useMemo, useState } from 'react';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { AlertTriangle, BadgePercent, Gift, LoaderCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { db } from '../../firebase';

const couponInitial = {
    id: null,
    code: '',
    type: 'percent',
    value: '',
    minOrderAmount: '',
    usageLimit: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
};

const giftCardInitial = {
    id: null,
    code: '',
    amount: '',
    expiresAt: '',
    assignedEmail: '',
    status: 'active',
};

const normalizeCode = (value) => value.trim().toUpperCase().replace(/\s+/g, '');
const toNumber = (value) => Number(String(value || '').replace(/[^\d.-]/g, '')) || 0;
const toDateInput = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const d = timestamp.toDate();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
};

const Promotions = () => {
    const [activeTab, setActiveTab] = useState('coupons');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [coupons, setCoupons] = useState([]);
    const [giftCards, setGiftCards] = useState([]);
    const [couponForm, setCouponForm] = useState(couponInitial);
    const [giftCardForm, setGiftCardForm] = useState(giftCardInitial);

    useEffect(() => {
        const couponQuery = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
        const giftCardQuery = query(collection(db, 'giftCards'), orderBy('createdAt', 'desc'));

        const unsubscribers = [
            onSnapshot(
                couponQuery,
                (snapshot) => {
                    setCoupons(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                code: data.code || '',
                                type: data.type || 'percent',
                                value: toNumber(data.value),
                                minOrderAmount: toNumber(data.minOrderAmount),
                                usageLimit: toNumber(data.usageLimit),
                                usedCount: toNumber(data.usedCount),
                                isActive: Boolean(data.isActive),
                                startsAt: data.startsAt || null,
                                endsAt: data.endsAt || null,
                                createdAtMs: data.createdAt?.toMillis?.() || 0,
                            };
                        })
                    );
                    setLoading(false);
                    setErrorMessage('');
                },
                (error) => {
                    console.error('Coupons snapshot error:', error);
                    setErrorMessage('Купоны мэдээлэл уншихад алдаа гарлаа.');
                    setLoading(false);
                }
            ),
            onSnapshot(
                giftCardQuery,
                (snapshot) => {
                    setGiftCards(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                code: data.code || '',
                                amount: toNumber(data.amount),
                                balance: toNumber(data.balance),
                                assignedEmail: data.assignedEmail || '',
                                status: data.status || 'active',
                                expiresAt: data.expiresAt || null,
                                createdAtMs: data.createdAt?.toMillis?.() || 0,
                            };
                        })
                    );
                },
                (error) => {
                    console.error('Gift cards snapshot error:', error);
                    setErrorMessage('Бэлгийн картын мэдээлэл уншихад алдаа гарлаа.');
                }
            ),
        ];

        return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    }, []);

    const couponStats = useMemo(
        () => ({
            total: coupons.length,
            active: coupons.filter((coupon) => coupon.isActive).length,
            exhausted: coupons.filter(
                (coupon) => coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit
            ).length,
        }),
        [coupons]
    );

    const giftCardStats = useMemo(
        () => ({
            total: giftCards.length,
            active: giftCards.filter((card) => card.status === 'active').length,
            value: giftCards.reduce((sum, card) => sum + card.balance, 0),
        }),
        [giftCards]
    );

    const filteredCoupons = useMemo(
        () =>
            coupons.filter((coupon) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return coupon.code.toLowerCase().includes(q) || coupon.type.toLowerCase().includes(q);
            }),
        [coupons, searchTerm]
    );

    const filteredGiftCards = useMemo(
        () =>
            giftCards.filter((card) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return (
                    card.code.toLowerCase().includes(q) ||
                    card.assignedEmail.toLowerCase().includes(q) ||
                    card.status.toLowerCase().includes(q)
                );
            }),
        [giftCards, searchTerm]
    );

    const handleCouponChange = (event) => {
        const { name, type, checked, value } = event.target;
        setCouponForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGiftCardChange = (event) => {
        const { name, value } = event.target;
        setGiftCardForm((prev) => ({ ...prev, [name]: value }));
    };

    const resetCouponForm = () => setCouponForm(couponInitial);
    const resetGiftCardForm = () => setGiftCardForm(giftCardInitial);

    const handleSaveCoupon = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        const code = normalizeCode(couponForm.code);
        const value = toNumber(couponForm.value);
        if (!code) {
            setErrorMessage('Купон код заавал оруулна.');
            return;
        }
        if (value <= 0) {
            setErrorMessage('Хямдралын утга 0-оос их байх ёстой.');
            return;
        }

        setIsSaving(true);
        const payload = {
            code,
            type: couponForm.type,
            value,
            minOrderAmount: toNumber(couponForm.minOrderAmount),
            usageLimit: toNumber(couponForm.usageLimit),
            isActive: Boolean(couponForm.isActive),
            startsAt: couponForm.startsAt ? new Date(`${couponForm.startsAt}T00:00:00`) : null,
            endsAt: couponForm.endsAt ? new Date(`${couponForm.endsAt}T23:59:59`) : null,
            updatedAt: serverTimestamp(),
        };

        try {
            if (couponForm.id) {
                await updateDoc(doc(db, 'coupons', couponForm.id), payload);
            } else {
                await addDoc(collection(db, 'coupons'), {
                    ...payload,
                    usedCount: 0,
                    createdAt: serverTimestamp(),
                });
            }
            resetCouponForm();
        } catch (error) {
            console.error('Save coupon error:', error);
            setErrorMessage('Купон хадгалах үед алдаа гарлаа.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGiftCard = async (event) => {
        event.preventDefault();
        setErrorMessage('');
        const code = normalizeCode(giftCardForm.code);
        const amount = toNumber(giftCardForm.amount);
        if (!code) {
            setErrorMessage('Бэлгийн картын код заавал оруулна.');
            return;
        }
        if (amount <= 0) {
            setErrorMessage('Дүн 0-оос их байх ёстой.');
            return;
        }

        setIsSaving(true);
        const payload = {
            code,
            amount,
            balance: giftCardForm.id ? undefined : amount,
            assignedEmail: giftCardForm.assignedEmail.trim(),
            status: giftCardForm.status,
            expiresAt: giftCardForm.expiresAt ? new Date(`${giftCardForm.expiresAt}T23:59:59`) : null,
            updatedAt: serverTimestamp(),
        };

        try {
            if (giftCardForm.id) {
                const cleanPayload = { ...payload };
                delete cleanPayload.balance;
                await updateDoc(doc(db, 'giftCards', giftCardForm.id), cleanPayload);
            } else {
                await addDoc(collection(db, 'giftCards'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                });
            }
            resetGiftCardForm();
        } catch (error) {
            console.error('Save gift card error:', error);
            setErrorMessage('Бэлгийн карт хадгалах үед алдаа гарлаа.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditCoupon = (coupon) => {
        setCouponForm({
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: String(coupon.value),
            minOrderAmount: String(coupon.minOrderAmount || ''),
            usageLimit: String(coupon.usageLimit || ''),
            startsAt: toDateInput(coupon.startsAt),
            endsAt: toDateInput(coupon.endsAt),
            isActive: coupon.isActive,
        });
        setActiveTab('coupons');
    };

    const handleEditGiftCard = (card) => {
        setGiftCardForm({
            id: card.id,
            code: card.code,
            amount: String(card.amount),
            expiresAt: toDateInput(card.expiresAt),
            assignedEmail: card.assignedEmail,
            status: card.status,
        });
        setActiveTab('giftCards');
    };

    const handleDelete = async (collectionName, id) => {
        if (!window.confirm('Энэ мэдээллийг устгахдаа итгэлтэй байна уу?')) return;
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            console.error('Delete promotion error:', error);
            setErrorMessage('Устгах үед алдаа гарлаа.');
        }
    };

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Урамшуулал</h1>
                    <p>Купон код, бэлгийн карт болон урамшууллын хэрэгслүүдийг удирдана.</p>
                </div>
            </div>

            {errorMessage && (
                <div className="dashboard-alert">
                    <AlertTriangle size={16} />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="promotions-tabs">
                <button className={`promotions-tab ${activeTab === 'coupons' ? 'active' : ''}`} onClick={() => setActiveTab('coupons')}>
                    <BadgePercent size={16} />
                    <span>Купон код</span>
                </button>
                <button className={`promotions-tab ${activeTab === 'giftCards' ? 'active' : ''}`} onClick={() => setActiveTab('giftCards')}>
                    <Gift size={16} />
                    <span>Бэлгийн карт</span>
                </button>
            </div>

            <div className="promotions-layout">
                <div className="section-card">
                    <div className="search-box" style={{ marginBottom: '1rem' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'coupons' ? 'Купон хайх...' : 'Бэлгийн карт хайх...'}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    {activeTab === 'coupons' ? (
                        <>
                            <div className="promotions-mini-stats">
                                <div className="promotion-stat-item"><span>Нийт</span><strong>{couponStats.total}</strong></div>
                                <div className="promotion-stat-item"><span>Идэвхтэй</span><strong>{couponStats.active}</strong></div>
                                <div className="promotion-stat-item"><span>Дууссан</span><strong>{couponStats.exhausted}</strong></div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Код</th>
                                            <th>Төрөл</th>
                                            <th>Утга</th>
                                            <th>Ашиглалт</th>
                                            <th>Төлөв</th>
                                            <th>Үйлдэл</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={6}><LoaderCircle size={16} className="spin" /> Уншиж байна...</td></tr>
                                        ) : filteredCoupons.length ? (
                                            filteredCoupons.map((coupon) => (
                                                <tr key={coupon.id}>
                                                    <td className="product-name-cell">{coupon.code}</td>
                                                    <td>{coupon.type}</td>
                                                    <td>{coupon.type === 'percent' ? `${coupon.value}%` : `₮${coupon.value.toLocaleString()}`}</td>
                                                    <td>{coupon.usedCount}/{coupon.usageLimit || '∞'}</td>
                                                    <td><span className={`status-pill ${coupon.isActive ? 'active' : 'inactive'}`}>{coupon.isActive ? 'active' : 'inactive'}</span></td>
                                                    <td className="actions-cell">
                                                        <button className="action-icon edit" type="button" onClick={() => handleEditCoupon(coupon)}><Pencil size={15} /></button>
                                                        <button className="action-icon delete" type="button" onClick={() => handleDelete('coupons', coupon.id)}><Trash2 size={15} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6}>Илэрц олдсонгүй</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="promotions-mini-stats">
                                <div className="promotion-stat-item"><span>Нийт</span><strong>{giftCardStats.total}</strong></div>
                                <div className="promotion-stat-item"><span>Идэвхтэй</span><strong>{giftCardStats.active}</strong></div>
                                <div className="promotion-stat-item"><span>Үлдэгдэл</span><strong>₮{giftCardStats.value.toLocaleString()}</strong></div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Код</th>
                                            <th>Дүн</th>
                                            <th>Үлдэгдэл</th>
                                            <th>Хэрэглэгч</th>
                                            <th>Төлөв</th>
                                            <th>Үйлдэл</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={6}><LoaderCircle size={16} className="spin" /> Уншиж байна...</td></tr>
                                        ) : filteredGiftCards.length ? (
                                            filteredGiftCards.map((card) => (
                                                <tr key={card.id}>
                                                    <td className="product-name-cell">{card.code}</td>
                                                    <td>₮{card.amount.toLocaleString()}</td>
                                                    <td>₮{card.balance.toLocaleString()}</td>
                                                    <td>{card.assignedEmail || '-'}</td>
                                                    <td><span className={`status-pill ${card.status === 'active' ? 'active' : 'inactive'}`}>{card.status}</span></td>
                                                    <td className="actions-cell">
                                                        <button className="action-icon edit" type="button" onClick={() => handleEditGiftCard(card)}><Pencil size={15} /></button>
                                                        <button className="action-icon delete" type="button" onClick={() => handleDelete('giftCards', card.id)}><Trash2 size={15} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={6}>Илэрц олдсонгүй</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="section-card">
                    <h3>{activeTab === 'coupons' ? 'Купон бүртгэх' : 'Бэлгийн карт бүртгэх'}</h3>
                    {activeTab === 'coupons' ? (
                        <form className="promotions-form" onSubmit={handleSaveCoupon}>
                            <label>Код<input name="code" value={couponForm.code} onChange={handleCouponChange} required /></label>
                            <label>Төрөл
                                <select className="form-select" name="type" value={couponForm.type} onChange={handleCouponChange}>
                                    <option value="percent">Хувь (%)</option>
                                    <option value="fixed">Тогтмол дүн</option>
                                    <option value="shipping">Хүргэлт үнэгүй</option>
                                </select>
                            </label>
                            <label>Урамшууллын утга<input name="value" type="number" min="0" value={couponForm.value} onChange={handleCouponChange} required /></label>
                            <label>Доод худалдан авалт<input name="minOrderAmount" type="number" min="0" value={couponForm.minOrderAmount} onChange={handleCouponChange} /></label>
                            <label>Ашиглалтын лимит<input name="usageLimit" type="number" min="0" value={couponForm.usageLimit} onChange={handleCouponChange} /></label>
                            <div className="promotions-form-row">
                                <label>Эхлэх огноо<input name="startsAt" type="date" value={couponForm.startsAt} onChange={handleCouponChange} /></label>
                                <label>Дуусах огноо<input name="endsAt" type="date" value={couponForm.endsAt} onChange={handleCouponChange} /></label>
                            </div>
                            <label className="promotions-check">
                                <input name="isActive" type="checkbox" checked={couponForm.isActive} onChange={handleCouponChange} />
                                <span>Идэвхтэй</span>
                            </label>
                            <div className="promotions-actions">
                                <button className="add-btn" type="submit" disabled={isSaving}>
                                    <Plus size={16} />
                                    <span>{isSaving ? 'Хадгалж байна...' : couponForm.id ? 'Шинэчлэх' : 'Хадгалах'}</span>
                                </button>
                                <button type="button" className="filter-btn" onClick={resetCouponForm}>Цэвэрлэх</button>
                            </div>
                        </form>
                    ) : (
                        <form className="promotions-form" onSubmit={handleSaveGiftCard}>
                            <label>Код<input name="code" value={giftCardForm.code} onChange={handleGiftCardChange} required /></label>
                            <label>Дүн<input name="amount" type="number" min="0" value={giftCardForm.amount} onChange={handleGiftCardChange} required /></label>
                            <label>Хэрэглэгчийн имэйл<input name="assignedEmail" type="email" value={giftCardForm.assignedEmail} onChange={handleGiftCardChange} /></label>
                            <label>Дуусах огноо<input name="expiresAt" type="date" value={giftCardForm.expiresAt} onChange={handleGiftCardChange} /></label>
                            <label>Төлөв
                                <select className="form-select" name="status" value={giftCardForm.status} onChange={handleGiftCardChange}>
                                    <option value="active">active</option>
                                    <option value="paused">paused</option>
                                    <option value="used">used</option>
                                    <option value="expired">expired</option>
                                </select>
                            </label>
                            <div className="promotions-actions">
                                <button className="add-btn" type="submit" disabled={isSaving}>
                                    <Plus size={16} />
                                    <span>{isSaving ? 'Хадгалж байна...' : giftCardForm.id ? 'Шинэчлэх' : 'Хадгалах'}</span>
                                </button>
                                <button type="button" className="filter-btn" onClick={resetGiftCardForm}>Цэвэрлэх</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Promotions;
