namespace padel.Models;

public class Club
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? OwnerPlayerId { get; set; }
    public Player? OwnerPlayer { get; set; }
    public bool IsArchived { get; set; }
    public List<Player> Players { get; set; } = [];
    public List<PlayerClub> PlayerClubs { get; set; } = [];
    public List<Tournament> Tournaments { get; set; } = [];
}
