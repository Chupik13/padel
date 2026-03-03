namespace padel.Dtos.Requests;

public class GetTournamentsRequest
{
    public int? SeasonId { get; set; }
    public int? PlayerId { get; set; }
    public bool? IsBalanced { get; set; }
    public bool? InSeason { get; set; }
}
