import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDefaultAdminPath } from '../../config/roles';
import SalesDashboard from '../../pages/admin/SalesDashboard';

const AdminHomeRedirect = () => {
    const { role, roles } = useAuth();
    const target = getDefaultAdminPath(role, roles);

    if (target === '/admin') {
        return <SalesDashboard />;
    }

    return <Navigate to={target} replace />;
};

export default AdminHomeRedirect;
