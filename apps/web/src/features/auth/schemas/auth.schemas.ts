import { z } from 'zod';

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required.')
    .min(3, 'Name must be at least 3 characters long.')
    .max(100, 'Name must not exceed 100 characters.'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .min(8, 'Password must be at least 8 characters long.')
    .max(128, 'Password must not exceed 128 characters.')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter.')
    .regex(/\d/, 'Password must contain at least one number.')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must contain at least one special character.',
    ),
});

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email is required.')
    .email('Please enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must not exceed 128 characters.'),
});

export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type SignInFormValues = z.infer<typeof signInSchema>;

export interface PasswordRuleCheck {
  id: string;
  label: string;
  passed: boolean;
}

export function evaluatePasswordRules(password: string): PasswordRuleCheck[] {
  return [
    {
      id: 'minLength',
      label: 'At least 8 characters',
      passed: password.length >= 8,
    },
    {
      id: 'letter',
      label: 'At least one letter (A-Z or a-z)',
      passed: /[A-Za-z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      passed: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
}
