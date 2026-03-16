import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resetPassword } from '../api/auth';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirm) return;
    if (password !== confirm) {
      setError(t('resetPassword.mismatch'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch {
      setError(t('resetPassword.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="auth-lang-toggle" onClick={toggleLang}>
        {i18n.language === 'ru' ? 'EN' : 'RU'}
      </button>
      <h1 className="title">{t('app.title')}</h1>
      {success ? (
        <div className="auth-form">
          <p style={{ color: 'var(--accent)', textAlign: 'center' }}>{t('resetPassword.success')}</p>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 style={{ textAlign: 'center', margin: 0 }}>{t('resetPassword.title')}</h2>
          <input
            className="input"
            type="password"
            placeholder={t('resetPassword.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            type="password"
            placeholder={t('resetPassword.confirmPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </button>
        </form>
      )}
    </div>
  );
}
