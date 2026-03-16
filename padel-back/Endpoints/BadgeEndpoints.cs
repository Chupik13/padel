using padel.Dtos.Requests;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class BadgeEndpoints
{
    public static void MapBadgeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/badges").RequireAuthorization();

        group.MapGet("/types", async (BadgeService badgeService) =>
        {
            var result = await badgeService.GetBadgeTypes();
            return Results.Ok(result);
        });

        group.MapGet("/player/{playerId:int}", async (int playerId, BadgeService badgeService) =>
        {
            var result = await badgeService.GetPlayerBadges(playerId);
            return Results.Ok(result);
        });

        group.MapPost("/", async (AssignBadgeRequest request, BadgeService badgeService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            if (!await EndpointHelpers.IsAdmin(httpContext, db))
                return Results.Forbid();

            var result = await badgeService.AssignBadge(request.PlayerId, request.BadgeTypeId, request.Note);
            if (result is not null)
                await auditLogService.Log(EndpointHelpers.GetPlayerId(httpContext), "assign_badge", $"playerId={request.PlayerId}, badgeTypeId={request.BadgeTypeId}");
            return result is not null ? Results.Created($"/api/badges/{result.Id}", result) : Results.BadRequest();
        });

        group.MapDelete("/{id:int}", async (int id, BadgeService badgeService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            if (!await EndpointHelpers.IsAdmin(httpContext, db))
                return Results.Forbid();

            var success = await badgeService.RemoveBadge(id);
            if (success)
                await auditLogService.Log(EndpointHelpers.GetPlayerId(httpContext), "remove_badge", $"badgeId={id}");
            return success ? Results.NoContent() : Results.NotFound();
        });
    }
}
