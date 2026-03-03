namespace padel.Dtos.Results;

public class LeaderBoardResult
{
    public int SeasonId { get; set; }
    public List<PlayerSeasonScoreResult> Players { get; set; } = [];
}
