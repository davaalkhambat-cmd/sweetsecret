import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const { user, userProfile, roleInfo, logout } = useAuth();
    const displayRoleInfo = roleInfo || { label: 'Ажилтан', color: '#6B7280', icon: '👤' };
    const displayName = userProfile?.displayName || user?.email || 'Ажилтан';
    const initial = (displayName?.[0] || 'U').toUpperCase();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
        setIsLoggingOut(false);
        navigate('/admin/login', { replace: true });
    };

    return (
        <div className="admin-layout">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onLogout={handleLogout}
                isLoggingOut={isLoggingOut}
            />

            <div className="admin-main">
                <header className="admin-header">
                    <div className="header-spacer" />
                    <div className="header-actions">
                        <button className="header-btn" type="button" aria-label="Мэдэгдэл">
                            <Bell size={18} />
                        </button>
                        <div
                            className="user-pill"
                            style={{ borderLeftColor: displayRoleInfo.color }}
                        >
                            <span className="user-pill-avatar" aria-hidden="true">{initial}</span>
                            <span className="user-pill-info">
                                <span className="user-pill-name">{displayName}</span>
                                <span className="user-pill-role">
                                    <span className="user-pill-role-icon">{displayRoleInfo.icon}</span>
                                    {displayRoleInfo.label}
                                </span>
                            </span>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
