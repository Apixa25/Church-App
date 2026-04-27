import React from 'react';
import { GroupMember, ChatGroup } from '../services/chatApi';

interface ChatMembersProps {
  members: GroupMember[];
  currentUser: any;
  group: ChatGroup;
  onClose: () => void;
  onUpdateRole?: (memberId: string, role: string) => void;
  onRemoveMember?: (memberId: string, displayName: string) => void;
  onToggleMute?: (memberId: string, muted: boolean) => void;
}

const ChatMembers: React.FC<ChatMembersProps> = ({
  members,
  currentUser,
  group,
  onClose,
  onUpdateRole,
  onRemoveMember,
  onToggleMute
}) => {
  const canManageMembers = group.userRole === 'OWNER' || group.userRole === 'ADMIN';

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return '#ff6b35';
      case 'ADMIN': return '#ff9500';
      case 'MODERATOR': return '#007aff';
      default: return '#666';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER': return '👑';
      case 'ADMIN': return '🛡️';
      case 'MODERATOR': return '🔧';
      default: return '👤';
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { OWNER: 0, ADMIN: 1, MODERATOR: 2, MEMBER: 3, GUEST: 4, RESTRICTED: 5 };
    const aOrder = roleOrder[a.memberRole as keyof typeof roleOrder] || 999;
    const bOrder = roleOrder[b.memberRole as keyof typeof roleOrder] || 999;
    
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="chat-members-panel">
      <div className="members-header">
        <h3>👥 Members ({members.length})</h3>
        <button onClick={onClose} className="close-members">✕</button>
      </div>
      
      <div className="members-list">
        {sortedMembers.map((member) => (
          <div key={member.id} className="member-item">
            <div className="member-avatar">
              {member.profilePicUrl ? (
                <img src={member.profilePicUrl} alt={member.displayName} />
              ) : (
                <div className="avatar-placeholder">
                  {member.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              {member.isOnline && <div className="online-indicator"></div>}
            </div>
            
            <div className="member-info">
              <div className="member-name">
                {member.displayName}
                {member.userId === currentUser?.userId && <span className="you-label">(You)</span>}
              </div>
              <div className="member-role" style={{ color: getRoleColor(member.memberRole) }}>
                <span className="role-icon">{getRoleIcon(member.memberRole)}</span>
                {member.roleDisplayName}
              </div>
              {member.customName && member.customName !== member.userName && (
                <div className="member-custom-name">aka {member.customName}</div>
              )}
            </div>
            
            <div className="member-status">
              {member.isMuted && <span className="status-icon muted" title="Muted">🔇</span>}
              {!member.canPost && <span className="status-icon restricted" title="Cannot post">🚫</span>}
              {member.isOnline ? (
                <span className="online-text">Online</span>
              ) : (
                <span className="offline-text">Offline</span>
              )}
            </div>

            {canManageMembers && member.userId !== currentUser?.userId && member.memberRole !== 'OWNER' && (
              <div className="member-moderation-actions">
                <select
                  value={member.memberRole}
                  onChange={(e) => onUpdateRole?.(member.id, e.target.value)}
                  aria-label={`Change role for ${member.displayName}`}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="MODERATOR">Moderator</option>
                  <option value="MEMBER">Member</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
                <button onClick={() => onToggleMute?.(member.id, !member.isMuted)}>
                  {member.isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button className="danger" onClick={() => onRemoveMember?.(member.id, member.displayName)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="members-footer">
        <div className="member-stats">
          <div className="stat">
            <span className="stat-number">{members.filter(m => m.isOnline).length}</span>
            <span className="stat-label">Online</span>
          </div>
          <div className="stat">
            <span className="stat-number">{members.filter(m => m.memberRole === 'ADMIN' || m.memberRole === 'OWNER').length}</span>
            <span className="stat-label">Admins</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMembers;