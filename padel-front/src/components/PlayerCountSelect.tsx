import { useTranslation } from 'react-i18next';
import InfoTip from './InfoTip';

interface Props {
  onSelect: (count: number) => void;
}

export default function PlayerCountSelect({ onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="screen center-content">
      <h1 className="title">{t('app.title')}</h1>
      <div className="title-row">
        <p className="subtitle">{t('playerCount.subtitle')}</p>
        <InfoTip text={t('playerCount.subtitle_hint')} />
      </div>
      <div className="card-buttons">
        {[4, 5, 6].map((n) => (
          <button key={n} className="card-button" onClick={() => onSelect(n)}>
            <span className="card-button-number">{n}</span>
            <span className="card-button-label">{t('playerCount.players')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
