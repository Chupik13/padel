import { useTranslation } from 'react-i18next';
import type { FormatOption } from '../types';

function getFormatOptions(playerCount: number): FormatOption[] {
  if (playerCount === 4) {
    return [
      { label: '3', matchCount: 3, generationMode: 'balanced', k: 1 },
      { label: '6', matchCount: 6, generationMode: 'balanced', k: 2 },
      { label: '9', matchCount: 9, generationMode: 'balanced', k: 3 },
    ];
  }

  if (playerCount === 5) {
    return [
      { label: '5', matchCount: 5, generationMode: 'balanced', k: 1 },
      { label: '10', matchCount: 10, generationMode: 'balanced', k: 2 },
      { label: '15', matchCount: 15, generationMode: 'balanced', k: 3 },
    ];
  }

  if (playerCount === 6) {
    return [
      { label: '6', matchCount: 6, generationMode: 'fixed' },
      { label: '9', matchCount: 9, generationMode: 'fixed' },
      { label: '15', matchCount: 15, generationMode: 'balanced', k: 2 },
    ];
  }

  return [];
}

interface Props {
  playerCount: number;
  onSelect: (option: FormatOption) => void;
  onBack: () => void;
}

export default function FormatSelect({ playerCount, onSelect, onBack }: Props) {
  const { t } = useTranslation();
  const options = getFormatOptions(playerCount);

  return (
    <div className="screen center-content">
      <h1 className="screen-title">{t('format.matchCount')}</h1>
      <p className="subtitle">{t('format.selectMatches')}</p>
      <div className="card-buttons">
        {options.map((opt) => (
          <button key={opt.matchCount} className="card-button" onClick={() => onSelect(opt)}>
            <span className="card-button-number">{opt.matchCount}</span>
            <span className="card-button-label">{t('format.matches')}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={onBack}>
        {t('common.back')}
      </button>
    </div>
  );
}
