namespace padel.Dtos.Results;

public class ProfileResult
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public SeasonStatisticResult? CurrentSeason { get; set; }
    public List<SeasonStatisticResult> PreviousSeasons { get; set; } = [];
    public List<TournamentResult> PlayerTournaments { get; set; } = [];
}
