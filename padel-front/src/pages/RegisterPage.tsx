import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [login, setLogin] = useState('');
  const [name, setName] = useState('');
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
    if (!login.trim() || !name.trim() || !password) {
      setError(t('register.fillAllFields'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await auth.register(login.trim(), password, name.trim());
      localStorage.setItem('lastSeenVersion', __APP_VERSION__);
      navigate('/play', { replace: true });
    } catch {
      setError(t('register.loginExists'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <button className="lang-toggle auth-lang-toggle" onClick={toggleLang}>
        {i18n.language === 'ru' ? 'EN' : 'RU'}
      </button>
      <h1 className="title">{t('app.title')}</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          className="input"
          type="text"
          placeholder={t('register.placeholder_login')}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoFocus
        />
        <input
          className="input"
          type="text"
          placeholder={t('register.placeholder_name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          type="password"
          placeholder={t('register.placeholder_password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? t('register.submitting') : t('register.submit')}
        </button>
      </form>
      <p className="auth-link">
        {t('register.hasAccount')} <Link to="/login">{t('register.login')}</Link>
      </p>
    </div>
  );
}
