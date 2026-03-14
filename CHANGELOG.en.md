# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2026-03-15

### Added

- **7-player support** — the game now supports 4, 5, 6 and 7 players.
  - Seasonal: 21 matches (balanced, k=2).
  - Friendly: 7 (fixed), 14 (fixed), or 21 (balanced) matches.
  - Each match: 4 play, 3 rest.
- **Club avatars** — club members can upload a club avatar. Displayed in club lists, club page, and club selection when creating a tournament.
- **Club name in tournament history** — tournament cards now show the club name where the game was played.
- **Multi-club tournament filtering** — tournament history shows games from all of the user's clubs, not just the primary one.

### Improved

- **New design** — Inter font, updated "Georgiano" wordmark logo in the header with colored letters.
- **In-match progress chart** — replaced the standings table with an SVG line chart showing each player's cumulative score. Tap to open fullscreen chart with axes and avatars. Swipe to switch between match and chart.
- **"Match" / "Tournament" tabs** — added a toggle to switch between current match view and all-matches table instead of scrolling.
- **In-game navigation** — prev/next buttons are hidden on the "Tournament" tab, shown only on the "Match" tab.
- **Profile page** — settings button moved to top-right corner, removed InfoTip hints.
- **Side menu** — redesigned header: avatar and name on one line, club and rating moved to a meta block.
- **Clubs page** — club avatars in lists, avatar edit button on the club page.
- **Seasons page** — future season cards with start date.
- **Cancel tournament confirmation** — added confirmation text when cancelling a tournament.

### Fixed

- **Docker images switched to Ubuntu** — replaced Alpine with noble (backend) and bookworm (frontend) for linux/amd64 compatibility.

---

## [1.3.1] — 2026-03-13

### Added

- **Multi-club support** — players can now belong to multiple clubs simultaneously. Primary club can be selected in settings. Stats, seasons and tournaments are tied to the primary club.
- **Club selection for tournaments** — the Play page lets you choose which club to create a tournament in (when you belong to multiple clubs).
- **Redesigned clubs page** — "My clubs" and "All clubs" sections, join without leaving current club, action menu (set as primary / leave).

### Improved

- **Simplified tournament creation** — removed the separate player count step, count is now derived from selected players (4–6). New flow: club → game type → players → match count → start.
- **Profile settings** — added primary club selector (when you belong to multiple clubs).

### Fixed

- **Club stats** — leaderboard now correctly filters by the selected club instead of showing the same data across all clubs.
- **Schedule generation for 4 players** — fixed "no matches" error when creating a tournament with 4 players and repeated matches.
- **Member count update** — club member count updates immediately after joining without page reload.
- **Club creation doesn't override primary** — creating a new club no longer overwrites the primary club if one is already set.
- **Block tournaments without club** — cannot create a tournament if the player hasn't joined any club.

---

## [1.3.0] — 2026-03-13

### Added

- **Feedback form** — the static contact page is now a full feedback form with subject selection (suggestion, bug, other), message field and optional reply email. Messages are sent to the developer's email.
- **Match and tournament timers** — during gameplay, current match time and total tournament time are displayed. In tournament history, each match shows its duration.
- **Tournament duration in history** — tournament cards show total duration next to player count (static for finished, live for ongoing).
- **Tournament filters** — history page now has filter chips for seasonal/friendly, early finished and cancelled tournaments.
- **Tournament deletion** — admin can permanently delete tournaments from history.
- **Club game spectating** — the Play page shows active tournaments from other club members with spectator access.
- **Profile settings** — name change page accessible from the profile.
- **Auto-cleanup of stale tournaments** — tournaments with no activity for 40+ minutes on the current match are automatically early-finished or cancelled.
- **Seasons** — future season placeholder cards, countdown to current season end, hide top-3 from leaderboard after super game.

### Improved

- **Rest distribution** — in 5-6 player tournaments, rest periods are spread more evenly so players don't play too many matches in a row.
- **Team order balancing** — players alternate between first/second position within a team instead of always being in the same order.
- **Host marked with dot** — the crown emoji next to the host's name is replaced with a subtle gold dot.
- **Minimum 60% matches for early finish** — cannot finish a tournament early if fewer than 60% of matches have been played.
- **Avatars in results** — the tournament results table now shows player avatars.
- **Unfinished tournaments excluded from stats** — only fully completed tournaments count towards rankings and statistics.
- **Password reset link valid for 1 hour** (was 30 minutes).

### Fixed

- **Removed debug logs** — removed debug Console.WriteLine statements from production code.

---

## [1.2.1] — 2026-03-04

### Added

- **Password recovery via email** — "Forgot password?" link on the login page. Enter login → receive email with reset link → set new password page. Sent via Gmail SMTP.
- **Email on registration** — email field is now required when creating an account.
- **"Enter your email" modal** — existing users without an email will see a modal prompting them to add one (needed for password recovery).

### Fixed

- **Tooltips stay within screen bounds** — info tips (i) are now always positioned within the visible area and no longer clipped by overflow containers.

---

## [1.2.0] — 2026-03-04

### Added

- **Clubs** — club system for organizing player groups. Create your own club or join an existing one. All tournaments, seasons and rankings are tied to a club. First login prompts you to choose or create a club.
- **RU/EN localization** — full interface translation to Russian and English. Language toggle in the header and on login/register pages. Language auto-detected from browser, saved to localStorage.
- **Partner win stats** — each profile section (current season, overall stats, previous seasons) now has a collapsible partner list showing win rate and games played together.
- **Head-to-Head comparison** — viewing another player's profile shows a comparison card: matches as opponents, matches as partners, average scores.
- **Quick rematch** — after finishing a live tournament, the host sees a "Rematch" button that creates a new tournament with the same players and format.
- **Season score chart** — on the seasons page, clicking a player row shows a chart of tournament results. Green bars = counted in ranking, grey = not counted.
- **Season countdown** — current season card shows days remaining until the season ends.
- **Auto-redirect to "What's new"** — on version update, the app automatically opens the latest changes page.
- **Info tips** — "i" icons on key pages with explanations of game mechanics (seasons, tournaments, profile, clubs).

### Changed

- **"What's new" page** — changelog is now fetched from GitHub (CHANGELOG.md / CHANGELOG.en.md) instead of a hardcoded list. Versions are grouped by major.minor, latest version is highlighted on redirect.
- **Seasons tied to club** — leaderboard and season stats are filtered by the current user's club.
- **Tournaments tied to club** — tournament history and leaderboard only show data from your club.
- **New app icon** — favicon replaced with an SVG logo.

---

## [1.1.2] — 2026-03-03

### Fixed

- Cancelled tournaments are no longer counted in profile stats, season ratings, and season leaderboards.
- Broken tournaments (without teams/players in matches) are hidden from history, unfinished lists, and active tournaments.

---

## [1.1.1] — 2026-03-03

### Added

- "Early" tag (gold) for early-finished tournaments in history.
- Match count tag in tournament history.

### Fixed

- Tournaments with 0 matches are hidden from history.
- "Cancel tournament" and "New tournament" buttons no longer stretch.

---

## [1.1.0] — 2026-03-03

### Added

- **"What's new" page** — a dedicated page with version history. Accessible from the side menu.
- **Unfinished tournaments list** — the "Play" tab displays all unfinished tournaments with options to join, finish, cancel, or finish early.
- **Soft tournament cancellation** — cancelled tournaments are kept in history with a "Cancelled" tag instead of being deleted from the database.
- **Match count tag** — a grey tag with match count added to tournament history.
- **Admin access** — user `t224215` can see all unfinished tournaments and has host privileges for any of them.

### Fixed

- Dash instead of "#1" in profile when a player has no season games.
- Unfinished tournaments without a host are now visible to the admin in the "Play" tab.

---

## [1.0.0] — 2026-03-03

First release of the padel tournament management app.
C#/.NET 10 backend + React/TypeScript frontend.

### Added

- **Avatar compression** — automatic compression to 256x256 and saving in WebP (SixLabors.ImageSharp). Migration of existing PNG/JPG on server startup.
- **Balanced tournament formats** — replacement of fixed options (5/10) with Balanced/Small/Medium calculated by formula `C(n,2) * k / 2`:
  - 4 players: Balanced(3), Small(6), Medium(9)
  - 5 players: Balanced(5), Medium(10)
  - 6 players: Balanced(15), Small(5), Medium(10)
- **Early tournament finish** — "Finish early" button for friendly games. Unplayed matches get a score of 8:8. Modal confirmation, SignalR synchronization. Not available for seasonal games.
- **Global leaderboard** — "Tournament history" / "Leaderboard" tabs on the tournaments page. Summary table: games, points, average points (total and seasonal). Lazy loading. Endpoint `GET /api/players/leaderboard`.

### Fixed

- Broken tournaments (without matches) are hidden from all lists and automatically cancelled
- Protection against `MatchView` crash on invalid `currentMatchIndex`
- Correct `inSeason` setting when loading an active tournament from the server
