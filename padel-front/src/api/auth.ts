import { apiFetch } from './client';
import type { UserResult, LoginRequest, RegisterRequest } from '../types/api';

export function login(data: LoginRequest): Promise<UserResult> {
  return apiFetch<UserResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function register(data: RegisterRequest): Promise<UserResult> {
  return apiFetch<UserResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout(): Promise<void> {
  return apiFetch<void>('/api/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<UserResult> {
  return apiFetch<UserResult>('/api/auth/me');
}

export function setEmail(email: string): Promise<void> {
  return apiFetch<void>('/api/auth/set-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function forgotPassword(login: string): Promise<void> {
  return apiFetch<void>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ login }),
  });
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiFetch<void>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
