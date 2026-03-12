import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ShoppingBag,
    Users,
    BadgePercent,
    Settings,
    ShieldCheck,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMenuForRole, getRoleInfo } from '../../config/roles';

const ICON_MAP = {
    LayoutDashboard: <LayoutDashboard size={20} />,
    Package: <Package size={20} />,
    ShoppingBag: <ShoppingBag size={20} />,
    Users: <Users size={20} />,
    BadgePercent: <BadgePercent size={20} />,
    Settings: <Settings size={20} />,
    ShieldCheck: <ShieldCheck size={20} />,
};

const Sidebar = ({ isCollapsed, toggleSidebar, onLogout, isLoggingOut = false }) => {
    const { role } = useAuth();
    const menuItems = getMenuForRole(role);
    const roleInfo = getRoleInfo(role);

    return (
        <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isCollapsed && <h2 className="brand-name">Beauty Admin</h2>}
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="sidebar-role-badge" style={{ borderLeftColor: roleInfo.color }}>
                    <span className="sidebar-role-icon">{roleInfo.icon}</span>
                    <span className="sidebar-role-label">{roleInfo.label}</span>
                </div>
            )}

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-icon">
                            {ICON_MAP[item.iconName] || <LayoutDashboard size={20} />}
                        </span>
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
