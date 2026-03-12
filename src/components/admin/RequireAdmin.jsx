import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RequireAdmin = ({ children }) => {
    const location = useLocation();
    const { user, isAdmin, loading } = useAuth();

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
                <span>Админ эрх шалгаж байна...</span>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    }

    return children;
};

export default RequireAdmin;
