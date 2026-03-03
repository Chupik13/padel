namespace padel.Dtos.Requests;

public class MatchRequest
{
    public TeamRequest TeamOne { get; set; } = null!;
    public TeamRequest TeamTwo { get; set; } = null!;
}
