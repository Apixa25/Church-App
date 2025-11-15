import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8083/api';

interface OrganizationCreateFormProps {
  onSuccess?: (organization: any) => void;
  onCancel?: () => void;
}

const OrganizationCreateForm: React.FC<OrganizationCreateFormProps> = ({ onSuccess, onCancel }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState<'CHURCH' | 'MINISTRY' | 'NONPROFIT'>('CHURCH');
  const [description, setDescription] = useState('');
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
      const response = await axios.post(
        `${API_BASE_URL}/organizations`,
        {
          name: name.trim(),
          slug: slug.trim(),
          type,
          metadata: description.trim() ? { description: description.trim() } : {}
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
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
            <option value="CHURCH">Church</option>
            <option value="MINISTRY">Ministry</option>
            <option value="NONPROFIT">Nonprofit</option>
          </Select>
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

const ErrorMessage = styled.div`
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
  font-size: 14px;
  margin-bottom: 16px;
`;

export default OrganizationCreateForm;
