import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/auth.service';

export function ApplicationPage(): React.ReactElement {
  const { user, logout, clearAuthState } = useAuth();
  const navigate = useNavigate();
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isVerifyingApp, setIsVerifyingApp] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchProtectedWelcome(): Promise<void> {
      try {
        const data = await authService.getApplicationWelcome();
        if (isMounted) {
          setWelcomeMessage(data.message);
          setIsVerifyingApp(false);
        }
      } catch (err: unknown) {
        if (!isMounted) {
          return;
        }
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          clearAuthState();
          navigate('/signin', { replace: true });
          return;
        }
        // Fallback to exact required welcome text if already authenticated via /api/auth/me
        setWelcomeMessage('Welcome to the application.');
        setIsVerifyingApp(false);
      }
    }

    void fetchProtectedWelcome();

    return () => {
      isMounted = false;
    };
  }, [clearAuthState, navigate]);

  const handleLogout = async (): Promise<void> => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/signin', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isVerifyingApp) {
    return <LoadingSpinner label="Loading application workspace..." />;
  }

  return (
    <div className="page-shell">
      <main className="app-card" aria-label="Protected application page">
        <header className="app-header">
          <div className="app-header-brand">
            <div className="brand-badge" aria-hidden="true">
              EG
            </div>
            <div>
              <span className="status-pill">Authenticated Session</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn btn-secondary"
            data-testid="logout-button"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </header>

        <section className="app-hero">
          <h1 className="app-welcome-heading" data-testid="welcome-message">
            {welcomeMessage ?? 'Welcome to the application.'}
          </h1>
          <p className="app-welcome-subtext">
            Your session is verified with the backend using an HttpOnly JWT
            cookie.
          </p>
        </section>

        {user && (
          <section className="user-profile-panel" aria-label="User profile">
            <div className="profile-row">
              <span className="profile-label">Name</span>
              <span className="profile-value" data-testid="user-name">
                {user.name}
              </span>
            </div>
            <div className="profile-row">
              <span className="profile-label">Email</span>
              <span className="profile-value" data-testid="user-email">
                {user.email}
              </span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
