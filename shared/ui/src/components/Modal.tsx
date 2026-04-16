import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { create } from 'zustand';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ 
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    closable = true,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    className = ''
  }, ref) => {
    
    // Handle escape key
    useEffect(() => {
      if (!closeOnEscape || !isOpen) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [isOpen]);

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return 'max-w-md';
        case 'md':
          return 'max-w-lg';
        case 'lg':
          return 'max-w-2xl';
        case 'xl':
          return 'max-w-4xl';
        case 'full':
          return 'max-w-[95vw] max-h-[95vh]';
        default:
          return 'max-w-lg';
      }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-surface-inverse/60 backdrop-blur-sm"
              onClick={handleBackdropClick}
            />

            {/* Modal container */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                ref={ref}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
                className={`
                  relative w-full bg-surface-card rounded-xl shadow-elevated
                  ${getSizeStyles()}
                  ${className}
                `}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {(title || closable) && (
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                      {title && (
                        <h2 className="text-2xl font-display font-semibold text-text-primary">
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p className="mt-2 text-sm text-text-secondary">
                          {description}
                        </p>
                      )}
                    </div>
                    {closable && (
                      <button
                        onClick={onClose}
                        className="ml-4 text-text-muted hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary rounded-lg p-2 transition-colors duration-200"
                      >
                        <span className="sr-only">Close</span>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className={`${title || closable ? 'p-6' : 'p-8'} ${size === 'full' ? 'overflow-y-auto' : ''}`}>
                  {children}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    );
  }
);

Modal.displayName = 'Modal';

// Modal sub-components for better composition
export const ModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`border-b border-gray-200 px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

ModalHeader.displayName = 'ModalHeader';

export const ModalBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`px-6 py-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

ModalBody.displayName = 'ModalBody';

export const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

ModalFooter.displayName = 'ModalFooter';

// Modal store for global modal management (optional)
interface ModalStore {
  modals: Array<{ id: string; component: React.ReactNode }>;
  openModal: (id: string, component: React.ReactNode) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
}

// Temporary mock store to prevent runtime errors
export const useModalStore = (): ModalStore => ({
  modals: [],
  openModal: () => {},
  closeModal: () => {},
  closeAllModals: () => {},
});

// Hook for easier modal usage
export const useModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const openModal = React.useCallback(() => setIsOpen(true), []);
  const closeModal = React.useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    openModal,
    closeModal
  };
};

// Confirmation modal component
export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmModal = React.forwardRef<HTMLDivElement, ConfirmModalProps>(
  ({ 
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary'
  }, ref) => {
    
    const handleConfirm = () => {
      onConfirm();
      onClose();
    };

    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">{message}</p>
          
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-subtle transition-colors duration-200"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                ${variant === 'danger' 
                  ? 'bg-brand-danger text-text-inverse hover:bg-brand-danger/90' 
                  : 'bg-brand-primary text-text-inverse hover:bg-brand-primary/90'
                }
              `}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </Modal>
    );
  }
);

ConfirmModal.displayName = 'ConfirmModal';
