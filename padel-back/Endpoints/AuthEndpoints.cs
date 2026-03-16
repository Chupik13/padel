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

        group.MapPost("/register", async (RegisterRequest request, AuthService authService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var result = await authService.Register(request.Login, request.Password, request.Name, request.Email, httpContext);
            if (result is null)
                return Results.Conflict(new { message = "User already exists" });

            await auditLogService.Log(result.Id, "register", $"login={request.Login}");

            return Results.Ok(new
            {
                result.Id, result.Login, result.Name, result.ImageUrl,
                HasEmail = !string.IsNullOrEmpty(request.Email),
                IsAdmin = false
            });
        });

        group.MapPost("/login", async (LoginRequest request, AuthService authService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var result = await authService.Login(request.Login, request.Password, httpContext);
            if (result is null)
                return Results.Unauthorized();

            await auditLogService.Log(result.Id, "login");

            var user = await db.Users.Include(u => u.Player).FirstOrDefaultAsync(u => u.Login == request.Login);
            return Results.Ok(new
            {
                result.Id, result.Login, result.Name, result.ImageUrl,
                HasEmail = user?.Email is not null,
                IsAdmin = user?.Player?.IsAdmin ?? false
            });
        });

        group.MapPost("/logout", async (HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var playerId = EndpointHelpers.GetPlayerId(httpContext);
            await auditLogService.Log(playerId, "logout");
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
                HasEmail = user?.Email is not null,
                IsAdmin = player.IsAdmin
            });
        }).RequireAuthorization();

        group.MapPost("/set-email", async (SetEmailRequest request, AuthService authService, HttpContext httpContext, PadelDbContext db, AuditLogService auditLogService) =>
        {
            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var user = await db.Users.FirstOrDefaultAsync(u => u.PlayerId == playerId);
            if (user is null)
                return Results.Unauthorized();

            var success = await authService.SetEmail(user.Id, request.Email);
            if (success)
                await auditLogService.Log(playerId, "set_email");
            return success ? Results.Ok() : Results.BadRequest();
        }).RequireAuthorization();

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, AuthService authService, HttpContext httpContext, AuditLogService auditLogService) =>
        {
            var lang = httpContext.Request.Headers.AcceptLanguage.ToString().Contains("ru") ? "ru" : "en";
            await authService.ForgotPassword(request.Login, lang);
            await auditLogService.Log(null, "forgot_password", $"login={request.Login}");
            return Results.Ok();
        });

        group.MapPost("/reset-password", async (ResetPasswordRequest request, AuthService authService, AuditLogService auditLogService) =>
        {
            var success = await authService.ResetPassword(request.Token, request.NewPassword);
            if (success)
                await auditLogService.Log(null, "reset_password");
            return success ? Results.Ok() : Results.BadRequest(new { message = "Invalid or expired token" });
        });
    }
}
