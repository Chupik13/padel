using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class BadgeService(PadelDbContext db)
{
    public async Task<List<BadgeTypeResult>> GetBadgeTypes()
    {
        return await db.BadgeTypes.Select(bt => new BadgeTypeResult
        {
            Id = bt.Id,
            Key = bt.Key,
            NameRu = bt.NameRu,
            NameEn = bt.NameEn,
            Emoji = bt.Emoji
        }).ToListAsync();
    }

    public async Task<List<PlayerBadgeResult>> GetPlayerBadges(int playerId)
    {
        return await db.PlayerBadges
            .Include(pb => pb.BadgeType)
            .Where(pb => pb.PlayerId == playerId)
            .Select(pb => new PlayerBadgeResult
            {
                Id = pb.Id,
                PlayerId = pb.PlayerId,
                BadgeTypeId = pb.BadgeTypeId,
                BadgeKey = pb.BadgeType.Key,
                BadgeNameRu = pb.BadgeType.NameRu,
                BadgeNameEn = pb.BadgeType.NameEn,
                BadgeEmoji = pb.BadgeType.Emoji,
                AwardedAt = pb.AwardedAt,
                Note = pb.Note
            }).ToListAsync();
    }

    public async Task<PlayerBadgeResult?> AssignBadge(int playerId, int badgeTypeId, string? note)
    {
        var badgeType = await db.BadgeTypes.FindAsync(badgeTypeId);
        if (badgeType is null) return null;

        var playerBadge = new PlayerBadge
        {
            PlayerId = playerId,
            BadgeTypeId = badgeTypeId,
            AwardedAt = DateTime.UtcNow,
            Note = note
        };
        db.PlayerBadges.Add(playerBadge);
        await db.SaveChangesAsync();

        return new PlayerBadgeResult
        {
            Id = playerBadge.Id,
            PlayerId = playerBadge.PlayerId,
            BadgeTypeId = playerBadge.BadgeTypeId,
            BadgeKey = badgeType.Key,
            BadgeNameRu = badgeType.NameRu,
            BadgeNameEn = badgeType.NameEn,
            BadgeEmoji = badgeType.Emoji,
            AwardedAt = playerBadge.AwardedAt,
            Note = playerBadge.Note
        };
    }

    public async Task<bool> RemoveBadge(int playerBadgeId)
    {
        var badge = await db.PlayerBadges.FindAsync(playerBadgeId);
        if (badge is null) return false;
        db.PlayerBadges.Remove(badge);
        await db.SaveChangesAsync();
        return true;
    }
}
