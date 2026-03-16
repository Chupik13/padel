import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getLogs } from '../api/logs';
import type { AuditLogResult } from '../types/api';

export default function LogsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [logs, setLogs] = useState<AuditLogResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 50;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getLogs(page, pageSize);
        setLogs(res.logs);
        setTotal(res.total);
      } catch {
        setError(t('logs.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!(user?.isAdmin)) {
    return (
      <div className="screen center-content">
        <p className="error">{t('logs.noAccess')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="screen center-content">
        <div className="loading-spinner" />
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="screen">
      <h2 className="screen-title">{t('logs.title')}</h2>

      {error && <p className="error">{error}</p>}

      <div className="logs-table-wrapper">
        <table className="logs-table">
          <thead>
            <tr>
              <th>{t('logs.time')}</th>
              <th>{t('logs.player')}</th>
              <th>{t('logs.action')}</th>
              <th>{t('logs.details')}</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="logs-time">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td>{log.playerName ?? '—'}</td>
                <td className="logs-action">{t(`logs.action_${log.action}`, { defaultValue: log.action })}</td>
                <td className="logs-details">{log.details ?? ''}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>{t('logs.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="logs-pagination">
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t('logs.prev')}
          </button>
          <span className="logs-page-info">{page} / {totalPages}</span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t('logs.next')}
          </button>
        </div>
      )}
    </div>
  );
}
