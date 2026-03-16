import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Boxes,
    BarChart3,
    Truck,
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
    Boxes: <Boxes size={20} />,
    BarChart3: <BarChart3 size={20} />,
    Truck: <Truck size={20} />,
    ShoppingBag: <ShoppingBag size={20} />,
    Users: <Users size={20} />,
    BadgePercent: <BadgePercent size={20} />,
    Settings: <Settings size={20} />,
    ShieldCheck: <ShieldCheck size={20} />,
};

const MENU_GROUPS = {
    commerce: {
        key: 'commerce',
        label: 'Үндсэн худалдаа',
        itemKeys: ['dashboard', 'products', 'inventory', 'sales-revenue', 'settings'],
    },
    delivery: {
        key: 'delivery',
        label: 'Хүргэлт',
        itemKeys: ['delivery-dashboard', 'orders', 'users', 'promotions', 'staff-roles', 'settings'],
    },
};

const Sidebar = ({ isCollapsed, toggleSidebar, onLogout, isLoggingOut = false }) => {
    const { role, roles, roleInfo } = useAuth();
    const location = useLocation();

    const menuItems = React.useMemo(() => {
        return getMenuForRole(role, roles);
    }, [role, roles]);

    const [activeGroup, setActiveGroup] = React.useState('delivery');

    const groupedMenuItems = React.useMemo(() => {
        return {
            commerce: menuItems.filter((item) => MENU_GROUPS.commerce.itemKeys.includes(item.key)),
            delivery: menuItems.filter((item) => MENU_GROUPS.delivery.itemKeys.includes(item.key)),
        };
    }, [menuItems]);

    React.useEffect(() => {
        const currentItem = menuItems.find((item) => item.path === location.pathname || (item.path === '/admin' && location.pathname === '/admin'));
        if (!currentItem) return;

        const preferredGroup = Object.values(MENU_GROUPS).find((group) => group.itemKeys.includes(currentItem.key));
        if (preferredGroup) {
            setActiveGroup(preferredGroup.key);
        }
    }, [location.pathname, menuItems]);

    const visibleMenuItems = groupedMenuItems[activeGroup] || menuItems;

    const displayRoleInfo = roleInfo || roles.customer;
    return (
        <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                {!isCollapsed && <h2 className="brand-name">Beauty Admin</h2>}
                <button className="sidebar-toggle" onClick={toggleSidebar}>
                    {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            {!isCollapsed && (
                <div className="sidebar-role-badge" style={{ borderLeftColor: displayRoleInfo.color }}>
                    <span className="sidebar-role-icon">{displayRoleInfo.icon}</span>
                    <span className="sidebar-role-label">{displayRoleInfo.label}</span>
                </div>
            )}

            <nav className="sidebar-nav">
                {!isCollapsed && (
                    <div className="sidebar-mode-switch">
                        {Object.values(MENU_GROUPS).map((group) => (
                            <button
                                key={group.key}
                                type="button"
                                className={`sidebar-mode-btn ${activeGroup === group.key ? 'active' : ''}`}
                                onClick={() => setActiveGroup(group.key)}
                            >
                                {group.label}
                            </button>
                        ))}
                    </div>
                )}

                {!isCollapsed && (
                    <div className="sidebar-group-caption">
                        <span>{MENU_GROUPS[activeGroup]?.label}</span>
                        <small>{activeGroup === 'commerce' ? 'Ерөнхий худалдааны цэс' : 'Хүргэлтийн удирдлагын цэс'}</small>
                    </div>
                )}

                {visibleMenuItems.map((item) => (
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
