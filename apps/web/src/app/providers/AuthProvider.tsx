import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authService } from '../../features/auth/services/auth.service';
import {
  SignInInput,
  SignUpInput,
  User,
} from '../../features/auth/types/auth.types';

export interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (input: SignUpInput) => Promise<User>;
  signIn: (input: SignInInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<User | null>;
  clearAuthState: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async (): Promise<User | null> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  const signUp = useCallback(async (input: SignUpInput): Promise<User> => {
    const registeredUser = await authService.signUp(input);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const signIn = useCallback(async (input: SignInInput): Promise<User> => {
    const authenticatedUser = await authService.signIn(input);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      signUp,
      signIn,
      logout,
      refreshAuth,
      clearAuthState,
    }),
    [user, isLoading, signUp, signIn, logout, refreshAuth, clearAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
