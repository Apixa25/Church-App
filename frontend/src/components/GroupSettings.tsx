import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup, Group } from '../contexts/GroupContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfilePicture } from '../services/postApi';
import { processImageForUpload, isValidImageFile } from '../utils/imageUtils';
import styled from 'styled-components';

const PageContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-primary);
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: 18px;

  &:hover {
    background: var(--bg-elevated);
    color: var(--text-primary);
    border-color: var(--accent-primary);
  }
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
`;

const FormSection = styled.div`
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-lg);
  padding: 24px;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 16px 0;
`;

const ImagePreviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const ImagePreview = styled.div`
  width: 200px;
  height: 200px;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-primary);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlaceholderIcon = styled.div`
  font-size: 48px;
  color: var(--text-secondary);
`;

const ImageInput = styled.input`
  display: none;
`;

const ChangeImageButton = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  background: var(--bg-secondary);
  color: var(--accent-primary);
  border: 1px solid var(--accent-primary);
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    background: var(--bg-elevated);
    box-shadow: 0 0 12px rgba(91, 127, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FormLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px;
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  resize: vertical;
  transition: border-color var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }

  &::placeholder {
    color: var(--text-secondary);
  }
`;

const CharCount = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  text-align: right;
  margin-top: 4px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  ${props => props.variant === 'primary' ? `
    background: var(--gradient-primary);
    color: white;
    box-shadow: 0 0 12px var(--button-primary-glow);

    &:hover:not(:disabled) {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 0 20px var(--button-primary-glow);
    }
  ` : `
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-primary);

    &:hover:not(:disabled) {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 20px;
  font-size: 16px;
  color: var(--text-secondary);
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: #ef4444;
  margin-bottom: 16px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: var(--border-radius-md);
  padding: 12px 16px;
  color: #22c55e;
  margin-bottom: 16px;
  font-size: 14px;
`;

const GroupSettings: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getGroupById, updateGroup, isCreator, myGroups } = useGroup();

  // Form state
  const [group, setGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load group data and check permissions
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId) {
        navigate('/');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const groupData = await getGroupById(groupId);
        if (!groupData) {
          setError('Group not found');
          return;
        }

        // Check if user is creator or moderator
        const creatorStatus = await isCreator(groupId);
        const membership = myGroups.find(m => m.groupId === groupId);
        const isModerator = membership?.role === 'MODERATOR' || membership?.role === 'CREATOR';

        if (!creatorStatus && !isModerator) {
          // Not authorized - redirect to group page
          navigate(`/groups/${groupId}`);
          return;
        }

        setGroup(groupData);
        setDescription(groupData.description || '');
        if (groupData.imageUrl) {
          setImagePreview(groupData.imageUrl);
        }
      } catch (err: any) {
        console.error('Error loading group:', err);
        setError(err.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, getGroupById, isCreator, myGroups, navigate]);

  // Handle image file selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!isValidImageFile(file)) {
      setError('Please select a valid image file (JPG, PNG, GIF, WebP, or HEIC)');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (100MB max)
    if (file.size > 100 * 1024 * 1024) {
      setError('Image file size must be less than 100MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setError(null);
      console.log('Processing group image for upload...');

      // Process image (converts HEIC, compresses large files)
      const processedFile = await processImageForUpload(file, 800, 800, 3 * 1024 * 1024);

      // Clean up previous preview URL
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }

      setImageFile(processedFile);
      setImagePreview(URL.createObjectURL(processedFile));
      console.log('Group image ready for upload');
    } catch (err) {
      console.error('Image processing failed:', err);
      // Fallback: use original file
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!groupId || !group) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let imageUrl = group.imageUrl;

      // Upload new image if selected
      if (imageFile) {
        console.log('Uploading group image...');
        imageUrl = await uploadProfilePicture(imageFile);
        console.log('Group image uploaded:', imageUrl);
      }

      // Update group
      await updateGroup(groupId, {
        description: description.trim(),
        imageUrl: imageUrl || undefined
      });

      setSuccess('Group settings saved successfully!');

      // Navigate back after short delay
      setTimeout(() => {
        navigate(`/groups/${groupId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving group settings:', err);
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingState>Loading group settings...</LoadingState>
      </PageContainer>
    );
  }

  if (!group) {
    return (
      <PageContainer>
        <ErrorMessage>{error || 'Group not found'}</ErrorMessage>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={handleCancel} title="Back to group">
          ←
        </BackButton>
        <PageTitle>Group Settings</PageTitle>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {/* Group Image Section */}
      <FormSection>
        <SectionTitle>Group Image</SectionTitle>
        <ImagePreviewContainer>
          <ImagePreview>
            {imagePreview ? (
              <PreviewImage src={imagePreview} alt="Group" />
            ) : (
              <PlaceholderIcon>👥</PlaceholderIcon>
            )}
          </ImagePreview>
          <ImageInput
            ref={fileInputRef}
            type="file"
            accept="image/*,.heic,.heif"
            onChange={handleImageChange}
          />
          <ChangeImageButton
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {imagePreview ? 'Change Image' : 'Add Image'}
          </ChangeImageButton>
        </ImagePreviewContainer>
      </FormSection>

      {/* Description Section */}
      <FormSection>
        <SectionTitle>Description</SectionTitle>
        <FormLabel htmlFor="description">
          Tell people what this group is about
        </FormLabel>
        <TextArea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter a description for your group..."
          maxLength={1000}
          disabled={saving}
        />
        <CharCount>{description.length} / 1000</CharCount>
      </FormSection>

      {/* Action Buttons */}
      <ButtonContainer>
        <Button variant="secondary" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </ButtonContainer>
    </PageContainer>
  );
};

export default GroupSettings;
