namespace padel.Models;

public class Club
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<Player> Players { get; set; } = [];
    public List<Tournament> Tournaments { get; set; } = [];
}
