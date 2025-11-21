import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';

interface AdminRouteProps {
  children: React.ReactNode;
  requirePlatformAdmin?: boolean; // If true, require PLATFORM_ADMIN role; if false, allow MODERATOR or ORG_ADMIN too
}

const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requirePlatformAdmin = false
}) => {
  const { user } = useAuth();
  const { allMemberships, loading } = useOrganization();
  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }

    // If they're a platform admin, they always have access
    if (user.role === 'PLATFORM_ADMIN') {
      setHasAccess(true);
      setChecking(false);
      return;
    }

    // If this route requires platform admin, deny access to non-platform-admins
    if (requirePlatformAdmin) {
      setHasAccess(false);
      setChecking(false);
      return;
    }

    // If they're a moderator, they have access (unless platform admin is required)
    if (user.role === 'MODERATOR') {
      setHasAccess(true);
      setChecking(false);
      return;
    }

    // Wait for memberships to load
    if (loading) {
      return;
    }

    // Check if user is an ORG_ADMIN of any organization
    const isOrgAdmin = allMemberships.some(
      membership => membership.role === 'ORG_ADMIN'
    );

    setHasAccess(isOrgAdmin);
    setChecking(false);
  }, [user, allMemberships, loading, requirePlatformAdmin]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (checking || loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'var(--text-primary)'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="access-denied">
        <h1>🚫 Access Denied</h1>
        <p>You don't have permission to access this area.</p>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
          Admin dashboard access requires Platform Admin, Moderator, or Organization Admin privileges.
        </p>
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;