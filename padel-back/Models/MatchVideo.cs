namespace padel.Models;

public class MatchVideo
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;
    public int OperatorPlayerId { get; set; }
    public Player OperatorPlayer { get; set; } = null!;
    public int CameraSide { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime UploadedAt { get; set; }
    public string? MergedFilePath { get; set; }
    public MergeStatus MergeStatus { get; set; } = MergeStatus.Pending;
}

public enum MergeStatus
{
    Pending,
    Processing,
    Completed,
    Failed
}
