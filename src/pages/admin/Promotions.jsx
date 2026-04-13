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
import { AlertTriangle, BadgePercent, Gift, LoaderCircle, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
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

const promotionInitial = {
    id: null,
    title: '',
    type: 'buy_x_get_y',
    triggerProductId: '',
    minQuantity: '1',
    giftProductId: '',
    giftQuantity: '1',
    minOrderAmount: '',
    startsAt: '',
    endsAt: '',
    isActive: true,
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

const getProductImage = (product) =>
    product?.image || product?.images?.[0] || 'https://placehold.co/100x100?text=Product';

const getPromotionErrorMessage = (error, fallbackMessage) => {
    const errorCode = error?.code || '';
    if (errorCode === 'permission-denied') {
        return 'Firestore permission denied. `promotions` collection-ийн rules-ээ deploy хийгээгүй байна.';
    }
    if (errorCode === 'failed-precondition') {
        return 'Firestore тохиргоо дутуу байна. Collection query эсвэл rule-ээ шалгана уу.';
    }
    return fallbackMessage;
};

const promotionPresets = [
    {
        id: 'welcome-oil',
        title: 'Шинэ хэрэглэгчийн бэлэг',
        description: 'Innergarm x Elle Light up Oil 40ml-ийг 1ш бэлгэнд өгөх preset.',
        type: 'free_gift_over_amount',
        minOrderAmount: '150000',
        minQuantity: '1',
        giftQuantity: '1',
    },
    {
        id: 'cup-bundle',
        title: 'Menstrual Cup 1+1',
        description: 'Menstrual Cup авбал дагалдах бүтээгдэхүүн бэлгэнд өгөх preset.',
        type: 'buy_x_get_y',
        minOrderAmount: '',
        minQuantity: '1',
        giftQuantity: '1',
    },
    {
        id: 'high-value-gift',
        title: '250,000₮+ тусгай бэлэг',
        description: 'Өндөр дүнтэй захиалгад 1ш бэлэг автоматаар идэвхжих preset.',
        type: 'free_gift_over_amount',
        minOrderAmount: '250000',
        minQuantity: '1',
        giftQuantity: '1',
    },
];

const Promotions = () => {
    const [activeTab, setActiveTab] = useState('coupons');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [coupons, setCoupons] = useState([]);
    const [giftCards, setGiftCards] = useState([]);
    const [promotionRules, setPromotionRules] = useState([]);
    const [products, setProducts] = useState([]);
    const [triggerProductSearch, setTriggerProductSearch] = useState('');
    const [giftProductSearch, setGiftProductSearch] = useState('');
    const [isTriggerSearchOpen, setIsTriggerSearchOpen] = useState(false);
    const [isGiftSearchOpen, setIsGiftSearchOpen] = useState(false);
    const [couponForm, setCouponForm] = useState(couponInitial);
    const [giftCardForm, setGiftCardForm] = useState(giftCardInitial);
    const [promotionForm, setPromotionForm] = useState(promotionInitial);

    useEffect(() => {
        const couponQuery = query(collection(db, 'coupons'), orderBy('createdAt', 'desc'));
        const giftCardQuery = query(collection(db, 'giftCards'), orderBy('createdAt', 'desc'));
        const promotionQuery = query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));

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
            onSnapshot(
                promotionQuery,
                (snapshot) => {
                    setPromotionRules(
                        snapshot.docs.map((docSnap) => {
                            const data = docSnap.data();
                            return {
                                id: docSnap.id,
                                title: data.title || '',
                                type: data.type || 'buy_x_get_y',
                                triggerProductId: data.triggerProductId || '',
                                triggerProductName: data.triggerProductName || '',
                                minQuantity: toNumber(data.minQuantity) || 1,
                                giftProductId: data.giftProductId || '',
                                giftProductName: data.giftProductName || '',
                                giftQuantity: toNumber(data.giftQuantity) || 1,
                                minOrderAmount: toNumber(data.minOrderAmount),
                                isActive: Boolean(data.isActive),
                                startsAt: data.startsAt || null,
                                endsAt: data.endsAt || null,
                                createdAtMs: data.createdAt?.toMillis?.() || 0,
                            };
                        })
                    );
                },
                (error) => {
                    console.error('Promotions snapshot error:', error);
                    setErrorMessage('Автомат урамшууллын мэдээлэл уншихад алдаа гарлаа.');
                }
            ),
            onSnapshot(
                collection(db, 'products'),
                (snapshot) => {
                    setProducts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
                },
                (error) => {
                    console.error('Products snapshot error:', error);
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

    const promotionStats = useMemo(
        () => ({
            total: promotionRules.length,
            active: promotionRules.filter((promotion) => promotion.isActive).length,
            buyGet: promotionRules.filter((promotion) => promotion.type === 'buy_x_get_y').length,
            freeGift: promotionRules.filter((promotion) => promotion.type === 'free_gift_over_amount').length,
        }),
        [promotionRules]
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

    const filteredPromotions = useMemo(
        () =>
            promotionRules.filter((promotion) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return (
                    promotion.title.toLowerCase().includes(q) ||
                    promotion.type.toLowerCase().includes(q) ||
                    promotion.triggerProductName.toLowerCase().includes(q) ||
                    promotion.giftProductName.toLowerCase().includes(q)
                );
            }),
        [promotionRules, searchTerm]
    );

    const handleCouponChange = (event) => {
        const { name, type, checked, value } = event.target;
        setCouponForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleGiftCardChange = (event) => {
        const { name, value } = event.target;
        setGiftCardForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePromotionChange = (event) => {
        const { name, type, checked, value } = event.target;
        setPromotionForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const selectedTriggerProduct = useMemo(
        () => products.find((product) => product.id === promotionForm.triggerProductId) || null,
        [products, promotionForm.triggerProductId]
    );

    const selectedGiftProduct = useMemo(
        () => products.find((product) => product.id === promotionForm.giftProductId) || null,
        [products, promotionForm.giftProductId]
    );

    const filteredTriggerProducts = useMemo(() => {
        const q = triggerProductSearch.trim().toLowerCase();
        if (!q) return products.slice(0, 8);
        return products.filter((product) => product.name?.toLowerCase().includes(q)).slice(0, 8);
    }, [products, triggerProductSearch]);

    const filteredGiftProducts = useMemo(() => {
        const q = giftProductSearch.trim().toLowerCase();
        if (!q) return products.slice(0, 8);
        return products.filter((product) => product.name?.toLowerCase().includes(q)).slice(0, 8);
    }, [products, giftProductSearch]);

    const resetCouponForm = () => setCouponForm(couponInitial);
    const resetGiftCardForm = () => setGiftCardForm(giftCardInitial);
    const resetPromotionForm = () => {
        setPromotionForm(promotionInitial);
        setTriggerProductSearch('');
        setGiftProductSearch('');
        setIsTriggerSearchOpen(false);
        setIsGiftSearchOpen(false);
    };

    const applyPromotionPreset = (preset) => {
        setPromotionForm((prev) => ({
            ...promotionInitial,
            id: prev.id,
            title: preset.title,
            type: preset.type,
            minOrderAmount: preset.minOrderAmount,
            minQuantity: preset.minQuantity,
            giftQuantity: preset.giftQuantity,
            isActive: true,
        }));
        setTriggerProductSearch('');
        setGiftProductSearch('');
        setIsTriggerSearchOpen(false);
        setIsGiftSearchOpen(false);
    };

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
            setErrorMessage(getPromotionErrorMessage(error, 'Купон хадгалах үед алдаа гарлаа.'));
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
            setErrorMessage(getPromotionErrorMessage(error, 'Бэлгийн карт хадгалах үед алдаа гарлаа.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePromotion = async (event) => {
        event.preventDefault();
        setErrorMessage('');

        const title = promotionForm.title.trim();
        const triggerProduct = products.find((product) => product.id === promotionForm.triggerProductId);
        const giftProduct = products.find((product) => product.id === promotionForm.giftProductId);
        const minQuantity = Math.max(1, toNumber(promotionForm.minQuantity));
        const giftQuantity = Math.max(1, toNumber(promotionForm.giftQuantity));
        const minOrderAmount = toNumber(promotionForm.minOrderAmount);

        if (!title) {
            setErrorMessage('Урамшууллын нэр заавал оруулна.');
            return;
        }

        if (!giftProduct) {
            setErrorMessage('Бэлгэнд өгөх бүтээгдэхүүнээ сонгоно уу.');
            return;
        }

        if (promotionForm.type === 'buy_x_get_y' && !triggerProduct) {
            setErrorMessage('1+1 нөхцөлд trigger бүтээгдэхүүн сонгоно уу.');
            return;
        }

        if (promotionForm.type === 'free_gift_over_amount' && minOrderAmount <= 0) {
            setErrorMessage('Доод худалдан авалтын дүн 0-оос их байх ёстой.');
            return;
        }

        setIsSaving(true);
        const payload = {
            title,
            type: promotionForm.type,
            triggerProductId: triggerProduct?.id || '',
            triggerProductName: triggerProduct?.name || '',
            minQuantity,
            giftProductId: giftProduct.id,
            giftProductName: giftProduct.name || '',
            giftProductImage: getProductImage(giftProduct),
            giftQuantity,
            minOrderAmount,
            isActive: Boolean(promotionForm.isActive),
            startsAt: promotionForm.startsAt ? new Date(`${promotionForm.startsAt}T00:00:00`) : null,
            endsAt: promotionForm.endsAt ? new Date(`${promotionForm.endsAt}T23:59:59`) : null,
            updatedAt: serverTimestamp(),
        };

        try {
            if (promotionForm.id) {
                await updateDoc(doc(db, 'promotions', promotionForm.id), payload);
            } else {
                await addDoc(collection(db, 'promotions'), {
                    ...payload,
                    createdAt: serverTimestamp(),
                });
            }
            resetPromotionForm();
        } catch (error) {
            console.error('Save promotion error:', error);
            setErrorMessage(getPromotionErrorMessage(error, 'Автомат урамшуулал хадгалах үед алдаа гарлаа.'));
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

    const handleEditPromotion = (promotion) => {
        setPromotionForm({
            id: promotion.id,
            title: promotion.title,
            type: promotion.type,
            triggerProductId: promotion.triggerProductId || '',
            minQuantity: String(promotion.minQuantity || 1),
            giftProductId: promotion.giftProductId || '',
            giftQuantity: String(promotion.giftQuantity || 1),
            minOrderAmount: String(promotion.minOrderAmount || ''),
            startsAt: toDateInput(promotion.startsAt),
            endsAt: toDateInput(promotion.endsAt),
            isActive: promotion.isActive,
        });
        setTriggerProductSearch(promotion.triggerProductName || '');
        setGiftProductSearch(promotion.giftProductName || '');
        setActiveTab('rules');
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

    const renderRuleDescription = (promotion) => {
        if (promotion.type === 'buy_x_get_y') {
            return `${promotion.triggerProductName || 'Trigger бараа'} ${promotion.minQuantity}+ авбал ${promotion.giftProductName || 'бэлэг бараа'} ${promotion.giftQuantity}ш үнэгүй`;
        }
        return `₮${promotion.minOrderAmount.toLocaleString()}-с дээш захиалгад ${promotion.giftProductName || 'бэлэг бараа'} ${promotion.giftQuantity}ш үнэгүй`;
    };

    const renderProductSearchField = ({
        label,
        searchValue,
        setSearchValue,
        isOpen,
        setIsOpen,
        productsToShow,
        selectedProduct,
        onSelect,
    }) => (
        <div className="promotions-product-picker">
            <label>{label}</label>
            <div className="product-search-container promotions-product-search">
                <div className="input-with-icon">
                    <Search size={16} className="field-icon" />
                    <input
                        className="form-input"
                        type="text"
                        placeholder="Бүтээгдэхүүн хайх..."
                        value={searchValue}
                        onFocus={() => setIsOpen(true)}
                        onChange={(event) => {
                            setSearchValue(event.target.value);
                            setIsOpen(true);
                        }}
                    />
                </div>
                {selectedProduct && (
                    <div className="promotion-selected-product">
                        <img src={getProductImage(selectedProduct)} alt={selectedProduct.name} />
                        <div>
                            <strong>{selectedProduct.name}</strong>
                            <span>{selectedProduct.code || selectedProduct.sku || 'Кодгүй бүтээгдэхүүн'}</span>
                        </div>
                    </div>
                )}
                {isOpen && (
                    <div className="search-results-dropdown promotions-search-results">
                        {productsToShow.length > 0 ? (
                            productsToShow.map((product) => (
                                <button
                                    key={product.id}
                                    type="button"
                                    className="search-result-item promotions-search-result-item"
                                    onClick={() => {
                                        onSelect(product);
                                        setSearchValue(product.name || '');
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="promotions-search-result-main">
                                        <img src={getProductImage(product)} alt={product.name} />
                                        <div>
                                            <strong>{product.name}</strong>
                                            <div className="p-stock">Үлдэгдэл: {product.stock || 0} ш</div>
                                        </div>
                                    </div>
                                    <div className="p-price">₮{Number(product.price || product.salePrice || 0).toLocaleString()}</div>
                                </button>
                            ))
                        ) : (
                            <div className="search-result-item" style={{ justifyContent: 'center', color: '#999' }}>
                                Ийм бүтээгдэхүүн олдсонгүй
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="admin-page">
            <div className="page-header">
                <div className="header-info">
                    <h1>Урамшуулал</h1>
                    <p>Купон код, бэлгийн карт болон захиалгад санал болгох автомат урамшууллыг удирдана.</p>
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
                <button className={`promotions-tab ${activeTab === 'rules' ? 'active' : ''}`} onClick={() => setActiveTab('rules')}>
                    <Sparkles size={16} />
                    <span>Автомат урамшуулал</span>
                </button>
            </div>

            <div className="promotions-layout">
                <div className="section-card promotions-form-card">
                    <div className="search-box" style={{ marginBottom: '1rem' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder={
                                activeTab === 'coupons'
                                    ? 'Купон хайх...'
                                    : activeTab === 'giftCards'
                                        ? 'Бэлгийн карт хайх...'
                                        : 'Автомат урамшуулал хайх...'
                            }
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
                    ) : activeTab === 'giftCards' ? (
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
                    ) : (
                        <>
                            <div className="promotions-mini-stats">
                                <div className="promotion-stat-item"><span>Нийт</span><strong>{promotionStats.total}</strong></div>
                                <div className="promotion-stat-item"><span>Идэвхтэй</span><strong>{promotionStats.active}</strong></div>
                                <div className="promotion-stat-item"><span>1+1</span><strong>{promotionStats.buyGet}</strong></div>
                                <div className="promotion-stat-item"><span>Threshold Gift</span><strong>{promotionStats.freeGift}</strong></div>
                            </div>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Нэр</th>
                                            <th>Нөхцөл</th>
                                            <th>Бэлэг</th>
                                            <th>Төлөв</th>
                                            <th>Үйлдэл</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5}><LoaderCircle size={16} className="spin" /> Уншиж байна...</td></tr>
                                        ) : filteredPromotions.length ? (
                                            filteredPromotions.map((promotion) => (
                                                <tr key={promotion.id}>
                                                    <td className="product-name-cell">{promotion.title}</td>
                                                    <td>{renderRuleDescription(promotion)}</td>
                                                    <td>{promotion.giftProductName} x{promotion.giftQuantity}</td>
                                                    <td><span className={`status-pill ${promotion.isActive ? 'active' : 'inactive'}`}>{promotion.isActive ? 'active' : 'inactive'}</span></td>
                                                    <td className="actions-cell">
                                                        <button className="action-icon edit" type="button" onClick={() => handleEditPromotion(promotion)}><Pencil size={15} /></button>
                                                        <button className="action-icon delete" type="button" onClick={() => handleDelete('promotions', promotion.id)}><Trash2 size={15} /></button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={5}>Илэрц олдсонгүй</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="section-card">
                    <h3>
                        {activeTab === 'coupons'
                            ? 'Купон бүртгэх'
                            : activeTab === 'giftCards'
                                ? 'Бэлгийн карт бүртгэх'
                                : 'Автомат урамшуулал бүртгэх'}
                    </h3>
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
                    ) : activeTab === 'giftCards' ? (
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
                    ) : (
                        <form className="promotions-form" onSubmit={handleSavePromotion}>
                            <div className="promotion-presets">
                                {promotionPresets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        className="promotion-preset-card"
                                        onClick={() => applyPromotionPreset(preset)}
                                    >
                                        <span>Preset</span>
                                        <strong>{preset.title}</strong>
                                        <small>{preset.description}</small>
                                    </button>
                                ))}
                            </div>
                            <label>Урамшууллын нэр<input name="title" value={promotionForm.title} onChange={handlePromotionChange} required /></label>
                            <label>Төрөл
                                <select className="form-select" name="type" value={promotionForm.type} onChange={handlePromotionChange}>
                                    <option value="buy_x_get_y">1+1 / Buy X Get Y</option>
                                    <option value="free_gift_over_amount">Тодорхой дүнгээс дээш бэлэг</option>
                                </select>
                            </label>
                            {promotionForm.type === 'buy_x_get_y' ? (
                                <>
                                    {renderProductSearchField({
                                        label: 'Нөхцөл хангах бүтээгдэхүүн',
                                        searchValue: triggerProductSearch,
                                        setSearchValue: setTriggerProductSearch,
                                        isOpen: isTriggerSearchOpen,
                                        setIsOpen: setIsTriggerSearchOpen,
                                        productsToShow: filteredTriggerProducts,
                                        selectedProduct: selectedTriggerProduct,
                                        onSelect: (product) => setPromotionForm((prev) => ({ ...prev, triggerProductId: product.id })),
                                    })}
                                    <label>Хэд авахаар идэвхжих вэ
                                        <input name="minQuantity" type="number" min="1" value={promotionForm.minQuantity} onChange={handlePromotionChange} required />
                                    </label>
                                </>
                            ) : (
                                <label>Доод худалдан авалт
                                    <input name="minOrderAmount" type="number" min="0" value={promotionForm.minOrderAmount} onChange={handlePromotionChange} required />
                                </label>
                            )}
                            {renderProductSearchField({
                                label: 'Бэлгэнд өгөх бүтээгдэхүүн',
                                searchValue: giftProductSearch,
                                setSearchValue: setGiftProductSearch,
                                isOpen: isGiftSearchOpen,
                                setIsOpen: setIsGiftSearchOpen,
                                productsToShow: filteredGiftProducts,
                                selectedProduct: selectedGiftProduct,
                                onSelect: (product) => setPromotionForm((prev) => ({ ...prev, giftProductId: product.id })),
                            })}
                            <label>Бэлгийн тоо
                                <input name="giftQuantity" type="number" min="1" value={promotionForm.giftQuantity} onChange={handlePromotionChange} required />
                            </label>
                            <div className="promotions-form-row">
                                <label>Эхлэх огноо<input name="startsAt" type="date" value={promotionForm.startsAt} onChange={handlePromotionChange} /></label>
                                <label>Дуусах огноо<input name="endsAt" type="date" value={promotionForm.endsAt} onChange={handlePromotionChange} /></label>
                            </div>
                            <label className="promotions-check">
                                <input name="isActive" type="checkbox" checked={promotionForm.isActive} onChange={handlePromotionChange} />
                                <span>Идэвхтэй</span>
                            </label>
                            <div className="promotions-actions">
                                <button className="add-btn" type="submit" disabled={isSaving}>
                                    <Plus size={16} />
                                    <span>{isSaving ? 'Хадгалж байна...' : promotionForm.id ? 'Шинэчлэх' : 'Хадгалах'}</span>
                                </button>
                                <button type="button" className="filter-btn" onClick={resetPromotionForm}>Цэвэрлэх</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Promotions;
