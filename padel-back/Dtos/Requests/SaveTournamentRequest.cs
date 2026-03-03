namespace padel.Dtos.Requests;

public class SaveTournamentRequest
{
    public bool IsBalanced { get; set; }
    public bool InSeason { get; set; }
    public List<MatchRequest> Matches { get; set; } = [];
}
