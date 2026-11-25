import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/app/providers/AuthProvider';
import { AppRouter } from '../src/app/router/AppRouter';
import { authService } from '../src/features/auth/services/auth.service';
import { User } from '../src/features/auth/types/auth.types';

vi.mock('../src/features/auth/services/auth.service', () => ({
  authService: {
    signUp: vi.fn(),
    signIn: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
    getApplicationWelcome: vi.fn(),
  },
}));

const mockedAuthService = vi.mocked(authService);

const mockUser: User = {
  id: '67445420c13a4b0012345678',
  name: 'Jane Doe',
  email: 'jane.doe@example.com',
  createdAt: '2026-11-25T12:00:00.000Z',
};

function renderWithRouter(initialEntries: string[] = ['/signin']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Frontend Authentication & Protected Routing Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Signup form validation', () => {
    it('displays inline validation messages for short name, invalid email, and weak password', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const user = userEvent.setup();

      renderWithRouter(['/signup']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Full Name/i), 'Jo');
      await user.type(screen.getByLabelText(/Email Address/i), 'invalid-email');
      await user.type(screen.getByLabelText(/^Password$/i), 'short');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(
        await screen.findByText('Name must be at least 3 characters long.'),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Please enter a valid email address.'),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Password must be at least 8 characters long.'),
      ).toBeInTheDocument();

      expect(mockedAuthService.signUp).not.toHaveBeenCalled();
    });

    it('enforces letter, number, and special character password requirements', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const user = userEvent.setup();

      renderWithRouter(['/signup']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Full Name/i), 'Jane Doe');
      await user.type(
        screen.getByLabelText(/Email Address/i),
        'jane.doe@example.com',
      );
      await user.type(screen.getByLabelText(/^Password$/i), 'Password123');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      expect(
        await screen.findByText(
          'Password must contain at least one special character.',
        ),
      ).toBeInTheDocument();
      expect(mockedAuthService.signUp).not.toHaveBeenCalled();
    });
  });

  describe('2. Signin form validation', () => {
    it('validates email format and required password before submitting', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const user = userEvent.setup();

      renderWithRouter(['/signin']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Email Address/i), 'bad-email');
      await user.click(screen.getByRole('button', { name: /Sign In/i }));

      expect(
        await screen.findByText('Please enter a valid email address.'),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('Password is required.'),
      ).toBeInTheDocument();
      expect(mockedAuthService.signIn).not.toHaveBeenCalled();
    });
  });

  describe('3. Loading states & duplicate submission prevention', () => {
    it('shows initial session verification loading spinner before resolving auth status', async () => {
      let resolveAuth!: (value: User) => void;
      const pendingAuthPromise = new Promise<User>((resolve) => {
        resolveAuth = resolve;
      });
      mockedAuthService.getCurrentUser.mockReturnValue(pendingAuthPromise);
      mockedAuthService.getApplicationWelcome.mockResolvedValue({
        message: 'Welcome to the application.',
      });

      renderWithRouter(['/app']);

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      expect(
        screen.getByText(/Verifying your session.../i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Welcome to the application.'),
      ).not.toBeInTheDocument();

      resolveAuth(mockUser);

      expect(
        await screen.findByText('Welcome to the application.'),
      ).toBeInTheDocument();
    });

    it('disables form button and shows pending label while signin request is in flight', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      let resolveSignIn!: (value: User) => void;
      mockedAuthService.signIn.mockReturnValue(
        new Promise<User>((resolve) => {
          resolveSignIn = resolve;
        }),
      );
      mockedAuthService.getApplicationWelcome.mockResolvedValue({
        message: 'Welcome to the application.',
      });

      const user = userEvent.setup();
      renderWithRouter(['/signin']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/Email Address/i),
        'jane.doe@example.com',
      );
      await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass1!');

      const submitBtn = screen.getByRole('button', { name: /Sign In/i });
      await user.click(submitBtn);

      expect(
        await screen.findByRole('button', { name: /Signing in.../i }),
      ).toBeDisabled();

      resolveSignIn(mockUser);

      expect(
        await screen.findByText('Welcome to the application.'),
      ).toBeInTheDocument();
    });
  });

  describe('4. API error display', () => {
    it('displays duplicate email conflict message on signup failure', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const conflictError = new AxiosError(
        'Conflict',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: { headers: new AxiosHeaders() },
          data: {
            statusCode: 409,
            error: 'Conflict',
            message: 'An account with this email address already exists.',
          },
        },
      );
      mockedAuthService.signUp.mockRejectedValue(conflictError);

      const user = userEvent.setup();
      renderWithRouter(['/signup']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/Full Name/i), 'Jane Doe');
      await user.type(
        screen.getByLabelText(/Email Address/i),
        'jane.doe@example.com',
      );
      await user.type(screen.getByLabelText(/^Password$/i), 'SecurePass1!');

      await user.click(screen.getByRole('button', { name: /Create Account/i }));

      const errorAlert = await screen.findByTestId('api-error-banner');
      expect(errorAlert).toHaveTextContent(
        'An account with this email address already exists.',
      );
    });

    it('displays generic invalid credentials message on signin failure', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      const unauthorizedError = new AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config: { headers: new AxiosHeaders() },
          data: {
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid email or password.',
          },
        },
      );
      mockedAuthService.signIn.mockRejectedValue(unauthorizedError);

      const user = userEvent.setup();
      renderWithRouter(['/signin']);

      await waitFor(() => {
        expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      });

      await user.type(
        screen.getByLabelText(/Email Address/i),
        'jane.doe@example.com',
      );
      await user.type(screen.getByLabelText(/^Password$/i), 'WrongPass1!');

      await user.click(screen.getByRole('button', { name: /Sign In/i }));

      const errorAlert = await screen.findByTestId('api-error-banner');
      expect(errorAlert).toHaveTextContent('Invalid email or password.');
    });
  });

  describe('5 & 6. Protected-route & Authentication initialization behavior', () => {
    it('redirects unauthenticated users attempting to access /app to /signin', async () => {
      mockedAuthService.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));

      renderWithRouter(['/app']);

      expect(
        await screen.findByRole('heading', { name: /Welcome back/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Welcome to the application.'),
      ).not.toBeInTheDocument();
    });

    it('renders /app with exact welcome message when GET /api/auth/me confirms session, and redirects to /signin upon logout', async () => {
      mockedAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockedAuthService.getApplicationWelcome.mockResolvedValue({
        message: 'Welcome to the application.',
      });
      mockedAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully.',
      });

      const user = userEvent.setup();
      renderWithRouter(['/app']);

      expect(
        await screen.findByText('Welcome to the application.'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('Jane Doe');
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        'jane.doe@example.com',
      );

      await user.click(screen.getByTestId('logout-button'));

      expect(mockedAuthService.logout).toHaveBeenCalledTimes(1);
      expect(
        await screen.findByRole('heading', { name: /Welcome back/i }),
      ).toBeInTheDocument();
    });
  });
});
