namespace padel.Dtos.Results;

public class PlayerResult
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Login { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsAdmin { get; set; }
}
