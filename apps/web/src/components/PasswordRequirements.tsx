import React from 'react';
import { evaluatePasswordRules } from '../features/auth/schemas/auth.schemas';

export interface PasswordRequirementsProps {
  password: string;
}

export function PasswordRequirements({
  password,
}: PasswordRequirementsProps): React.ReactElement {
  const checks = evaluatePasswordRules(password);

  return (
    <div
      className="password-requirements"
      aria-label="Password requirements checklist"
    >
      <p className="password-requirements-title">Password must include:</p>
      <ul className="password-requirements-list">
        {checks.map((check) => (
          <li
            key={check.id}
            className={`password-requirement-item ${
              check.passed ? 'requirement-passed' : 'requirement-pending'
            }`}
          >
            <span className="requirement-indicator" aria-hidden="true">
              {check.passed ? '✓' : '•'}
            </span>
            <span>{check.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
