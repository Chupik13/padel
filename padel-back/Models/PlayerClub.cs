namespace padel.Models;

public class PlayerClub
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
    public int ClubId { get; set; }
    public Club Club { get; set; } = null!;
    public DateTime JoinedAt { get; set; }
}
