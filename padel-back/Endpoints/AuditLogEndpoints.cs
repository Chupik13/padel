using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class AuditLogEndpoints
{
    public static void MapAuditLogEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/logs").RequireAuthorization();

        group.MapGet("/", async (int? page, int? pageSize, AuditLogService auditLogService, HttpContext httpContext, PadelDbContext db) =>
        {
            if (!await EndpointHelpers.IsAdmin(httpContext, db))
                return Results.Forbid();

            var p = page ?? 1;
            var ps = Math.Clamp(pageSize ?? 50, 1, 100);
            var logs = await auditLogService.GetLogs(p, ps);
            var total = await auditLogService.GetTotalCount();

            return Results.Ok(new { logs, total, page = p, pageSize = ps });
        });
    }
}
