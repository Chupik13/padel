import { apiFetch } from './client';
import type { AuditLogResult } from '../types/api';

export interface LogsResponse {
  logs: AuditLogResult[];
  total: number;
  page: number;
  pageSize: number;
}

export function getLogs(page: number, pageSize: number): Promise<LogsResponse> {
  return apiFetch<LogsResponse>(`/api/logs?page=${page}&pageSize=${pageSize}`);
}
