using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class AuditLogService(PadelDbContext db)
{
    public async Task Log(int? playerId, string action, string? details = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            Timestamp = DateTime.UtcNow,
            PlayerId = playerId,
            Action = action,
            Details = details
        });
        await db.SaveChangesAsync();
    }

    public async Task<List<AuditLogResult>> GetLogs(int page, int pageSize)
    {
        return await db.AuditLogs
            .Include(l => l.Player)
            .OrderByDescending(l => l.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new AuditLogResult
            {
                Id = l.Id,
                Timestamp = l.Timestamp,
                PlayerName = l.Player != null ? l.Player.Name : null,
                PlayerLogin = l.Player != null ? l.Player.Login : null,
                Action = l.Action,
                Details = l.Details
            })
            .ToListAsync();
    }

    public async Task<int> GetTotalCount()
    {
        return await db.AuditLogs.CountAsync();
    }
}
