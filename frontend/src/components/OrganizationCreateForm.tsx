import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

interface OrganizationCreateFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
}

const OrganizationCreateForm: React.FC<OrganizationCreateFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'CHURCH' | 'MINISTRY' | 'NONPROFIT' | 'FAMILY' | 'GENERAL'>('CHURCH');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);

  // Auto-generate slug from name
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    // Auto-generate slug only if user hasn't manually edited it
    if (!slugTouched) {
      setSlug(generateSlug(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugTouched(true);
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
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

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    if (!slug.trim()) {
      setError('Organization slug is required');
      return;
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Use FormData for multipart/form-data
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('slug', slug.trim());
      formData.append('type', type);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await axios.post(
        `${API_BASE_URL}/organizations`,
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
      setName('');
      setSlug('');
      setType('CHURCH');
      setDescription('');
      setLogoFile(null);
      setLogoPreview(null);
      setSlugTouched(false);
    } catch (err: any) {
      console.error('Error creating organization:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to create organizations. System admin access required.');
      } else if (err.response?.status === 409 || err.response?.data?.message?.includes('slug')) {
        setError('This organization slug is already taken. Please choose a different one.');
      } else {
        setError(err.response?.data?.message || 'Failed to create organization. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormContainer>
      <FormTitle>Create New Organization</FormTitle>
      
      <InfoMessage>
        <InfoIcon>💡</InfoIcon>
        <div>
          <strong>You will become the Organization Admin</strong>
          <p>As the creator, you'll automatically receive full administrative control over this organization. 
          You can manage members, content, donations, and all organization settings.</p>
        </div>
      </InfoMessage>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g., First Baptist Church"
            required
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="slug">
            URL Slug *
            <HelpText>This will be used in URLs (e.g., yourapp.com/org/{slug || 'your-org'})</HelpText>
          </Label>
          <Input
            type="text"
            id="slug"
            value={slug}
            onChange={handleSlugChange}
            placeholder="e.g., first-baptist-church"
            pattern="[a-z0-9-]+"
            required
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="type">Organization Type *</Label>
          <Select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            disabled={isSubmitting}
          >
            <option value="CHURCH">⛪ Church</option>
            <option value="MINISTRY">🙏 Ministry</option>
            <option value="NONPROFIT">💝 Non-Profit</option>
            <option value="FAMILY">🏠 Family</option>
            <option value="GENERAL">🌐 General</option>
          </Select>
          <HelpText>
            {type === 'FAMILY' 
              ? '🏠 Family organizations are for family groups - users can set this as their Family Primary'
              : '⛪ Church, Ministry, Non-Profit, and General can be set as a user\'s Church Primary'}
          </HelpText>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">Description (Optional)</Label>
          <TextArea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe this organization..."
            rows={3}
            disabled={isSubmitting}
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="logo">Organization Logo (Optional)</Label>
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
          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Organization'}
          </SubmitButton>
        </ButtonGroup>
      </Form>
    </FormContainer>
  );
};

const FormContainer = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 600px;
  margin: 0 auto;
`;

const FormTitle = styled.h2`
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #1a1a1a;
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
  color: #333;
`;

const HelpText = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: #666;
  margin-top: 4px;
`;

const Input = styled.input`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }

  &:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #4a90e2;
  }

  &:disabled {
    background: #f5f5f5;
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
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled(Button)`
  background: #4a90e2;
  color: white;

  &:hover:not(:disabled) {
    background: #357abd;
  }
`;

const CancelButton = styled(Button)`
  background: #f5f5f5;
  color: #666;

  &:hover:not(:disabled) {
    background: #e5e5e5;
  }
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
      margin: 0;
      font-size: 13px;
      color: #555;
      line-height: 1.5;
    }
  }
`;

const InfoIcon = styled.span`
  font-size: 28px;
  line-height: 1;
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
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
  justify-content: center;
  padding: 24px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
  gap: 8px;

  &:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  span {
    font-size: 14px;
    color: #666;
  }
`;

const UploadIcon = styled.span`
  font-size: 32px;
  margin-bottom: 8px;
`;

const LogoPreviewWrapper = styled.div`
  position: relative;
  display: inline-block;
`;

const LogoPreview = styled.img`
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #ddd;
  object-fit: contain;
  background: #fafafa;
  padding: 8px;
`;

const RemoveLogoButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #cc0000;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default OrganizationCreateForm;
