import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../../components/AuthLayout';
import { SignUpForm } from './SignUpForm';

export function SignUpPage(): React.ReactElement {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Get started with secure cookie-based authentication"
      footer={
        <p className="auth-switch-text">
          Already have an account?{' '}
          <Link to="/signin" className="auth-link">
            Sign in
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthLayout>
  );
}
