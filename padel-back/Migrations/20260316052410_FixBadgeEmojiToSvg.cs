using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class FixBadgeEmojiToSvg : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "BadgeTypes" SET "Emoji" = '/badges/leg-cast.svg' WHERE "Key" = 'leg_of_season';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
