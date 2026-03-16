namespace padel.Models;

public class Player
{
    public int Id { get; set; }
    public string Login { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int? ClubId { get; set; }
    public Club? Club { get; set; }
    public List<PlayerTeam> PlayerTeams { get; set; } = [];
    public List<PlayerClub> PlayerClubs { get; set; } = [];
    public bool IsAdmin { get; set; }
    public List<PlayerBadge> PlayerBadges { get; set; } = [];
}
