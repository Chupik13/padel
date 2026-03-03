namespace padel.Models;

public class Team
{
    public int Id { get; set; }
    public List<PlayerTeam> PlayerTeams { get; set; } = [];
    public List<TeamMatch> TeamMatches { get; set; } = [];
}
