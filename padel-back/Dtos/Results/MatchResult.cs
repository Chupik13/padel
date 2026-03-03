namespace padel.Dtos.Results;

public class MatchResult
{
    public int Id { get; set; }
    public PlayerResult TeamOnePlayer1 { get; set; } = null!;
    public PlayerResult TeamOnePlayer2 { get; set; } = null!;
    public PlayerResult TeamTwoPlayer1 { get; set; } = null!;
    public PlayerResult TeamTwoPlayer2 { get; set; } = null!;
    public int TeamOneScore { get; set; }
    public int TeamTwoScore { get; set; }
}
