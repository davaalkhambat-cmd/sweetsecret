import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultAdminPath } from '../../config/roles';
import CommerceDashboard from '../../pages/admin/CommerceDashboard';

const AdminHomeRedirect = () => {
    const { role, roles } = useAuth();
    const target = getDefaultAdminPath(role, roles);

    if (target === '/admin') {
        return <CommerceDashboard />;
    }

    return <Navigate to={target} replace />;
};

export default AdminHomeRedirect;
