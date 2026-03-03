import type { FormatOption } from '../types';

function getFormatOptions(playerCount: number): FormatOption[] {
  // C(n,2) = n*(n-1)/2
  const totalPairs = (playerCount * (playerCount - 1)) / 2;
  // matchCount = totalPairs * k / 2

  if (playerCount === 4) {
    // C(4,2)=6 pairs => k=1: 3, k=2: 6, k=3: 9
    return [
      { label: 'Баланс', matchCount: 3, generationMode: 'balanced', k: 1 },
      { label: 'Малый', matchCount: 6, generationMode: 'balanced', k: 2 },
      { label: 'Средний', matchCount: 9, generationMode: 'balanced', k: 3 },
    ];
  }

  if (playerCount === 5) {
    // C(5,2)=10 pairs => k=1: 5, k=2: 10
    // Малый = Баланс, so only 2 options
    return [
      { label: 'Баланс', matchCount: 5, generationMode: 'balanced', k: 1 },
      { label: 'Средний', matchCount: 10, generationMode: 'balanced', k: 2 },
    ];
  }

  if (playerCount === 6) {
    // C(6,2)=15 pairs => k=2: 15 (balanced base)
    // Малый=5 and Средний=10 are fixed (can't be balanced at those counts)
    return [
      { label: 'Баланс', matchCount: 15, generationMode: 'balanced', k: 2 },
      { label: 'Малый', matchCount: 5, generationMode: 'fixed' },
      { label: 'Средний', matchCount: 10, generationMode: 'fixed' },
    ];
  }

  // Fallback
  const k = 1;
  return [
    { label: 'Баланс', matchCount: (totalPairs * k) / 2, generationMode: 'balanced', k },
  ];
}

interface Props {
  playerCount: number;
  onSelect: (option: FormatOption) => void;
  onBack: () => void;
}

export default function FormatSelect({ playerCount, onSelect, onBack }: Props) {
  const options = getFormatOptions(playerCount);

  return (
    <div className="screen center-content">
      <h1 className="screen-title">Формат турнира</h1>
      <p className="subtitle">Выберите количество матчей</p>
      <div className="format-buttons">
        {options.map((opt) => (
          <button key={opt.label} className="format-button" onClick={() => onSelect(opt)}>
            <span className="format-button-title">{opt.label} ({opt.matchCount})</span>
          </button>
        ))}
      </div>
      <button className="btn btn-secondary" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={onBack}>
        Назад
      </button>
    </div>
  );
}
