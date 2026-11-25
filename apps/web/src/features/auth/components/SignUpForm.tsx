import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField } from '../../../components/FormField';
import { PasswordRequirements } from '../../../components/PasswordRequirements';
import { extractApiErrorMessage } from '../../../lib/api-error';
import { useAuth } from '../hooks/useAuth';
import { SignUpFormValues, signUpSchema } from '../schemas/auth.schemas';

export function SignUpForm(): React.ReactElement {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    mode: 'onTouched',
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (values: SignUpFormValues): Promise<void> => {
    setApiError(null);
    try {
      await signUp(values);
      navigate('/app', { replace: true });
    } catch (error: unknown) {
      setApiError(
        extractApiErrorMessage(
          error,
          'Unable to create your account. Please try again.',
        ),
      );
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="auth-form"
      noValidate
      aria-label="Sign up form"
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
        id="signup-name"
        label="Full Name"
        type="text"
        placeholder="Jane Doe"
        autoComplete="name"
        disabled={isSubmitting}
        error={errors.name?.message}
        {...register('name')}
      />

      <FormField
        id="signup-email"
        label="Email Address"
        type="email"
        placeholder="jane.doe@example.com"
        autoComplete="email"
        disabled={isSubmitting}
        error={errors.email?.message}
        {...register('email')}
      />

      <FormField
        id="signup-password"
        label="Password"
        type="password"
        placeholder="Create a strong password"
        autoComplete="new-password"
        enablePasswordToggle
        disabled={isSubmitting}
        error={errors.password?.message}
        {...register('password')}
      />

      <PasswordRequirements password={passwordValue} />

      <button
        type="submit"
        className="btn btn-primary btn-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
  );
}
