import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'farmer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole === null) {
    return <div>Loading...</div>;
  }

  if (userRole !== requiredRole) {
    return <Navigate to={userRole === 'admin' ? '/admin' : '/farmer'} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
