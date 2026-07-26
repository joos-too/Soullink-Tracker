/**
 * Emulator Seeding Service
 *
 * Seeds the Firebase emulator with test data for local development.
 * Creates a test user and sample trackers with team, box, and graveyard data.
 */

import { auth, db } from "@/src/firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { get, ref, update } from "firebase/database";
import { createInitialState } from "@/src/services/init.ts";
import { FossilEntry, ItemEntry, PokemonLink } from "@/types";

// Test user credentials for emulator mode
const TEST_USER_EMAIL = "test@example.com";
const TEST_USER_PASSWORD = "testpassword123";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const encodeEmailKey = (normalizedEmail: string): string =>
  normalizedEmail.replace(/[.#$/\[\]]/g, "_");

// Flag to track if seeding has been attempted (prevents duplicate seeding during hot reloads)
let seedingAttempted = false;

/**
 * Checks if test data already exists in the emulator
 */
async function testDataExists(): Promise<boolean> {
  try {
    // Check if test user has any trackers
    const userTrackersRef = ref(db, "userTrackers");
    const snapshot = await get(userTrackersRef);
    return snapshot.exists() && Object.keys(snapshot.val()).length > 0;
  } catch (error) {
    console.error("Error checking for test data:", error);
    return false;
  }
}

/**
 * Creates or signs in the test user
 */
async function createTestUser(): Promise<string> {
  try {
    // Try to sign in first (user might already exist from previous run)
    const userCredential = await signInWithEmailAndPassword(
      auth,
      TEST_USER_EMAIL,
      TEST_USER_PASSWORD,
    );
    console.log("Test user signed in:", userCredential.user.uid);
    return userCredential.user.uid;
  } catch (signInError: any) {
    // If sign in fails, try to create the user
    if (
      signInError.code === "auth/user-not-found" ||
      signInError.code === "auth/invalid-credential"
    ) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          TEST_USER_EMAIL,
          TEST_USER_PASSWORD,
        );
        console.log("Test user created:", userCredential.user.uid);
        return userCredential.user.uid;
      } catch (createError) {
        console.error("Error creating test user:", createError);
        throw createError;
      }
    }
    throw signInError;
  }
}

/**
 * Creates a single tracker with sample data
 */
async function createTracker(
  userId: string,
  config: {
    title: string;
    gameVersionId: string;
    playerNames: string[];
    teamPokemon: PokemonLink[];
    boxPokemon: PokemonLink[];
    graveyardPokemon: PokemonLink[];
    checkedLevelCaps: number[];
    checkedRivalCaps: number[];
    rivalCensorEnabled?: boolean;
    revealedRivalCaps?: number[];
    itemEntries?: ItemEntry[][];
    fossilEntries?: FossilEntry[][];
    createdAt?: number;
    runs?: number;
    best?: number;
    deaths?: number[];
    sumDeaths?: number[];
    legendaryEncounters?: number;
  },
): Promise<Record<string, any>> {
  const now = config.createdAt ?? Date.now();
  const trackerId = `test-tracker-${config.gameVersionId}-${now}`;

  // Create tracker metadata
  const trackerMeta = {
    id: trackerId,
    title: config.title,
    playerNames: config.playerNames,
    createdAt: now,
    createdBy: userId,
    members: {
      [userId]: {
        uid: userId,
        email: TEST_USER_EMAIL,
        role: "owner",
        addedAt: now,
      },
    },
    gameVersionId: config.gameVersionId,
  };

  // Create initial state with sample data
  const initialState = createInitialState(
    config.gameVersionId,
    config.playerNames,
  );

  initialState.team = config.teamPokemon;
  initialState.box = config.boxPokemon;
  initialState.graveyard = config.graveyardPokemon;

  // Add fossil data if provided
  if (config.fossilEntries) {
    initialState.fossils = config.fossilEntries;
  }

  if (config.itemEntries) {
    initialState.items = config.itemEntries;
  }

  const deadCount = config.graveyardPokemon.filter((p) => !p.isLost).length;
  const deathsPerPlayer = config.playerNames.map((_, i) => {
    let count = Math.floor(deadCount / config.playerNames.length);
    if (i < deadCount % config.playerNames.length) count++;
    return count;
  });
  initialState.stats.deaths = config.deaths ?? deathsPerPlayer;
  initialState.stats.sumDeaths = config.sumDeaths ?? [
    ...(config.deaths ?? deathsPerPlayer),
  ];

  if (config.runs !== undefined) {
    initialState.stats.runs = config.runs;
  }
  if (config.best !== undefined) {
    initialState.stats.best = config.best;
  }
  if (config.legendaryEncounters !== undefined) {
    initialState.stats.legendaryEncounters = config.legendaryEncounters;
  }

  config.checkedLevelCaps.forEach((index) => {
    if (initialState.levelCaps[index]) {
      initialState.levelCaps[index].done = true;
    }
  });

  config.checkedRivalCaps.forEach((index) => {
    if (initialState.rivalCaps[index]) {
      initialState.rivalCaps[index].done = true;
    }
  });

  if (config.revealedRivalCaps) {
    config.revealedRivalCaps.forEach((index) => {
      if (initialState.rivalCaps[index]) {
        initialState.rivalCaps[index].revealed = true;
      }
    });
  }

  if (config.rivalCensorEnabled !== undefined) {
    initialState.rivalCensorEnabled = config.rivalCensorEnabled;
  }

  // Return updates object for this tracker
  return {
    [`trackers/${trackerId}/meta`]: trackerMeta,
    [`trackers/${trackerId}/state`]: initialState,
    [`userTrackers/${userId}/${trackerId}`]: true,
  };
}

async function createSampleTrackerData(userId: string): Promise<void> {
  const now = Date.now();

  const gen5Updates = await createTracker(userId, {
    title: "Pokémon Black Soullink",
    gameVersionId: "gen5_bw",
    createdAt: new Date("2026-09-18").getTime(),
    playerNames: ["Player 1", "Player 2"],
    teamPokemon: [
      {
        id: 1,
        locationSlug: "unova-route-1",
        members: [
          { id: 501, nickname: "Otterpop" },
          { id: 498, nickname: "Sizzle" },
        ],
      },
      {
        id: 2,
        locationSlug: "unova-route-2",
        members: [
          { id: 504, nickname: "Scout" },
          { id: 506, nickname: "Buddy" },
        ],
      },
      {
        id: 3,
        locationSlug: "unova-route-3",
        members: [
          { id: 522, nickname: "Sparky" },
          { id: 509, nickname: "Whiskers" },
        ],
      },
    ],
    boxPokemon: [
      {
        id: 4,
        locationSlug: "dreamyard",
        members: [
          { id: 517, nickname: "Dreamy" },
          { id: 519, nickname: "Coo" },
        ],
      },
      {
        id: 5,
        locationSlug: "pinwheel-forest",
        members: [
          { id: 540, nickname: "Leafy" },
          { id: 543, nickname: "Stinger" },
        ],
      },
      {
        id: 6,
        locationSlug: null,
        fossilSlugs: ["old-amber", "skull-fossil"],
        members: [
          { id: 142, nickname: "Amber" },
          { id: 408, nickname: "Rocky" },
        ],
      },
    ],
    graveyardPokemon: [
      {
        id: 7,
        locationSlug: "wellspring-cave",
        members: [
          { id: 524, nickname: "Pebble" },
          { id: 527, nickname: "Sonar" },
        ],
      },
      {
        id: 8,
        locationSlug: "cold-storage",
        members: [
          { id: 582, nickname: "Frosty" },
          { id: 532, nickname: "Lumber" },
        ],
      },
    ],
    runs: 17,
    best: 7,
    deaths: [21, 16],
    sumDeaths: [4, 5],
    legendaryEncounters: 45,
    checkedLevelCaps: [0, 1, 2, 3, 4],
    checkedRivalCaps: [0, 1, 2, 3, 4, 5, 6],
    revealedRivalCaps: [0, 1, 2, 3, 4, 5, 6],
    fossilEntries: [
      [
        {
          fossilId: "cover-fossil",
          location: "",
          locationSlug: "nacrene-city",
          inBag: false,
          revived: false,
        },
        {
          fossilId: "helix-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "old-amber",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: true,
          pokemonId: 142,
        },
      ],
      [
        {
          fossilId: "plume-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "dome-fossil",
          location: "",
          locationSlug: "nacrene-city",
          inBag: false,
          revived: false,
        },
        {
          fossilId: "skull-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: true,
          pokemonId: 408,
        },
      ],
    ],
    itemEntries: [
      [
        {
          id: "fire-stone",
          location: "",
          locationSlug: "nimbasa-city",
          inBag: true,
          used: false,
        },
        {
          id: "water-stone",
          location: "",
          locationSlug: "driftveil-city",
          inBag: true,
          used: true,
        },
        {
          id: "dusk-stone",
          location: "",
          locationSlug: "mistralton-city",
          inBag: false,
          used: false,
        },
      ],
      [
        {
          id: "leaf-stone",
          location: "",
          locationSlug: "castelia-city",
          inBag: true,
          used: false,
        },
        {
          id: "thunder-stone",
          location: "",
          locationSlug: "driftveil-city",
          inBag: true,
          used: true,
        },
        {
          id: "sun-stone",
          location: "",
          locationSlug: "nacrene-city",
          inBag: false,
          used: false,
        },
        {
          id: "moon-stone",
          location: "",
          locationSlug: "icirrus-city",
          inBag: true,
          used: false,
        },
      ],
    ],
  });

  const gen1Updates = await createTracker(userId, {
    title: "Pokémon Blue Soullink",
    gameVersionId: "gen1_rb",
    createdAt: new Date("2026-02-27").getTime(),
    playerNames: ["Player 1", "Player 2"],
    teamPokemon: [
      {
        id: 1,
        locationSlug: "kanto-route-1",
        members: [
          { id: 16, nickname: "Gust" },
          { id: 19, nickname: "Ratty" },
        ],
      },
      {
        id: 2,
        locationSlug: "kanto-route-2",
        members: [
          { id: 10, nickname: "Crawler" },
          { id: 13, nickname: "Stinger" },
        ],
      },
      {
        id: 3,
        locationSlug: "viridian-forest",
        members: [
          { id: 25, nickname: "Sparky" },
          { id: 27, nickname: "Sandy" },
        ],
      },
    ],
    boxPokemon: [
      {
        id: 4,
        locationSlug: "kanto-route-3",
        members: [
          { id: 12, nickname: "Flutter" },
          { id: 14, nickname: "Cocoon" },
        ],
      },
      {
        id: 5,
        locationSlug: "kanto-route-4",
        members: [
          { id: 129, nickname: "Splashy" },
          { id: 41, nickname: "Fang" },
        ],
      },
    ],
    graveyardPokemon: [
      {
        id: 6,
        locationSlug: "mt-moon",
        members: [
          { id: 74, nickname: "Boulder" },
          { id: 35, nickname: "Moony" },
        ],
      },
      {
        id: 7,
        locationSlug: "rock-tunnel",
        members: [
          { id: 66, nickname: "Flex" },
          { id: 95, nickname: "Slither" },
        ],
      },
      {
        id: 8,
        locationSlug: "pokemon-tower",
        members: [
          { id: 92, nickname: "" },
          { id: 104, nickname: "" },
        ],
        isLost: true,
      },
    ],
    runs: 42,
    deaths: [1, 1],
    sumDeaths: [55, 62],
    legendaryEncounters: 132,
    checkedLevelCaps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    checkedRivalCaps: [0, 1, 2, 3, 4, 5],
    rivalCensorEnabled: false,
    revealedRivalCaps: [0, 1, 2, 3, 4, 5],
    fossilEntries: [
      [
        {
          fossilId: "old-amber",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "helix-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
      ],
      [
        {
          fossilId: "dome-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "old-amber",
          location: "",
          locationSlug: "pewter-city",
          inBag: false,
          revived: false,
        },
      ],
    ],
    itemEntries: [
      [
        {
          id: "fire-stone",
          location: "",
          locationSlug: "celadon-city",
          inBag: true,
          used: true,
        },
        {
          id: "water-stone",
          location: "",
          locationSlug: "celadon-city",
          inBag: true,
          used: false,
        },
        {
          id: "thunder-stone",
          location: "",
          locationSlug: "celadon-city",
          inBag: true,
          used: true,
        },
        {
          id: "moon-stone",
          location: "",
          locationSlug: "pewter-city",
          inBag: true,
          used: false,
        },
      ],
      [
        {
          id: "leaf-stone",
          location: "",
          locationSlug: "celadon-city",
          inBag: true,
          used: true,
        },
        {
          id: "fire-stone",
          location: "",
          locationSlug: "cinnabar-island",
          inBag: true,
          used: false,
        },
      ],
    ],
  });

  const gen4Updates = await createTracker(userId, {
    title: "Pokémon Platinum Soullink",
    gameVersionId: "gen4_pt",
    createdAt: new Date("2026-09-13").getTime(),
    playerNames: ["Player 1", "Player 2"],
    teamPokemon: [
      {
        id: 1,
        locationSlug: "sinnoh-route-201",
        members: [
          { id: 387, nickname: "Leafy" },
          { id: 390, nickname: "Blaze" },
        ],
      },
      {
        id: 2,
        locationSlug: "sinnoh-route-202",
        members: [
          { id: 396, nickname: "Swoosh" },
          { id: 399, nickname: "Chompy" },
        ],
      },
      {
        id: 3,
        locationSlug: "sinnoh-route-204",
        members: [
          { id: 403, nickname: "Sparky" },
          { id: 406, nickname: "Rosie" },
        ],
      },
    ],
    boxPokemon: [
      {
        id: 4,
        locationSlug: "valley-windworks",
        members: [
          { id: 417, nickname: "Zippy" },
          { id: 425, nickname: "Balloon" },
        ],
      },
      {
        id: 5,
        locationSlug: "sinnoh-route-205",
        members: [
          { id: 436, nickname: "Mirror" },
          { id: 77, nickname: "Ember" },
        ],
      },
    ],
    graveyardPokemon: [
      {
        id: 6,
        locationSlug: "ravaged-path",
        members: [
          { id: 401, nickname: "Cricket" },
          { id: 427, nickname: "Hoppy" },
        ],
      },
      {
        id: 7,
        locationSlug: "eterna-forest",
        members: [
          { id: 412, nickname: "Cloak" },
          { id: 420, nickname: "Cherry" },
        ],
      },
      {
        id: 8,
        locationSlug: "lost-tower",
        members: [
          { id: 433, nickname: "" },
          { id: 434, nickname: "" },
        ],
        isLost: true,
      },
    ],
    runs: 27,
    deaths: [0, 2],
    sumDeaths: [13, 27],
    legendaryEncounters: 95,
    checkedLevelCaps: [0, 1, 2, 3, 4, 5, 6, 7],
    checkedRivalCaps: [0, 1, 2, 3, 4],
    rivalCensorEnabled: false,
    revealedRivalCaps: [0, 1, 2, 3, 4],
    fossilEntries: [
      [
        {
          fossilId: "skull-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "old-amber",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "helix-fossil",
          location: "",
          locationSlug: "oreburgh-city",
          inBag: false,
          revived: false,
        },
      ],
      [
        {
          fossilId: "armor-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
        {
          fossilId: "dome-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: false,
        },
      ],
    ],
    itemEntries: [
      [
        {
          id: "fire-stone",
          location: "",
          locationSlug: "veilstone-city",
          inBag: true,
          used: false,
        },
        {
          id: "dawn-stone",
          location: "",
          locationSlug: "hearthome-city",
          inBag: true,
          used: true,
        },
        {
          id: "shiny-stone",
          location: "",
          locationSlug: "canalave-city",
          inBag: false,
          used: false,
        },
        {
          id: "water-stone",
          location: "",
          locationSlug: "solaceon-town",
          inBag: true,
          used: false,
        },
        {
          id: "dusk-stone",
          location: "",
          locationSlug: "eterna-city",
          inBag: true,
          used: false,
        },
      ],
      [
        {
          id: "leaf-stone",
          location: "",
          locationSlug: "floaroma-town",
          inBag: true,
          used: false,
        },
        {
          id: "thunder-stone",
          location: "",
          locationSlug: "sunyshore-city",
          inBag: true,
          used: true,
        },
        {
          id: "sun-stone",
          location: "",
          locationSlug: "pastoria-city",
          inBag: false,
          used: false,
        },
      ],
    ],
  });

  const gen6Updates = await createTracker(userId, {
    title: "Pokémon Alpha Sapphire Soullink",
    gameVersionId: "gen6_oras",
    createdAt: new Date("2025-11-21").getTime(),
    playerNames: ["Player 1", "Player 2"],
    teamPokemon: [
      {
        id: 1,
        locationSlug: "hoenn-route-101",
        members: [
          { id: 252, nickname: "Gecko" },
          { id: 255, nickname: "Chicky" },
        ],
      },
      {
        id: 2,
        locationSlug: "hoenn-route-102",
        members: [
          { id: 263, nickname: "Ziggy" },
          { id: 270, nickname: "Lilypad" },
        ],
      },
      {
        id: 3,
        locationSlug: "hoenn-route-104",
        members: [
          { id: 276, nickname: "Swift" },
          { id: 278, nickname: "Gully" },
        ],
      },
    ],
    boxPokemon: [
      {
        id: 4,
        locationSlug: "petalburg-woods",
        members: [
          { id: 265, nickname: "Squirmy" },
          { id: 273, nickname: "Acorn" },
        ],
      },
      {
        id: 5,
        locationSlug: "hoenn-route-116",
        members: [
          { id: 299, nickname: "Compass" },
          { id: 293, nickname: "Whisper" },
        ],
      },
      {
        id: 6,
        locationSlug: null,
        fossilSlugs: ["root-fossil", "claw-fossil"],
        members: [
          { id: 345, nickname: "Rooty" },
          { id: 347, nickname: "Claws" },
        ],
      },
    ],
    graveyardPokemon: [
      {
        id: 7,
        locationSlug: "granite-cave",
        members: [
          { id: 296, nickname: "Sumo" },
          { id: 304, nickname: "Ironclad" },
        ],
      },
      {
        id: 8,
        locationSlug: "hoenn-route-110",
        members: [
          { id: 309, nickname: "Volt" },
          { id: 316, nickname: "Blob" },
        ],
      },
    ],
    runs: 4,
    best: 5,
    deaths: [1, 1],
    sumDeaths: [7, 10],
    legendaryEncounters: 9,
    checkedLevelCaps: [0, 1, 2],
    checkedRivalCaps: [0, 1],
    revealedRivalCaps: [0, 1],
    fossilEntries: [
      [
        {
          fossilId: "jaw-fossil",
          location: "",
          locationSlug: "rustboro-city",
          inBag: false,
          revived: false,
        },
        {
          fossilId: "root-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: true,
          pokemonId: 345,
        },
      ],
      [
        {
          fossilId: "sail-fossil",
          location: "",
          locationSlug: "rustboro-city",
          inBag: false,
          revived: false,
        },
        {
          fossilId: "claw-fossil",
          location: "",
          locationSlug: "",
          inBag: true,
          revived: true,
          pokemonId: 347,
        },
        {
          fossilId: "cover-fossil",
          location: "",
          locationSlug: "mauville-city",
          inBag: false,
          revived: false,
        },
      ],
    ],
    itemEntries: [
      [
        {
          id: "fire-stone",
          location: "",
          locationSlug: "lavaridge-town",
          inBag: true,
          used: false,
        },
        {
          id: "water-stone",
          location: "",
          locationSlug: "slateport-city",
          inBag: true,
          used: true,
        },
        {
          id: "sun-stone",
          location: "",
          locationSlug: "mossdeep-city",
          inBag: false,
          used: false,
        },
        {
          id: "item:sceptilite",
          location: "",
          locationSlug: "fortree-city",
          inBag: true,
          used: false,
        },
      ],
      [
        {
          id: "leaf-stone",
          location: "",
          locationSlug: "fortree-city",
          inBag: true,
          used: false,
        },
        {
          id: "thunder-stone",
          location: "",
          locationSlug: "mauville-city",
          inBag: true,
          used: false,
        },
        {
          id: "moon-stone",
          location: "",
          locationSlug: "fallarbor-town",
          inBag: true,
          used: true,
        },
        {
          id: "item:blazikenite",
          location: "",
          locationSlug: "fallarbor-town",
          inBag: true,
          used: false,
        },
        {
          id: "item:altarianite",
          location: "",
          locationSlug: "lilycove-city",
          inBag: false,
          used: false,
        },
      ],
    ],
  });

  const allUpdates: Record<string, any> = {
    ...gen5Updates,
    ...gen1Updates,
    ...gen4Updates,
    ...gen6Updates,
    [`users/${userId}`]: {
      uid: userId,
      createdAt: now,
      lastLoginAt: now,
    },
    [`userEmails/${encodeEmailKey(normalizeEmail(TEST_USER_EMAIL))}`]: {
      uid: userId,
      updatedAt: now,
    },
  };

  await update(ref(db), allUpdates);
  console.log(
    "Sample tracker data created successfully (Gen 1, Gen 4, Gen 5, and Gen 6 trackers)",
  );
}

/**
 * Seeds the emulator with test data
 * This function is idempotent and safe to call multiple times
 */
export async function seedEmulatorData(): Promise<void> {
  // Prevent multiple seeding attempts during hot reloads
  if (seedingAttempted) {
    return;
  }

  seedingAttempted = true;

  try {
    // Check if test data already exists
    const dataExists = await testDataExists();
    if (dataExists) {
      console.log("Test data already exists, skipping seeding");
      return;
    }

    console.log("Starting emulator data seeding...");

    // Create test user
    const userId = await createTestUser();

    // Create sample tracker data
    await createSampleTrackerData(userId);

    console.log("Emulator seeding completed successfully");
  } catch (error) {
    console.error("Error seeding emulator data:", error);
    // Reset flag on error so it can be retried
    seedingAttempted = false;
  }
}
