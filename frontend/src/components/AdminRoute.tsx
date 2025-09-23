import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean; // If true, require ADMIN role; if false, allow MODERATOR too
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requireAdmin = false
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = requireAdmin
    ? user.role === 'ADMIN'
    : user.role === 'ADMIN' || user.role === 'MODERATOR';

  if (!hasAccess) {
    return (
      <div className="access-denied">
        <h1>🚫 Access Denied</h1>
        <p>You don't have permission to access this area.</p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;