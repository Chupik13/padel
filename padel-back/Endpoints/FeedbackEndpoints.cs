using System.Net.Mail;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Requests;
using padel.Models;
using padel.Services;

namespace padel.Endpoints;

public static class FeedbackEndpoints
{
    public static void MapFeedbackEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/feedback");

        group.MapPost("/", async (FeedbackRequest request, HttpContext httpContext, PadelDbContext db, EmailService emailService, AuditLogService auditLogService) =>
        {
            if (string.IsNullOrWhiteSpace(request.Message))
                return Results.BadRequest(new { message = "Message is required" });

            var playerIdStr = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (playerIdStr is null || !int.TryParse(playerIdStr, out var playerId))
                return Results.Unauthorized();

            var player = await db.Players.FirstOrDefaultAsync(p => p.Id == playerId);
            if (player is null)
                return Results.Unauthorized();

            string? senderEmail = null;
            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                try { _ = new MailAddress(request.Email); }
                catch (FormatException) { return Results.BadRequest(new { message = "Invalid email" }); }
                senderEmail = request.Email.Trim();
            }
            else
            {
                senderEmail = (await db.Users.FirstOrDefaultAsync(u => u.PlayerId == playerId))?.Email;
            }

            try
            {
                await emailService.SendFeedbackEmail(
                    player.Name,
                    senderEmail,
                    request.Subject,
                    request.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Feedback] Email send failed: {ex.Message}");
                return Results.StatusCode(500);
            }

            await auditLogService.Log(playerId, "send_feedback", request.Subject);
            return Results.Ok();
        }).RequireAuthorization();
    }
}
