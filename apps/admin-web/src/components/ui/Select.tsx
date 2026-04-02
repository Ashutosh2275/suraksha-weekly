import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onChange?: (value: string) => void;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ 
    options = [],
    value,
    defaultValue,
    placeholder = 'Select an option',
    label,
    error,
    helper,
    disabled = false,
    required = false,
    size = 'md',
    className = '',
    onChange
  }, ref) => {
    const [selectedValue, setSelectedValue] = useState(value || defaultValue || '');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const selectRef = useRef<HTMLDivElement>(null);

    // Controlled component support
    useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            handleOptionSelect(options[highlightedIndex].value);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex(prev => 
              prev < options.length - 1 ? prev + 1 : 0
            );
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex(prev => 
              prev > 0 ? prev - 1 : options.length - 1
            );
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    const handleOptionSelect = (optionValue: string) => {
      setSelectedValue(optionValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange?.(optionValue);
    };

    const selectedOption = options.find(option => option.value === selectedValue);

    const baseStyles = 'w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-body';
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    };

    const stateStyles = error
      ? 'border-brand-danger text-text-primary focus:border-brand-danger focus:ring-brand-danger'
      : isOpen
      ? 'border-brand-primary bg-surface-card focus:border-brand-primary focus:ring-brand-primary'
      : 'border-gray-300 bg-surface-card hover:border-gray-400 focus:border-brand-primary focus:ring-brand-primary';

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
            {required && <span className="text-brand-danger ml-1">*</span>}
          </label>
        )}
        
        <div ref={selectRef} className="relative">
          <button
            ref={ref}
            type="button"
            disabled={disabled}
            className={`${baseStyles} ${sizeStyles[size]} ${stateStyles} flex items-center justify-between`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            onKeyDown={handleKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className={selectedOption ? 'text-text-primary' : 'text-text-muted'}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            
            <motion.svg
              className="w-5 h-5 text-text-muted ml-2 flex-shrink-0"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </motion.svg>
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute z-10 w-full mt-1 bg-surface-card border border-gray-200 rounded-lg shadow-elevated max-h-60 overflow-auto"
              >
                <ul role="listbox" className="py-2">
                  {options.map((option, index) => (
                    <li key={option.value} role="option" aria-selected={option.value === selectedValue}>
                      <button
                        type="button"
                        disabled={option.disabled}
                        className={`
                          w-full px-4 py-2 text-left transition-colors duration-150 font-body
                          ${option.disabled 
                            ? 'text-text-muted cursor-not-allowed opacity-50' 
                            : 'text-text-primary hover:bg-surface-subtle'
                          }
                          ${option.value === selectedValue 
                            ? 'bg-brand-primary text-text-inverse' 
                            : ''
                          }
                          ${highlightedIndex === index 
                            ? 'bg-surface-subtle' 
                            : ''
                          }
                        `}
                        onClick={() => !option.disabled && handleOptionSelect(option.value)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                      >
                        {option.label}
                        {option.value === selectedValue && (
                          <svg className="inline-block w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {(helper || error) && (
          <div className="mt-2">
            {error ? (
              <p className="text-sm text-brand-danger flex items-center gap-1">
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            ) : helper ? (
              <p className="text-sm text-text-muted">{helper}</p>
            ) : null}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
