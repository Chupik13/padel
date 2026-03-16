using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class RemovePlayerBadgeUniqueConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlayerBadges_PlayerId_BadgeTypeId",
                table: "PlayerBadges");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerBadges_PlayerId_BadgeTypeId",
                table: "PlayerBadges",
                columns: new[] { "PlayerId", "BadgeTypeId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlayerBadges_PlayerId_BadgeTypeId",
                table: "PlayerBadges");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerBadges_PlayerId_BadgeTypeId",
                table: "PlayerBadges",
                columns: new[] { "PlayerId", "BadgeTypeId" },
                unique: true);
        }
    }
}
