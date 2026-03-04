namespace padel.Models;

public class User
{
    public int Id { get; set; }
    public string Login { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Email { get; set; }
    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
}
