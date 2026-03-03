using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace padel.Services;

public class AvatarService(IWebHostEnvironment env)
{
    private string AvatarsDir => Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "avatars");

    public async Task<string> ProcessAndSaveAvatar(Stream inputStream, int playerId)
    {
        Directory.CreateDirectory(AvatarsDir);

        // Delete old avatar files for this player
        foreach (var oldFile in Directory.GetFiles(AvatarsDir, $"{playerId}.*"))
            File.Delete(oldFile);

        using var image = await Image.LoadAsync(inputStream);

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(256, 256),
            Mode = ResizeMode.Crop
        }));

        var fileName = $"{playerId}.webp";
        var filePath = Path.Combine(AvatarsDir, fileName);

        await image.SaveAsWebpAsync(filePath, new WebpEncoder { Quality = 80 });

        return $"/avatars/{fileName}";
    }

    public async Task MigrateExistingAvatars(IServiceProvider serviceProvider)
    {
        if (!Directory.Exists(AvatarsDir)) return;

        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<padel.Models.PadelDbContext>();

        var players = db.Players.Where(p => p.ImageUrl != null && !p.ImageUrl.EndsWith(".webp")).ToList();

        foreach (var player in players)
        {
            var oldPath = Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), player.ImageUrl!.TrimStart('/'));
            if (!File.Exists(oldPath)) continue;

            try
            {
                await using var stream = File.OpenRead(oldPath);
                player.ImageUrl = await ProcessAndSaveAvatar(stream, player.Id);

                // Delete old file if it's different from the new one
                if (File.Exists(oldPath) && !oldPath.EndsWith(".webp"))
                    File.Delete(oldPath);
            }
            catch
            {
                // Skip files that can't be processed
            }
        }

        await db.SaveChangesAsync();
    }
}
