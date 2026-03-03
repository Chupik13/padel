namespace padel.Dtos.Results;

public class TournamentResult
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public List<MatchResult> Matches { get; set; } = [];
    public bool IsBalanced { get; set; }
    public int? SeasonId { get; set; }
    public List<PlayerScoreResult> Results { get; set; } = [];
    public int CurrentMatchIndex { get; set; }
    public int? HostPlayerId { get; set; }
    public bool IsFinished { get; set; }
    public bool IsCancelled { get; set; }
}
