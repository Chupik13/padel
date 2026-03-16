import type { Match } from '../types';

/** All combinations of `k` elements from `arr` */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

/** 3 ways to split 4 players into 2 pairs */
function pairings(four: number[]): [number, number, number, number][] {
  const [a, b, c, d] = four;
  return [
    [a, b, c, d], // AB vs CD
    [a, c, b, d], // AC vs BD
    [a, d, b, c], // AD vs BC
  ];
}

/** Target k: how many times each pair should be teammates */
function targetK(n: number): number {
  if (n === 4) return 1;
  if (n === 5) return 1;
  if (n === 6) return 2;
  if (n === 7) return 2;
  return 1;
}

/** Encode a pair as string key */
function pairKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

type MatchCandidate = {
  team1: [number, number];
  team2: [number, number];
  resting: number[];
  teamPairs: [string, string]; // precomputed pair keys
};

export function generateSchedule(playerIds: number[], customK?: number, latePlayerIds?: Set<number>): Match[] {
  const n = playerIds.length;
  const k = customK ?? targetK(n);

  // Build pair count map
  const allPairKeys: string[] = [];
  const pairCounts: Record<string, number> = {};
  for (const [a, b] of combinations(playerIds, 2)) {
    const key = pairKey(a, b);
    allPairKeys.push(key);
    pairCounts[key] = 0;
  }

  // Generate all possible matches, indexed by which pair they cover
  const candidatesByPair: Record<string, MatchCandidate[]> = {};
  for (const key of allPairKeys) {
    candidatesByPair[key] = [];
  }

  for (const four of combinations(playerIds, 4)) {
    const resting = playerIds.filter((id) => !four.includes(id));
    for (const [a, b, c, d] of pairings(four)) {
      const p1 = pairKey(a, b);
      const p2 = pairKey(c, d);
      const cand: MatchCandidate = {
        team1: [a, b],
        team2: [c, d],
        resting,
        teamPairs: [p1, p2],
      };
      candidatesByPair[p1].push(cand);
      candidatesByPair[p2].push(cand);
    }
  }

  const totalPairs = allPairKeys.length;
  const expectedMatches = (totalPairs * k) / 2;
  const result: MatchCandidate[] = [];
  const usedSet = new Set<MatchCandidate>();

  // Pre-seed: ensure at least one match where all late players rest
  if (latePlayerIds && latePlayerIds.size > 0) {
    const nonLate = playerIds.filter((id) => !latePlayerIds.has(id));
    if (nonLate.length >= 4) {
      const searchKey = pairKey(nonLate[0], nonLate[1]);
      for (const cand of candidatesByPair[searchKey] ?? []) {
        if ([...latePlayerIds].every((id) => cand.resting.includes(id))) {
          const [p1, p2] = cand.teamPairs;
          if (pairCounts[p1] < k && pairCounts[p2] < k) {
            pairCounts[p1]++;
            pairCounts[p2]++;
            result.push(cand);
            usedSet.add(cand);
            break;
          }
        }
      }
    }
  }

  function backtrack(): boolean {
    if (result.length === expectedMatches) return true;

    // Find the pair with the smallest count (that hasn't reached k yet)
    let minCount = k;
    let minPair = '';
    for (const key of allPairKeys) {
      if (pairCounts[key] < minCount) {
        minCount = pairCounts[key];
        minPair = key;
        if (minCount === 0) break; // Can't do better than 0
      }
    }

    if (!minPair) return false;

    // Only try candidates that cover this specific pair
    for (const cand of candidatesByPair[minPair]) {
      if (usedSet.has(cand)) continue;
      const [p1, p2] = cand.teamPairs;
      if (pairCounts[p1] >= k || pairCounts[p2] >= k) continue;

      // Apply
      pairCounts[p1]++;
      pairCounts[p2]++;
      result.push(cand);
      usedSet.add(cand);

      if (backtrack()) return true;

      // Undo
      result.pop();
      usedSet.delete(cand);
      pairCounts[p1]--;
      pairCounts[p2]--;
    }

    return false;
  }

  backtrack();

  // Fallback: if backtracking couldn't fill (e.g. 4 players k>1 — only 3 unique matches),
  // use generateFixedSchedule which supports repeating candidates
  if (result.length < expectedMatches) {
    return generateFixedSchedule(playerIds, expectedMatches, latePlayerIds);
  }

  const matches: Match[] = result.map((m) => ({
    team1: m.team1,
    team2: m.team2,
    resting: m.resting,
  }));

  return reorderMatches(matches, latePlayerIds);
}

export function generateFixedSchedule(playerIds: number[], matchCount: number, latePlayerIds?: Set<number>): Match[] {
  // Build all match candidates
  const candidates: MatchCandidate[] = [];
  for (const four of combinations(playerIds, 4)) {
    const resting = playerIds.filter((id) => !four.includes(id));
    for (const [a, b, c, d] of pairings(four)) {
      candidates.push({
        team1: [a, b],
        team2: [c, d],
        resting,
        teamPairs: [pairKey(a, b), pairKey(c, d)],
      });
    }
  }

  const playCounts: Record<number, number> = {};
  for (const id of playerIds) playCounts[id] = 0;

  const teamPairCounts: Record<string, number> = {};
  for (const [a, b] of combinations(playerIds, 2)) {
    teamPairCounts[pairKey(a, b)] = 0;
  }

  const result: MatchCandidate[] = [];
  const usedIndices = new Set<number>();

  // Pre-pick: ensure at least one match where all late players rest
  if (latePlayerIds && latePlayerIds.size > 0) {
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const cand = candidates[i];
      if (![...latePlayerIds].every((id) => cand.resting.includes(id))) continue;
      const playing = [...cand.team1, ...cand.team2];
      const playScore = playing.reduce((s, id) => s + playCounts[id], 0);
      const pairScore = cand.teamPairs.reduce((s, pk) => s + teamPairCounts[pk], 0);
      const score = playScore * 1000 + pairScore * 10;
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx >= 0) {
      const chosen = candidates[bestIdx];
      usedIndices.add(bestIdx);
      result.push(chosen);
      for (const id of [...chosen.team1, ...chosen.team2]) playCounts[id]++;
      for (const pk of chosen.teamPairs) teamPairCounts[pk]++;
    }
  }

  for (let pick = result.length; pick < matchCount; pick++) {
    // Reset used set if all candidates exhausted (4-player case: only 3 unique groups×pairings)
    if (usedIndices.size === candidates.length) {
      usedIndices.clear();
    }

    let bestIdx = -1;
    let bestScore = Infinity;

    for (let i = 0; i < candidates.length; i++) {
      if (usedIndices.has(i)) continue;
      const cand = candidates[i];

      const playing = [...cand.team1, ...cand.team2];
      const playScore = playing.reduce((s, id) => s + playCounts[id], 0);
      const pairScore = cand.teamPairs.reduce((s, k) => s + teamPairCounts[k], 0);
      const restScore = cand.resting.reduce((s, id) => s + playCounts[id], 0);

      const score = playScore * 1000 + pairScore * 10 - restScore;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const chosen = candidates[bestIdx];
    usedIndices.add(bestIdx);
    result.push(chosen);

    // Update counts
    for (const id of [...chosen.team1, ...chosen.team2]) playCounts[id]++;
    for (const k of chosen.teamPairs) teamPairCounts[k]++;
  }

  const matches: Match[] = result.map((m) => ({
    team1: m.team1,
    team2: m.team2,
    resting: m.resting,
  }));

  return reorderMatches(matches, latePlayerIds);
}

/** Reorder matches for even rest distribution (greedy multi-penalty). */
function reorderMatches(matches: Match[], latePlayerIds?: Set<number>): Match[] {
  if (matches.length <= 1) return matches;

  const late = latePlayerIds ?? new Set<number>();

  // Collect all resting player ids
  const allRestingIds = new Set<number>();
  for (const m of matches) for (const id of m.resting) allRestingIds.add(id);

  const remaining = new Set(matches.map((_, i) => i));
  const ordered: Match[] = [];

  // Track per-player rest info
  const restCount: Record<number, number> = {};
  const lastRestIndex: Record<number, number> = {};
  for (const id of allRestingIds) {
    restCount[id] = 0;
    lastRestIndex[id] = -Infinity;
  }

  // Total rests per player expected
  const totalRests: Record<number, number> = {};
  for (const id of allRestingIds) {
    totalRests[id] = matches.filter((m) => m.resting.includes(id)).length;
  }

  // Pick the first match: if late players exist, choose match where most late players rest
  let firstIdx = 0;
  if (late.size > 0) {
    let bestFirst = -1;
    let bestFirstPenalty = Infinity;
    for (const i of remaining) {
      const m = matches[i];
      const restingSet = new Set(m.resting);
      let penalty = 0;
      for (const lateId of late) {
        if (!restingSet.has(lateId)) penalty += 10000;
      }
      if (penalty < bestFirstPenalty) {
        bestFirstPenalty = penalty;
        bestFirst = i;
      }
    }
    firstIdx = bestFirst;
  }

  remaining.delete(firstIdx);
  ordered.push(matches[firstIdx]);
  for (const id of matches[firstIdx].resting) {
    restCount[id]++;
    lastRestIndex[id] = 0;
  }

  while (remaining.size > 0) {
    const currentIdx = ordered.length;
    const prevResting = new Set(ordered[ordered.length - 1].resting);

    let bestMatchIdx = -1;
    let bestPenalty = Infinity;

    // Ideal gap between rests for each player
    const idealGap: Record<number, number> = {};
    for (const id of allRestingIds) {
      idealGap[id] = totalRests[id] > 0 ? matches.length / totalRests[id] : matches.length;
    }

    for (const i of remaining) {
      const m = matches[i];
      let penalty = 0;

      for (const id of m.resting) {
        // Overlap penalty: player rested in previous match
        if (prevResting.has(id)) penalty += 100;

        // Balance penalty: penalize players who already rested more than average
        const expectedSoFar = (totalRests[id] * currentIdx) / matches.length;
        penalty += Math.abs(restCount[id] - expectedSoFar) * 10;

        // Gap penalty: penalize if gap since last rest is too small
        const gap = Math.min(currentIdx - lastRestIndex[id], matches.length);
        if (gap < idealGap[id] * 0.5) {
          penalty += (idealGap[id] - gap) * 5;
        }

        // Fatigue bonus: prioritize rest for players who played too many in a row
        if (gap > idealGap[id]) {
          penalty -= (gap - idealGap[id]) * 20;
        }
      }

      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestMatchIdx = i;
      }
    }

    remaining.delete(bestMatchIdx);
    const chosen = matches[bestMatchIdx];
    ordered.push(chosen);
    for (const id of chosen.resting) {
      restCount[id]++;
      lastRestIndex[id] = currentIdx;
    }
  }

  return balanceTeamOrder(ordered);
}

/** Balance team order so each player is "first in team" roughly equally. */
function balanceTeamOrder(matches: Match[]): Match[] {
  const firstCount: Record<number, number> = {};
  const result: Match[] = [];

  for (const m of matches) {
    // For each team, check if swapping would improve balance
    const t1 = [...m.team1] as [number, number];
    const t2 = [...m.team2] as [number, number];

    // Team 1: swap if second player has been first less often, or randomly on tie
    const c1a = firstCount[t1[0]] ?? 0;
    const c1b = firstCount[t1[1]] ?? 0;
    if (c1a > c1b || (c1a === c1b && Math.random() < 0.5)) t1.reverse();

    // Team 2: same logic
    const c2a = firstCount[t2[0]] ?? 0;
    const c2b = firstCount[t2[1]] ?? 0;
    if (c2a > c2b || (c2a === c2b && Math.random() < 0.5)) t2.reverse();

    // Update counts
    firstCount[t1[0]] = (firstCount[t1[0]] ?? 0) + 1;
    firstCount[t2[0]] = (firstCount[t2[0]] ?? 0) + 1;

    result.push({ ...m, team1: t1 as [number, number], team2: t2 as [number, number] });
  }

  return result;
}
