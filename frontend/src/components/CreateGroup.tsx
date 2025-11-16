import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import chatApi from '../services/chatApi';

interface CreateGroupProps {
  onGroupCreated?: (groupId: string) => void;
  onCancel?: () => void;
}

interface GroupFormData {
  name: string;
  description: string;
  type: string;
  isPrivate: boolean;
  maxMembers?: number;
}

const CreateGroup: React.FC<CreateGroupProps> = ({ onGroupCreated, onCancel }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    type: 'SUBGROUP',
    isPrivate: false,
    maxMembers: undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const groupTypes = [
    { value: 'SUBGROUP', label: 'General Subgroup', description: 'For general discussions and fellowship' },
    { value: 'PRAYER', label: 'Prayer Group', description: 'Focused on prayer and spiritual support' },
    { value: 'STUDY', label: 'Bible Study', description: 'For studying scripture together' },
    { value: 'MINISTRY', label: 'Ministry Team', description: 'For ministry coordination and planning' },
    { value: 'YOUTH', label: 'Youth Group', description: 'For young people and youth activities' },
    { value: 'MENS', label: "Men's Group", description: 'For men in the community' },
    { value: 'WOMENS', label: "Women's Group", description: 'For women in the community' },
    { value: 'PRIVATE', label: 'Private Group', description: 'Invite-only group for specific purposes' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleMaxMembersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      maxMembers: value ? parseInt(value) : undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    if (formData.name.length < 2 || formData.name.length > 100) {
      setError('Group name must be between 2 and 100 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        isPrivate: formData.isPrivate,
        maxMembers: formData.maxMembers || undefined,
      };

      const newGroup = await chatApi.createGroup(groupData);
      
      if (onGroupCreated) {
        onGroupCreated(newGroup.id);
      } else {
        // Navigate to the new group
        navigate(`/chats/${newGroup.id}`);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create group';
      setError(errorMessage);
      console.error('Error creating group:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/chats');
    }
  };

  const selectedGroupType = groupTypes.find(type => type.value === formData.type);

  return (
    <div className="create-group">
      <div className="create-group-header">
        <h3>➕ Create New Group</h3>
        <p>Start a new conversation space for your community</p>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="create-group-form">
        {/* Group Name */}
        <div className="form-group">
          <label htmlFor="groupName">Group Name *</label>
          <input
            id="groupName"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter group name..."
            maxLength={100}
            required
            disabled={loading}
          />
          <small>{formData.name.length}/100 characters</small>
        </div>

        {/* Group Description */}
        <div className="form-group">
          <label htmlFor="groupDescription">Description (Optional)</label>
          <textarea
            id="groupDescription"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe the purpose of this group..."
            rows={3}
            maxLength={500}
            disabled={loading}
          />
          <small>{formData.description.length}/500 characters</small>
        </div>

        {/* Group Type */}
        <div className="form-group">
          <label htmlFor="groupType">Group Type *</label>
          <select
            id="groupType"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            required
            disabled={loading}
          >
            {groupTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {selectedGroupType && (
            <small className="type-description">
              {selectedGroupType.description}
            </small>
          )}
        </div>

        {/* Privacy Settings */}
        <div className="form-group">
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPrivate"
                checked={formData.isPrivate}
                onChange={handleInputChange}
                disabled={loading}
              />
              <span className="checkmark"></span>
              Make this group private (invite-only)
            </label>
          </div>
          <small>
            {formData.isPrivate 
              ? "Only invited members can join this group" 
              : "Any organization member can discover and join this group"
            }
          </small>
        </div>

        {/* Member Limit */}
        <div className="form-group">
          <label htmlFor="maxMembers">Member Limit (Optional)</label>
          <input
            id="maxMembers"
            type="number"
            value={formData.maxMembers || ''}
            onChange={handleMaxMembersChange}
            placeholder="No limit"
            min={2}
            max={1000}
            disabled={loading}
          />
          <small>Leave empty for unlimited members</small>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="create-button"
            disabled={loading || !formData.name.trim()}
          >
            {loading ? (
              <>
                <span className="loading-spinner-small"></span>
                Creating...
              </>
            ) : (
              '➕ Create Group'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGroup;
