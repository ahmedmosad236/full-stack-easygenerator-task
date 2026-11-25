import React from 'react';

export interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({
  label = 'Verifying your session...',
}: LoadingSpinnerProps): React.ReactElement {
  return (
    <div
      className="loading-screen"
      role="status"
      aria-live="polite"
      data-testid="auth-loading"
    >
      <div className="spinner" aria-hidden="true" />
      <p className="loading-label">{label}</p>
    </div>
  );
}
