using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using padel.Dtos.Results;
using padel.Models;

namespace padel.Services;

public class AuthService(PadelDbContext db)
{
    public async Task<PlayerResult?> Register(string login, string password, string name, HttpContext httpContext)
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
