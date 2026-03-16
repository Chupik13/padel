namespace padel.Models;

public class BadgeType
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string NameRu { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
    public List<PlayerBadge> PlayerBadges { get; set; } = [];
}
