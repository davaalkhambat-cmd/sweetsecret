import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Backoffice-ийн staff role-тэй хэрэглэгчийг нэвтрүүлнэ.
 * requiredPermission өгвөл module-level permission давхар шалгана.
 */
const RequireAdmin = ({ children, requiredPermission }) => {
    const location = useLocation();
    const { user, isStaff, hasPermission, loading } = useAuth();

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                }}
            >
                <LoaderCircle size={20} className="spin" />
                <span>Эрх шалгаж байна...</span>
            </div>
        );
    }

    if (!user || !isStaff) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }

    // Хэрэв тодорхой permission шаардагдаж байвал шалгана
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return (
            <div
                style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    textAlign: 'center',
                    padding: '2rem',
                }}
            >
                <div style={{ fontSize: '3rem' }}>🚫</div>
                <h2 style={{ fontSize: '1.4rem', color: '#1a1a2e' }}>Хандах эрхгүй</h2>
                <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                    Танд энэ хуудсанд хандах эрх байхгүй байна. Админтай холбогдож эрх авна уу.
                </p>
            </div>
        );
    }

    return children;
};

export default RequireAdmin;
