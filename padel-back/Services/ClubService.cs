using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class ClubService(PadelDbContext db)
{
    public async Task<List<ClubResult>> GetAll()
    {
        return await db.Clubs
            .Select(c => new ClubResult
            {
                Id = c.Id,
                Name = c.Name,
                MemberCount = c.Players.Count
            })
            .ToListAsync();
    }

    public async Task<ClubResult?> GetMyClub(int playerId)
    {
        var player = await db.Players.Include(p => p.Club).FirstOrDefaultAsync(p => p.Id == playerId);
        if (player?.Club is null) return null;

        var memberCount = await db.Players.CountAsync(p => p.ClubId == player.ClubId);

        return new ClubResult
        {
            Id = player.Club.Id,
            Name = player.Club.Name,
            MemberCount = memberCount
        };
    }

    public async Task<ClubResult> Create(string name, int creatorPlayerId)
    {
        var club = new Club
        {
            Name = name,
            CreatedAt = DateTime.UtcNow
        };
        db.Clubs.Add(club);
        await db.SaveChangesAsync();

        var player = await db.Players.FirstAsync(p => p.Id == creatorPlayerId);
        player.ClubId = club.Id;
        await db.SaveChangesAsync();

        return new ClubResult
        {
            Id = club.Id,
            Name = club.Name,
            MemberCount = 1
        };
    }

    public async Task<bool> Join(int playerId, int clubId)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player is null || player.ClubId is not null) return false;

        var clubExists = await db.Clubs.AnyAsync(c => c.Id == clubId);
        if (!clubExists) return false;

        player.ClubId = clubId;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> Leave(int playerId)
    {
        var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
        if (player is null || player.ClubId is null) return false;

        var hasUnfinished = await db.Tournaments
            .Where(t => !t.IsFinished && !t.IsCancelled)
            .Where(t => t.Matches.Any(m => m.TeamMatches.Any(tm =>
                tm.Team.PlayerTeams.Any(pt => pt.PlayerId == playerId))))
            .AnyAsync();
        if (hasUnfinished) return false;

        player.ClubId = null;
        await db.SaveChangesAsync();
        return true;
    }
}
