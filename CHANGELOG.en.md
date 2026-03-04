# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
