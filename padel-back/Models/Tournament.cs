namespace padel.Models;

public class Tournament
{
    public int Id { get; set; }
    public DateTime Date { get; set; }
    public bool IsBalanced { get; set; }
    public int? SeasonId { get; set; }
    public Season? Season { get; set; }
    public List<Match> Matches { get; set; } = [];
    public int CurrentMatchIndex { get; set; }
    public int? HostPlayerId { get; set; }
    public bool IsFinished { get; set; }
    public bool IsEarlyFinished { get; set; }
    public bool IsCancelled { get; set; }
    public int? ClubId { get; set; }
    public Club? Club { get; set; }
}
