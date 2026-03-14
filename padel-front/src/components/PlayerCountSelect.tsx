import { useTranslation } from 'react-i18next';

interface Props {
  clubName?: string;
  onSelect: (count: number) => void;
}

export default function PlayerCountSelect({ clubName, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div className="screen center-content">
      <h1 className="title">{t('app.title')}{clubName && <span className="title-club-name">{clubName}</span>}</h1>
      <p className="subtitle">{t('playerCount.subtitle')}</p>
      <div className="card-buttons">
        {[4, 5, 6, 7].map((n) => (
          <button key={n} className="card-button" onClick={() => onSelect(n)}>
            <span className="card-button-number">{n}</span>
            <span className="card-button-label">{t('playerCount.players')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
