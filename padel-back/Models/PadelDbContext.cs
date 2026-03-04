using Microsoft.EntityFrameworkCore;

namespace padel.Models;

public class PadelDbContext(DbContextOptions<PadelDbContext> options) : DbContext(options)
{
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<PlayerTeam> PlayerTeams => Set<PlayerTeam>();
    public DbSet<TeamMatch> TeamMatches => Set<TeamMatch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Club> Clubs => Set<Club>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Player>(entity =>
        {
            entity.HasIndex(p => p.Login).IsUnique();
            entity.HasOne(p => p.Club)
                .WithMany(c => c.Players)
                .HasForeignKey(p => p.ClubId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Login).IsUnique();
            entity.HasOne(u => u.Player)
                .WithOne()
                .HasForeignKey<User>(u => u.PlayerId);
        });

        modelBuilder.Entity<PlayerTeam>(entity =>
        {
            entity.HasIndex(pt => new { pt.PlayerId, pt.TeamId }).IsUnique();
            entity.HasOne(pt => pt.Player)
                .WithMany(p => p.PlayerTeams)
                .HasForeignKey(pt => pt.PlayerId);
            entity.HasOne(pt => pt.Team)
                .WithMany(t => t.PlayerTeams)
                .HasForeignKey(pt => pt.TeamId);
        });

        modelBuilder.Entity<TeamMatch>(entity =>
        {
            entity.HasIndex(tm => new { tm.TeamId, tm.MatchId }).IsUnique();
            entity.HasOne(tm => tm.Team)
                .WithMany(t => t.TeamMatches)
                .HasForeignKey(tm => tm.TeamId);
            entity.HasOne(tm => tm.Match)
                .WithMany(m => m.TeamMatches)
                .HasForeignKey(tm => tm.MatchId);
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.HasOne(m => m.Tournament)
                .WithMany(t => t.Matches)
                .HasForeignKey(m => m.TournamentId);
        });

        modelBuilder.Entity<Tournament>(entity =>
        {
            entity.HasOne(t => t.Season)
                .WithMany(s => s.Tournaments)
                .HasForeignKey(t => t.SeasonId);
            entity.HasOne(t => t.Club)
                .WithMany(c => c.Tournaments)
                .HasForeignKey(t => t.ClubId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Season>(entity =>
        {
            entity.HasOne(s => s.SuperGameTournament)
                .WithOne()
                .HasForeignKey<Season>(s => s.SuperGameTournamentId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
