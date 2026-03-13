using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerClubTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PlayerClubs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    ClubId = table.Column<int>(type: "integer", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerClubs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerClubs_Clubs_ClubId",
                        column: x => x.ClubId,
                        principalTable: "Clubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlayerClubs_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerClubs_ClubId",
                table: "PlayerClubs",
                column: "ClubId");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerClubs_PlayerId_ClubId",
                table: "PlayerClubs",
                columns: new[] { "PlayerId", "ClubId" },
                unique: true);

            // Seed: copy existing Player.ClubId memberships into PlayerClubs
            migrationBuilder.Sql(
                """
                INSERT INTO "PlayerClubs" ("PlayerId", "ClubId", "JoinedAt")
                SELECT "Id", "ClubId", NOW() AT TIME ZONE 'UTC'
                FROM "Players"
                WHERE "ClubId" IS NOT NULL
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerClubs");
        }
    }
}
