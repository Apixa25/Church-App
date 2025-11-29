import React, { useState } from 'react';
import { useGroup } from '../contexts/GroupContext';
import styled from 'styled-components';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--bg-primary);
  border-radius: var(--border-radius-lg);
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ModalSubtitle = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-disabled);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  transition: all var(--transition-base);
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-disabled);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TagInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  color: var(--text-primary);
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(91, 127, 255, 0.2);
  }

  &::placeholder {
    color: var(--text-disabled);
  }
`;

const TagHint = styled.small`
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
`;

const ErrorMessage = styled.div`
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: var(--error);
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid rgba(40, 167, 69, 0.3);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: var(--success);
  margin-bottom: 20px;
  font-size: 14px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  ${props => {
    if (props.variant === 'primary') {
      return `
        background: var(--gradient-primary);
        color: white;
        box-shadow: 0 4px 12px var(--button-primary-glow);
        
        &:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px var(--button-primary-glow);
        }
      `;
    } else if (props.variant === 'secondary') {
      return `
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-primary);
        
        &:hover:not(:disabled) {
          background: var(--bg-elevated);
          border-color: var(--border-glow);
        }
      `;
    } else {
      return `
        background: var(--bg-secondary);
        color: var(--text-primary);
        border: 1px solid var(--border-primary);
        
        &:hover:not(:disabled) {
          background: var(--bg-elevated);
        }
      `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const CharacterCount = styled.small`
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
`;

interface CreatePostGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreatePostGroupModal: React.FC<CreatePostGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createGroup } = useGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 255) {
      setError('Group name must be between 2 and 255 characters');
      return;
    }

    if (description && description.length > 2000) {
      setError('Description cannot exceed 2000 characters');
      return;
    }

    setLoading(true);

    try {
      // Parse tags (comma-separated)
      const tags = tagsInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const groupData = {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility: 'PUBLIC' as const, // All new groups are PUBLIC
        tags: tags.length > 0 ? tags : undefined,
      };

      await createGroup(groupData);
      setSuccess('Group created successfully!');
      
      // Reset form
      setName('');
      setDescription('');
      setTagsInput('');

      // Close modal after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.message || err.response?.data?.message || 'Failed to create group';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setDescription('');
      setTagsInput('');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Create New Group</ModalTitle>
          <ModalSubtitle>
            Create a public group for sharing posts. Groups are searchable and anyone can join.
          </ModalSubtitle>
        </ModalHeader>

        {error && <ErrorMessage>⚠️ {error}</ErrorMessage>}
        {success && <SuccessMessage>✅ {success}</SuccessMessage>}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., World of Concrete 2025"
              maxLength={255}
              required
              disabled={loading}
            />
            <CharacterCount>{name.length}/255 characters</CharacterCount>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="groupDescription">Description (Optional)</Label>
            <TextArea
              id="groupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this group is about..."
              maxLength={2000}
              disabled={loading}
            />
            <CharacterCount>{description.length}/2000 characters</CharacterCount>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="groupTags">Tags (Optional)</Label>
            <TagInput
              id="groupTags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="concrete, construction, las vegas (comma-separated)"
              disabled={loading}
            />
            <TagHint>Add tags to help others discover your group</TagHint>
          </FormGroup>

          <ButtonGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreatePostGroupModal;

