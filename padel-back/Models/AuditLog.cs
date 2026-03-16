namespace padel.Models;

public class AuditLog
{
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public int? PlayerId { get; set; }
    public Player? Player { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Details { get; set; }
}
