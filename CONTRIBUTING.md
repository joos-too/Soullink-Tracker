# Contributing

Thanks for your interest in contributing to **Soullink Tracker**! This guide covers everything you need to get up and running - from local setup to submitting a pull request.

## 📋 Prerequisites

- [Node.js](https://nodejs.org/) (LTS) & npm
- [Java 21+](https://www.oracle.com/java/technologies/downloads/#java21) - required by Firebase Emulators

## 🚀 Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/joos-too/pokemon-soullink-tracker.git
cd pokemon-soullink-tracker

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env     # defaults are fine for emulator mode

# 4. Install Firebase CLI (once)
npm install -g firebase-tools

# 5. Start Firebase Emulators
npm run emulators

# 6. In a second terminal - start the dev server
npm run dev
```

### Automatic Test Data Seeding

When running with emulators, the app automatically seeds:

- **Test user:** `test@example.com` / `testpassword123`
- **Sample trackers:** pre-populated team, box, and graveyard etc...

## 🏗 Production Deployment

```bash
# 1. Clone at the desired release tag
git clone --branch v1.2.0 https://github.com/joos-too/pokemon-soullink-tracker.git
cd pokemon-soullink-tracker

# 2. Create .env.production with your Firebase project credentials
#    (see Environment Setup below)

# 3. Install & build
npm install
npm run build

# 4. Serve the dist/ folder with any static host (nginx, Vercel, Netlify …)
```

## 📦 Available Commands

| Command                    | Description                              |
| -------------------------- | ---------------------------------------- |
| `npm run dev`              | Start the Vite dev server                |
| `npm run emulators`        | Start Firebase emulators                 |
| `npm run build`            | Create a production build                |
| `npm run generate-pokemon` | Regenerate Pokémon datasets from PokéAPI |

## 📜 Scripts

The app relies heavily on external data (Pokémon, items, locations, evolutions...), which are gatered from two main sources,
PokéAPI and PokéWiki. To merge the live and static data from these two sources into a usable format, multiple scripts were
created. These data-generation scripts live in `scripts/` and produce pre-built TypeScript datasets. These scripts read
from a local clone of the [PokeAPI/api-data](https://github.com/PokeAPI/api-data) repository via a shared static client
(`pokeapi-static-client.mjs`) instead of making individual live HTTP requests.

| Script                      | Command                           | Purpose                                                                                                                                                                                                          |
| --------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate-pokemon.mjs`      | `npm run generate-pokemon`        | Reads species, evolutions, types, and locations... from the local PokéAPI data and writes the localized (EN/DE) files (`src/data/pokemon.ts`, `src/data/locations.ts`).                                          |
| `generate-items.mjs`        | `node scripts/generate-items.mjs` | Parses raw PokéWiki `.txt` files in `scripts/itemlists-source/version-files/`, cross-references them with the local PokéAPI data to determine each item's earliest game version, and writes `src/data/items.ts`. |
| `pokeapi-static-client.mjs` | _(library, not run directly)_     | Shared client that reads JSON from a local `scripts/pokeapi-data/` clone, providing the same interface as `pokedex-promise-v2` without network requests.                                                         |

**Why these exist:** PokéAPI provides comprehensive Pokémon data but lacks version-introduction metadata for items and
would be too slow to query at runtime. The scripts combinine local API data with hand-curated item lists from
[PokéWiki](https://www.pokewiki.de/), producing static datasets.

### Sprites

- **Static assets** (badges, rivals, Elite Four, champions, fossils, stones) live in `public/` and are served directly.
- **Pokémon sprites** are loaded at runtime from the [PokeAPI sprite repository](https://github.com/PokeAPI/sprites) on GitHub.
- A **service worker** (`public/pokeapi-js-wrapper-sw.js`) caches sprite requests for offline access and faster repeat loads.
- Sprite helpers in `src/services/sprites.ts` resolve the correct URL based on Pokémon ID, shiny state, generation preference, and mega stone display style.

### Pokémon Data Pipeline

The app ships pre-generated TypeScript datasets so it works fully offline after initial load:

| File                               | Contents                                            |
| ---------------------------------- | --------------------------------------------------- |
| `src/data/pokemon-en.ts`           | English Pokémon names with generation metadata      |
| `src/data/pokemon-de.ts`           | German Pokémon names with generation metadata       |
| `src/data/pokemon-map.ts`          | Name → ID lookup maps and ID → generation mapping   |
| `src/data/pokemon-evolutions.ts`   | Evolution chains with localized method descriptions |
| `src/data/pokemon-types.ts`        | Type data per Pokémon (including past-type changes) |
| `src/data/location-suggestions.ts` | Route/location names per region (EN + DE)           |

**`generate-pokemon-de.mjs`** fetches all species, evolution chains, locations, types, items, and moves from [PokéAPI](https://pokeapi.co/) and writes the files above. Every name is resolved in both English and German, with manual overrides for entries the API doesn't translate correctly.

```bash
npm run generate-pokemon
```

### Item Data Pipeline

PokéAPI does not provide version-introduction data for items - you can't tell from the API alone whether an item first appeared in Gen 1 or Gen 5. To solve this we maintain **hand-curated item lists** sourced from [PokéWiki](https://www.pokewiki.de/) in `scripts/itemlists-source/`.

The generation pipeline has two steps:

1. **`convert-itemlists.mjs`** - Parses the raw PokéWiki `.txt` exports into JSON files (one per game version).
2. **`generate-items.mjs`** - Fetches every item from PokéAPI, cross-references it against the local JSON lists to determine the **earliest game version** an item appeared in, then fetches properly cased item-slugs and localized names from PokéAPI.

The result is `src/data/items.ts` - a typed array where every item carries its `slug`, localized names, first `version`, pocket, and categories. This lets the tracker filter items to only those available in the game version the user selected.

```bash
node scripts/convert-itemlists.mjs   # only needed when .txt sources change
node scripts/generate-items.mjs
```

> **Why not just PokéAPI?** The API groups items by pocket and category but has no concept of "this item was introduced in Generation X." The local item lists fill that gap so the autocomplete can show version-accurate results.

## 🌍 Localization

The UI supports **English** and **German**.

- Use translation keys over inline user-facing strings
- When adding or changing UI-text-elements, update both `src/locales/en.ts` and `src/locales/de.ts`
- Keep labels, button text, and validation messages aligned across both languages

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
