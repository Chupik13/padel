import { apiFetch } from './client';

export function sendFeedback(data: { subject: string; message: string; email?: string }): Promise<void> {
  return apiFetch<void>('/api/feedback/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
