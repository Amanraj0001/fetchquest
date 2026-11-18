
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../Context/useAuth';
import ProtectedRoute from './ProtectedRoute';

function AdminRoute({ children }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <ProtectedRoute>{children}</ProtectedRoute>;
    }

    if (!user.isAdmin) {
       
        return <Navigate to="/dashboard" replace />;
    }


    return children;
}


export default function ProtectedAdminRoute({ children }) {
    return (
        <ProtectedRoute>
            <AdminRoute>
                {children}
            </AdminRoute>
        </ProtectedRoute>
    );
}