using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentVideoMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasVideoMode",
                table: "Tournaments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsGameStarted",
                table: "Tournaments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // All existing tournaments are non-video, so mark them as started
            migrationBuilder.Sql("UPDATE \"Tournaments\" SET \"IsGameStarted\" = true WHERE \"HasVideoMode\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HasVideoMode",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "IsGameStarted",
                table: "Tournaments");
        }
    }
}
