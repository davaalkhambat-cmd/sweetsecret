import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Loyalty from './pages/Loyalty';
import Cart from './components/Cart';

// Admin Imports
import AdminLayout from './components/admin/AdminLayout';
import RequireAdmin from './components/admin/RequireAdmin';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Orders from './pages/admin/Orders';
import Users from './pages/admin/Users';
import Promotions from './pages/admin/Promotions';
import AdminLogin from './pages/admin/AdminLogin';
import StaffRoles from './pages/admin/StaffRoles';
import Profile from './pages/Profile';
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

            {/* Admin Routes */}
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <AdminLayout />
                    </RequireAdmin>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="products" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_PRODUCTS}>
                        <Products />
                    </RequireAdmin>
                } />
                <Route path="orders" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_ORDERS}>
                        <Orders />
                    </RequireAdmin>
                } />
                <Route path="users" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_USERS}>
                        <Users />
                    </RequireAdmin>
                } />
                <Route path="promotions" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.VIEW_PROMOTIONS}>
                        <Promotions />
                    </RequireAdmin>
                } />
                <Route path="staff-roles" element={
                    <RequireAdmin requiredPermission={PERMISSIONS.MANAGE_STAFF_ROLES}>
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
