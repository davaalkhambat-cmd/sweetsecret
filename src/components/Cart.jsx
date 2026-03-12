import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Gift, Minus, Plus, Tag, X } from 'lucide-react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

const formatMoney = (value) => `₮${Math.round(value || 0).toLocaleString()}`;

const getExpiryLabel = (expiresAt) => {
    if (!expiresAt) return 'Хугацаа заагаагүй';
    const date = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    if (Number.isNaN(date.getTime())) return 'Хугацаа заагаагүй';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')} хүртэл`;
};

const Cart = ({ isOpen, onClose, items, onRemove, onUpdateQty }) => {
    const { user, userProfile } = useAuth();
    const [couponCode, setCouponCode] = useState('');
    const [couponMessage, setCouponMessage] = useState('');
    const [coupons, setCoupons] = useState([]);
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [appliedReward, setAppliedReward] = useState(null);

    const memberRewards = useMemo(() => {
        const points = toNumber(userProfile?.loyaltyPoints);
        if (!user) return [];

        const rewards = [];
        if (points >= 300) {
            rewards.push({
                id: 'reward-300',
                title: '₮10,000 Member Reward',
                type: 'fixed',
                value: 10000,
                expiresOn: '2026-03-28',
            });
        }
        if (points >= 800) {
            rewards.push({
                id: 'reward-800',
                title: '10% Member Reward',
                type: 'percent',
                value: 10,
                expiresOn: '2026-04-12',
            });
        }
        return rewards;
    }, [user, userProfile]);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(db, 'coupons'),
            (snapshot) => {
                const rows = snapshot.docs
                    .map((docSnap) => {
                        const data = docSnap.data();
                        return {
                            id: docSnap.id,
                            code: String(data.code || '').toUpperCase(),
                            type: data.type || 'percent',
                            value: toNumber(data.value),
                            minOrderAmount: toNumber(data.minOrderAmount),
                            usageLimit: toNumber(data.usageLimit),
                            usedCount: toNumber(data.usedCount),
                            isActive: Boolean(data.isActive),
                            endsAt: data.endsAt || null,
                        };
                    })
                    .filter((coupon) => coupon.isActive);
                setCoupons(rows);
            },
            () => {
                setCoupons([]);
            }
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setCouponCode('');
            setCouponMessage('');
        }
    }, [isOpen]);

    const subtotal = useMemo(
        () => items.reduce((sum, item) => sum + toNumber(item.price) * toNumber(item.quantity), 0),
        [items]
    );

    const shipping = subtotal >= 250000 || subtotal === 0 ? 0 : 9900;
    const rewardDiscount = appliedReward
        ? appliedReward.type === 'percent'
            ? (subtotal * appliedReward.value) / 100
            : appliedReward.value
        : 0;
    const couponDiscount = appliedCoupon
        ? appliedCoupon.type === 'percent'
            ? (subtotal * appliedCoupon.value) / 100
            : appliedCoupon.type === 'shipping'
            ? shipping
            : appliedCoupon.value
        : 0;
    const totalDiscount = Math.min(subtotal + shipping, rewardDiscount + couponDiscount);
    const total = Math.max(0, subtotal + shipping - totalDiscount);

    const availableCoupons = useMemo(() => {
        const now = Date.now();
        return coupons.filter((coupon) => {
            const notExpired = !coupon.endsAt || (coupon.endsAt.toDate?.() || new Date(coupon.endsAt)).getTime() >= now;
            const hasUsage = !coupon.usageLimit || coupon.usedCount < coupon.usageLimit;
            const minOrderOk = subtotal >= coupon.minOrderAmount;
            return notExpired && hasUsage && minOrderOk;
        });
    }, [coupons, subtotal]);

    const applyCouponByCode = (codeInput) => {
        const code = codeInput.trim().toUpperCase();
        if (!code) {
            setCouponMessage('Купон код оруулна уу.');
            return;
        }

        const found = availableCoupons.find((coupon) => coupon.code === code);
        if (!found) {
            setCouponMessage('Код олдсонгүй эсвэл нөхцөл хангахгүй байна.');
            return;
        }

        setAppliedCoupon(found);
        setCouponMessage(`"${found.code}" код амжилттай ашиглагдлаа.`);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMessage('Купон цуцлагдлаа.');
    };

    const rewardsAndOffers = [
        ...memberRewards.map((reward) => ({
            ...reward,
            source: 'member',
            expiryText: `Expires on ${reward.expiresOn}`,
        })),
        ...availableCoupons.slice(0, 3).map((coupon) => ({
            id: coupon.id,
            title:
                coupon.type === 'percent'
                    ? `${coupon.value}% OFF`
                    : coupon.type === 'shipping'
                    ? 'FREE SHIPPING'
                    : `${formatMoney(coupon.value)} OFF`,
            type: coupon.type,
            value: coupon.value,
            source: 'coupon',
            couponCode: coupon.code,
            expiryText: getExpiryLabel(coupon.endsAt),
        })),
    ];

    return (
        <>
            <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
            <aside className={`cart-drawer cart-drawer--modern ${isOpen ? 'open' : ''}`}>
                <div className="cart-header">
                    <h2 className="cart-title">Shopping Bag • {items.reduce((acc, item) => acc + item.quantity, 0)} Items</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close Cart"><X size={20} /></button>
                </div>

                <div className="cart-modern-layout">
                    <div className={`cart-items-panel ${items.length === 0 ? 'is-empty' : ''}`}>
                        {items.length === 0 ? (
                            <div className="empty-cart">
                                <p>Таны сагс одоогоор хоосон байна.</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <article key={item.id} className="cart-item card-like">
                                    <img src={item.image} alt={item.name} className="cart-item-image" />
                                    <div className="cart-item-details">
                                        <h4 className="cart-item-name">{item.name}</h4>
                                        <p className="cart-item-meta">{item.category || 'Бараа'} • In Stock</p>
                                        <div className="cart-item-actions">
                                            <div className="qty-box">
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQty(item.id, Math.max(1, item.quantity - 1))}
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button className="btn-remove" onClick={() => onRemove(item.id)}>Устгах</button>
                                        </div>
                                        <span className="cart-item-price">{formatMoney(item.price * item.quantity)}</span>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>

                    <div className="cart-side-panel">
                        <div className="cart-summary-card">
                            <h3>Order Summary</h3>
                            <div className="summary-row"><span>Subtotal ({items.length} items)</span><strong>{formatMoney(subtotal)}</strong></div>
                            <div className="summary-row"><span>Shipping</span><strong>{shipping ? formatMoney(shipping) : 'Free'}</strong></div>
                            <div className="summary-row discount"><span>Rewards/Coupon</span><strong>-{formatMoney(totalDiscount)}</strong></div>
                            <div className="summary-total"><span>Estimated Total</span><strong>{formatMoney(total)}</strong></div>
                            <button className="btn-checkout">CONTINUE TO CHECKOUT</button>
                        </div>

                        <div className="cart-payments-card">
                            <h4>Төлбөрийн сонголт</h4>
                            <div className="payment-option pocket">
                                <div className="payment-logo">P</div>
                                <div>
                                    <strong>Pocket урьдчилгаагүй хувааж төл</strong>
                                    <p>Урьдчилгаагүй, шимтгэлгүй 30-90 хоногт 2-6 хувааж төл.</p>
                                </div>
                            </div>
                            <div className="payment-option storepay">
                                <div className="payment-logo">S</div>
                                <div>
                                    <strong>StorePay</strong>
                                    <p>Ашиглан 4 хуваан төлөх боломжтой.</p>
                                </div>
                            </div>
                        </div>

                        <div className="cart-rewards-card">
                            <h4>REWARDS</h4>
                            <p className="rewards-sub">Apply up to 3 rewards with the purchase!</p>

                            <div className="coupon-inline">
                                <input
                                    type="text"
                                    placeholder="Купон код оруулах"
                                    value={couponCode}
                                    onChange={(event) => setCouponCode(event.target.value)}
                                />
                                <button type="button" onClick={() => applyCouponByCode(couponCode)}>APPLY</button>
                            </div>
                            {couponMessage ? <p className="coupon-message">{couponMessage}</p> : null}
                            {appliedCoupon ? (
                                <div className="applied-chip">
                                    <Tag size={14} />
                                    <span>{appliedCoupon.code}</span>
                                    <button type="button" onClick={removeCoupon}>Хасах</button>
                                </div>
                            ) : null}

                            <div className="rewards-list">
                                {rewardsAndOffers.length ? (
                                    rewardsAndOffers.map((offer) => (
                                        <div key={offer.id} className="reward-item">
                                            <div>
                                                <strong>{offer.title}</strong>
                                                <small>{offer.expiryText}</small>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (offer.source === 'member') {
                                                        setAppliedReward(offer);
                                                    } else {
                                                        applyCouponByCode(offer.couponCode || '');
                                                    }
                                                }}
                                            >
                                                APPLY
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="reward-item-empty">
                                        <Gift size={16} />
                                        <span>Одоогоор боломжит reward/coupon алга байна.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Cart;
