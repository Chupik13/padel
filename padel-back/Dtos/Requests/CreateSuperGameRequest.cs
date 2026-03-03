namespace padel.Dtos.Requests;

public class CreateSuperGameRequest
{
    public List<MatchSetupRequest> Matches { get; set; } = [];
}
