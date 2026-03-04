import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forgotPassword } from '../api/auth';

export default function ForgotPasswordPage() {
  const [login, setLogin] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim()) return;
    setLoading(true);
    try {
      await forgotPassword(login.trim());
    } catch {
      // always show success to not reveal account existence
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="lang-toggle auth-lang-toggle" onClick={toggleLang}>
        {i18n.language === 'ru' ? 'EN' : 'RU'}
      </button>
      <h1 className="title">{t('app.title')}</h1>
      {sent ? (
        <div className="auth-form">
          <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>{t('forgotPassword.success')}</p>
          <Link to="/login" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none' }}>
            {t('login.submit')}
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 style={{ textAlign: 'center', margin: 0 }}>{t('forgotPassword.title')}</h2>
          <input
            className="input"
            type="text"
            placeholder={t('forgotPassword.placeholder')}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
          </button>
        </form>
      )}
      <p className="auth-link">
        <Link to="/login">{t('common.back')}</Link>
      </p>
    </div>
  );
}
