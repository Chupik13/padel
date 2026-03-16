using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddBadgeSystemAndIsAdmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAdmin",
                table: "Players",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BadgeTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Key = table.Column<string>(type: "text", nullable: false),
                    NameRu = table.Column<string>(type: "text", nullable: false),
                    NameEn = table.Column<string>(type: "text", nullable: false),
                    Emoji = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadgeTypes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlayerBadges",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    BadgeTypeId = table.Column<int>(type: "integer", nullable: false),
                    AwardedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerBadges", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerBadges_BadgeTypes_BadgeTypeId",
                        column: x => x.BadgeTypeId,
                        principalTable: "BadgeTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlayerBadges_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadgeTypes_Key",
                table: "BadgeTypes",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerBadges_BadgeTypeId",
                table: "PlayerBadges",
                column: "BadgeTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PlayerBadges_PlayerId_BadgeTypeId",
                table: "PlayerBadges",
                columns: new[] { "PlayerId", "BadgeTypeId" },
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO "BadgeTypes" ("Key", "NameRu", "NameEn", "Emoji")
                VALUES ('leg_of_season', 'Нога сезона', 'Leg of the Season', '/badges/leg-cast.svg');
                """);

            migrationBuilder.Sql("""
                UPDATE "Players" SET "IsAdmin" = true WHERE "Login" IN ('t224215', 'admin');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PlayerBadges");

            migrationBuilder.DropTable(
                name: "BadgeTypes");

            migrationBuilder.DropColumn(
                name: "IsAdmin",
                table: "Players");
        }
    }
}
