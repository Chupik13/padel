namespace padel.Models;

public class Season
{
    public int Id { get; set; }
    public DateTime SeasonStart { get; set; }
    public DateTime SeasonEnd { get; set; }
    public int RequireGamesCount { get; set; }
    public List<Tournament> Tournaments { get; set; } = [];
    public int? SuperGameTournamentId { get; set; }
    public Tournament? SuperGameTournament { get; set; }
}
