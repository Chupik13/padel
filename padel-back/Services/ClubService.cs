using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class ClubService(PadelDbContext db)
{
    public async Task<List<ClubResult>> GetAll()
    {
        return await db.Clubs
            .Where(c => !c.IsArchived)
            .Select(c => new ClubResult
            {
                Id = c.Id,
                Name = c.Name,
                ImageUrl = c.ImageUrl,
                MemberCount = c.PlayerClubs.Count,
                OwnerPlayerId = c.OwnerPlayerId
            })
            .ToListAsync();
    }

    public async Task<List<ClubResult>> GetMyClubs(int playerId)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player is null) return [];

        return await db.PlayerClubs
            .Where(pc => pc.PlayerId == playerId && !pc.Club.IsArchived)
            .Select(pc => new ClubResult
            {
                Id = pc.Club.Id,
                Name = pc.Club.Name,
                ImageUrl = pc.Club.ImageUrl,
                MemberCount = pc.Club.PlayerClubs.Count,
                IsPrimary = pc.ClubId == player.ClubId,
                OwnerPlayerId = pc.Club.OwnerPlayerId
            })
            .ToListAsync();
    }

    public async Task<ClubResult> Create(string name, int creatorPlayerId)
    {
        var club = new Club
        {
            Name = name,
            CreatedAt = DateTime.UtcNow,
            OwnerPlayerId = creatorPlayerId
        };
        db.Clubs.Add(club);
        await db.SaveChangesAsync();

        var player = await db.Players.FirstAsync(p => p.Id == creatorPlayerId);
        if (player.ClubId is null)
            player.ClubId = club.Id;

        db.PlayerClubs.Add(new PlayerClub
        {
            PlayerId = creatorPlayerId,
            ClubId = club.Id,
            JoinedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        return new ClubResult
        {
            Id = club.Id,
            Name = club.Name,
            ImageUrl = club.ImageUrl,
            MemberCount = 1,
            IsPrimary = true,
            OwnerPlayerId = club.OwnerPlayerId
        };
    }

    public async Task<bool> Join(int playerId, int clubId)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player is null) return false;

        var clubExists = await db.Clubs.AnyAsync(c => c.Id == clubId && !c.IsArchived);
        if (!clubExists) return false;

        var alreadyMember = await db.PlayerClubs.AnyAsync(pc => pc.PlayerId == playerId && pc.ClubId == clubId);
        if (alreadyMember) return false;

        db.PlayerClubs.Add(new PlayerClub
        {
            PlayerId = playerId,
            ClubId = clubId,
            JoinedAt = DateTime.UtcNow
        });

        // If player has no primary club, set this as primary
        if (player.ClubId is null)
            player.ClubId = clubId;

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> Leave(int playerId, int clubId)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player is null) return false;

        var membership = await db.PlayerClubs.FirstOrDefaultAsync(pc => pc.PlayerId == playerId && pc.ClubId == clubId);
        if (membership is null) return false;

        // Block if player has unfinished tournaments in this club
        var hasUnfinished = await db.Tournaments
            .Where(t => !t.IsFinished && !t.IsCancelled && t.ClubId == clubId)
            .Where(t => t.Matches.Any(m => m.TeamMatches.Any(tm =>
                tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))))
            .AnyAsync();
        if (hasUnfinished) return false;

        db.PlayerClubs.Remove(membership);

        // If leaving primary club, assign next one
        if (player.ClubId == clubId)
        {
            var nextClub = await db.PlayerClubs
                .Where(pc => pc.PlayerId == playerId && pc.ClubId != clubId)
                .OrderBy(pc => pc.JoinedAt)
                .FirstOrDefaultAsync();
            player.ClubId = nextClub?.ClubId;
        }

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetPrimaryClub(int playerId, int clubId)
    {
        var isMember = await db.PlayerClubs.AnyAsync(pc => pc.PlayerId == playerId && pc.ClubId == clubId);
        if (!isMember) return false;

        var player = await db.Players.FirstAsync(p => p.Id == playerId);
        player.ClubId = clubId;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<(bool Success, string? Error)> Archive(int playerId, int clubId, bool isAdmin)
    {
        var club = await db.Clubs.FirstOrDefaultAsync(c => c.Id == clubId && !c.IsArchived);
        if (club is null) return (false, "not_found");

        if (!isAdmin && club.OwnerPlayerId != playerId)
            return (false, "forbidden");

        var hasUnfinished = await db.Tournaments
            .AnyAsync(t => t.ClubId == clubId && !t.IsFinished && !t.IsCancelled);
        if (hasUnfinished) return (false, "has_unfinished");

        club.IsArchived = true;

        // Remove all memberships
        var memberships = await db.PlayerClubs
            .Where(pc => pc.ClubId == clubId)
            .ToListAsync();
        db.PlayerClubs.RemoveRange(memberships);

        // Reassign primary club for affected players
        var affectedPlayerIds = memberships.Select(m => m.PlayerId).ToList();
        var affectedPlayers = await db.Players
            .Where(p => affectedPlayerIds.Contains(p.Id) && p.ClubId == clubId)
            .ToListAsync();

        foreach (var player in affectedPlayers)
        {
            var nextClub = await db.PlayerClubs
                .Where(pc => pc.PlayerId == player.Id && pc.ClubId != clubId)
                .OrderBy(pc => pc.JoinedAt)
                .FirstOrDefaultAsync();
            player.ClubId = nextClub?.ClubId;
        }

        await db.SaveChangesAsync();
        return (true, null);
    }
}
