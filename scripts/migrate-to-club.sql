-- Migration script: bind existing players and tournaments to a club
-- Usage: After creating a club through the UI, replace <CLUB_ID> with the actual club ID

-- Bind all existing players to the club
UPDATE "Players" SET "ClubId" = <CLUB_ID> WHERE "ClubId" IS NULL;

-- Bind all existing tournaments to the club
UPDATE "Tournaments" SET "ClubId" = <CLUB_ID> WHERE "ClubId" IS NULL;
