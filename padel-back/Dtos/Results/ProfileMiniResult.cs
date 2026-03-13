namespace padel.Dtos.Results;

public class ProfileMiniResult
{
    public string Name { get; set; } = string.Empty;
    public double SeasonScore { get; set; }
    public int? ClubId { get; set; }
    public string? ClubName { get; set; }
    public List<ClubMiniResult> Clubs { get; set; } = [];
}
