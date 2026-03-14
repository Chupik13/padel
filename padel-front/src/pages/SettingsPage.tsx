import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { updateName } from '../api/profile';
import { setPrimaryClub } from '../api/clubs';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, miniProfile, refreshMiniProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  const clubs = miniProfile?.clubs ?? [];
  const primaryClubId = miniProfile?.clubId ?? null;

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

  const handlePrimaryChange = async (clubId: number) => {
    setError('');
    setSaved(false);
    try {
      await setPrimaryClub(clubId);
      await refreshMiniProfile();
    } catch {
      setError(t('settings.saveError'));
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

        {clubs.length >= 2 && (
          <>
            <label className="settings-label">{t('settings.primaryClub')}</label>
            <select
              className="input"
              value={primaryClubId ?? ''}
              onChange={(e) => handlePrimaryChange(Number(e.target.value))}
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </>
        )}

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">{t('settings.saved')}</p>}
      </div>
        <button style={{marginTop: 'auto', marginBottom: 10, maxHeight: 44}} className="btn btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? t('settings.saving') : t('settings.save')}
        </button>
    </div>
  );
}
