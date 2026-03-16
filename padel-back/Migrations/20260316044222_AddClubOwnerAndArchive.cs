using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddClubOwnerAndArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "Clubs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "OwnerPlayerId",
                table: "Clubs",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clubs_OwnerPlayerId",
                table: "Clubs",
                column: "OwnerPlayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Clubs_Players_OwnerPlayerId",
                table: "Clubs",
                column: "OwnerPlayerId",
                principalTable: "Players",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Seed: set OwnerPlayerId to the earliest member of each club
            migrationBuilder.Sql("""
                UPDATE "Clubs" SET "OwnerPlayerId" = sub."PlayerId"
                FROM (SELECT DISTINCT ON ("ClubId") "ClubId", "PlayerId"
                      FROM "PlayerClubs" ORDER BY "ClubId", "JoinedAt") sub
                WHERE "Clubs"."Id" = sub."ClubId"
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clubs_Players_OwnerPlayerId",
                table: "Clubs");

            migrationBuilder.DropIndex(
                name: "IX_Clubs_OwnerPlayerId",
                table: "Clubs");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "Clubs");

            migrationBuilder.DropColumn(
                name: "OwnerPlayerId",
                table: "Clubs");
        }
    }
}
