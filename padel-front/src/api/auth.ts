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
