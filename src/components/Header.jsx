import React from 'react';
import { ShoppingBag, User, Search, Facebook, Instagram, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = ({ cartItemCount, onCartClick }) => {
    const { user } = useAuth();

    const navLinks = ['Бүгд', 'Багц', 'Эмэг хэсгийн чай...', 'Эмэг хэсгийн цэв...', 'Үтрээний серум', 'Пробиотиктой саван', 'Хямдрал'];

    return (
        <header className="ss-clone-header">
            <div className="ss-clone-topbar">
                <div className="container ss-clone-topbar-inner">
                    <span>Тавтай морил</span>
                    <div className="ss-clone-topbar-links">
                        <a href="#">Холбоо барих</a>
                        <a href="#">Салбарууд</a>
                        <a href="#">Ажлын байр</a>
                        <a href="#" aria-label="Facebook"><Facebook size={16} /></a>
                        <a href="#" aria-label="Instagram"><Instagram size={16} /></a>
                        <a href="#" className="ss-clone-translate"><Globe size={14} /> Орчуулах</a>
                    </div>
                </div>
            </div>

            <div className="ss-clone-mainbar">
                <div className="container ss-clone-mainbar-inner">
                    <Link to="/" className="ss-clone-logo">
                        Sweet Secret
                        <small>SINCE 2016</small>
                    </Link>

                    <nav className="ss-clone-nav">
                        {navLinks.map((label) => (
                            <Link key={label} to="#" className="ss-clone-nav-link">
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ss-clone-actions">
                        <button type="button" aria-label="Хайх"><Search size={25} /></button>
                        <button type="button" aria-label="Сагс" onClick={onCartClick} className="ss-clone-cart-btn">
                            <ShoppingBag size={25} />
                            {cartItemCount > 0 ? <span>{cartItemCount}</span> : null}
                        </button>
                        <Link to="/profile" aria-label={user ? 'Миний профайл' : 'Нэвтрэх'} className="ss-clone-avatar-link">
                            <div className="ss-clone-avatar">
                                <User size={18} />
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
