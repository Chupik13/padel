import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateName } from '../api/profile';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, refreshMiniProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateName(name.trim());
      await refreshMiniProfile();
      setSaved(true);
    } catch {
      setError(t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="screen">
      <button className="btn-back" onClick={() => navigate(-1)}>
        ← {t('common.back')}
      </button>
      <h2 className="screen-title">{t('settings.title')}</h2>
      <div className="settings-form">
        <label className="settings-label">{t('settings.nameLabel')}</label>
        <input
          className="input"
          type="text"
          value={name}
          maxLength={50}
          onChange={(e) => { setName(e.target.value); setSaved(false); }}
        />
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">{t('settings.saved')}</p>}
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
      </div>
    </div>
  );
}
