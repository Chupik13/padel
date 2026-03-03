namespace padel.Dtos.Results;

public class SeasonResult
{
    public int Id { get; set; }
    public DateTime SeasonStart { get; set; }
    public DateTime SeasonEnd { get; set; }
    public int RequireGamesCount { get; set; }
    public int TournamentsPlayed { get; set; }
    public bool IsCurrent { get; set; }
    public LeaderBoardResult LeaderBoard { get; set; } = null!;
    public SuperGameResult? SuperGame { get; set; }
}
