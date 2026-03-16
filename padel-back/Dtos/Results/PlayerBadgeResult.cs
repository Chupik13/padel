namespace padel.Dtos.Results;

public class PlayerBadgeResult
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public int BadgeTypeId { get; set; }
    public string BadgeKey { get; set; } = string.Empty;
    public string BadgeNameRu { get; set; } = string.Empty;
    public string BadgeNameEn { get; set; } = string.Empty;
    public string BadgeEmoji { get; set; } = string.Empty;
    public DateTime AwardedAt { get; set; }
    public string? Note { get; set; }
}
