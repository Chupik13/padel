using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth");

        group.MapPost("/register", async (RegisterRequest request, AuthService authService, HttpContext httpContext) =>
        {
            var result = await authService.Register(request.Login, request.Password, request.Name, httpContext);
            return result is null
                ? Results.Conflict(new { message = "User already exists" })
                : Results.Ok(result);
        });

        group.MapPost("/login", async (LoginRequest request, AuthService authService, HttpContext httpContext) =>
        {
            var result = await authService.Login(request.Login, request.Password, httpContext);
            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        });

        group.MapPost("/logout", async (HttpContext httpContext) =>
        {
            await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok();
        }).RequireAuthorization();

        group.MapGet("/me", async (HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
            if (player is null)
                return Results.Unauthorized();

            return Results.Ok(TournamentMapper.MapPlayer(player));
        }).RequireAuthorization();
    }
}
