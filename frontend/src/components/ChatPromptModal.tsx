import React, { useEffect, useState } from 'react';
import './ConfirmationModal.css';

interface ChatPromptModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

/**
 * Text-input variant of ConfirmationModal. Replaces window.prompt(), which is blocked in
 * Capacitor WebViews and unstyled everywhere else.
 */
const ChatPromptModal: React.FC<ChatPromptModalProps> = ({
  isOpen,
  title,
  message,
  label,
  defaultValue = '',
  placeholder,
  confirmText = 'Submit',
  cancelText = 'Cancel',
  icon,
  isLoading = false,
  onClose,
  onSubmit
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isLoading) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await onSubmit(value.trim());
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <form
        className="modal-content confirmation-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-header">
          <h2>
            {icon && <span className="modal-icon">{icon}</span>}
            {title}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="confirmation-message">{message}</p>
          {label && <label htmlFor="chat-prompt-input" className="chat-prompt-label">{label}</label>}
          <textarea
            id="chat-prompt-input"
            className="chat-prompt-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={3}
            autoFocus
            disabled={isLoading}
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </button>
          <button type="submit" className="btn-confirm btn-primary" disabled={isLoading}>
            {isLoading ? 'Sending...' : confirmText}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPromptModal;
