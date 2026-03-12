import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Package,
    Star,
    Settings,
    LogOut,
    ChevronRight,
    Clock,
    ShieldCheck,
    Shield,
    Briefcase,
    Mail,
    Lock,
    UserCircle2,
    LoaderCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

const orders = [
    { id: '#SS-9021', date: '2024-03-01', status: 'Хүргэгдсэн', total: '145,000₮', items: 3 },
    { id: '#SS-8842', date: '2024-02-15', status: 'Хүргэгдсэн', total: '85,600₮', items: 1 },
    { id: '#SS-8511', date: '2023-12-20', status: 'Цуцлагдсан', total: '210,000₮', items: 5 },
];

const loyaltyBenefits = [
    { title: 'Үнэгүй хүргэлт', description: 'Бүх худалдан авалтанд', icon: <Package size={20} /> },
    { title: 'Төрсөн өдрийн бэлэг', description: 'Жил бүр', icon: <Star size={20} /> },
    { title: 'Түрүүлж худалдан авах', description: 'Шинэ цуглуулгууд', icon: <Clock size={20} /> },
];

const Profile = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [authMessage, setAuthMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { user, loading, isAdmin, isStaff, signInWithGoogle, signInWithEmail, signUpWithEmail, logout } = useAuth();
    const navigate = useNavigate();

    const userData = useMemo(() => {
        if (!user) {
            return null;
        }

        const defaultName = user.email ? user.email.split('@')[0] : 'Хэрэглэгч';

        return {
            name: user.displayName || defaultName,
            email: user.email || 'И-мэйл бүртгэгдээгүй',
            phone: user.phoneNumber || 'Утасны мэдээлэл оруулаагүй',
            joinedDate: user.metadata?.creationTime || '',
            loyaltyLevel: 'Gold Member',
            points: 4500,
            avatar:
                user.photoURL ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    user.displayName || defaultName
                )}`,
        };
    }, [user]);

    const resetMessage = () => setAuthMessage('');

    const handleGoogleSignIn = async () => {
        resetMessage();
        setIsSubmitting(true);

        const result = await signInWithGoogle();
        if (!result.ok) {
            setAuthMessage(result.error);
        }

        setIsSubmitting(false);
    };

    const handleEmailAuth = async (event) => {
        event.preventDefault();
        resetMessage();
        setIsSubmitting(true);

        const result = isRegisterMode
            ? await signUpWithEmail(email.trim(), password, displayName)
            : await signInWithEmail(email.trim(), password);

        if (!result.ok) {
            setAuthMessage(result.error);
        } else {
            setEmail('');
            setPassword('');
            setDisplayName('');
        }

        setIsSubmitting(false);
    };

    const handleLogout = async () => {
        const result = await logout();
        if (!result.ok) {
            setAuthMessage(result.error);
        }
    };

    if (loading) {
        return (
            <div className="profile-page auth-screen">
                <div className="auth-card loading-card">
                    <LoaderCircle className="spin" size={28} />
                    <h2>Нэвтрэлтийг шалгаж байна...</h2>
                </div>
            </div>
        );
    }

    if (!user || !userData) {
        return (
            <div className="profile-page auth-screen">
                <div className="auth-card">
                    <h1>Профайл руу нэвтрэх</h1>
                    <p>Захиалга, лоялти оноо болон тохиргоогоо удирдах бол нэвтэрнэ үү.</p>

                    {authMessage && <div className="auth-alert">{authMessage}</div>}

                    <button
                        type="button"
                        className="google-btn"
                        onClick={handleGoogleSignIn}
                        disabled={isSubmitting}
                    >
                        <span className="google-mark">G</span>
                        Google-ээр нэвтрэх
                    </button>

                    <div className="auth-separator">эсвэл</div>

                    <form className="auth-form" onSubmit={handleEmailAuth}>
                        {isRegisterMode && (
                            <label>
                                <span>Нэр</span>
                                <div className="input-wrap">
                                    <UserCircle2 size={16} />
                                    <input
                                        type="text"
                                        placeholder="Таны нэр"
                                        value={displayName}
                                        onChange={(event) => setDisplayName(event.target.value)}
                                    />
                                </div>
                            </label>
                        )}

                        <label>
                            <span>И-мэйл</span>
                            <div className="input-wrap">
                                <Mail size={16} />
                                <input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </div>
                        </label>

                        <label>
                            <span>Нууц үг</span>
                            <div className="input-wrap">
                                <Lock size={16} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    minLength={6}
                                    required
                                />
                            </div>
                        </label>

                        <button type="submit" className="auth-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Түр хүлээнэ үү...' : isRegisterMode ? 'Бүртгүүлэх' : 'Нэвтрэх'}
                        </button>
                    </form>

                    <button
                        type="button"
                        className="switch-auth-mode"
                        onClick={() => {
                            setIsRegisterMode((prev) => !prev);
                            resetMessage();
                        }}
                    >
                        {isRegisterMode
                            ? 'Аль хэдийн бүртгэлтэй юу? Нэвтрэх'
                            : 'Бүртгэлгүй юу? Шинээр бүртгүүлэх'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="container profile-container">
                <aside className="profile-sidebar">
                    <div className="user-card-header">
                        <div className="avatar-wrapper">
                            <img src={userData.avatar} alt="User Avatar" />
                        </div>
                        <div className="user-meta">
                            <h2>{userData.name}</h2>
                            <p className="user-badge">{userData.loyaltyLevel}</p>
                        </div>
                    </div>

                    <nav className="profile-nav">
                        <button
                            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            <User size={20} />
                            <span>Тойм</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                            onClick={() => setActiveTab('orders')}
                        >
                            <Package size={20} />
                            <span>Захиалгын түүх</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'loyalty' ? 'active' : ''}`}
                            onClick={() => setActiveTab('loyalty')}
                        >
                            <Star size={20} />
                            <span>Лоялти оноо</span>
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            <Settings size={20} />
                            <span>Тохиргоо</span>
                        </button>
                        {isAdmin && (
                            <button
                                className="nav-item admin-nav"
                                onClick={() => navigate('/admin')}
                            >
                                <Shield size={20} />
                                <span>Админ панел</span>
                            </button>
                        )}
                        {isStaff && (
                            <button
                                className="nav-item staff-nav"
                                onClick={() => navigate('/workspace')}
                            >
                                <Briefcase size={20} />
                                <span>Ажлын талбар</span>
                            </button>
                        )}
                        <div className="nav-divider"></div>
                        <button className="nav-item logout" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Гарах</span>
                        </button>
                    </nav>
                </aside>

                <main className="profile-content">
                    {activeTab === 'overview' && (
                        <div className="fade-in">
                            <div className="content-header">
                                <h1>Сайн байна уу, {userData.name.split(' ')[0]}?</h1>
                                <p>Өөрийн бүртгэл болон лоялти оноогоо эндээс удирдаарай.</p>
                            </div>

                            <div className="stats-cards">
                                <div className="stat-card points-card">
                                    <div className="card-icon"><Star /></div>
                                    <div className="card-info">
                                        <span className="label">Нийт оноо</span>
                                        <h2 className="value">{userData.points} pts</h2>
                                        <div className="progress-bar">
                                            <div className="progress" style={{ width: '75%' }}></div>
                                        </div>
                                        <p className="next-tier">Дараагийн түвшин хүртэл 500 оноо</p>
                                    </div>
                                </div>
                                <div className="stat-card orders-card">
                                    <div className="card-icon"><Package /></div>
                                    <div className="card-info">
                                        <span className="label">Нийт захиалга</span>
                                        <h2 className="value">{orders.length}</h2>
                                        <p className="sub-value">Сүүлийн 1 жилд</p>
                                    </div>
                                </div>
                                <div className="stat-card secure-card">
                                    <div className="card-icon"><ShieldCheck /></div>
                                    <div className="card-info">
                                        <span className="label">Аюулгүй байдал</span>
                                        <h2 className="value">Хамгаалагдсан</h2>
                                        <p className="sub-value">2 шатлалт баталгаажуулалт</p>
                                    </div>
                                </div>
                            </div>

                            <div className="recent-orders-section">
                                <div className="section-header">
                                    <h3>Сүүлийн захиалгууд</h3>
                                    <button onClick={() => setActiveTab('orders')} className="btn-link">Бүгдийг харах</button>
                                </div>
                                <div className="orders-list">
                                    {orders.slice(0, 2).map((order) => (
                                        <div key={order.id} className="order-item">
                                            <div className="order-id">
                                                <span className="id-text">{order.id}</span>
                                                <span className="order-date">{order.date}</span>
                                            </div>
                                            <div className="order-details">
                                                <span>{order.items} бүтээгдэхүүн</span>
                                                <strong>{order.total}</strong>
                                            </div>
                                            <div className={`status-badge ${order.status === 'Хүргэгдсэн' ? 'success' : 'cancelled'}`}>
                                                {order.status}
                                            </div>
                                            <ChevronRight size={20} className="arrow" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'loyalty' && (
                        <div className="fade-in">
                            <div className="content-header">
                                <h1>Миний Лоялти</h1>
                                <p>Цуглуулсан оноогоороо хөнгөлөлт болон бэлэг аваарай.</p>
                            </div>
                            <div className="loyalty-grid">
                                {loyaltyBenefits.map((benefit, idx) => (
                                    <div key={idx} className="benefit-card">
                                        <div className="benefit-icon">{benefit.icon}</div>
                                        <h4>{benefit.title}</h4>
                                        <p>{benefit.description}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="points-history mt-4">
                                <h3>Онооны түүх</h3>
                                <div className="history-table">
                                    <div className="history-row header">
                                        <span>Огноо</span>
                                        <span>Үйлдэл</span>
                                        <span className="text-right">Оноо</span>
                                    </div>
                                    <div className="history-row">
                                        <span>2024-03-01</span>
                                        <span>Худалдан авалт #SS-9021</span>
                                        <span className="points-plus">+1,450 pts</span>
                                    </div>
                                    <div className="history-row">
                                        <span>2024-02-15</span>
                                        <span>Худалдан авалт #SS-8842</span>
                                        <span className="points-plus">+850 pts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="fade-in">
                            <div className="content-header">
                                <h1>Миний захиалгууд</h1>
                                <p>Бүх хийсэн захиалгуудын жагсаалт.</p>
                            </div>
                            <div className="full-orders-list">
                                {orders.map((order) => (
                                    <div key={order.id} className="full-order-card">
                                        <div className="order-main-info">
                                            <div className="id-group">
                                                <h3>{order.id}</h3>
                                                <span className="order-date-text">{order.date}</span>
                                            </div>
                                            <div className={`status-pill ${order.status === 'Хүргэгдсэн' ? 'delivered' : 'cancelled'}`}>
                                                {order.status}
                                            </div>
                                        </div>
                                        <div className="order-products-preview">
                                            <div className="product-mini">
                                                <div className="img-placeholder"></div>
                                                <div className="mini-info">
                                                    <p className="p-name">Залуужуулах серум</p>
                                                    <p className="p-qty">1 x 45,000₮</p>
                                                </div>
                                            </div>
                                            {order.items > 1 && (
                                                <div className="more-products">+{order.items - 1} бусад бүтээгдэхүүн</div>
                                            )}
                                        </div>
                                        <div className="order-footer">
                                            <div className="footer-item">
                                                <span className="label">Нийт дүн:</span>
                                                <span className="value">{order.total}</span>
                                            </div>
                                            <button className="reorder-btn">Дахиж захиалах</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="fade-in">
                            <div className="content-header">
                                <h1>Бүртгэл тохируулах</h1>
                                <p>Хувийн мэдээллээ шинэчлэх.</p>
                            </div>
                            <div className="settings-form">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Овог нэр</label>
                                        <input type="text" defaultValue={userData.name} />
                                    </div>
                                    <div className="form-group">
                                        <label>И-мэйл хаяг</label>
                                        <input type="email" defaultValue={userData.email} />
                                    </div>
                                    <div className="form-group">
                                        <label>Утасны дугаар</label>
                                        <input type="tel" defaultValue={userData.phone} />
                                    </div>
                                    <div className="form-group">
                                        <label>Бүртгүүлсэн огноо</label>
                                        <input type="text" value={userData.joinedDate} readOnly />
                                    </div>
                                </div>
                                <button className="save-btn">Өөрчлөлтийг хадгалах</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Profile;
