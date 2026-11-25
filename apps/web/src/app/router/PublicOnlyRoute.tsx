import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useAuth } from '../../features/auth/hooks/useAuth';

export interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

export function PublicOnlyRoute({
  children,
}: PublicOnlyRouteProps): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner label="Verifying your session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
