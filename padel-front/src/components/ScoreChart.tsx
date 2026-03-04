import { useTranslation } from 'react-i18next';
import type { TournamentScoreEntry } from '../types/api';

interface Props {
  scores: TournamentScoreEntry[];
  playerName: string;
}

export default function ScoreChart({ scores, playerName }: Props) {
  const { i18n } = useTranslation();
  const dateFmt = i18n.language === 'ru' ? 'ru-RU' : 'en-US';

  if (scores.length === 0) return null;

  const maxScore = Math.max(...scores.map((s) => s.averageScore), 1);

  return (
    <div className="score-chart">
      <div className="score-chart-title">{playerName}</div>
      <div className="score-chart-bars">
        {scores.map((s, i) => {
          const heightPct = (s.averageScore / maxScore) * 100;
          return (
            <div key={i} className="score-chart-bar-col">
              <span className="score-chart-value">{s.averageScore}</span>
              <div className="score-chart-bar-wrapper">
                <div
                  className={`score-chart-bar ${s.isCounted ? 'score-chart-bar-counted' : 'score-chart-bar-uncounted'}`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="score-chart-date">
                {new Date(s.date).toLocaleDateString(dateFmt, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
