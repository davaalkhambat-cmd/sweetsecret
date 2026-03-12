import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const categoryItems = [
    { title: 'БАГЦ', img: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&fit=crop&w=180&q=80' },
    { title: 'ЭМЭГ ХЭСГИЙН ЦАЙРУУЛАХ...', img: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=180&q=80' },
    { title: 'ҮТРЭЭНИЙ СЕРУМ', img: 'https://images.unsplash.com/photo-1608571423539-e951a15c5a08?auto=format&fit=crop&w=180&q=80' },
    { title: 'ПРОБИОТИКТОЙ САВАН', img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=180&q=80' },
    { title: 'ТООЁХОН (+18)', img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=180&q=80' },
    { title: 'БУСАД', img: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=180&q=80' },
];

const tabs = ['Онцлох', 'Шинэ', 'Бестселлер'];

const Home = ({ onAddToCart }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Онцлох');

    useEffect(() => {
        const q = query(collection(db, 'products'), where('status', '==', 'Active'));
        return onSnapshot(
            q,
            (snapshot) => {
                const rows = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    const price = Number(data.price || 0);
                    return {
                        id: docSnap.id,
                        name: data.name || 'Бүтээгдэхүүн',
                        image: data.image || 'https://via.placeholder.com/500x500?text=Product',
                        price,
                        oldPrice: price > 0 ? Math.round(price * 1.25) : 0,
                        category: data.category || 'БҮТЭЭГДЭХҮҮН',
                        updatedAtMs: data.updatedAt?.toMillis?.() || 0,
                    };
                });
                setProducts(rows.sort((a, b) => b.updatedAtMs - a.updatedAtMs));
                setLoading(false);
            },
            () => setLoading(false)
        );
    }, []);

    const featuredProducts = useMemo(() => products.slice(0, 5), [products]);
    const discountProducts = useMemo(() => products.slice(0, 5), [products]);
    const bundleProducts = useMemo(() => products.slice(5, 10), [products]);

    const renderProductGrid = (rows) => (
        <div className="ss-product-grid">
            {rows.map((product, index) => (
                <article key={`${product.id}-${index}`} className="ss-product-card">
                    <div className="ss-product-image-wrap">
                        <img src={product.image} alt={product.name} />
                        <span className="ss-discount-tag">-20%</span>
                    </div>
                    <h4>{product.name}</h4>
                    <p className="ss-price-row">
                        <del>{product.oldPrice.toLocaleString()}₮</del>
                        <strong>{product.price.toLocaleString()}₮</strong>
                    </p>
                    <button className="add-to-cart-btn" onClick={() => onAddToCart(product)}>Сагсанд хийх</button>
                </article>
            ))}
            {!rows.length && !loading && <p>Бүтээгдэхүүн алга байна.</p>}
        </div>
    );

    return (
        <main className="ss-clone-home">
            <section className="ss-main-hero">
                <div className="container ss-main-hero-inner">
                    <div className="ss-main-hero-left">
                        <div className="ss-site-pill">www.sweetsecret.mn</div>
                    </div>
                    <div className="ss-main-hero-right">
                        <h1>ҮТРЭЭНИЙ</h1>
                        <p>ГОО ЗҮЙН</p>
                        <h2>БҮТЭЭГДЭХҮҮНИЙ</h2>
                        <p>ХАМГИЙН <strong>ТОМ</strong></p>
                        <h2>ФЛАТФОРМ</h2>
                    </div>
                </div>
            </section>

            <section className="ss-icon-strip">
                <div className="container ss-icon-strip-inner">
                    {categoryItems.map((item) => (
                        <article key={item.title} className="ss-icon-item">
                            <img src={item.img} alt={item.title} />
                            <h4>{item.title}</h4>
                        </article>
                    ))}
                </div>
            </section>

            <section className="container ss-featured-block">
                <div className="ss-tabs">
                    {tabs.map((tab) => (
                        <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                            {tab}
                        </button>
                    ))}
                </div>
                {loading ? <p>Уншиж байна...</p> : renderProductGrid(featuredProducts)}
            </section>

            <section className="container ss-brand-row">
                {['INTIMATE EARTH', 'INTIME ORGANIQUE', 'medicube', 'wettrust', 'SVAKOM', 'smile makers'].map((b) => (
                    <span key={b}>{b}</span>
                ))}
            </section>

            <section className="container ss-list-section">
                <div className="ss-list-head">
                    <h3>Хямдрал</h3>
                    <a href="#">Цааш үзэх <ArrowUpRight size={14} /></a>
                </div>
                {renderProductGrid(discountProducts)}
            </section>

            <section className="container ss-list-section">
                <div className="ss-list-head">
                    <h3>Багц</h3>
                    <a href="#">Цааш үзэх <ArrowUpRight size={14} /></a>
                </div>
                {renderProductGrid(bundleProducts)}
            </section>

            <footer className="ss-clone-footer">
                <div className="container ss-clone-footer-grid">
                    <div>
                        <div className="ss-clone-logo footer">Sweet Secret<small>SINCE 2016</small></div>
                        <div className="ss-facebook-card">Wettrust Store - Үтрээний ...</div>
                        <div className="ss-footer-socials">
                            <a href="#"><Facebook size={18} /></a>
                            <a href="#"><Instagram size={18} /></a>
                        </div>
                    </div>

                    <div>
                        <h4>ТУСЛАХ ЦЭС</h4>
                        <ul>
                            <li>Бидний тухай</li>
                            <li>Холбоо барих</li>
                            <li>Түгээмэл асуулт</li>
                            <li>Нийтлэлүүд</li>
                            <li>Ажлын байр</li>
                            <li>Салбарууд</li>
                        </ul>
                    </div>

                    <div>
                        <h4>БҮТЭЭГДЭХҮҮН</h4>
                        <ul>
                            <li>Бүх бүтээгдэхүүн</li>
                            <li>Онцлох бүтээгдэхүүн</li>
                            <li>Бестселлер</li>
                            <li>Хямдарсан бүтээгдэхүүн</li>
                        </ul>
                    </div>

                    <div>
                        <h4>ХОЛБОО БАРИХ</h4>
                        <ul>
                            <li><Phone size={17} /> 77188585</li>
                            <li><Mail size={17} /> wettruststore@gmail.com</li>
                            <li><MapPin size={17} /> Салбар 1 📍 ХҮД, Хан-Уул И мартын 2 давхарт</li>
                            <li>Өдөр бүр 09:00-22:00 Салбар 2 📍 Шангри-Ла худалдааны төвийн 2 давхарт</li>
                            <li>Beauty Aveno дотор | Өдөр бүр 10:00-21:00</li>
                            <li>📍 Салбар 3 - Улсын их дэлгүүрийн 1 давхарт | Даваа - Бямба 08:30-22:30 Ням 09:00-22:00</li>
                        </ul>
                    </div>
                </div>
            </footer>
        </main>
    );
};

export default Home;
