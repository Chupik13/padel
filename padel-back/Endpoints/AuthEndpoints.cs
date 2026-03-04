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
            var result = await authService.Register(request.Login, request.Password, request.Name, request.Email, httpContext);
            if (result is null)
                return Results.Conflict(new { message = "User already exists" });

            return Results.Ok(new
            {
                result.Id, result.Login, result.Name, result.ImageUrl,
                HasEmail = !string.IsNullOrEmpty(request.Email)
            });
        });

        group.MapPost("/login", async (LoginRequest request, AuthService authService, HttpContext httpContext, PadelDbContext db) =>
        {
            var result = await authService.Login(request.Login, request.Password, httpContext);
            if (result is null)
                return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.Login == request.Login);
            return Results.Ok(new
            {
                result.Id, result.Login, result.Name, result.ImageUrl,
                HasEmail = user?.Email is not null
            });
        });

        group.MapPost("/logout", async (HttpContext httpContext) =>
        {
            await httpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Ok();
        }).RequireAuthorization();

        group.MapGet("/me", async (HttpContext httpContext, PadelDbContext db, AuthService authService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
            if (player is null)
                return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.PlayerId == playerId);
            var mapped = TournamentMapper.MapPlayer(player);

            return Results.Ok(new
            {
                mapped.Id,
                mapped.Login,
                mapped.Name,
                mapped.ImageUrl,
                HasEmail = user?.Email is not null
            });
        }).RequireAuthorization();

        group.MapPost("/set-email", async (SetEmailRequest request, AuthService authService, HttpContext httpContext, PadelDbContext db) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.PlayerId == playerId);
            if (user is null)
                return Results.Unauthorized();

            var success = await authService.SetEmail(user.Id, request.Email);
            return success ? Results.Ok() : Results.BadRequest();
        }).RequireAuthorization();

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, AuthService authService, HttpContext httpContext) =>
        {
            var lang = httpContext.Request.Headers.AcceptLanguage.ToString().Contains("ru") ? "ru" : "en";
            await authService.ForgotPassword(request.Login, lang);
            return Results.Ok();
        });

        group.MapPost("/reset-password", async (ResetPasswordRequest request, AuthService authService) =>
        {
            var success = await authService.ResetPassword(request.Token, request.NewPassword);
            return success ? Results.Ok() : Results.BadRequest(new { message = "Invalid or expired token" });
        });
    }
}
