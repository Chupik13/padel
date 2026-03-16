using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class SeedSeasonMedalBadges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO "BadgeTypes" ("Key", "NameRu", "NameEn", "Emoji")
                VALUES
                    ('gold_medal', 'Золотая медаль', 'Gold Medal', '/badges/gold-medal.svg'),
                    ('silver_medal', 'Серебряная медаль', 'Silver Medal', '/badges/silver-medal.svg'),
                    ('bronze_medal', 'Бронзовая медаль', 'Bronze Medal', '/badges/bronze-medal.svg')
                ON CONFLICT ("Key") DO UPDATE SET
                    "NameRu" = EXCLUDED."NameRu",
                    "NameEn" = EXCLUDED."NameEn",
                    "Emoji" = EXCLUDED."Emoji";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DELETE FROM "BadgeTypes" WHERE "Key" IN ('gold_medal', 'silver_medal', 'bronze_medal');
                """);
        }
    }
}
