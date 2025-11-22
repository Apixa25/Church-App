import React from 'react';
import { Membership } from '../contexts/OrganizationContext';
import './UserRolesDisplay.css';

interface UserRolesDisplayProps {
  platformRole: 'USER' | 'MODERATOR' | 'PLATFORM_ADMIN';
  organizationMemberships: Membership[];
  isLoading?: boolean;
}

const UserRolesDisplay: React.FC<UserRolesDisplayProps> = ({
  platformRole,
  organizationMemberships,
  isLoading = false
}) => {
  const getRoleDisplay = (role: string, isPlatform: boolean = false) => {
    if (isPlatform) {
      switch (role) {
        case 'PLATFORM_ADMIN':
          return { label: 'Platform Administrator', icon: '👑', color: '#ff6b6b', badge: 'ADMIN' };
        case 'MODERATOR':
          return { label: 'Platform Moderator', icon: '🛡️', color: '#4ecdc4', badge: 'MOD' };
        case 'USER':
          return null; // Don't show USER role
        default:
          return { label: role, icon: '👤', color: '#95a5a6', badge: role };
      }
    } else {
      switch (role) {
        case 'ORG_ADMIN':
          return { label: 'Organization Administrator', icon: '🏛️', color: '#9b59b6', badge: 'ORG ADMIN' };
        case 'MODERATOR':
          return { label: 'Organization Moderator', icon: '🛡️', color: '#3498db', badge: 'ORG MOD' };
        case 'MEMBER':
          return { label: 'Member', icon: '👥', color: '#95a5a6', badge: 'MEMBER' };
        default:
          return { label: role, icon: '👤', color: '#95a5a6', badge: role };
      }
    }
  };

  const platformRoleDisplay = getRoleDisplay(platformRole, true);
  const orgRoles = organizationMemberships
    .map(m => ({ membership: m, display: getRoleDisplay(m.role, false) }))
    .filter(item => item.display !== null);

  // Don't show anything if user is just a regular USER with no special org roles
  if (!platformRoleDisplay && orgRoles.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="user-roles-display">
        <div className="roles-loading">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="user-roles-display">
      <h3 className="roles-section-title">Roles & Permissions</h3>
      
      {platformRoleDisplay && (
        <div className="role-item platform-role">
          <div className="role-icon" style={{ backgroundColor: platformRoleDisplay.color + '20' }}>
            <span>{platformRoleDisplay.icon}</span>
          </div>
          <div className="role-info">
            <div className="role-label">{platformRoleDisplay.label}</div>
            <div className="role-badge" style={{ backgroundColor: platformRoleDisplay.color }}>
              {platformRoleDisplay.badge}
            </div>
          </div>
        </div>
      )}

      {orgRoles.length > 0 && (
        <div className="organization-roles">
          <h4 className="org-roles-title">Organization Roles</h4>
          {orgRoles.map(({ membership, display }) => (
            <div key={membership.id} className="role-item org-role">
              <div className="role-icon" style={{ backgroundColor: display!.color + '20' }}>
                <span>{display!.icon}</span>
              </div>
              <div className="role-info">
                <div className="role-label">{display!.label}</div>
                <div className="role-organization">{membership.organizationName}</div>
                <div className="role-badge" style={{ backgroundColor: display!.color }}>
                  {display!.badge}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserRolesDisplay;

