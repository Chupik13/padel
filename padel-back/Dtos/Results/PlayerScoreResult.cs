namespace padel.Dtos.Results;

public class PlayerScoreResult
{
    public PlayerResult Player { get; set; } = null!;
    public double Score { get; set; }
}
