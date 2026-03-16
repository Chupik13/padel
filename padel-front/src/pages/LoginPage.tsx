import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'en' : 'ru';
    i18n.changeLanguage(next);
    localStorage.setItem('language', next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!login.trim() || !password) {
      setError(t('login.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.login(login.trim(), password);
      navigate('/play', { replace: true });
    } catch {
      setError(t('login.invalidCredentials'));
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
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          placeholder={t('login.placeholder_login')}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
        />
        <input
          className="input"
          type="password"
          placeholder={t('login.placeholder_password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? t('login.submitting') : t('login.submit')}
        </button>
      </form>
      <p className="auth-link">
        <Link to="/forgot-password">{t('login.forgotPassword')}</Link>
      </p>
      <p className="auth-link">
        {t('login.noAccount')} <Link to="/register">{t('login.register')}</Link>
      </p>
    </div>
  );
}
