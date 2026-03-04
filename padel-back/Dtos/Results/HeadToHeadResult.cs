namespace padel.Dtos.Results;

public class HeadToHeadResult
{
    public PlayerResult Player1 { get; set; } = null!;
    public PlayerResult Player2 { get; set; } = null!;
    public int MatchesAsOpponents { get; set; }
    public int Player1Wins { get; set; }
    public int Player2Wins { get; set; }
    public int Draws { get; set; }
    public int MatchesAsPartners { get; set; }
    public int WinsAsPartners { get; set; }
    public double WinRateAsPartners { get; set; }
    public double Player1AvgScore { get; set; }
    public double Player2AvgScore { get; set; }
}
