namespace padel.Dtos.Results;

public class GlobalPlayerStats
{
    public PlayerResult Player { get; set; } = null!;
    public int TotalGames { get; set; }
    public double TotalPoints { get; set; }
    public double AveragePointsPerGame { get; set; }
    public int SeasonGames { get; set; }
    public double SeasonTotalPoints { get; set; }
    public double SeasonAveragePoints { get; set; }
}

public class GlobalLeaderboardResult
{
    public List<GlobalPlayerStats> Players { get; set; } = [];
}
