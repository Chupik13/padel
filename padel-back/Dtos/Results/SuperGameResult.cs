namespace padel.Dtos.Results;

public class SuperGameResult
{
    public int TournamentId { get; set; }
    public bool IsFinished { get; set; }
    public List<PlayerScoreResult> Podium { get; set; } = [];
}
