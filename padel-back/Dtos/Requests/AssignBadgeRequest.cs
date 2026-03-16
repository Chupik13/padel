namespace padel.Dtos.Requests;

public record AssignBadgeRequest(int PlayerId, int BadgeTypeId, string? Note);
