import React from 'react';
import styled from 'styled-components';
import OrganizationCreateForm from './OrganizationCreateForm';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (organization: any) => void;
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2200;
  padding: 16px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 720px;
  max-height: 92vh;
  overflow-y: auto;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
`;

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const handleSuccess = (organization: any) => {
    if (onSuccess) {
      onSuccess(organization);
    }
    onClose();
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <OrganizationCreateForm
          onCancel={onClose}
          onSuccess={handleSuccess}
          createEndpoint="/organizations/user-create"
          permissionErrorMessage="You need to be signed in to create an organization."
        />
      </ModalContent>
    </ModalOverlay>
  );
};

export default CreateOrganizationModal;
