import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { isOnlyEmojis, generateUniqueSlug } from '../utils/emojiUtils';
import './FamilyGroupCreateForm.css';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

interface FamilyGroupCreateFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
}

const FamilyGroupCreateForm: React.FC<FamilyGroupCreateFormProps> = ({ onSuccess, onCancel }) => {
  const [nameType, setNameType] = useState<'text' | 'emoji'>('text');
  const [textName, setTextName] = useState('');
  const [emojiName, setEmojiName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Curated list of family-friendly emojis
  const familyEmojis = [
    '❤️', '💚', '💛', '💙', '🧡', '💜', '🖤', '🤍', '💕', '💖',
    '🍌', '🍎', '🍊', '🍓', '🍉', '🥭', '🍑', '🍒', '🍇', '🥝',
    '🐵', '🐶', '🐱', '🐰', '🐻', '🐨', '🦊', '🐯', '🦁', '🐮',
    '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '☁️', '🌺', '🌻',
    '🏠', '💒', '🎂', '🎉', '🎈', '🎁', '🕯️', '🦋', '🐝', '🌿'
  ];

  // Count visual emojis (helper function)
  const countVisualEmojis = (str: string): number => {
    if (!str) return 0;
    // Count actual visible emoji characters (accounting for multi-codepoint emojis)
    const emojiMatches = str.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{FE0F}]/gu);
    if (!emojiMatches) return 0;
    // Filter out modifier characters (zero-width joiner, variation selector)
    return emojiMatches.filter(e => !/[\u{200D}\u{FE0F}]/u.test(e)).length;
  };

  const handleEmojiClick = (emoji: string) => {
    setEmojiName(prev => {
      const newValue = prev + emoji;
      // Limit to reasonable number of emojis (e.g., 10)
      // Each emoji can be 2-4 characters, so limit by visual count
      if (countVisualEmojis(newValue) >= 10) return prev;
      return newValue;
    });
    setError(null);
  };

  const handleRemoveLastEmoji = () => {
    setEmojiName(prev => {
      if (prev.length === 0) return prev;
      // Try to remove the last emoji sequence
      // Most emojis are 2-4 characters, but some can be longer
      // Simple approach: try removing 1-4 characters from the end
      for (let i = 4; i >= 1; i--) {
        const candidate = prev.slice(0, -i);
        const removed = prev.slice(-i);
        // Check if what we removed is a valid emoji pattern
        if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(removed)) {
          return candidate;
        }
      }
      // Fallback: just remove last character
      return prev.slice(0, -1);
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        setError('Image size must be less than 100MB');
        return;
      }

      setLogoFile(file);
      setError(null); // Clear any previous errors
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalName = nameType === 'text' ? textName.trim() : emojiName.trim();

    if (!finalName) {
      setError('Family group name is required');
      return;
    }

    // Validate emoji names
    if (nameType === 'emoji') {
      if (!isOnlyEmojis(finalName)) {
        setError('Please use only emojis for emoji-based names. Remove any text or special characters.');
        return;
      }
      if (countVisualEmojis(finalName) < 1) {
        setError('Please add at least one emoji');
        return;
      }
      if (countVisualEmojis(finalName) > 10) {
        setError('Please use 10 emojis or fewer');
        return;
      }
    }

    // Validate text names
    if (nameType === 'text') {
      if (finalName.length < 2) {
        setError('Family group name must be at least 2 characters');
        return;
      }
      if (finalName.length > 255) {
        setError('Family group name must be 255 characters or less');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const isEmojiName = nameType === 'emoji';
      let slug = '';
      
      if (isEmojiName) {
        // Generate UUID-based slug for emoji names
        slug = generateUniqueSlug();
      } else {
        // Normal slug generation for text names
        slug = finalName
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
        
        if (!slug) {
          throw new Error('Could not generate a valid slug from the name');
        }
      }
      
      const formData = new FormData();
      formData.append('name', finalName);
      formData.append('slug', slug);
      formData.append('type', 'FAMILY');
      formData.append('description', `Family group created by user`);
      
      // Append logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await axios.post(
        `${API_BASE_URL}/organizations/family-group`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (onSuccess) {
        onSuccess(response.data);
      }

      // Reset form
      setTextName('');
      setEmojiName('');
      setNameType('text');
      setLogoFile(null);
      setLogoPreview(null);
    } catch (err: any) {
      console.error('Error creating family group:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to create organizations.');
      } else if (err.response?.status === 409 || err.response?.data?.message?.includes('slug')) {
        // Retry with new slug if slug conflict (shouldn't happen with UUID, but just in case)
        setError('This family group name is already taken. Please try a different name or try again.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError(err.message || 'Failed to create family group. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>🏠 Create Family Group</FormTitle>
      
      <InfoMessage>
        <InfoIcon>💡</InfoIcon>
        <div>
          <strong>Create Your Family Group</strong>
          <p>Start a family group to connect with your extended family! You can use regular text or choose emojis as your family name. Perfect for families with multiple last names!</p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
            <strong>Example:</strong> Instead of "The Sills Family", you could use "❤️🍌🐵" to represent all family members regardless of last name.
          </p>
        </div>
      </InfoMessage>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Choose Name Type *</Label>
          <NameTypeSelector>
            <NameTypeButton
              type="button"
              active={nameType === 'text'}
              onClick={() => {
                setNameType('text');
                setError(null);
              }}
              disabled={isSubmitting}
            >
              📝 Text Name
            </NameTypeButton>
            <NameTypeButton
              type="button"
              active={nameType === 'emoji'}
              onClick={() => {
                setNameType('emoji');
                setError(null);
              }}
              disabled={isSubmitting}
            >
              😀 Emoji Name
            </NameTypeButton>
          </NameTypeSelector>
        </FormGroup>

        {nameType === 'text' ? (
          <FormGroup>
            <Label htmlFor="textName">Family Group Name *</Label>
            <Input
              type="text"
              id="textName"
              value={textName}
              onChange={(e) => {
                setTextName(e.target.value);
                setError(null);
              }}
              placeholder="e.g., The Sills Family"
              required
              disabled={isSubmitting}
              maxLength={255}
            />
            <HelpText>Enter a name for your family group using letters, numbers, and spaces</HelpText>
          </FormGroup>
        ) : (
          <>
            <FormGroup>
              <Label>Emoji Family Name *</Label>
              <EmojiDisplayContainer>
                <EmojiDisplay>
                  {emojiName || <PlaceholderText>Select emojis below...</PlaceholderText>}
                </EmojiDisplay>
                {emojiName && (
                  <ClearEmojiButton
                    type="button"
                    onClick={() => {
                      setEmojiName('');
                      setError(null);
                    }}
                    disabled={isSubmitting}
                  >
                    Clear All
                  </ClearEmojiButton>
                )}
              </EmojiDisplayContainer>
              <HelpText>Click emojis below to build your family name (up to 10 emojis)</HelpText>
              {emojiName && (
                <EmojiCount>
                  {countVisualEmojis(emojiName)} / 10 emojis
                </EmojiCount>
              )}
            </FormGroup>

            <FormGroup>
              <Label>Select Emojis</Label>
              <EmojiPickerContainer>
                <EmojiGrid>
                  {familyEmojis.map((emoji, index) => (
                    <EmojiButton
                      key={index}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      disabled={isSubmitting || countVisualEmojis(emojiName) >= 10}
                      title={`Add ${emoji}`}
                    >
                      {emoji}
                    </EmojiButton>
                  ))}
                </EmojiGrid>
              </EmojiPickerContainer>
              {emojiName && (
                <RemoveLastButton
                  type="button"
                  onClick={handleRemoveLastEmoji}
                  disabled={isSubmitting}
                >
                  Remove Last Emoji
                </RemoveLastButton>
              )}
            </FormGroup>
          </>
        )}

        <FormGroup>
          <Label htmlFor="logo">Organization Logo / Profile Picture</Label>
          <LogoUploadContainer>
            {logoPreview ? (
              <LogoPreviewWrapper>
                <LogoPreview src={logoPreview} alt="Logo preview" />
                <RemoveLogoButton type="button" onClick={handleRemoveLogo} disabled={isSubmitting}>
                  ✕
                </RemoveLogoButton>
              </LogoPreviewWrapper>
            ) : (
              <LogoUploadArea>
                <LogoUploadInput
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={isSubmitting}
                />
                <LogoUploadLabel htmlFor="logo">
                  <UploadIcon>📷</UploadIcon>
                  <span>Click to upload logo</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    PNG, JPG, GIF up to 5MB
                  </span>
                </LogoUploadLabel>
              </LogoUploadArea>
            )}
          </LogoUploadContainer>
        </FormGroup>

        <ButtonGroup>
          {onCancel && (
            <CancelButton type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </CancelButton>
          )}
          <SubmitButton 
            type="submit" 
            disabled={isSubmitting || !(textName.trim() || emojiName.trim())}
          >
            {isSubmitting ? 'Creating...' : 'Create Family Group'}
          </SubmitButton>
        </ButtonGroup>
      </Form>
    </FormContainer>
  );
};

// Styled Components
const FormContainer = styled.div`
  background: var(--bg-tertiary, white);
  border-radius: var(--border-radius-lg, 8px);
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
  color: var(--text-primary, #1a1a1a);
`;

const FormTitle = styled.h2`
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
`;

const InfoMessage = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #e8f4fd;
  border: 1px solid #b3d9f2;
  border-radius: 6px;
  margin-bottom: 20px;
  
  div {
    flex: 1;
    
    strong {
      display: block;
      color: #1565c0;
      font-size: 15px;
      margin-bottom: 6px;
    }
    
    p {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }
  }
`;

const InfoIcon = styled.span`
  font-size: 28px;
  line-height: 1;
  flex-shrink: 0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
`;

const HelpText = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary, #666);
  margin-top: 4px;
`;

const Input = styled.input`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  transition: border-color 0.2s;
  background: var(--bg-secondary, white);
  color: var(--text-primary, #333);

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #4a90e2);
  }

  &:disabled {
    background: var(--bg-tertiary, #f5f5f5);
    cursor: not-allowed;
  }
`;

const NameTypeSelector = styled.div`
  display: flex;
  gap: 12px;
`;

const NameTypeButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border: 2px solid ${props => props.active ? 'var(--accent-primary, #4a90e2)' : 'var(--border-primary, #ddd)'};
  border-radius: var(--border-radius-md, 4px);
  background: ${props => props.active ? 'var(--accent-primary, #4a90e2)' : 'var(--bg-secondary, white)'};
  color: ${props => props.active ? 'white' : 'var(--text-primary, #333)'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #4a90e2);
    background: ${props => props.active ? 'var(--accent-primary, #4a90e2)' : 'var(--bg-tertiary, #f5f5f5)'};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmojiDisplayContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const EmojiDisplay = styled.div`
  flex: 1;
  padding: 16px;
  border: 2px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  background: var(--bg-secondary, white);
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  line-height: 1.2;
  word-break: break-all;
  text-align: center;
`;

const PlaceholderText = styled.span`
  color: var(--text-tertiary, #999);
  font-size: 14px;
`;

const ClearEmojiButton = styled.button`
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  background: var(--bg-secondary, white);
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary, #f5f5f5);
    border-color: var(--accent-primary, #4a90e2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const EmojiCount = styled.div`
  font-size: 12px;
  color: var(--text-secondary, #666);
  text-align: right;
  margin-top: -4px;
`;

const EmojiPickerContainer = styled.div`
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  padding: 16px;
  background: var(--bg-secondary, white);
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 8px;
`;

const EmojiButton = styled.button`
  padding: 12px;
  font-size: 24px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  background: var(--bg-secondary, white);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary, #f5f5f5);
    border-color: var(--accent-primary, #4a90e2);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

const RemoveLastButton = styled.button`
  margin-top: 8px;
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  background: var(--bg-secondary, white);
  color: var(--text-primary, #333);
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;

  &:hover:not(:disabled) {
    background: var(--bg-tertiary, #f5f5f5);
    border-color: var(--accent-primary, #4a90e2);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: var(--border-radius-md, 4px);
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled(Button)`
  background: var(--accent-primary, #4a90e2);
  color: white;

  &:hover:not(:disabled) {
    background: var(--accent-primary-dark, #357abd);
  }
`;

const CancelButton = styled(Button)`
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #666);
  border: 1px solid var(--border-primary, #ddd);

  &:hover:not(:disabled) {
    background: var(--bg-tertiary, #e5e5e5);
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error, #fcc);
  border-radius: var(--border-radius-md, 4px);
  color: var(--error, #c33);
  font-size: 14px;
  margin-bottom: 16px;
`;

const LogoUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LogoUploadArea = styled.div`
  position: relative;
  border: 2px dashed var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 4px);
  padding: 24px;
  text-align: center;
  background: var(--bg-secondary, #f9f9f9);
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    border-color: var(--accent-primary, #4a90e2);
    background: var(--bg-tertiary, #f0f0f0);
  }
`;

const LogoUploadInput = styled.input`
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
  z-index: -1;
`;

const LogoUploadLabel = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--text-primary, #333);

  span {
    font-size: 14px;
    color: var(--text-secondary, #666);
  }
`;

const UploadIcon = styled.span`
  font-size: 32px;
  line-height: 1;
`;

const LogoPreviewWrapper = styled.div`
  position: relative;
  display: inline-block;
  max-width: 200px;
  border-radius: var(--border-radius-md, 4px);
  overflow: hidden;
  border: 1px solid var(--border-primary, #ddd);
`;

const LogoPreview = styled.img`
  width: 100%;
  height: auto;
  display: block;
  max-height: 200px;
  object-fit: contain;
`;

const RemoveLogoButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.9);
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default FamilyGroupCreateForm;

