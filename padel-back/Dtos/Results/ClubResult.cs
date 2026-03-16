namespace padel.Dtos.Results;

public class ClubResult
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int MemberCount { get; set; }
    public bool IsPrimary { get; set; }
    public int? OwnerPlayerId { get; set; }
}

public class ClubMiniResult
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
