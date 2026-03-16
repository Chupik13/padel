using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace padel.Migrations
{
    /// <inheritdoc />
    public partial class SeedNewAutoBadges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                INSERT INTO "BadgeTypes" ("Key", "NameRu", "NameEn", "Emoji")
                VALUES
                    ('most_active', 'Жесть я активный', 'Super Active', '/badges/most-active.svg'),
                    ('almost_win', 'Почти победа', 'Almost Victory', '/badges/almost-win.svg'),
                    ('almost_loss', 'Почти луз', 'Almost Loss', '/badges/almost-loss.svg'),
                    ('on_fire', 'Попёрло', 'On Fire', '/badges/on-fire.svg')
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
                DELETE FROM "BadgeTypes" WHERE "Key" IN ('most_active', 'almost_win', 'almost_loss', 'on_fire');
                """);
        }
    }
}
