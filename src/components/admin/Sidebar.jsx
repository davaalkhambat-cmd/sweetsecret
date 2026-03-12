import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    BadgePercent,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';

const Sidebar = ({ isCollapsed, toggleSidebar, onLogout, isLoggingOut = false }) => {
    const menuItems = [
        { title: 'Хянах самбар', icon: <LayoutDashboard size={20} />, path: '/admin' },
        { title: 'Бараа бүтээгдэхүүн', icon: <Package size={20} />, path: '/admin/products' },
        { title: 'Захиалгууд', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
        { title: 'Хэрэглэгчид', icon: <Users size={20} />, path: '/admin/users' },
        { title: 'Урамшуулал', icon: <BadgePercent size={20} />, path: '/admin/promotions' },
        { title: 'Тохиргоо', icon: <Settings size={20} />, path: '/admin/settings' },
    ];

    return (
        <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isCollapsed && <h2 className="brand-name">Beauty Admin</h2>}
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!isCollapsed && <span className="nav-title">{item.title}</span>}
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button className="logout-btn" type="button" onClick={onLogout} disabled={isLoggingOut}>
                    <LogOut size={20} />
                    {!isCollapsed && <span>{isLoggingOut ? 'Гарч байна...' : 'Гарах'}</span>}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
