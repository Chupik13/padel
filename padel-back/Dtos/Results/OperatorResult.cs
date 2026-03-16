namespace padel.Dtos.Results;

public class OperatorResult
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int CameraSide { get; set; }
    public bool IsActive { get; set; }
}
