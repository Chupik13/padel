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
    public DbSet<PlayerClub> PlayerClubs => Set<PlayerClub>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<BadgeType> BadgeTypes => Set<BadgeType>();
    public DbSet<PlayerBadge> PlayerBadges => Set<PlayerBadge>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

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

        modelBuilder.Entity<Club>(entity =>
        {
            entity.HasOne(c => c.OwnerPlayer)
                .WithMany()
                .HasForeignKey(c => c.OwnerPlayerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PlayerClub>(entity =>
        {
            entity.HasIndex(pc => new { pc.PlayerId, pc.ClubId }).IsUnique();
            entity.HasOne(pc => pc.Player)
                .WithMany(p => p.PlayerClubs)
                .HasForeignKey(pc => pc.PlayerId);
            entity.HasOne(pc => pc.Club)
                .WithMany(c => c.PlayerClubs)
                .HasForeignKey(pc => pc.ClubId);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasIndex(t => t.Token).IsUnique();
            entity.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId);
        });

        modelBuilder.Entity<Season>(entity =>
        {
            entity.HasOne(s => s.SuperGameTournament)
                .WithOne()
                .HasForeignKey<Season>(s => s.SuperGameTournamentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BadgeType>(entity =>
        {
            entity.HasIndex(bt => bt.Key).IsUnique();
        });

        modelBuilder.Entity<PlayerBadge>(entity =>
        {
            entity.HasIndex(pb => new { pb.PlayerId, pb.BadgeTypeId });
            entity.HasOne(pb => pb.Player)
                .WithMany(p => p.PlayerBadges)
                .HasForeignKey(pb => pb.PlayerId);
            entity.HasOne(pb => pb.BadgeType)
                .WithMany(bt => bt.PlayerBadges)
                .HasForeignKey(pb => pb.BadgeTypeId);
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasIndex(l => l.Timestamp);
            entity.HasOne(l => l.Player)
                .WithMany()
                .HasForeignKey(l => l.PlayerId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
