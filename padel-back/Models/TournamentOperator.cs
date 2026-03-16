namespace padel.Models;

public class TournamentOperator
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
    public int CameraSide { get; set; }
    public bool IsActive { get; set; } = true;
}
