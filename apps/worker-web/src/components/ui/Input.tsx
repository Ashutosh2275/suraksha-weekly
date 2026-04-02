import React, { useState } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helper?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label,
    helper, 
    error,
    size = 'md',
    prefix,
    suffix,
    className = '',
    disabled,
    type = 'text',
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const baseStyles = 'w-full rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-body';
    
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg'
    };

    const stateStyles = error
      ? 'border-brand-danger text-text-primary focus:border-brand-danger focus:ring-brand-danger'
      : isFocused
      ? 'border-brand-primary bg-surface-card focus:border-brand-primary focus:ring-brand-primary'
      : 'border-gray-300 bg-surface-card hover:border-gray-400 focus:border-brand-primary focus:ring-brand-primary';

    const prefixSuffixStyles = (prefix || suffix) ? 'flex items-center' : '';
    const inputPadding = prefix && suffix ? 'px-0' : prefix ? 'pl-0' : suffix ? 'pr-0' : '';

    const inputElement = (
      <input
        ref={ref}
        type={type}
        disabled={disabled}
        className={`${baseStyles} ${sizeStyles[size]} ${stateStyles} ${inputPadding} ${className}`}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    );

    const inputWithPrefixSuffix = (prefix || suffix) ? (
      <div className={`${baseStyles} ${sizeStyles[size]} ${stateStyles} ${prefixSuffixStyles} overflow-hidden`}>
        {prefix && (
          <div className="flex-shrink-0 flex items-center text-text-muted mr-3">
            {prefix}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className="flex-1 border-0 bg-transparent focus:ring-0 focus:outline-none p-0 font-body"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        {suffix && (
          <div className="flex-shrink-0 flex items-center text-text-muted ml-3">
            {suffix}
          </div>
        )}
      </div>
    ) : inputElement;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
          </label>
        )}
        
        {inputWithPrefixSuffix}
        
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

Input.displayName = 'Input';

// Specialized phone input for Indian numbers
export const PhoneInput = React.forwardRef<HTMLInputElement, Omit<InputProps, 'prefix' | 'type'>>(
  ({ className = '', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        type="tel"
        prefix={
          <div className="flex items-center gap-2 text-sm">
            <span>🇮🇳</span>
            <span className="text-text-secondary">+91</span>
          </div>
        }
        placeholder="Enter 10-digit mobile number"
        maxLength={10}
        pattern="[0-9]{10}"
        className={className}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

// OTP input with individual digit boxes
export interface OTPInputProps {
  length?: number;
  onComplete?: (value: string) => void;
  error?: boolean;
  className?: string;
}

export const OTPInput = React.forwardRef<HTMLDivElement, OTPInputProps>(
  ({ length = 6, onComplete, error = false, className = '' }, ref) => {
    const [values, setValues] = useState<string[]>(new Array(length).fill(''));
    const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
      if (value.length > 1) {
        // Handle paste
        const pastedValues = value.slice(0, length).split('');
        const newValues = [...values];
        pastedValues.forEach((char, i) => {
          if (index + i < length && /^\d$/.test(char)) {
            newValues[index + i] = char;
          }
        });
        setValues(newValues);
        
        // Focus next empty input or last input
        const nextIndex = Math.min(index + pastedValues.length, length - 1);
        inputRefs.current[nextIndex]?.focus();
        
        if (newValues.every(v => v !== '') && onComplete) {
          onComplete(newValues.join(''));
        }
      } else if (/^\d$/.test(value)) {
        const newValues = [...values];
        newValues[index] = value;
        setValues(newValues);
        
        // Move to next input
        if (index < length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
        
        if (newValues.every(v => v !== '') && onComplete) {
          onComplete(newValues.join(''));
        }
      }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && values[index] === '' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (e.key === 'Backspace') {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
    };

    const shakeAnimation = error ? 'animate-pulse' : '';

    return (
      <div ref={ref} className={`flex gap-3 ${className}`}>
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`
              w-12 h-12 text-center text-lg font-mono font-semibold 
              border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2
              transition-colors duration-200
              ${error 
                ? 'border-brand-danger text-brand-danger focus:border-brand-danger focus:ring-brand-danger' 
                : 'border-gray-300 focus:border-brand-primary focus:ring-brand-primary'
              }
              ${shakeAnimation}
            `}
          />
        ))}
      </div>
    );
  }
);

OTPInput.displayName = 'OTPInput';
