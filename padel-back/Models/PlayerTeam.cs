namespace padel.Models;

public class PlayerTeam
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;
}
