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
  
  // BUILD TIMESTAMP: 2025-11-22 23:45:00 PST - FINAL VERSION
  console.log('🚀🚀🚀 AdminRoute v4.0 ABSOLUTE LATEST - BUILD TIME 23:45 PST 🚀🚀🚀');
  console.log('%c NEW CODE LOADED SUCCESSFULLY! ', 'background: lime; color: black; font-size: 20px; padding: 10px;');

  useEffect(() => {
    console.log('='.repeat(80));
    console.log('🔒 AdminRoute Access Check Starting...');
    console.log('='.repeat(80));
    console.log('📧 User Email:', user?.email);
    console.log('👤 User Role:', user?.role);
    console.log('⏳ Loading:', loading);
    console.log('📋 All Memberships:', allMemberships);
    console.log('🔢 Membership Count:', allMemberships?.length);
    console.log('='.repeat(80));

    if (!user) {
      setChecking(false);
      return;
    }

    // If they're a platform admin, they always have access
    if (user.role === 'PLATFORM_ADMIN') {
      console.log('✅ Access granted: PLATFORM_ADMIN');
      setHasAccess(true);
      setChecking(false);
      return;
    }

    // If this route requires platform admin, deny access to non-platform-admins
    if (requirePlatformAdmin) {
      console.log('❌ Access denied: Platform admin required');
      setHasAccess(false);
      setChecking(false);
      return;
    }

    // If they're a moderator, they have access (unless platform admin is required)
    if (user.role === 'MODERATOR') {
      console.log('✅ Access granted: MODERATOR');
      setHasAccess(true);
      setChecking(false);
      return;
    }

    // Wait for memberships to load
    if (loading) {
      console.log('⏳ Waiting for memberships to load...');
      return;
    }

    // Check if user is an ORG_ADMIN of any organization
    const isOrgAdmin = allMemberships.some(
      membership => membership.role === 'ORG_ADMIN'
    );

    console.log('='.repeat(80));
    console.log('🔍 ORG_ADMIN CHECK:');
    console.log('  All Memberships:', allMemberships);
    console.log('  Roles Found:', allMemberships.map(m => m.role));
    console.log('  Is Org Admin?:', isOrgAdmin);
    console.log('='.repeat(80));

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
        <h2 style={{ color: 'lime', fontSize: '24px', marginTop: '20px' }}>
          ⚠️ CODE VERSION: v3.0 - BUILD 2025-11-22 23:30 PST ⚠️
        </h2>
        <p>You don't have permission to access this area.</p>
        <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
          Admin dashboard access requires Platform Admin, Moderator, or Organization Admin privileges.
        </p>
        
        {/* DEBUG INFO - REMOVE LATER */}
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #333',
          borderRadius: '8px',
          textAlign: 'left',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <div><strong>🔍 DEBUG INFO:</strong></div>
          <div>User Email: {user?.email}</div>
          <div>User Role: {user?.role}</div>
          <div>Loading: {loading ? 'true' : 'false'}</div>
          <div>All Memberships Count: {allMemberships?.length || 0}</div>
          <div>Memberships: {JSON.stringify(allMemberships, null, 2)}</div>
          <div>Has Access: {hasAccess ? 'true' : 'false'}</div>
          <div>Require Platform Admin: {requirePlatformAdmin ? 'true' : 'false'}</div>
        </div>
        
        <button onClick={() => window.history.back()}>Go Back</button>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminRoute;