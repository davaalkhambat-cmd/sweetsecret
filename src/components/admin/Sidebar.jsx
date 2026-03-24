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
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_MENU_SECTIONS, getMenuForRole, getSectionStateForRole } from '../../config/roles';

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

const Sidebar = ({ isCollapsed, toggleSidebar, onLogout, isLoggingOut = false }) => {
    const { role, roles, roleInfo } = useAuth();
    const location = useLocation();

    const menuItems = React.useMemo(() => {
        return getMenuForRole(role, roles);
    }, [role, roles]);

    const groupedMenuItems = React.useMemo(() => {
        return ADMIN_MENU_SECTIONS
            .map((section) => ({
                ...section,
                items: menuItems.filter((item) => item.section === section.key),
            }))
            .filter((section) => section.items.length > 0);
    }, [menuItems]);

    const [sectionState, setSectionState] = React.useState(() => getSectionStateForRole(role, roles));

    React.useEffect(() => {
        setSectionState(getSectionStateForRole(role, roles));
    }, [role, roles]);

    React.useEffect(() => {
        const activeItem = menuItems.find((item) =>
            item.path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(item.path)
        );
        if (!activeItem) return;

        setSectionState((current) => ({
            ...current,
            [activeItem.section]: true,
        }));
    }, [location.pathname, menuItems]);

    const toggleSection = (sectionKey) => {
        setSectionState((current) => ({
            ...current,
            [sectionKey]: !current[sectionKey],
        }));
    };

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
                {isCollapsed
                    ? menuItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/admin'}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            title={item.title}
                        >
                            <span className="nav-icon">
                                {ICON_MAP[item.iconName] || <LayoutDashboard size={20} />}
                            </span>
                        </NavLink>
                    ))
                    : groupedMenuItems.map((section) => {
                        const isOpen = sectionState[section.key] ?? true;

                        return (
                            <div key={section.key} className={`sidebar-section ${isOpen ? 'open' : 'closed'}`}>
                                <button
                                    type="button"
                                    className="sidebar-section-toggle"
                                    onClick={() => toggleSection(section.key)}
                                >
                                    <div className="sidebar-group-caption">
                                        <span>{section.label}</span>
                                        <small>{section.description}</small>
                                    </div>
                                    <div className="sidebar-section-meta">
                                        <span className="sidebar-section-count">{section.items.length}</span>
                                        <ChevronDown size={16} className={`sidebar-section-chevron ${isOpen ? 'open' : ''}`} />
                                    </div>
                                </button>

                                <div className={`sidebar-section-items ${isOpen ? 'open' : 'closed'}`}>
                                    {section.items.map((item) => (
                                        <NavLink
                                            key={item.path}
                                            to={item.path}
                                            end={item.path === '/admin'}
                                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                        >
                                            <span className="nav-icon">
                                                {ICON_MAP[item.iconName] || <LayoutDashboard size={20} />}
                                            </span>
                                            <span className="nav-title">{item.title}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
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
