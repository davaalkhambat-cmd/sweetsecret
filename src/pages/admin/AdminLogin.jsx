import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LoaderCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLogin = () => {
    const { user, role, isAdmin, loading, signInWithEmail, signInWithGoogle, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const targetPath = useMemo(() => {
        const fromPath = location.state?.from;
        return typeof fromPath === 'string' && fromPath.startsWith('/admin') ? fromPath : '/admin';
    }, [location.state]);

    if (!loading && user && isAdmin) {
        return <Navigate to={targetPath} replace />;
    }

    const handleEmailLogin = async (event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setErrorMessage('');

        const result = await signInWithEmail(email.trim(), password);
        if (!result.ok) {
            setErrorMessage(result.error);
            setIsSubmitting(false);
            return;
        }

        navigate(targetPath, { replace: true });
    };

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        setErrorMessage('');

        const result = await signInWithGoogle();
        if (!result.ok) {
            setErrorMessage(result.error);
            setIsSubmitting(false);
            return;
        }

        navigate(targetPath, { replace: true });
    };

    const handleLogout = async () => {
        setIsSubmitting(true);
        setErrorMessage('');
        const result = await logout();
        if (!result.ok) {
            setErrorMessage(result.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="admin-login-page">
            <div className="admin-login-card">
                <h1>Админ нэвтрэх</h1>
                <p>Удирдлагын хэсэгт хандахын тулд админ эрхтэй хэрэглэгчээр нэвтэрнэ үү.</p>

                {loading && (
                    <div className="admin-login-alert info">
                        <LoaderCircle size={16} className="spin" />
                        <span>Хэрэглэгчийн мэдээлэл шалгаж байна...</span>
                    </div>
                )}

                {!loading && user && !isAdmin && (
                    <div className="admin-login-alert">
                        Энэ хэрэглэгч админ эрхгүй байна
                        {role ? ` (role: ${role})` : ''}. Админ эрхтэй аккаунтаар дахин нэвтэрнэ үү.
                    </div>
                )}

                {errorMessage && <div className="admin-login-alert">{errorMessage}</div>}

                <button className="admin-google-btn" type="button" onClick={handleGoogleLogin} disabled={isSubmitting || loading}>
                    Google-ээр нэвтрэх
                </button>

                <div className="admin-login-divider">эсвэл</div>

                <form onSubmit={handleEmailLogin} className="admin-login-form">
                    <label>И-мэйл</label>
                    <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        disabled={isSubmitting || loading}
                    />

                    <label>Нууц үг</label>
                    <input
                        type="password"
                        placeholder="******"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        disabled={isSubmitting || loading}
                    />

                    <button className="admin-login-submit" type="submit" disabled={isSubmitting || loading}>
                        {isSubmitting ? 'Шалгаж байна...' : 'Нэвтрэх'}
                    </button>
                </form>

                {!loading && user && (
                    <button className="admin-logout-btn" type="button" onClick={handleLogout} disabled={isSubmitting}>
                        <LogOut size={16} />
                        <span>Одоогийн хэрэглэгчээс гарах</span>
                    </button>
                )}

                <Link to="/profile" className="admin-back-link">
                    Хэрэглэгчийн профайл руу буцах
                </Link>
            </div>
        </div>
    );
};

export default AdminLogin;
