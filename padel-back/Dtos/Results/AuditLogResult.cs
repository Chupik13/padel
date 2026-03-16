namespace padel.Dtos.Results;

public class AuditLogResult
{
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string? PlayerName { get; set; }
    public string? PlayerLogin { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
}
