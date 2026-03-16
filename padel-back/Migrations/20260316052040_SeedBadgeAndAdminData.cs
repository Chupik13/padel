using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class SeedBadgeAndAdminData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO "BadgeTypes" ("Key", "NameRu", "NameEn", "Emoji")
                VALUES ('leg_of_season', 'Нога сезона', 'Leg of the Season', '/badges/leg-cast.svg')
                ON CONFLICT ("Key") DO UPDATE SET "Emoji" = EXCLUDED."Emoji";
                """);

            migrationBuilder.Sql("""
                UPDATE "Players" SET "IsAdmin" = true WHERE "Login" IN ('t224215', 'admin');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
