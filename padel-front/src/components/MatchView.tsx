import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Tournament, Player, Match } from '../types';

interface Props {
  tournament: Tournament;
  onUpdateScore: (matchIndex: number, score1: number | undefined, score2: number | undefined) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  onCancel?: () => void;
  onEarlyFinish?: () => void;
  onBecomeOperator?: () => void;
  readOnly?: boolean;
  hostName?: string;
  earlyFinishError?: string;
  hideControls?: boolean;
}

function getPlayer(players: Player[], id: number): Player | undefined {
  return players.find((p) => p.id === id);
}

function PlayerAvatar({ player }: { player: Player }) {
  return (
    <span className="avatar avatar-xs">
      {player.imageUrl ? <img src={player.imageUrl} alt="" /> : <span>{player.name[0]}</span>}
    </span>
  );
}

const CHART_COLORS = ['#9dbdba', '#93aec1', '#f8b042', '#ec6a52', '#f3b7ad', '#5A6A75'];

function computeProgressData(players: Player[], matches: Match[], upTo: number) {
  const cumulative = new Map<number, number[]>();
  for (const p of players) {
    cumulative.set(p.id, [0]);
  }
  for (let i = 0; i < upTo; i++) {
    const m = matches[i];
    const s1 = m.score1 ?? 0;
    const s2 = m.score2 ?? 0;
    const scored = m.score1 !== undefined;
    for (const p of players) {
      const arr = cumulative.get(p.id)!;
      const prev = arr[arr.length - 1];
      if (!scored) {
        arr.push(prev);
      } else if (m.team1.includes(p.id)) {
        arr.push(prev + s1);
      } else if (m.team2.includes(p.id)) {
        arr.push(prev + s2);
      } else {
        arr.push(prev);
      }
    }
  }
  return players.map((p) => ({ player: p, points: cumulative.get(p.id)! }));
}

function ProgressChart({ players, matches, upTo }: { players: Player[]; matches: Match[]; upTo: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const footer = document.querySelector('.match-footer');
      const footerTop = footer ? footer.getBoundingClientRect().top : window.innerHeight;
      const availableH = Math.max(0, footerTop - rect.top);
      setSize((prev) => ({ w: rect.width, h: prev.h === 0 ? availableH : Math.min(prev.h, availableH) }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = computeProgressData(players, matches, upTo);
  const maxPts = Math.max(1, ...data.map((d) => Math.max(...d.points)));
  const totalMatches = matches.length;
  const sorted = [...data].sort((a, b) => b.points[b.points.length - 1] - a.points[a.points.length - 1]);

  if (totalMatches === 0) {
    return <div className="progress-chart" ref={containerRef} />;
  }

  const avatarR = 12;

  const renderChart = (w: number, h: number, showAvatarsOnLine: boolean) => {
    // Pre-calculate collisions to determine right padding
    const minGap = avatarR * 2 + 4;
    const avatarCols = sorted.map(() => 0);
    if (showAvatarsOnLine) {
      // Use a temporary scale just for collision detection
      const tmpChartH = h - (avatarR + 4) * 2;
      const tmpY = (v: number) => (avatarR + 4) + tmpChartH - (v / maxPts) * tmpChartH;
      for (let i = 0; i < sorted.length; i++) {
        const yi = tmpY(sorted[i].points[sorted[i].points.length - 1]);
        for (let j = 0; j < i; j++) {
          const yj = tmpY(sorted[j].points[sorted[j].points.length - 1]);
          if (Math.abs(yi - yj) < minGap && avatarCols[i] === avatarCols[j]) {
            avatarCols[i]++;
          }
        }
      }
    }
    const maxCol = Math.max(0, ...avatarCols);

    const pad = {
      top: showAvatarsOnLine ? avatarR + 4 : 4,
      right: showAvatarsOnLine ? (maxCol + 1) * (avatarR * 2 + 4) + avatarR + 4 : 4,
      bottom: showAvatarsOnLine ? avatarR + 20 : 4,
      left: showAvatarsOnLine ? 30 : 4,
    };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const xScale = (i: number) => pad.left + (totalMatches === 1 ? chartW : (i / totalMatches) * chartW);
    const yScale = (v: number) => pad.top + chartH - (v / maxPts) * chartH;

    // Y axis tick values
    const yTicks: number[] = [];
    if (showAvatarsOnLine) {
      const step = Math.max(1, Math.ceil(maxPts / 4));
      for (let v = 0; v <= maxPts; v += step) yTicks.push(v);
      if (yTicks[yTicks.length - 1] < maxPts) yTicks.push(maxPts);
    }

    return (
      <svg width={w} height={h}>
        <defs>
          {sorted.map((d) => (
            <clipPath key={d.player.id} id={`avatar-clip-${d.player.id}${showAvatarsOnLine ? '-full' : ''}`}>
              <circle cx="0" cy="0" r={avatarR} />
            </clipPath>
          ))}
        </defs>
        {showAvatarsOnLine && (
          <>
            {/* Y axis */}
            {yTicks.map((v) => (
              <g key={`y-${v}`}>
                <line x1={pad.left} y1={yScale(v)} x2={w - pad.right} y2={yScale(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <text x={pad.left - 6} y={yScale(v) + 4} fill="#5A6A75" fontSize="11" textAnchor="end">{v}</text>
              </g>
            ))}
            {/* X axis */}
            {Array.from({ length: totalMatches + 1 }, (_, i) => (
              i > 0 && (i % Math.ceil(totalMatches / 8) === 0 || i === totalMatches) ? (
                <text key={`x-${i}`} x={xScale(i)} y={h - 4} fill="#5A6A75" fontSize="11" textAnchor="middle">{i}</text>
              ) : null
            ))}
          </>
        )}
        {sorted.map((d, idx) => {
          const color = CHART_COLORS[players.findIndex((p) => p.id === d.player.id) % CHART_COLORS.length];
          const pts = d.points.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
          return (
            <g key={d.player.id}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {showAvatarsOnLine && (() => {
                const lastX = xScale(upTo);
                const lastY = yScale(d.points[d.points.length - 1]);
                const col = avatarCols[idx];
                const ax = lastX + avatarR + 4 + col * (avatarR * 2 + 4);
                const clipId = `avatar-clip-${d.player.id}-full`;
                return d.player.imageUrl ? (
                  <g transform={`translate(${ax}, ${lastY})`}>
                    <circle r={avatarR + 1.5} fill={color} />
                    <image href={d.player.imageUrl} x={-avatarR} y={-avatarR} width={avatarR * 2} height={avatarR * 2} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
                  </g>
                ) : (
                  <g transform={`translate(${ax}, ${lastY})`}>
                    <circle r={avatarR} fill={color} />
                    <text fill="#E8EEF3" fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="central">{d.player.name[0]}</text>
                  </g>
                );
              })()}
            </g>
          );
        })}
      </svg>
    );
  };

  if (size.w === 0 || size.h === 0) {
    return <div className="progress-chart" ref={containerRef} />;
  }

  return (
    <>
      <div className="progress-chart" ref={containerRef} onClick={() => setExpanded(true)}>
        <div className="progress-chart-inner">
          <div className="progress-chart-legend">
            {(() => {
              const itemSize = Math.min(32, Math.floor(size.h / 3));
              const maxMargin = Math.max(0, size.h - itemSize - 10);

              return sorted.map((d) => {
                const pts = d.points[d.points.length - 1];
                const progress = totalMatches > 1 ? upTo / (totalMatches - 1) : 0;
                const fraction = maxPts > 0 ? (pts / maxPts) * progress : 0;
                const mb = fraction * maxMargin;
                const color = CHART_COLORS[players.findIndex((p) => p.id === d.player.id) % CHART_COLORS.length];
                return (
                  <div key={d.player.id} className="progress-legend-item" style={{ borderColor: color, width: itemSize, height: itemSize, marginBottom: mb }}>
                    {d.player.imageUrl ? (
                      <img src={d.player.imageUrl} alt="" className="progress-legend-avatar" />
                    ) : (
                      <span className="progress-legend-letter" style={{ background: color }}>{d.player.name[0]}</span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="modal-overlay" onClick={() => setExpanded(false)}>
          <div className="progress-chart-fullscreen" onClick={(e) => e.stopPropagation()}>
            {renderChart(Math.min(window.innerWidth - 64, 600 - 32), window.innerHeight * 0.75, true)}
            <button className="btn btn-secondary progress-chart-close" onClick={() => setExpanded(false)}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) onSwipeLeft();
    else onSwipeRight();
  }, [onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}

export default function MatchView({ tournament, onUpdateScore, onNext, onPrev, onFinish, onCancel, onEarlyFinish, onBecomeOperator, readOnly = false, hostName, earlyFinishError, hideControls = false }: Props) {
  const { players, matches, currentMatchIndex } = tournament;
  const safeIndex = matches.length > 0 ? Math.min(currentMatchIndex, matches.length - 1) : 0;
  const match = matches.length > 0 ? matches[safeIndex] : undefined;
  const isLast = safeIndex === matches.length - 1;
  const isFirst = safeIndex === 0;
  const { t } = useTranslation();

  const [score1, setScore1] = useState(match?.score1?.toString() ?? '');
  const [score2, setScore2] = useState(match?.score2?.toString() ?? '');
  const [finishModal, setFinishModal] = useState<'menu' | 'earlyFinish' | 'cancel' | null>(null);
  const [matchElapsed, setMatchElapsed] = useState('');
  const [tournamentElapsed, setTournamentElapsed] = useState('');
  const [activeTab, setActiveTab] = useState<'match' | 'stats'>('match');

  const swipe = useSwipe(
    () => setActiveTab('stats'),
    () => setActiveTab('match'),
  );

  const tournamentStartedAt = matches[0]?.startedAt;

  useEffect(() => {
    setScore1(match?.score1?.toString() ?? '');
    setScore2(match?.score2?.toString() ?? '');
  }, [safeIndex, match?.score1, match?.score2]);

  useEffect(() => {
    const fmt = (ms: number) => {
      if (ms < 0) return '';
      const mins = Math.floor(ms / 60000);
      const secs = Math.floor((ms % 60000) / 1000);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    const update = () => {
      const now = Date.now();
      if (match?.startedAt) {
        setMatchElapsed(fmt(now - new Date(match.startedAt).getTime()));
      } else {
        setMatchElapsed('');
      }
      if (tournamentStartedAt) {
        setTournamentElapsed(fmt(now - new Date(tournamentStartedAt).getTime()));
      } else {
        setTournamentElapsed('');
      }
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [match?.startedAt, tournamentStartedAt]);

  if (!match) {
    return (
      <div className="screen center-content">
        <p className="subtitle">{t('match.noMatches')}</p>
        {onCancel && (
          <button className="btn btn-danger" style={{ maxWidth: 360, width: '100%', flex: 'none' }} onClick={onCancel}>
            {t('match.cancelTournament')}
          </button>
        )}
      </div>
    );
  }

  const saveScores = () => {
    if (readOnly) return;
    if (score1 === '' && score2 === '') return;
    const s1 = score1 === '' ? undefined : parseInt(score1) || 0;
    const s2 = score2 === '' ? undefined : parseInt(score2) || 0;
    onUpdateScore(safeIndex, s1, s2);
  };

  const handleNext = () => {
    saveScores();
    if (isLast) {
      onFinish();
    } else {
      onNext();
    }
  };

  const handlePrev = () => {
    saveScores();
    onPrev();
  };

  const progress = ((safeIndex + 1) / matches.length) * 100;

  return (
    <div className="screen" {...swipe}>
      {readOnly && (
        <div className="spectator-badge">
          {t('match.spectator')}{hostName && <span className="host-badge"> &middot; {t('match.host', { name: hostName })}</span>}
        </div>
      )}
      {finishModal === 'menu' && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-actions">
              {onEarlyFinish && (
                <button className="btn btn-danger" disabled={safeIndex / matches.length < 0.6} onClick={() => setFinishModal('earlyFinish')}>
                  {t('match.earlyFinish')}
                </button>
              )}
              {onCancel && (
                <button className="btn btn-danger" onClick={() => setFinishModal('cancel')}>
                  {t('match.cancelTournament')}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setFinishModal(null)}>
                {t('common.back')}
              </button>
            </div>
          </div>
        </div>
      )}
      {(finishModal === 'earlyFinish' || finishModal === 'cancel') && (
        <div className="modal-overlay">
          <div className="modal">
            <p>{finishModal === 'earlyFinish' ? t('match.earlyFinishConfirm') : t('match.cancelConfirm')}</p>
            <div className="button-row">
              <button className="btn btn-secondary" onClick={() => setFinishModal('menu')}>
                {t('common.back')}
              </button>
              <button className="btn btn-danger" onClick={() => {
                const action = finishModal;
                setFinishModal(null);
                if (action === 'earlyFinish') onEarlyFinish?.();
                else onCancel?.();
              }}>
                {finishModal === 'earlyFinish' ? t('match.finishBtn') : t('match.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      {earlyFinishError && <p className="error" style={{ textAlign: 'center', marginBottom: 8 }}>{earlyFinishError}</p>}
      <div className="match-header">
        <div className="match-toggle">
          <button className={`match-toggle-btn ${activeTab === 'match' ? 'active' : ''}`} onClick={() => setActiveTab('match')}>
            {t('match.tabMatch')}
          </button>
          <button className={`match-toggle-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            {t('match.tabTournament')}
          </button>
        </div>
      </div>
      {activeTab === 'match' && (
        <div className="match-content">
          <div className="match-progress-row">
            <div className="match-counter">{t('match.counter', { current: safeIndex + 1, total: matches.length })}</div>
            {!readOnly && (onEarlyFinish || onCancel) && (
              <button className="match-finish-btn" onClick={() => setFinishModal('menu')}>
                {t('match.finishBtn')}
              </button>
            )}
            {readOnly && onBecomeOperator && (
              <button className="match-finish-btn" onClick={onBecomeOperator}>
                {t('video.joinAsOperator')}
              </button>
            )}
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          {(tournamentElapsed || matchElapsed) && (
            <div className="match-timer">
              {tournamentElapsed && <span className="timer-tournament">{tournamentElapsed}</span>}
              {matchElapsed && <span className="timer-match">{matchElapsed}</span>}
            </div>
          )}
          <div className="match-teams">
            <div className="team-card">
              <div className="team-label">{t('match.team1')}</div>
              <div className="team-players">
                {match.team1.map((id) => {
                  const p = getPlayer(players, id);
                  return p ? (
                    <span key={id} className="team-player-name"><PlayerAvatar player={p} /> {p.name}</span>
                  ) : (
                    <span key={id}>#{id}</span>
                  );
                })}
              </div>
              {!hideControls && (
                <input
                  className="score-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={score1}
                  disabled={readOnly}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScore1(val);
                    const num = parseInt(val);
                    if (val !== '' && !isNaN(num) && num >= 0 && num <= 16) {
                      setScore2((16 - num).toString());
                    }
                  }}
                  onBlur={saveScores}
                />
              )}
            </div>

            <div className="vs">VS</div>

            <div className="team-card">
              <div className="team-label">{t('match.team2')}</div>
              <div className="team-players team-players-right">
                {match.team2.map((id) => {
                  const p = getPlayer(players, id);
                  return p ? (
                    <span key={id} className="team-player-name">{p.name} <PlayerAvatar player={p} /></span>
                  ) : (
                    <span key={id}>#{id}</span>
                  );
                })}
              </div>
              {!hideControls && (
                <input
                  className="score-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={score2}
                  disabled={readOnly}
                  onChange={(e) => {
                    const val = e.target.value;
                    setScore2(val);
                    const num = parseInt(val);
                    if (val !== '' && !isNaN(num) && num >= 0 && num <= 16) {
                      setScore1((16 - num).toString());
                    }
                  }}
                  onBlur={saveScores}
                />
              )}
            </div>
          </div>
          {match.resting.length > 0 && (
            <div className="resting">
              {t('match.resting', { names: match.resting.map((id) => getPlayer(players, id)?.name ?? `#${id}`).join(', ') })}
            </div>
          )}
          <div className="finish-line"></div>
          <ProgressChart players={players} matches={matches} upTo={safeIndex} />
        </div>
      )}

        {activeTab === 'stats' && (
          <div className="match-stats-scroll">
            <table className="results-table match-table">
              <thead>
                <tr><th style={{ width: '45%' }}>{t('match.team1')}</th><th style={{ width: 'auto', textAlign: 'center' }}></th><th style={{ width: '45%', textAlign: 'right' }}>{t('match.team2')}</th></tr>
              </thead>
              <tbody>
                {matches.map((m, i) => (
                  <tr key={i} className={i === safeIndex ? 'current-match-row' : ''}>
                    <td className="match-table-names">{getPlayer(players, m.team1[0])?.name ?? `#${m.team1[0]}`}, {getPlayer(players, m.team1[1])?.name ?? `#${m.team1[1]}`}</td>
                    <td className="match-table-score">
                      {m.score1 !== undefined ? `${m.score1}:${m.score2}` : 'vs'}
                    </td>
                    <td className="match-table-names">{getPlayer(players, m.team2[0])?.name ?? `#${m.team2[0]}`}, {getPlayer(players, m.team2[1])?.name ?? `#${m.team2[1]}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {!readOnly && !hideControls && activeTab === 'match' && (
        <div className="match-footer">
          <div className="button-row">
            <button className="btn btn-secondary" onClick={handlePrev} disabled={isFirst}>
              {t('common.back')}
            </button>
            <button className="btn btn-primary" onClick={handleNext} style={isLast ? { fontSize: '0.85rem' } : undefined}>
              {isLast ? t('match.finish') : t('match.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
