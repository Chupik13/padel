namespace padel.Dtos.Results;

public class PlayerSeasonScoreResult : PlayerScoreResult
{
    public double MediumScoreByTournaments { get; set; }
    public int TournamentsPlayed { get; set; }
}
