namespace padel.Dtos.Results;

public class MatchVideoResult
{
    public int MatchId { get; set; }
    public string? VideoUrl { get; set; }
    public bool HasBothSides { get; set; }
    public string MergeStatus { get; set; } = string.Empty;
}
