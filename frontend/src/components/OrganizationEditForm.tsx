import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { getApiUrl } from '../config/runtimeConfig';

const API_BASE_URL = getApiUrl();

interface Organization {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  tier: string;
  createdAt: string;
  logoUrl?: string;
  memberCount?: number;
  primaryMemberCount?: number;
}

interface OrganizationEditFormProps {
  organization: Organization;
  onSuccess?: (organization: Organization) => void;
  onCancel?: () => void;
}

const OrganizationEditForm: React.FC<OrganizationEditFormProps> = ({ 
  organization, 
  onSuccess, 
  onCancel 
}) => {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set initial preview from existing logo
    if (organization.logoUrl) {
      setLogoPreview(organization.logoUrl);
    }
  }, [organization.logoUrl]);

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
    // Reset preview to original logo if it exists
    setLogoPreview(organization.logoUrl || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!logoFile) {
      setError('Please select a new logo image to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Use FormData for multipart/form-data
      const formData = new FormData();
      formData.append('name', organization.name);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const response = await axios.put(
        `${API_BASE_URL}/organizations/${organization.id}`,
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
    } catch (err: any) {
      console.error('Error updating organization:', err);
      if (err.response?.status === 403) {
        setError('You do not have permission to update organizations. System admin access required.');
      } else {
        setError(err.response?.data?.message || 'Failed to update organization. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClick={onCancel}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Edit Organization</ModalTitle>
          <CloseButton onClick={onCancel}>×</CloseButton>
        </ModalHeader>

        <FormContainer>
          <OrgInfo>
            <OrgName>{organization.name}</OrgName>
            <OrgSlug>{organization.slug}</OrgSlug>
          </OrgInfo>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Form onSubmit={handleSubmit}>
            <FormGroup>
              <Label htmlFor="logo">Organization Logo / Profile Picture</Label>
              <LogoUploadContainer>
                {logoFile ? (
                  // Show new logo preview when a file is selected
                  <NewLogoPreview>
                    <LogoPreview src={logoPreview || ''} alt="New logo preview" />
                    <RemoveLogoButton type="button" onClick={handleRemoveLogo} disabled={isSubmitting}>
                      ✕
                    </RemoveLogoButton>
                    <NewLogoLabel>New Logo Preview</NewLogoLabel>
                    <ChangeLogoHint>
                      <LogoUploadInput
                        type="file"
                        id="logo"
                        accept="image/*"
                        onChange={handleLogoChange}
                        disabled={isSubmitting}
                      />
                      <ChangeLogoButton type="button" onClick={() => document.getElementById('logo')?.click()} disabled={isSubmitting}>
                        📷 Choose Different Image
                      </ChangeLogoButton>
                    </ChangeLogoHint>
                  </NewLogoPreview>
                ) : logoPreview ? (
                  // Show current logo with change option
                  <>
                    <LogoPreviewWrapper>
                      <LogoPreview src={logoPreview} alt="Current logo" />
                    </LogoPreviewWrapper>
                    <ChangeLogoHint>
                      <LogoUploadInput
                        type="file"
                        id="logo"
                        accept="image/*"
                        onChange={handleLogoChange}
                        disabled={isSubmitting}
                      />
                      <ChangeLogoButton type="button" onClick={() => document.getElementById('logo')?.click()} disabled={isSubmitting}>
                        📷 Change Logo
                      </ChangeLogoButton>
                    </ChangeLogoHint>
                  </>
                ) : (
                  // Show upload area when no logo exists
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
              <SubmitButton type="submit" disabled={isSubmitting || !logoFile}>
                {isSubmitting ? 'Updating...' : logoFile ? 'Update Logo' : 'Select Logo to Update'}
              </SubmitButton>
            </ButtonGroup>
          </Form>
        </FormContainer>
      </ModalContent>
    </ModalOverlay>
  );
};

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
  padding: 20px;
`;

const ModalContent = styled.div`
  background: var(--bg-elevated, #ffffff);
  border-radius: var(--border-radius-md, 12px);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-primary, #e5e7eb);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-primary, #e5e7eb);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 32px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: var(--bg-tertiary, #f5f5f5);
    color: var(--text-primary, #1a1a1a);
  }
`;

const FormContainer = styled.div`
  padding: 24px;
`;

const OrgInfo = styled.div`
  margin-bottom: 24px;
  padding: 16px;
  background: var(--bg-tertiary, #f9fafb);
  border-radius: var(--border-radius-sm, 8px);
  border: 1px solid var(--border-primary, #e5e7eb);
`;

const OrgName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #1a1a1a);
  margin-bottom: 4px;
`;

const OrgSlug = styled.div`
  font-size: 14px;
  color: var(--text-secondary, #666);
  font-family: 'Monaco', 'Courier New', monospace;
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
  border-radius: var(--border-radius-sm, 6px);
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SubmitButton = styled(Button)`
  background: var(--gradient-primary, linear-gradient(135deg, #5b7fff 0%, #8b5cf6 100%));
  color: white;
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));

  &:hover:not(:disabled) {
    box-shadow: var(--shadow-md, 0 4px 6px rgba(0, 0, 0, 0.1));
    transform: translateY(-1px);
  }
`;

const CancelButton = styled(Button)`
  background: var(--bg-tertiary, #f5f5f5);
  color: var(--text-secondary, #666);

  &:hover:not(:disabled) {
    background: var(--bg-secondary, #e5e5e5);
  }
`;

const ErrorMessage = styled.div`
  padding: 12px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid var(--error, #ef4444);
  border-radius: var(--border-radius-sm, 6px);
  color: var(--error, #ef4444);
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
  border: 2px dashed var(--border-primary, #ddd);
  border-radius: var(--border-radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-tertiary, #fafafa);
  gap: 8px;

  &:hover {
    border-color: var(--accent-primary, #5b7fff);
    background: rgba(91, 127, 255, 0.05);
  }

  span {
    font-size: 14px;
    color: var(--text-secondary, #666);
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
  max-width: 300px;
  max-height: 300px;
  border-radius: var(--border-radius-md, 8px);
  border: 1px solid var(--border-primary, #ddd);
  object-fit: contain;
  background: var(--bg-tertiary, #fafafa);
  padding: 8px;
`;

const RemoveLogoButton = styled.button`
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--error, #ff4444);
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
  box-shadow: var(--shadow-sm, 0 2px 4px rgba(0,0,0,0.2));
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #cc0000;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ChangeLogoHint = styled.div`
  margin-top: 12px;
  display: flex;
  justify-content: center;
`;

const ChangeLogoButton = styled.button`
  padding: 8px 16px;
  font-size: 14px;
  background: var(--accent-primary, #5b7fff);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm, 6px);
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--accent-primary-dark, #4a6fe8);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const NewLogoPreview = styled.div`
  position: relative;
  display: inline-block;
  margin-top: 12px;
`;

const NewLogoLabel = styled.div`
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary, #666);
  font-style: italic;
`;

export default OrganizationEditForm;

