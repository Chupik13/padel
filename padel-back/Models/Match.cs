namespace padel.Models;

public class Match
{
    public int Id { get; set; }
    public int TournamentId { get; set; }
    public Tournament Tournament { get; set; } = null!;
    public List<TeamMatch> TeamMatches { get; set; } = [];
    public int MatchOrder { get; set; }
    public DateTime? StartedAt { get; set; }
    public List<MatchVideo> Videos { get; set; } = [];
}
