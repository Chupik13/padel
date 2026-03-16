namespace padel.Models;

public class PlayerBadge
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
    public int BadgeTypeId { get; set; }
    public BadgeType BadgeType { get; set; } = null!;
    public DateTime AwardedAt { get; set; }
    public string? Note { get; set; }
}
