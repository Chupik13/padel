using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/profile").RequireAuthorization();

        group.MapGet("/", async (HttpContext httpContext, ProfileService profileService) =>
        {
            var login = httpContext.User.FindFirstValue(ClaimTypes.Name)!;
            var result = await profileService.GetProfile(login);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapGet("/mini", async (HttpContext httpContext, ProfileService profileService) =>
        {
            var login = httpContext.User.FindFirstValue(ClaimTypes.Name)!;
            var result = await profileService.GetMiniProfile(login);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        group.MapPost("/avatar", async (IFormFile file, HttpContext httpContext, PadelDbContext db, AvatarService avatarService) =>
        {
            var login = httpContext.User.FindFirstValue(ClaimTypes.Name)!;
            var player = await db.Players.FirstOrDefaultAsync(p => p.Login == login);
            if (player is null) return Results.NotFound();

            await using var stream = file.OpenReadStream();
            player.ImageUrl = await avatarService.ProcessAndSaveAvatar(stream, player.Id);
            await db.SaveChangesAsync();

            return Results.Ok();
        }).DisableAntiforgery();

        group.MapGet("/{userLogin}", async (string userLogin, ProfileService profileService) =>
        {
            var result = await profileService.GetProfile(userLogin);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });
    }
}
