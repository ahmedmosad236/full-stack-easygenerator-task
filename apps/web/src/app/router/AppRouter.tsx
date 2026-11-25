import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ApplicationPage } from '../../features/auth/components/ApplicationPage';
import { SignInPage } from '../../features/auth/components/SignInPage';
import { SignUpPage } from '../../features/auth/components/SignUpPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

export function AppRouter(): React.ReactElement {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<ApplicationPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
