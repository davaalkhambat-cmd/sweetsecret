import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Loyalty from './pages/Loyalty';
import Cart from './components/Cart';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import AdminHomeRedirect from './components/admin/AdminHomeRedirect';
import RequireAdmin from './components/admin/RequireAdmin';
import DeliveryDashboard from './pages/admin/Dashboard';
import CommerceDashboard from './pages/admin/CommerceDashboard';
import Inventory from './pages/admin/Inventory';
import SalesRevenue from './pages/admin/SalesRevenue';
import Products from './pages/admin/Products';
import Orders from './pages/admin/Orders';
import Users from './pages/admin/Users';
import Promotions from './pages/admin/Promotions';
import SocialBusinessSuite from './pages/admin/SocialBusinessSuite';
import AdminLogin from './pages/admin/AdminLogin';
import StaffRoles from './pages/admin/StaffRoles';
import Profile from './pages/Profile';
import StaffWorkspace from './pages/staff/StaffWorkspace';
import { PERMISSIONS } from './config/roles';

function App() {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartItems, setCartItems] = useState([]);

    const toggleCart = () => setIsCartOpen(!isCartOpen);

    const addToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    const updateCartItemQty = (id, quantity) => {
        setCartItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, quantity: Math.max(1, Number(quantity) || 1) } : item
            )
        );
    };

    return (
        <Routes>
            {/* User Site Routes */}
            <Route path="/" element={
                <div className="app-container">
                    <Header
                        cartItemCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                        onCartClick={toggleCart}
                    />
                    <main>
                        <Home onAddToCart={addToCart} />
                    </main>
                    <Cart
                        isOpen={isCartOpen}
                        onClose={toggleCart}
                        items={cartItems}
                        onRemove={removeFromCart}
                        onUpdateQty={updateCartItemQty}
                    />
                </div>
            } />

            <Route path="/loyalty" element={
                <div className="app-container">
                    <Header
                        cartItemCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                        onCartClick={toggleCart}
                    />
                    <main>
                        <Loyalty />
                    </main>
                    <Cart
                        isOpen={isCartOpen}
                        onClose={toggleCart}
                        items={cartItems}
                        onRemove={removeFromCart}
                        onUpdateQty={updateCartItemQty}
                    />
                </div>
            } />

            <Route path="/profile" element={
                <div className="app-container">
                    <Header
                        cartItemCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)}
                        onCartClick={toggleCart}
                    />
                    <main>
                        <Profile />
                    </main>
                    <Cart
                        isOpen={isCartOpen}
                        onClose={toggleCart}
                        items={cartItems}
                        onRemove={removeFromCart}
                        onUpdateQty={updateCartItemQty}
                    />
                </div>
            } />

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route
                path="/workspace"
                element={
                    <RequireAdmin>
                        <StaffWorkspace />
                    </RequireAdmin>
                }
            />

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <AdminLayout />
                    </RequireAdmin>
                }
            >
                <Route index element={<AdminHomeRedirect />} />
                <Route path="delivery-dashboard" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_OPERATIONS}>
                        <DeliveryDashboard />
                    </RequireAdmin>
                } />
                <Route path="products" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_PRODUCTS}>
                        <Products />
                    </RequireAdmin>
                } />
                <Route path="inventory" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_INVENTORY}>
                        <Inventory />
                    </RequireAdmin>
                } />
                <Route path="sales-revenue" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_FINANCE}>
                        <SalesRevenue />
                    </RequireAdmin>
                } />
                <Route path="orders" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_ORDERS}>
                        <Orders />
                    </RequireAdmin>
                } />
                <Route path="users" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_CUSTOMERS}>
                        <Users />
                    </RequireAdmin>
                } />
                <Route path="promotions" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_MARKETING}>
                        <Promotions />
                    </RequireAdmin>
                } />
                <Route path="social-business-suite" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_MARKETING}>
                        <SocialBusinessSuite />
                    </RequireAdmin>
                } />
                <Route path="staff-roles" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_ROLES}>
                        <StaffRoles />
                    </RequireAdmin>
                } />
                <Route path="settings" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_SETTINGS}>
                        <div className="admin-page"><h1>Тохиргоо (Тун удахгүй)</h1></div>
                    </RequireAdmin>
                } />
            </Route>
        </Routes>
    );
}

export default App;
