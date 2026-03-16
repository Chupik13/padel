using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchVideo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MatchVideos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MatchId = table.Column<int>(type: "integer", nullable: false),
                    OperatorPlayerId = table.Column<int>(type: "integer", nullable: false),
                    CameraSide = table.Column<int>(type: "integer", nullable: false),
                    FilePath = table.Column<string>(type: "text", nullable: false),
                    ContentType = table.Column<string>(type: "text", nullable: false),
                    FileSize = table.Column<long>(type: "bigint", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    MergedFilePath = table.Column<string>(type: "text", nullable: true),
                    MergeStatus = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MatchVideos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MatchVideos_Matches_MatchId",
                        column: x => x.MatchId,
                        principalTable: "Matches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MatchVideos_Players_OperatorPlayerId",
                        column: x => x.OperatorPlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TournamentOperators",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TournamentId = table.Column<int>(type: "integer", nullable: false),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    CameraSide = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TournamentOperators", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TournamentOperators_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TournamentOperators_Tournaments_TournamentId",
                        column: x => x.TournamentId,
                        principalTable: "Tournaments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MatchVideos_MatchId_CameraSide",
                table: "MatchVideos",
                columns: new[] { "MatchId", "CameraSide" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MatchVideos_OperatorPlayerId",
                table: "MatchVideos",
                column: "OperatorPlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentOperators_PlayerId",
                table: "TournamentOperators",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_TournamentOperators_TournamentId_CameraSide",
                table: "TournamentOperators",
                columns: new[] { "TournamentId", "CameraSide" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MatchVideos");

            migrationBuilder.DropTable(
                name: "TournamentOperators");
        }
    }
}
