namespace padel.Dtos.Requests;

public class UpdateScoreRequest
{
    public int MatchIndex { get; set; }
    public int TeamOneScore { get; set; }
    public int TeamTwoScore { get; set; }
}
