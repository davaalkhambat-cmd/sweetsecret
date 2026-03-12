import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import SalesModule from '../../components/staff/SalesModule';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    BarChart3,
    Settings,
    Bell,
    LogOut,
    Menu,
    X,
    Briefcase
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StaffWorkspace = () => {
    const { userProfile, logout, role } = useAuth();
    const [activeModule, setActiveModule] = useState('sales');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();

    const modules = [
        { id: 'dashboard', name: 'Тойм', icon: <LayoutDashboard size={20} />, roles: ['admin', 'manager', 'sales', 'cashier'] },
        { id: 'sales', name: 'Борлуулалт', icon: <ShoppingBag size={20} />, roles: ['admin', 'manager', 'sales', 'cashier'] },
        { id: 'customers', name: 'Хэрэглэгчид', icon: <Users size={20} />, roles: ['admin', 'manager', 'marketing_manager'] },
        { id: 'reports', name: 'Тайлан', icon: <BarChart3 size={20} />, roles: ['admin', 'manager'] },
        { id: 'settings', name: 'Тохиргоо', icon: <Settings size={20} />, roles: ['admin'] },
    ];

    const allowedModules = modules.filter(m => m.roles.includes(role));

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="staff-workspace-layout">
            {/* Sidebar */}
            <aside className={`workspace-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="brand">
                        <Briefcase size={24} color="#2563EB" />
                        <span>Staff Hub</span>
                    </div>
                </div>

                <nav className="workspace-nav">
                    {allowedModules.map(module => (
                        <button
                            key={module.id}
                            className={`nav-btn ${activeModule === module.id ? 'active' : ''}`}
                            onClick={() => setActiveModule(module.id)}
                        >
                            {module.icon}
                            <span>{module.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Гарах</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="workspace-main">
                <header className="workspace-header">
                    <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <div className="header-right">
                        <button className="icon-btn"><Bell size={20} /></button>
                        <div className="user-info">
                            <span className="user-name">{userProfile?.displayName || 'Ажилтан'}</span>
                            <span className="user-role">{role === 'admin' ? 'Админ' : role === 'sales' ? 'Борлуулалт' : 'Менежер'}</span>
                        </div>
                        <img
                            src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${userProfile?.displayName}`}
                            alt="Avatar"
                            className="workspace-avatar"
                        />
                    </div>
                </header>

                <div className="module-content">
                    {activeModule === 'sales' && <SalesModule />}
                    {activeModule !== 'sales' && (
                        <div className="placeholder-content">
                            <h2>{modules.find(m => m.id === activeModule)?.name}</h2>
                            <p>Энэ модуль удахгүй нэмэгдэнэ.</p>
                        </div>
                    )}
                </div>
            </main>

            <style aria-hidden="true">{`
                .staff-workspace-layout {
                    display: flex;
                    min-height: 100vh;
                    background: #fcf8f7;
                    font-family: 'Inter', sans-serif;
                }

                .workspace-sidebar {
                    width: 260px;
                    background: #fff;
                    border-right: 1px solid #eee;
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s ease;
                    z-index: 100;
                }

                .workspace-sidebar.closed {
                    width: 80px;
                }

                .sidebar-header {
                    padding: 30px 20px;
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-weight: 700;
                    font-size: 1.2rem;
                    color: #2D2424;
                }

                .workspace-sidebar.closed .brand span {
                    display: none;
                }

                .workspace-nav {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                .nav-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 15px;
                    border: none;
                    background: transparent;
                    border-radius: 12px;
                    color: #666;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }

                .nav-btn:hover {
                    background: #f8f9fa;
                    color: #2D2424;
                }

                .nav-btn.active {
                    background: #2563EB;
                    color: #fff;
                }

                .workspace-sidebar.closed .nav-btn span {
                    display: none;
                }

                .sidebar-footer {
                    padding: 20px;
                    border-top: 1px solid #eee;
                }

                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    width: 100%;
                    padding: 12px;
                    border: none;
                    background: transparent;
                    color: #ef4444;
                    font-weight: 500;
                    cursor: pointer;
                }

                .workspace-sidebar.closed .logout-btn span {
                    display: none;
                }

                .workspace-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .workspace-header {
                    height: 80px;
                    background: #fff;
                    border-bottom: 1px solid #eee;
                    padding: 0 30px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .toggle-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: #666;
                }

                .header-right {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }

                .icon-btn {
                    background: transparent;
                    border: none;
                    color: #666;
                    cursor: pointer;
                }

                .user-info {
                    display: flex;
                    flex-direction: column;
                    text-align: right;
                }

                .user-name {
                    font-weight: 600;
                    font-size: 0.95rem;
                    color: #2D2424;
                }

                .user-role {
                    font-size: 0.8rem;
                    color: #B85B5B;
                    font-weight: 500;
                }

                .workspace-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    object-fit: cover;
                }

                .module-content {
                    flex: 1;
                    padding: 30px;
                    overflow-y: auto;
                }

                .placeholder-content {
                    text-align: center;
                    padding-top: 100px;
                    color: #999;
                }

                @media (max-width: 768px) {
                    .workspace-sidebar {
                        position: fixed;
                        top: 0;
                        bottom: 0;
                        left: 0;
                        transform: translateX(-100%);
                    }
                    .workspace-sidebar.open {
                        transform: translateX(0);
                    }
                    .workspace-sidebar.closed {
                        transform: translateX(-100%);
                    }
                }
            `}</style>
        </div>
    );
};

export default StaffWorkspace;
