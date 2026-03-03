namespace padel.Dtos.Requests;

public class CreateLiveTournamentRequest
{
    public bool IsBalanced { get; set; }
    public bool InSeason { get; set; }
    public List<MatchSetupRequest> Matches { get; set; } = [];
}

public class MatchSetupRequest
{
    public TeamSetupRequest TeamOne { get; set; } = null!;
    public TeamSetupRequest TeamTwo { get; set; } = null!;
}

public class TeamSetupRequest
{
    public int FirstPlayerId { get; set; }
    public int SecondPlayerId { get; set; }
}
