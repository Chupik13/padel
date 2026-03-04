import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  count: number;
  onSubmit: (names: string[]) => void;
  onBack: () => void;
}

export default function PlayerNamesForm({ count, onSubmit, onBack }: Props) {
  const [names, setNames] = useState<string[]>(Array(count).fill(''));
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleChange = (index: number, value: string) => {
    const updated = [...names];
    updated[index] = value;
    setNames(updated);
    setError('');
  };

  const handleSubmit = () => {
    const trimmed = names.map((n) => n.trim());
    if (trimmed.some((n) => !n)) {
      setError(t('playerNames.fillAll'));
      return;
    }
    if (new Set(trimmed).size !== trimmed.length) {
      setError(t('playerNames.uniqueNames'));
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <div className="screen">
      <h2 className="screen-title">{t('playerNames.title')}</h2>
      <div className="form-fields">
        {names.map((name, i) => (
          <input
            key={i}
            className="input"
            type="text"
            placeholder={t('playerNames.placeholder', { number: i + 1 })}
            value={name}
            onChange={(e) => handleChange(i, e.target.value)}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="button-row">
        <button className="btn btn-secondary" onClick={onBack}>
          {t('common.back')}
        </button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          {t('playerNames.submit')}
        </button>
      </div>
    </div>
  );
}
