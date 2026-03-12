import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Search, Bell, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getRoleInfo } from '../../config/roles';

const AdminLayout = () => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();
    const { user, userProfile, role, logout } = useAuth();
    const roleInfo = getRoleInfo(role);

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
                    <div className="header-search">
                        <Search size={18} />
                        <input type="text" placeholder="Хайлт..." />
                    </div>
                    <div className="header-actions">
                        <button className="header-btn"><Bell size={20} /></button>
                        <div className="user-profile">
                            <div className="user-info-stack">
                                <span className="username">
                                    {userProfile?.displayName || user?.email || 'Ажилтан'}
                                </span>
                                <span
                                    className="header-role-tag"
                                    style={{ background: roleInfo.color + '18', color: roleInfo.color }}
                                >
                                    {roleInfo.icon} {roleInfo.label}
                                </span>
                            </div>
                            <div className="avatar"><User size={20} /></div>
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
