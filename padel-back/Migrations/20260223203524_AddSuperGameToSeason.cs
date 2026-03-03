using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddSuperGameToSeason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SuperGameTournamentId",
                table: "Seasons",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Seasons_SuperGameTournamentId",
                table: "Seasons",
                column: "SuperGameTournamentId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Seasons_Tournaments_SuperGameTournamentId",
                table: "Seasons",
                column: "SuperGameTournamentId",
                principalTable: "Tournaments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Seasons_Tournaments_SuperGameTournamentId",
                table: "Seasons");

            migrationBuilder.DropIndex(
                name: "IX_Seasons_SuperGameTournamentId",
                table: "Seasons");

            migrationBuilder.DropColumn(
                name: "SuperGameTournamentId",
                table: "Seasons");
        }
    }
}
