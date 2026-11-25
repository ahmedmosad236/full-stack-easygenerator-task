import { apiClient } from '../../../lib/api-client';
import {
  ApplicationResponse,
  AuthResponse,
  LogoutResponse,
  SignInInput,
  SignUpInput,
  User,
} from '../types/auth.types';

export const authService = {
  async signUp(input: SignUpInput): Promise<User> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return response.data.user;
  },

  async signIn(input: SignInInput): Promise<User> {
    const response = await apiClient.post<AuthResponse>('/auth/signin', {
      email: input.email.trim().toLowerCase(),
      password: input.password,
    });
    return response.data.user;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<AuthResponse>('/auth/me');
    return response.data.user;
  },

  async logout(): Promise<LogoutResponse> {
    const response = await apiClient.post<LogoutResponse>('/auth/logout');
    return response.data;
  },

  async getApplicationWelcome(): Promise<ApplicationResponse> {
    const response = await apiClient.get<ApplicationResponse>('/application');
    return response.data;
  },
};
