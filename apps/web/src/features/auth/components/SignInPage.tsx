import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../../components/AuthLayout';
import { SignInForm } from './SignInForm';

export function SignInPage(): React.ReactElement {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to access your protected application workspace"
      footer={
        <p className="auth-switch-text">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
        </p>
      }
    >
      <SignInForm />
    </AuthLayout>
  );
}
