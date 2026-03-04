namespace padel.Dtos.Results;

public class SeasonStatisticResult
{
    public int SeasonId { get; set; }
    public double Score { get; set; }
    public double MediumScoreAllTournaments { get; set; }
    public int TournamentsPlayed { get; set; }
    public int TournamentsRequired { get; set; }
    public int RatingPlace { get; set; }
    public int? SuperGamePlace { get; set; }
}
