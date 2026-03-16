import { useState } from 'react';

import { useTranslation } from 'react-i18next';
import { updateName } from '../api/profile';
import { setPrimaryClub } from '../api/clubs';
import { useAuth } from '../context/AuthContext';
import { areGuidesEnabled, resetAllGuides, disableAllGuides } from '../hooks/useGuide';

export default function SettingsPage() {
  const { user, miniProfile, refreshMiniProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [guidesOn, setGuidesOn] = useState(() => areGuidesEnabled());
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
      <h2 className="screen-title">{t('settings.title')}</h2>

      <div className="settings-sections">
        <div className="settings-group">
          <label className="settings-label">{t('settings.nameLabel')}</label>
          <input
            className="input"
            type="text"
            value={name}
            maxLength={50}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
          />
        </div>

        {clubs.length > 0 && (
          <div className="settings-group">
            <label className="settings-label">{t('settings.primaryClub')}</label>
            <select
              className="input"
              value={primaryClubId ?? ''}
              onChange={(e) => handlePrimaryChange(Number(e.target.value))}
              disabled={clubs.length < 2}
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={guidesOn}
              onChange={(e) => {
                if (e.target.checked) {
                  resetAllGuides();
                  setGuidesOn(true);
                } else {
                  disableAllGuides();
                  setGuidesOn(false);
                }
              }}
            />
            {t('settings.showGuides')}
          </label>
        </div>

        {error && <p className="error">{error}</p>}
        {saved && <p className="success">{t('settings.saved')}</p>}
      </div>

      <button className="btn btn-primary settings-save-btn" onClick={handleSave} disabled={saving || !name.trim()}>
        {saving ? t('settings.saving') : t('settings.save')}
      </button>
    </div>
  );
}
