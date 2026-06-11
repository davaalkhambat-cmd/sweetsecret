import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Wallet,
    Globe,
    Megaphone,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ADMIN_MENU_SECTIONS, getMenuForRole } from '../../config/roles';

const SECTION_ICON_MAP = {
    Building: <Building2 strokeWidth={1.7} />,
    Wallet: <Wallet strokeWidth={1.7} />,
    Globe: <Globe strokeWidth={1.7} />,
    Megaphone: <Megaphone strokeWidth={1.7} />,
    Settings: <Settings strokeWidth={1.7} />,
};

/** Flower-shape "active" dot from the reference HTML */
const FlowerDot = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g fill="currentColor">
            <ellipse cx="12" cy="6.4" rx="2.7" ry="3.2" />
            <ellipse cx="17.3" cy="10.2" rx="2.7" ry="3.2" transform="rotate(72 17.3 10.2)" />
            <ellipse cx="15.3" cy="16.6" rx="2.7" ry="3.2" transform="rotate(144 15.3 16.6)" />
            <ellipse cx="8.7" cy="16.6" rx="2.7" ry="3.2" transform="rotate(216 8.7 16.6)" />
            <ellipse cx="6.7" cy="10.2" rx="2.7" ry="3.2" transform="rotate(288 6.7 10.2)" />
        </g>
        <circle cx="12" cy="11.8" r="2.5" fill="#FBEAF0" />
    </svg>
);

const Sidebar = ({ isCollapsed, toggleSidebar, onLogout, isLoggingOut = false }) => {
    const { role, roles, roleInfo } = useAuth();
    const location = useLocation();

    const menuItems = React.useMemo(() => getMenuForRole(role, roles), [role, roles]);

    // 5 top-level section items — section overview хуудас руу заана
    const sectionItems = React.useMemo(() => {
        return ADMIN_MENU_SECTIONS.map((section) => {
            const items = menuItems.filter((it) => it.section === section.key);
            return {
                ...section,
                items,
                target: section.overviewPath || `/admin/${section.key}`,
                comingSoon: false, // section overview өөрөө байгаа учир үргэлж navigable
            };
        }).filter((s) => s.items.length > 0);
    }, [menuItems]);

    const isSectionActive = React.useCallback(
        (section) => {
            // Section overview path-той тохирох эсвэл доторх ямар нэг item-ын path-той тохирох
            if (location.pathname === section.overviewPath) return true;
            return section.items.some((item) =>
                item.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            );
        },
        [location.pathname]
    );

    const displayRoleInfo = roleInfo || roles.customer;

    return (
        <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="ss-menu">
                {/* Brand card */}
                <div className="ss-brand">
                    <span className="ss-mono">SS</span>
                    {!isCollapsed && (
                        <>
                            <span className="ss-rule" />
                            <div className="ss-titles">
                                <div className="ss-name">Sweet&nbsp;Secret</div>
                                <div className="ss-sub">Intimate&nbsp;Wellness<br />System</div>
                            </div>
                        </>
                    )}
                    <button
                        type="button"
                        className="ss-collapse"
                        onClick={toggleSidebar}
                        aria-label={isCollapsed ? 'Цэс дэлгэх' : 'Цэс хураах'}
                    >
                        {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
                    </button>
                </div>

                {/* Quote */}
                {!isCollapsed && (
                    <div className="ss-quote">
                        <p>
                            <span className="ss-qm">"</span>
                            Санаанд багтвал заяанд багтана.
                            <span className="ss-qm">"</span>
                        </p>
                    </div>
                )}

                {/* Role badge */}
                {!isCollapsed && (
                    <div className="ss-role-badge" style={{ borderLeftColor: displayRoleInfo.color }}>
                        <span className="ss-role-icon">{displayRoleInfo.icon}</span>
                        <span className="ss-role-label">{displayRoleInfo.label}</span>
                    </div>
                )}

                {/* Eyebrow */}
                <div className="ss-eyebrow">ЦЭС</div>

                {/* Top-level nav (5 sections) */}
                <nav className="ss-nav">
                    {sectionItems.map((section) => {
                        const active = isSectionActive(section);
                        const icon = SECTION_ICON_MAP[section.iconName] || <LayoutDashboard />;
                        const cls = `ss-item ${active ? 'active' : ''} ${section.comingSoon ? 'coming-soon' : ''}`;

                        if (section.comingSoon || !section.target) {
                            return (
                                <span
                                    key={section.key}
                                    className={cls}
                                    title={`${section.label} — Тун удахгүй`}
                                    aria-disabled="true"
                                >
                                    <span className="ss-ic">{icon}</span>
                                    {!isCollapsed && (
                                        <>
                                            <div className="ss-labels">
                                                <div className="ss-row1">
                                                    <span className="ss-num">{section.number}</span>
                                                    <span className="ss-mn">{section.label}</span>
                                                </div>
                                                <div className="ss-en">{section.englishLabel}</div>
                                            </div>
                                            <span className="ss-pill">Тун удахгүй</span>
                                        </>
                                    )}
                                </span>
                            );
                        }

                        return (
                            <NavLink
                                key={section.key}
                                to={section.target}
                                end={section.target === '/admin'}
                                className={cls}
                                title={section.label}
                            >
                                <span className="ss-ic">{icon}</span>
                                {!isCollapsed && (
                                    <>
                                        <div className="ss-labels">
                                            <div className="ss-row1">
                                                <span className="ss-num">{section.number}</span>
                                                <span className="ss-mn">{section.label}</span>
                                            </div>
                                            <div className="ss-en">{section.englishLabel}</div>
                                        </div>
                                        <span className="ss-dot">
                                            <FlowerDot />
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="ss-footer">
                    <button className="ss-logout" type="button" onClick={onLogout} disabled={isLoggingOut}>
                        <LogOut size={20} />
                        {!isCollapsed && <span>{isLoggingOut ? 'Гарч байна...' : 'Гарах'}</span>}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
