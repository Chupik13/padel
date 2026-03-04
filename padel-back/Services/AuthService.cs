using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class AuthService(PadelDbContext db, EmailService emailService)
{
    public async Task<PlayerResult?> Register(string login, string password, string name, string email, HttpContext httpContext)
    {
        if (await db.Users.AnyAsync(u => u.Login == login))
            return null;

        var player = new Player
        {
            Login = login,
            Name = name
        };
        db.Players.Add(player);
        await db.SaveChangesAsync();

        var user = new User
        {
            Login = login,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Email = email.Trim().ToLowerInvariant(),
            PlayerId = player.Id
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await SignIn(user, httpContext);

        return TournamentMapper.MapPlayer(player);
    }

    public async Task<PlayerResult?> Login(string login, string password, HttpContext httpContext)
    {
        var user = await db.Users.Include(u => u.Player).FirstOrDefaultAsync(u => u.Login == login);
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        await SignIn(user, httpContext);

        return TournamentMapper.MapPlayer(user.Player);
    }

    public async Task<bool> SetEmail(int userId, string email)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return false;

        user.Email = email.Trim().ToLowerInvariant();
        await db.SaveChangesAsync();
        return true;
    }

    public async Task ForgotPassword(string login, string lang)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Login == login);
        if (user?.Email is null) return;

        var tokenBytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(tokenBytes)
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

        var resetToken = new PasswordResetToken
        {
            UserId = user.Id,
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            IsUsed = false
        };
        db.PasswordResetTokens.Add(resetToken);
        await db.SaveChangesAsync();

        await emailService.SendPasswordResetEmail(user.Email, token, lang);
    }

    public async Task<bool> ResetPassword(string token, string newPassword)
    {
        var resetToken = await db.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token);

        if (resetToken is null || resetToken.IsUsed || resetToken.ExpiresAt < DateTime.UtcNow)
            return false;

        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        resetToken.IsUsed = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> HasEmail(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        return user?.Email is not null;
    }

    private static async Task SignIn(User user, HttpContext httpContext)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Login),
            new(ClaimTypes.NameIdentifier, user.PlayerId.ToString())
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties
            {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddYears(10)
            });
    }
}
