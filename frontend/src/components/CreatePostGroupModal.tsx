import React, { useState } from 'react';
import { useGroup } from '../contexts/GroupContext';
import styled from 'styled-components';
import { uploadMediaDirect } from '../services/postApi';
import { processImageForUpload } from '../utils/imageUtils';

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

const ImageUploadSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ImagePreview = styled.div`
  position: relative;
  width: 100%;
  max-width: 200px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
  border: 2px solid var(--border-primary);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: auto;
  max-height: 200px;
  object-fit: cover;
  display: block;
`;

const RemoveImageBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);

  &:hover {
    background: rgba(220, 53, 69, 1);
    transform: scale(1.1);
  }
`;

const ImageUploadLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
`;

const ImageUploadButton = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px dashed var(--border-primary);
  border-radius: var(--border-radius-md);
  transition: all var(--transition-base);
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    color: var(--text-primary);
  }
`;

const UploadIcon = styled.span`
  font-size: 24px;
`;

const UploadText = styled.span`
  font-weight: 500;
`;

const ImageHint = styled.small`
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
`;

const ChangeImageBtn = styled.button`
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-primary);
  border-radius: var(--border-radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition-base);
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary);
    border-color: var(--accent-primary);
    color: var(--text-primary);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);

  if (!isOpen) return null;

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

    const hasValidType = fileType.startsWith('image/') || validImageTypes.includes(fileType);
    const hasValidExtension = validImageExtensions.some(ext => fileName.endsWith(ext));

    const isLikelyImage = hasValidType || hasValidExtension ||
      (fileType === '' && hasValidExtension) ||
      (fileType === 'application/octet-stream' && hasValidExtension);

    if (!isLikelyImage) {
      setError('Please select an image file (JPG, PNG, GIF, WebP, or HEIC)');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setError('Image size must be less than 100MB');
      return;
    }

    setError(null);
    setImageUploading(true);

    try {
      const userAgent = navigator.userAgent;
      const isIPhone = /iPhone|iPod/.test(userAgent);

      let processedFile: File;
      if (isIPhone) {
        // iPhone Safari has issues with processed files - use original
        processedFile = file;
      } else {
        // Process on other devices
        if (file.size > 5 * 1024 * 1024) {
          try {
            processedFile = await Promise.race([
              processImageForUpload(file, 1920, 1920, 5 * 1024 * 1024),
              new Promise<File>((_, reject) =>
                setTimeout(() => reject(new Error('Processing timeout')), 25000)
              )
            ]);
          } catch {
            processedFile = file;
          }
        } else {
          processedFile = await processImageForUpload(file, 1920, 1920, 5 * 1024 * 1024);
        }
      }

      setSelectedImage(processedFile);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(processedFile);
    } catch (err: any) {
      console.error('Image processing failed:', err);
      // Fallback: use original file
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    const fileInput = document.getElementById('group-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

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

      // Upload image if selected
      let imageUrl: string | undefined;
      if (selectedImage) {
        try {
          const uploadedUrls = await uploadMediaDirect([selectedImage], 'groups');
          if (uploadedUrls && uploadedUrls.length > 0) {
            imageUrl = uploadedUrls[0];
          }
        } catch (uploadError: any) {
          console.error('Failed to upload group image:', uploadError);
          setError('Failed to upload image. Please try again.');
          setLoading(false);
          return;
        }
      }

      const groupData = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: 'PUBLIC', // All new groups are PUBLIC - backend expects 'type' not 'visibility'
        tags: tags.length > 0 ? tags : undefined,
        imageUrl,
      };

      await createGroup(groupData);
      setSuccess('Group created successfully!');

      // Reset form
      setName('');
      setDescription('');
      setTagsInput('');
      setSelectedImage(null);
      setImagePreview(null);

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
    if (!loading && !imageUploading) {
      setName('');
      setDescription('');
      setTagsInput('');
      setSelectedImage(null);
      setImagePreview(null);
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

          <FormGroup>
            <Label>Group Image (Optional)</Label>
            <ImageUploadSection>
              <input
                id="group-image-input"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleImageSelect}
                disabled={loading || imageUploading}
                style={{ display: 'none' }}
              />
              {imagePreview ? (
                <>
                  <ImagePreview>
                    <PreviewImage src={imagePreview} alt="Group preview" />
                    <RemoveImageBtn
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={loading || imageUploading}
                      title="Remove image"
                    >
                      ✕
                    </RemoveImageBtn>
                  </ImagePreview>
                  <ChangeImageBtn
                    type="button"
                    onClick={() => document.getElementById('group-image-input')?.click()}
                    disabled={loading || imageUploading}
                  >
                    {imageUploading ? 'Processing...' : 'Change Image'}
                  </ChangeImageBtn>
                </>
              ) : (
                <ImageUploadLabel htmlFor="group-image-input">
                  <ImageUploadButton>
                    <UploadIcon>📷</UploadIcon>
                    <UploadText>{imageUploading ? 'Processing...' : 'Upload Image'}</UploadText>
                  </ImageUploadButton>
                  <ImageHint>JPG, PNG, GIF, WebP, or HEIC • Max 10MB</ImageHint>
                </ImageUploadLabel>
              )}
            </ImageUploadSection>
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
              disabled={loading || imageUploading || !name.trim()}
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

