import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../../components/FormField';
import { extractApiErrorMessage } from '../../../lib/api-error';
import { useAuth } from '../hooks/useAuth';
import { SignInFormValues, signInSchema } from '../schemas/auth.schemas';

export function SignInForm(): React.ReactElement {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const onSubmit = async (values: SignInFormValues): Promise<void> => {
    setApiError(null);
    try {
      await signIn(values);
      navigate('/app', { replace: true });
    } catch (error: unknown) {
      setApiError(
        extractApiErrorMessage(
          error,
          'Unable to sign in. Please check your credentials and try again.',
        ),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="auth-form"
      noValidate
      aria-label="Sign in form"
    >
      {apiError && (
        <div
          className="alert-banner alert-error"
          role="alert"
          data-testid="api-error-banner"
        >
          {apiError}
        </div>
      )}

      <FormField
        id="signin-email"
        label="Email Address"
        type="email"
        placeholder="jane.doe@example.com"
        autoComplete="email"
        disabled={isSubmitting}
        error={errors.email?.message}
        {...register('email')}
      />

      <FormField
        id="signin-password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        enablePasswordToggle
        disabled={isSubmitting}
        error={errors.password?.message}
        {...register('password')}
      />

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  );
}
