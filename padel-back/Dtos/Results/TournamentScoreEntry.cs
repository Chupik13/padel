namespace padel.Dtos.Results;

public class TournamentScoreEntry
{
    public DateTime Date { get; set; }
    public double AverageScore { get; set; }
    public bool IsCounted { get; set; }
}
