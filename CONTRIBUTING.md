# Contributing

Thanks for your interest in contributing to **Soullink Tracker**! This guide covers everything you need to get up and running - from local setup to submitting a pull request.

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (LTS) & npm
- Docker and the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)

## 🚀 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/joos-too/pokemon-soullink-tracker.git
cd pokemon-soullink-tracker

# 2. Install dependencies
npm install

# 3. Start the local Supabase stack
npm run supabase:start

# 4. Set up environment
cp .env.example .env

# 5. In a second terminal - start the dev server
npm run dev
```

The local database is initialized from the migrations and seed data in
`supabase/`.

## 🏗 Production Deployment

Staging and production are deployed through the branch-specific GitHub Actions
workflows. Environment variables, database migration safeguards, and deployment
requirements are documented in
[`supabase/README.md`](supabase/README.md#automated-hosted-deployments).

## 📦 Available Commands

| Command                    | Description                              |
| -------------------------- | ---------------------------------------- |
| `npm run dev`              | Start the Vite dev server                |
| `npm run supabase:start`   | Start the local Supabase stack           |
| `npm run supabase:reset`   | Recreate and seed the local database     |
| `npm run supabase:test`    | Run database tests                       |
| `npm run test:unit`        | Run frontend unit tests                  |
| `npm run build`            | Create a production build                |
| `npm run prettier:check`   | Check repository formatting              |
| `npm run generate-pokemon` | Regenerate Pokémon and location datasets |
| `npm run generate-items`   | Regenerate the item dataset              |

## 📜 Scripts

The app relies heavily on external data (Pokémon, items, locations, evolutions etc.), which are gatered from two main sources,
PokéAPI and PokéWiki. To merge the live and static data from these two sources into a usable format, two scripts were
created. These data-generation scripts live in `scripts/` and produce pre-built TypeScript datasets. These scripts read
from a local clone of the [PokeAPI/api-data](https://github.com/PokeAPI/api-data) repository via a shared static client
(`pokeapi-static-client.mjs`) instead of making individual live HTTP requests.

To execute the scripts clone the data mirror once:

```
git clone --depth 1 https://github.com/PokeAPI/api-data.git scripts/pokeapi-data
```

To use a checkout elsewhere, set `POKEAPI_DATA_DIR` to either the `api-data` repo root or its `data/api/v2` directory.

| Script                 | Command                    | Purpose                                                                                                                                                                                                          |
| ---------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-pokemon.mjs` | `npm run generate-pokemon` | Reads species, evolutions, types, and locations etc. from the local PokéAPI data and writes the localized (EN/DE) files (`src/data/pokemon.ts`, `src/data/locations.ts`).                                        |
| `generate-items.mjs`   | `npm run generate-items`   | Parses raw PokéWiki `.txt` files in `scripts/itemlists-source/version-files/`, cross-references them with the local PokéAPI data to determine each item's earliest game version, and writes `src/data/items.ts`. |

**Why these exist:** PokéAPI provides comprehensive Pokémon data but lacks version-introduction metadata for items and translations for evolution methods. The scripts combinine local API data with hand-curated item lists from
[PokéWiki](https://www.pokewiki.de/), producing static datasets.

Generated datasets should be refreshed through their npm scripts rather than
edited by hand. Review generated diffs before committing them.

### Sprites

- **Static assets** (badges, rivals, Elite Four, champions, fossils, stones) live in `public/` and are served directly.
- **Pokémon sprites** are loaded at runtime from the [PokeAPI sprite repository](https://github.com/PokeAPI/sprites) on GitHub.
- A **service worker** (`public/pokeapi-js-wrapper-sw.js`) caches sprite requests for offline access and faster repeat loads.
- Sprite helpers in `src/services/sprites.ts` resolve the correct URL based on Pokémon ID, shiny state, generation preference, and mega stone display style.

## 🌍 Localization

The UI currently supports **English** and **German**.

- Use translation keys over inline user-facing strings
- When adding or changing UI-text-elements, update both `src/locales/en.ts` and `src/locales/de.ts`
- Keep labels, button text, and validation messages aligned across both languages

If you want to add another language, you need to create and register a new locale file, as well as evaluate available PokéAPI and PokéWiki data.

## 🎨 Code Formatting

Prettier is configured for the project. Husky runs it automatically as a pre-commit hook.

```bash
npm run prettier          # format everything
npm run prettier:check    # check only (CI-friendly)
```

## 🐛 Reporting Issues

When opening a new issue, please use the provided **issue templates**:

- **Bug Report** - for unexpected behavior or errors
- **Enhancement** - for improvements to existing features
- **New Feature** - for entirely new functionality

Click **"New Issue"** on GitHub and select the appropriate template. Fill in all sections - the more detail you provide, the faster we can act on it.

## 🚢 Submitting Changes

1. **Fork & branch** - on GitHub, click **Fork** to create your own copy, then create a new branch from `main` (e.g. `feature/amazing-feature`).
2. **Code** - make your changes locally and ensure `npm run build` and `npm run prettier:check` both pass.
3. **Push** - push your branch to your fork.
4. **Open a Pull Request** - on GitHub, navigate to the original repository, click **"New Pull Request"**, and select your fork/branch. The **PR template** loads automatically — fill in all sections, link the related issue (e.g. `Closes #42`), and complete the checklist.
5. **Request a review** - assign the PR to a code owner and wait for approval before merging.

---

<p align="center"><b>Thank you for contributing! 🎉</b></p>
