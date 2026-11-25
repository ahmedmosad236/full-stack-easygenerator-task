import React, { forwardRef, useState } from 'react';

export interface FormFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  enablePasswordToggle?: boolean;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    {
      id,
      label,
      error,
      type = 'text',
      enablePasswordToggle = false,
      ...inputProps
    },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordInput = type === 'password' && enablePasswordToggle;
    const effectiveType = isPasswordInput
      ? showPassword
        ? 'text'
        : 'password'
      : type;
    const errorId = `${id}-error`;

    return (
      <div className="form-field">
        <label htmlFor={id} className="form-label">
          {label}
        </label>
        <div className="input-wrapper">
          <input
            ref={ref}
            id={id}
            type={effectiveType}
            className={`form-input ${error ? 'form-input-error' : ''} ${
              isPasswordInput ? 'form-input-with-toggle' : ''
            }`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            {...inputProps}
          />
          {isPasswordInput && (
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
        {error && (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
