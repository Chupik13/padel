using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public static class TournamentMapper
{
    public static PlayerResult MapPlayer(Player player) => new()
    {
        Id = player.Id,
        Name = player.Name,
        Login = player.Login,
        ImageUrl = player.ImageUrl
    };

    public static TournamentResult ToResult(Tournament tournament)
    {
        var matches = tournament.Matches
            .Where(m => m.TeamMatches.Count >= 2 && 
                        m.TeamMatches[0].Team.PlayerTeams.Count >= 2 && 
                        m.TeamMatches[1].Team.PlayerTeams.Count >= 2)
            .OrderBy(m => m.MatchOrder)
            .Select(match =>
        {
            var teamOne = match.TeamMatches[0];
            var teamTwo = match.TeamMatches[1];
            var teamOnePlayers = teamOne.Team.PlayerTeams.Select(pt => pt.Player).ToList();
            var teamTwoPlayers = teamTwo.Team.PlayerTeams.Select(pt => pt.Player).ToList();

            return new MatchResult
            {
                Id = match.Id,
                TeamOnePlayer1 = MapPlayer(teamOnePlayers[0]),
                TeamOnePlayer2 = MapPlayer(teamOnePlayers[1]),
                TeamTwoPlayer1 = MapPlayer(teamTwoPlayers[0]),
                TeamTwoPlayer2 = MapPlayer(teamTwoPlayers[1]),
                TeamOneScore = teamOne.Score,
                TeamTwoScore = teamTwo.Score,
                StartedAt = match.StartedAt
            };
        }).ToList();

        // Calculate player scores: sum of team scores / number of matches
        var playerScores = new Dictionary<int, (Player Player, double TotalScore, int MatchCount)>();

        foreach (var match in tournament.Matches)
        {
            foreach (var teamMatch in match.TeamMatches)
            {
                foreach (var pt in teamMatch.Team.PlayerTeams)
                {
                    if (!playerScores.ContainsKey(pt.PlayerId))
                        playerScores[pt.PlayerId] = (pt.Player, 0, 0);

                    var current = playerScores[pt.PlayerId];
                    playerScores[pt.PlayerId] = (current.Player, current.TotalScore + teamMatch.Score, current.MatchCount + 1);
                }
            }
        }

        var results = playerScores.Values
            .Select(ps => new PlayerScoreResult
            {
                Player = MapPlayer(ps.Player),
                Score = ps.MatchCount > 0 ? Math.Round((double)ps.TotalScore / ps.MatchCount, 2) : 0
            })
            .OrderByDescending(ps => ps.Score)
            .ToList();

        return new TournamentResult
        {
            Id = tournament.Id,
            Date = tournament.Date,
            Matches = matches,
            IsBalanced = tournament.IsBalanced,
            SeasonId = tournament.SeasonId,
            Results = results,
            CurrentMatchIndex = tournament.CurrentMatchIndex,
            HostPlayerId = tournament.HostPlayerId,
            IsFinished = tournament.IsFinished,
            IsEarlyFinished = tournament.IsEarlyFinished,
            IsCancelled = tournament.IsCancelled,
            FinishedAt = tournament.FinishedAt
        };
    }
}
