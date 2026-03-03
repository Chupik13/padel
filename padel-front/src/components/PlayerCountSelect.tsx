interface Props {
  onSelect: (count: number) => void;
}

export default function PlayerCountSelect({ onSelect }: Props) {
  return (
    <div className="screen center-content">
      <h1 className="title">Грузиано</h1>
      <p className="subtitle">Выберите количество игроков</p>
      <div className="card-buttons">
        {[4, 5, 6].map((n) => (
          <button key={n} className="card-button" onClick={() => onSelect(n)}>
            <span className="card-button-number">{n}</span>
            <span className="card-button-label">игроков</span>
          </button>
        ))}
      </div>
    </div>
  );
}
