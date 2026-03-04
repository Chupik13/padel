using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class AddClubs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ClubId",
                table: "Tournaments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClubId",
                table: "Players",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Clubs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Clubs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tournaments_ClubId",
                table: "Tournaments",
                column: "ClubId");

            migrationBuilder.CreateIndex(
                name: "IX_Players_ClubId",
                table: "Players",
                column: "ClubId");

            migrationBuilder.AddForeignKey(
                name: "FK_Players_Clubs_ClubId",
                table: "Players",
                column: "ClubId",
                principalTable: "Clubs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Tournaments_Clubs_ClubId",
                table: "Tournaments",
                column: "ClubId",
                principalTable: "Clubs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Players_Clubs_ClubId",
                table: "Players");

            migrationBuilder.DropForeignKey(
                name: "FK_Tournaments_Clubs_ClubId",
                table: "Tournaments");

            migrationBuilder.DropTable(
                name: "Clubs");

            migrationBuilder.DropIndex(
                name: "IX_Tournaments_ClubId",
                table: "Tournaments");

            migrationBuilder.DropIndex(
                name: "IX_Players_ClubId",
                table: "Players");

            migrationBuilder.DropColumn(
                name: "ClubId",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "ClubId",
                table: "Players");
        }
    }
}
