namespace padel.Dtos.Requests;

public class FeedbackRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Email { get; set; }
}
