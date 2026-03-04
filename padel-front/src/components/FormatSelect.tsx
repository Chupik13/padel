import { useTranslation } from 'react-i18next';
import type { FormatOption } from '../types';

type FormatLabelKey = 'balanced' | 'small' | 'medium';

function getFormatOptions(playerCount: number, t: (key: string) => string): FormatOption[] {
  const label = (key: FormatLabelKey) => t(`format.${key}`);

  if (playerCount === 4) {
    return [
      { label: label('balanced'), matchCount: 3, generationMode: 'balanced', k: 1 },
      { label: label('small'), matchCount: 6, generationMode: 'balanced', k: 2 },
      { label: label('medium'), matchCount: 9, generationMode: 'balanced', k: 3 },
    ];
  }

  if (playerCount === 5) {
    return [
      { label: label('balanced'), matchCount: 5, generationMode: 'balanced', k: 1 },
      { label: label('medium'), matchCount: 10, generationMode: 'balanced', k: 2 },
    ];
  }

  if (playerCount === 6) {
    return [
      { label: label('balanced'), matchCount: 15, generationMode: 'balanced', k: 2 },
      { label: label('small'), matchCount: 5, generationMode: 'fixed' },
      { label: label('medium'), matchCount: 10, generationMode: 'fixed' },
    ];
  }

  const totalPairs = (playerCount * (playerCount - 1)) / 2;
  const k = 1;
  return [
    { label: label('balanced'), matchCount: (totalPairs * k) / 2, generationMode: 'balanced', k },
  ];
}

interface Props {
  playerCount: number;
  onSelect: (option: FormatOption) => void;
  onBack: () => void;
}

export default function FormatSelect({ playerCount, onSelect, onBack }: Props) {
  const { t } = useTranslation();
  const options = getFormatOptions(playerCount, t);

  return (
    <div className="screen center-content">
      <h1 className="screen-title">{t('format.title')}</h1>
      <p className="subtitle">{t('format.subtitle')}</p>
      <div className="format-buttons">
        {options.map((opt) => (
          <button key={opt.label} className="format-button" onClick={() => onSelect(opt)}>
            <span className="format-button-title">{opt.label} ({opt.matchCount})</span>
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={onBack}>
        {t('common.back')}
      </button>
    </div>
  );
}
