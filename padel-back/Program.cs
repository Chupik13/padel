using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using padel.Endpoints;
using padel.Hubs;
using padel.Models;
using padel.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<PadelDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.ExpireTimeSpan = TimeSpan.FromDays(365 * 10);
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = 401;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = 403;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProfileService>();
builder.Services.AddScoped<TournamentService>();
builder.Services.AddScoped<PlayerService>();
builder.Services.AddScoped<SeasonService>();
builder.Services.AddScoped<AvatarService>();
builder.Services.AddScoped<ClubService>();
builder.Services.AddScoped<BadgeService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<VideoService>();
builder.Services.AddHostedService<SeasonBackgroundService>();
builder.Services.AddHostedService<TournamentAutoCleanupService>();
builder.Services.AddHostedService<VideoMergeBackgroundService>();
builder.Services.AddSignalR();

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 500 * 1024 * 1024; // 500 MB
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(10);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(2);
    // Disable minimum data rate to prevent Kestrel from killing slow mobile uploads
    options.Limits.MinRequestBodyDataRate = null;
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<PadelDbContext>();
    db.Database.Migrate();

    var avatarService = scope.ServiceProvider.GetRequiredService<AvatarService>();
    await avatarService.MigrateExistingAvatars(app.Services);
}

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapProfileEndpoints();
app.MapTournamentEndpoints();
app.MapPlayerEndpoints();
app.MapSeasonEndpoints();
app.MapClubEndpoints();
app.MapBadgeEndpoints();
app.MapFeedbackEndpoints();
app.MapAuditLogEndpoints();
app.MapVideoEndpoints();
app.MapHub<TournamentHub>("/hubs/tournament");

app.Run();
