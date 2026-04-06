import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// import { create } from 'zustand';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Zustand store for toast management
interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Temporary mock store to prevent runtime errors
export const useToastStore = (): ToastStore => ({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
  clearAll: () => {},
});

// Toast hook for easy usage
export const useToast = () => {
  const { addToast } = useToastStore();

  const toast = {
    success: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'success', title, description, ...options }),
    error: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'error', title, description, ...options }),
    warning: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'warning', title, description, ...options }),
    info: (title: string, description?: string, options?: Partial<Toast>) =>
      addToast({ type: 'info', title, description, ...options }),
  };

  return { toast };
};

// Individual toast component
export interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export const ToastItem = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ toast, onRemove }, ref) => {
    const [progress, setProgress] = React.useState(100);

    useEffect(() => {
      if (toast.duration && toast.duration > 0) {
        const interval = setInterval(() => {
          setProgress((prev) => {
            const decrement = 100 / (toast.duration! / 100);
            return Math.max(0, prev - decrement);
          });
        }, 100);

        return () => clearInterval(interval);
      }
    }, [toast.duration]);

    const getToastStyles = () => {
      switch (toast.type) {
        case 'success':
          return {
            bg: 'bg-green-50 border-green-200',
            text: 'text-green-800',
            icon: (
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ),
            progressBar: 'bg-green-600'
          };
        case 'error':
          return {
            bg: 'bg-red-50 border-red-200',
            text: 'text-red-800',
            icon: (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ),
            progressBar: 'bg-red-600'
          };
        case 'warning':
          return {
            bg: 'bg-amber-50 border-amber-200',
            text: 'text-amber-800',
            icon: (
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ),
            progressBar: 'bg-amber-600'
          };
        case 'info':
        default:
          return {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            icon: (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            progressBar: 'bg-blue-600'
          };
      }
    };

    const styles = getToastStyles();

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 300, scale: 0.8 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
        className={`
          relative max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
          ${styles.bg}
        `}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {styles.icon}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-medium ${styles.text}`}>
                {toast.title}
              </p>
              {toast.description && (
                <p className={`mt-1 text-sm ${styles.text} opacity-75`}>
                  {toast.description}
                </p>
              )}
              {toast.action && (
                <div className="mt-3">
                  <button
                    onClick={toast.action.onClick}
                    className={`text-sm font-medium hover:underline ${styles.text}`}
                  >
                    {toast.action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => onRemove(toast.id)}
                className={`inline-flex ${styles.text} hover:opacity-75 focus:outline-none`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        {toast.duration && toast.duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black bg-opacity-10">
            <motion.div
              className={`h-full ${styles.progressBar}`}
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        )}
      </motion.div>
    );
  }
);

ToastItem.displayName = 'ToastItem';

// Toast container that renders all toasts
export const ToastContainer = React.forwardRef<HTMLDivElement, { className?: string }>((
  { className = '' }, 
  ref
) => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      ref={ref}
      className={`fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none ${className}`}
      style={{ maxWidth: '420px' }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={removeToast}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});

ToastContainer.displayName = 'ToastContainer';