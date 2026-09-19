import RulesetSaveModal from "@/src/components/modals/RulesetSaveModal.tsx";
import SettingsPage from "@/src/components/pages/SettingsPage.tsx";
import TrackerEditor from "@/src/components/pages/TrackerEditor.tsx";
import { useAppSession } from "@/src/app/AppSession";
import { LAST_TRACKER_STORAGE_KEY } from "@/src/app/trackerStorage";
import LoadingScreen from "@/src/app/LoadingScreen";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AppState,
  FossilEntry,
  ItemEntry,
  LinkEditPayload,
  LinkId,
  Pokemon,
  PokemonLink,
  RivalCensorMode,
  RivalGender,
  TrackerMeta,
} from "@/types";
import { createLinkId } from "@/src/services/linkIds.ts";
import {
  createInitialState,
  ensureStatsForPlayers,
  PLAYER_COLORS,
  sanitizePlayerNames,
  sanitizeRules,
} from "@/src/services/init.ts";
import type { TypeFilterEntry } from "@/src/components/widgets/BoxFilters.tsx";
import { useHiddenLinks } from "@/src/hooks/useHiddenLinks.ts";
import { useActiveTracker } from "@/src/hooks/useActiveTracker.ts";
import { getPokemonTypeSlugsById } from "@/src/services/pokemons/pokemonTypes.ts";
import { getGenerationSpritePath } from "@/src/services/sprites";
import { MultiLocaleSearchContext } from "@/src/hooks/useMultiLocaleSearch.ts";
import DeleteTrackerModal from "@/src/components/modals/DeleteTrackerModal.tsx";
import RealtimeConnectionBanner from "@/src/components/banners/RealtimeConnectionBanner.tsx";
import { focusRingClasses } from "@/src/styles/focusRing";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  setTrackerVisibility,
  updateTrackerMetadata,
} from "@/src/services/repos/trackerRepository.ts";
import {
  addMemberByEmail,
  deleteTracker,
  removeMemberFromTracker,
  TrackerOperationError,
  updateRivalPreference,
} from "@/src/services/trackers.ts";
import { GAME_VERSIONS } from "@/src/data/game-versions";
import {
  DEFAULT_RULES,
  DEFAULT_RULESET_ID,
  PRESET_RULESETS,
} from "@/src/data/rulesets";
import { saveRuleset } from "@/src/services/rulesets";
import { useTranslation } from "react-i18next";
import { resolvePokemonLocationDisplay } from "@/src/services/search/locationSearch.ts";
import "@/src/pokeapi"; // initialize Pokedex once so sprite caching SW gets registered

const AUTOSAVE_DEBOUNCE_MS = 200;
const MAX_SUPPORTED_GENERATION = 9;
const resolveGenerationFromVersionId = (versionId?: string | null): number => {
  if (!versionId) return MAX_SUPPORTED_GENERATION;
  const match = /^gen(\d+)/i.exec(versionId);
  if (!match) return MAX_SUPPORTED_GENERATION;
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) return MAX_SUPPORTED_GENERATION;
  return parsed;
};

const normalizePokemonId = (id: unknown): number | null => {
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

interface LinkCreationSession {
  initial: LinkEditPayload;
  playerLabels: string[];
}

interface ReviveSession extends LinkCreationSession {
  targets: Array<{ fossilSlug: string; originalIndex: number }>;
}

interface TrackerPageProps {
  trackerId: string;
  trackerMeta: TrackerMeta;
}
const TrackerPage: React.FC<TrackerPageProps> = ({
  trackerId: activeTrackerId,
  trackerMeta: activeTrackerMeta,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    rulesets,
    locale,
    defaultLocaleRulesetId,
    setTrackerMetas,
    removeTrackerLocally,
    userUseGenerationSprites,
    userUseSpritesInTeamTable,
    userMultiLocaleSearch,
    effectiveWikiId,
  } = useAppSession();
  const { t } = useTranslation();
  const [data, setData] = useState<AppState>(() =>
    createInitialState(activeTrackerMeta.gameVersionId),
  );
  const [isExiting, setIsExiting] = useState(false);
  const [manualLostSession, setManualLostSession] =
    useState<LinkCreationSession | null>(null);
  const openSettingsPanel = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.set("panel", "settings");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const closeSettingsPanel = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("panel");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [pendingLossPair, setPendingLossPair] = useState<PokemonLink | null>(
    null,
  );
  const [showDeleteLinkModal, setShowDeleteLinkModal] = useState(false);
  const [pendingDeletePair, setPendingDeletePair] =
    useState<PokemonLink | null>(null);
  const [trackerPendingDelete, setTrackerPendingDelete] =
    useState<TrackerMeta | null>(null);
  const [deleteTrackerLoading, setDeleteTrackerLoading] = useState(false);
  const [deleteTrackerError, setDeleteTrackerError] = useState<string | null>(
    null,
  );
  const [showRulesetSaveModal, setShowRulesetSaveModal] = useState(false);
  const [pendingRulesetId, setPendingRulesetId] = useState<string | null>(null);
  const [rulesetSaveReason, setRulesetSaveReason] = useState<
    "manual" | "switch"
  >("manual");
  const [rulesetSaveLoading, setRulesetSaveLoading] = useState(false);
  const [rulesetSaveError, setRulesetSaveError] = useState<string | null>(null);
  const [rulesetCopyName, setRulesetCopyName] = useState<string>("");
  const [rulesetOverwriteName, setRulesetOverwriteName] = useState<string>("");

  const [reviveSession, setReviveSession] = useState<ReviveSession | null>(
    null,
  );

  const activeGameVersionId = activeTrackerMeta?.gameVersionId;
  const activeGameVersion = activeGameVersionId
    ? GAME_VERSIONS[activeGameVersionId]
    : undefined;
  const activeTrackerAllPokemonAndItems =
    activeTrackerMeta?.allPokemonAndItems === true;
  const currentRuleset = useMemo(() => {
    const id = data.rulesetId || defaultLocaleRulesetId;
    return (
      rulesets.find((entry) => entry.id === id) ||
      PRESET_RULESETS.find((entry) => entry.id === id)
    );
  }, [data.rulesetId, defaultLocaleRulesetId, rulesets]);
  const normalizedTrackerRules = useMemo(
    () => sanitizeRules(data.rules),
    [data.rules],
  );
  const savedRulesetRules = useMemo(
    () => sanitizeRules(currentRuleset?.rules),
    [currentRuleset],
  );
  const rulesetInSync = useMemo(
    () =>
      savedRulesetRules.length > 0 &&
      savedRulesetRules.length === normalizedTrackerRules.length &&
      savedRulesetRules.every(
        (rule, index) => rule === normalizedTrackerRules[index],
      ),
    [normalizedTrackerRules, savedRulesetRules],
  );
  const versionGenerationLimit = useMemo(
    () => resolveGenerationFromVersionId(activeGameVersionId),
    [activeGameVersionId],
  );
  const pokemonGenerationLimit = activeTrackerAllPokemonAndItems
    ? MAX_SUPPORTED_GENERATION
    : versionGenerationLimit;
  const itemGenerationLimit = activeTrackerAllPokemonAndItems
    ? MAX_SUPPORTED_GENERATION
    : versionGenerationLimit;
  const isMember = Boolean(user && activeTrackerMeta?.members?.[user.uid]);
  const isGuest = Boolean(user && activeTrackerMeta?.guests?.[user.uid]);
  const isReadOnly = !isMember;
  const showSettings =
    searchParams.get("panel") === "settings" && (!isReadOnly || isGuest);

  useEffect(() => {
    setManualLostSession(null);
    setReviveSession(null);
  }, [activeTrackerId, isReadOnly]);

  const currentUserRivalPreferences = useMemo(() => {
    if (!user || !activeTrackerMeta) return {};
    return activeTrackerMeta.userSettings?.[user.uid]?.rivalPreferences ?? {};
  }, [user, activeTrackerMeta]);

  const generationSpritePath = useMemo(() => {
    // Use generation-specific sprites if enabled
    if (userUseGenerationSprites && activeGameVersionId) {
      return getGenerationSpritePath(activeGameVersionId);
    }
    return null;
  }, [userUseGenerationSprites, activeGameVersionId]);

  // ── Box filters & bad links (local view) ──────────────
  const { hiddenLinkIds, toggleHiddenLink, resetAllHiddenLinks } =
    useHiddenLinks(activeTrackerId);

  const boxTypeFilterKey = activeTrackerId
    ? `boxTypeFilter:${activeTrackerId}`
    : null;
  const boxHideHiddenLinksKey = activeTrackerId
    ? `boxHideHiddenLinks:${activeTrackerId}`
    : null;

  const loadBoxTypeFilter = (key: string | null): TypeFilterEntry => {
    if (!key) return { types: [], playerIndex: null };
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.types)) {
          return {
            types: parsed.types,
            playerIndex:
              typeof parsed.playerIndex === "number"
                ? parsed.playerIndex
                : null,
          };
        }
      }
    } catch {}
    return { types: [], playerIndex: null };
  };

  const [boxTypeFilter, setBoxTypeFilter] = useState<TypeFilterEntry>(() =>
    loadBoxTypeFilter(boxTypeFilterKey),
  );
  const handleBoxTypeFilterChange = (filter: TypeFilterEntry) => {
    setBoxTypeFilter(filter);
    try {
      if (boxTypeFilterKey) {
        localStorage.setItem(boxTypeFilterKey, JSON.stringify(filter));
      }
    } catch {}
  };

  const loadBoxHideHiddenLinks = (key: string | null): boolean => {
    if (!key) return false;
    try {
      return localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  };

  const [boxHideHiddenLinks, setBoxHideHiddenLinks] = useState(() =>
    loadBoxHideHiddenLinks(boxHideHiddenLinksKey),
  );
  const handleBoxHideHiddenLinksChange = (value: boolean) => {
    setBoxHideHiddenLinks(value);
    try {
      if (boxHideHiddenLinksKey) {
        localStorage.setItem(boxHideHiddenLinksKey, String(value));
      }
    } catch {}
  };

  // Reset filter state when switching trackers
  useEffect(() => {
    setBoxTypeFilter(loadBoxTypeFilter(boxTypeFilterKey));
    setBoxHideHiddenLinks(loadBoxHideHiddenLinks(boxHideHiddenLinksKey));
  }, [boxTypeFilterKey, boxHideHiddenLinksKey]);
  const [boxFiltersExpanded, setBoxFiltersExpanded] = useState(() => {
    try {
      return localStorage.getItem("boxFiltersExpanded") === "true";
    } catch {
      return false;
    }
  });
  const handleBoxFiltersExpandedChange = (value: boolean) => {
    setBoxFiltersExpanded(value);
    try {
      localStorage.setItem("boxFiltersExpanded", String(value));
    } catch {}
  };

  const filteredBox = useMemo(() => {
    let items = data.box;
    // type filter (optionally scoped to a specific player)
    if (boxTypeFilter.types.length > 0) {
      items = items.filter((link) => {
        const membersToCheck =
          boxTypeFilter.playerIndex !== null
            ? [link.members[boxTypeFilter.playerIndex]].filter(Boolean)
            : link.members;
        return membersToCheck.some((m) => {
          if (!m?.id) return false;
          const slugs = getPokemonTypeSlugsById(m.id, pokemonGenerationLimit);
          return slugs.some((s) => boxTypeFilter.types.includes(s));
        });
      });
    }
    // hide bad links
    if (boxHideHiddenLinks) {
      items = items.filter((link) => !hiddenLinkIds.has(link.id));
    }
    return items;
  }, [
    data.box,
    boxTypeFilter,
    boxHideHiddenLinks,
    hiddenLinkIds,
    pokemonGenerationLimit,
  ]);

  const playerTypeSlugs = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const link of data.team) {
      link.members.forEach((m, idx) => {
        if (m?.id) {
          if (!map.has(idx)) map.set(idx, new Set());
          for (const s of getPokemonTypeSlugsById(
            m.id,
            pokemonGenerationLimit,
          )) {
            map.get(idx)!.add(s);
          }
        }
      });
    }
    return map;
  }, [data.team, pokemonGenerationLimit]);

  const currentRulesetId = data.rulesetId || defaultLocaleRulesetId;
  const hasUserRulesetWithSameId = useMemo(
    () =>
      rulesets.some(
        (entry) =>
          entry.id === currentRulesetId &&
          !entry.isPreset &&
          entry.createdBy === user?.uid,
      ),
    [currentRulesetId, rulesets, user?.uid],
  );

  const handleRivalPreferenceChange = useCallback(
    async (key: string, gender: RivalGender) => {
      if (!activeTrackerId || !user) return;
      try {
        await updateRivalPreference(activeTrackerId, user.uid, key, gender);
      } catch (error) {
        console.error("Failed to update rival preference:", error);
      }
    },
    [activeTrackerId, user],
  );

  const coerceAppState = useCallback(
    (incoming: any, base: AppState): AppState => {
      const gameVersionForDefaults =
        activeGameVersion ?? GAME_VERSIONS["gen5_bw"];
      const savedLevelCaps = Array.isArray(incoming?.levelCaps)
        ? incoming.levelCaps
        : [];
      const finalLevelCaps = gameVersionForDefaults.levelCaps.map(
        (levelCapTemplate) => {
          const savedState = savedLevelCaps.find(
            (lc) => lc.id === levelCapTemplate.id,
          );
          return {
            ...levelCapTemplate,
            done: savedState?.done ?? false,
          };
        },
      );
      const savedRivalCaps = Array.isArray(incoming?.rivalCaps)
        ? incoming.rivalCaps
        : [];
      const finalRivalCaps = gameVersionForDefaults.rivalCaps.map(
        (rivalCapTemplate) => {
          const savedState = savedRivalCaps.find(
            (rc) => rc.id === rivalCapTemplate.id,
          );
          return {
            ...rivalCapTemplate,
            done: savedState?.done ?? false,
            revealed: savedState?.revealed ?? false,
          };
        },
      );

      const safe = incoming && typeof incoming === "object" ? incoming : {};
      const normalizedNames = sanitizePlayerNames(
        Array.isArray(safe.playerNames) ? safe.playerNames : base.playerNames,
      );
      const playerCount = normalizedNames.length;

      const sanitizePokemon = (pokemon: any): Pokemon => ({
        id: normalizePokemonId(pokemon?.id),
        nickname: typeof pokemon?.nickname === "string" ? pokemon.nickname : "",
        ...(typeof pokemon?.name === "string" && pokemon.name.trim().length > 0
          ? { name: pokemon.name.trim() }
          : {}),
      });

      const sanitizeMembers = (link: any): Pokemon[] => {
        return Array.isArray(link?.members)
          ? link.members.map(sanitizePokemon)
          : [];
      };

      const sanitizeLink = (p: any): PokemonLink => {
        const members = sanitizeMembers(p);
        const hasNickname = members.some(
          (member) => member.nickname.trim().length > 0,
        );
        const inferredLost = members.length > 0 && !hasNickname;
        const isLost = typeof p?.isLost === "boolean" ? p.isLost : inferredLost;
        const locationText =
          typeof p?.location === "string" && p.location.trim().length > 0
            ? p.location.trim()
            : "";
        return {
          id: p.id,
          locationSlug: p?.locationSlug ?? null,
          ...(locationText ? { location: locationText } : {}),
          fossilSlugs: p.fossilSlugs || [],
          members,
          isLost,
        };
      };

      const sanitizeArray = (arr: any): PokemonLink[] => {
        const list = Array.isArray(arr) ? arr : [];
        return list.map(sanitizeLink);
      };

      const sanitizeFossils = (playerFossils: any): FossilEntry[][] => {
        return normalizedNames.map((_, i) => {
          const list = Array.isArray(playerFossils) ? playerFossils[i] : null;
          if (!Array.isArray(list)) return [];
          return list.map((f: any) => {
            const locationText =
              typeof f.location === "string" && f.location.trim().length > 0
                ? f.location.trim()
                : "";
            return {
              fossilId: f.fossilId || "",
              ...(locationText ? { location: locationText } : {}),
              locationSlug:
                typeof f.locationSlug === "string" ? f.locationSlug : null,
              inBag: !!f.inBag,
              revived: !!f.revived,
              pokemonId: normalizePokemonId(f.pokemonId),
              ...(typeof f.pokemonName === "string" &&
              f.pokemonName.trim().length > 0
                ? { pokemonName: f.pokemonName.trim() }
                : {}),
            };
          });
        });
      };

      const sanitizeItems = (playerItems: any): ItemEntry[][] => {
        return normalizedNames.map((_, i) => {
          const list = Array.isArray(playerItems) ? playerItems[i] : null;
          if (!Array.isArray(list)) return [];
          return list.map((s: any) => {
            const itemId =
              typeof s.id === "string" && s.id.trim().length > 0
                ? s.id.trim()
                : "";
            return {
              ...(itemId ? { id: itemId } : {}),
              ...(typeof s.name === "string" && s.name.trim().length > 0
                ? { name: s.name.trim() }
                : {}),
              ...(typeof s.location === "string" && s.location.trim().length > 0
                ? { location: s.location.trim() }
                : {}),
              locationSlug:
                typeof s.locationSlug === "string" ? s.locationSlug : null,
              inBag: !!s.inBag,
              used: !!s.used,
            };
          });
        });
      };

      const resolvedRulesetId =
        typeof safe.rulesetId === "string" && safe.rulesetId.trim().length > 0
          ? safe.rulesetId
          : base.rulesetId || DEFAULT_RULESET_ID;
      const sanitizedRules = sanitizeRules(safe.rules);

      const stats = ensureStatsForPlayers(safe.stats, playerCount);

      return {
        playerNames: normalizedNames,
        team: sanitizeArray(safe.team),
        box: sanitizeArray(safe.box),
        graveyard: sanitizeArray(safe.graveyard),
        rules:
          sanitizedRules.length > 0
            ? sanitizedRules
            : base.rules && base.rules.length > 0
              ? base.rules
              : DEFAULT_RULES,
        rulesetId: resolvedRulesetId,
        levelCaps: finalLevelCaps,
        rivalCaps: finalRivalCaps,
        stats: {
          ...stats,
          runs:
            typeof safe.stats?.runs === "number" ? safe.stats.runs : stats.runs,
          best:
            typeof safe.stats?.best === "number" ? safe.stats.best : stats.best,
        },
        legendaryTrackerEnabled:
          safe.legendaryTrackerEnabled ?? base.legendaryTrackerEnabled ?? true,
        rivalCensorEnabled:
          safe.rivalCensorEnabled ?? base.rivalCensorEnabled ?? true,
        rivalCensorMode:
          safe.rivalCensorMode ??
          base.rivalCensorMode ??
          (safe.rivalCensorEnabled === false
            ? "off"
            : safe.rivalCensorEnabled === true
              ? "on"
              : "on"),
        hardcoreModeEnabled:
          safe.hardcoreModeEnabled ?? base.hardcoreModeEnabled ?? true,
        nicknamesEnabled:
          safe.nicknamesEnabled ?? base.nicknamesEnabled ?? true,
        infiniteFossilsEnabled:
          safe.infiniteFossilsEnabled ?? base.infiniteFossilsEnabled ?? false,
        megaStoneSpriteStyle:
          safe.megaStoneSpriteStyle ?? base.megaStoneSpriteStyle ?? "item",
        fossils: sanitizeFossils(safe.fossils),
        items: sanitizeItems(safe.items),
        runStartedAt:
          typeof safe.runStartedAt === "number"
            ? safe.runStartedAt
            : typeof base.runStartedAt === "number"
              ? base.runStartedAt
              : 0,
      };
    },
    [activeGameVersion],
  );

  useEffect(() => {
    if (user)
      window.localStorage.setItem(LAST_TRACKER_STORAGE_KEY, activeTrackerId);
  }, [activeTrackerId, user]);

  const {
    dataLoaded,
    stateConflict,
    realtimeStatus,
    reloadAfterConflict: handleReloadAfterStateConflict,
    retryRealtimeSync,
    discardPendingWrites,
  } = useActiveTracker({
    activeTrackerId,
    userId: user?.uid,
    gameVersionId: activeGameVersionId,
    canLoad: true,
    canWrite: Boolean(user && !isReadOnly && !isExiting),
    data,
    setData,
    coerceState: coerceAppState,
    debounceMs: AUTOSAVE_DEBOUNCE_MS,
  });

  const handleReset = () => {
    if (isReadOnly) return;
    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    if (isReadOnly) return;
    const gameVersionId = activeGameVersionId;
    setData((prev) => {
      const playerNames =
        prev.playerNames.length > 0
          ? sanitizePlayerNames(prev.playerNames)
          : sanitizePlayerNames(activeTrackerMeta?.playerNames);
      const base = createInitialState(gameVersionId, playerNames);
      const playerCount = playerNames.length;
      const makeZeroArray = () => Array.from({ length: playerCount }, () => 0);
      const summedDeaths = Array.from(
        { length: playerCount },
        (_, index) =>
          (prev.stats.sumDeaths?.[index] ?? 0) +
          (prev.stats.deaths?.[index] ?? 0),
      );
      const prevCurrentBest = Array.isArray(prev.levelCaps)
        ? prev.levelCaps.filter((c) => c && (c as any).done).length
        : 0;
      const newBest = Math.max(prev.stats.best ?? 0, prevCurrentBest);

      // Preserve revealed status of rival caps across resets
      const rivalCapsWithRevealedState = base.rivalCaps.map((rc) => {
        const prevRc = prev.rivalCaps?.find((p) => p.id === rc.id);
        return {
          ...rc,
          revealed: prevRc?.revealed ?? false,
        };
      });

      return {
        ...base,
        rivalCaps: rivalCapsWithRevealedState,
        rules: prev.rules, // keep rule changes
        rulesetId: prev.rulesetId ?? base.rulesetId,
        // keep toggled settings
        legendaryTrackerEnabled: prev.legendaryTrackerEnabled,
        rivalCensorEnabled: prev.rivalCensorEnabled,
        rivalCensorMode: prev.rivalCensorMode,
        hardcoreModeEnabled: prev.hardcoreModeEnabled,
        nicknamesEnabled: prev.nicknamesEnabled,
        infiniteFossilsEnabled: prev.infiniteFossilsEnabled,
        megaStoneSpriteStyle: prev.megaStoneSpriteStyle,
        stats: {
          runs: prev.stats.runs + 1, // increase run number by 1
          best: newBest, // persistiertes best
          top4Items: makeZeroArray(),
          deaths: makeZeroArray(),
          sumDeaths: summedDeaths,
          legendaryEncounters: prev.stats.legendaryEncounters ?? 0,
        },
        runStartedAt: Date.now(),
      };
    });
    setShowResetModal(false);
  };

  const getRulesetCopyName = useCallback(() => {
    const rulesetName = currentRuleset?.name;
    let title: string;
    if (rulesetName) {
      title = t("settings.rulesets.copyNameTemplate", {
        rulesetName: rulesetName,
      });
    } else {
      title = t("settings.rulesets.defaultRulesetName");
    }

    return title;
  }, [currentRuleset?.name, t]);

  const getRulesetOverwriteName = useCallback(() => {
    const rulesetName = currentRuleset?.name;
    const trackerName = activeTrackerMeta?.title;
    let title: string;

    if (rulesetName) {
      title = rulesetName;
    } else if (trackerName) {
      title = t("settings.rulesets.trackerRuleTemplate", {
        trackerName: trackerName,
      });
    } else {
      title = t("settings.rulesets.defaultRulesetName");
    }
    return title;
  }, [activeTrackerMeta?.title, currentRuleset?.name, t]);

  useEffect(() => {
    setRulesetCopyName(getRulesetCopyName());
    setRulesetOverwriteName(getRulesetOverwriteName());
  }, [getRulesetCopyName, getRulesetOverwriteName]);

  const handleOpenRulesetEditor = useCallback(() => {
    const from =
      typeof window !== "undefined"
        ? `${location.pathname}${location.search}`
        : undefined;
    navigate("/rulesets", { state: { from } });
  }, [navigate, location.pathname, location.search]);

  const handleNavigateHome = () => {
    navigate("/");
  };

  const handleEditLink = useCallback(
    (
      key: "team" | "box" | "graveyard",
      pairId: LinkId,
      payload: LinkEditPayload,
    ) => {
      if (isReadOnly) return;
      setData((prev) => {
        const collections: Array<"team" | "box" | "graveyard"> = [
          key,
          ...(["team", "box", "graveyard"] as const).filter(
            (collection) => collection !== key,
          ),
        ];
        const currentKey = collections.find((collection) =>
          prev[collection].some((pair) => pair.id === pairId),
        );
        if (!currentKey) return prev;
        return {
          ...prev,
          [currentKey]: prev[currentKey].map((pair) => {
            if (pair.id !== pairId) return pair;
            const isLost = currentKey === "graveyard" && Boolean(pair.isLost);
            return {
              ...pair,
              location: payload.location?.trim() || "",
              locationSlug: payload.locationSlug || null,
              members: payload.members.map((member) => ({
                id: normalizePokemonId(member.id),
                ...(member.name?.trim() ? { name: member.name.trim() } : {}),
                nickname: isLost ? "" : member.nickname.trim(),
              })),
            };
          }),
        };
      });
    },
    [isReadOnly],
  );

  const handleEvolveLink = useCallback(
    (
      key: "team" | "box",
      pairId: LinkId,
      playerIndex: number,
      newId: number,
    ) => {
      if (isReadOnly) return;
      setData((prev) => {
        const collections: Array<"team" | "box" | "graveyard"> = [
          key,
          key === "team" ? "box" : "team",
          "graveyard",
        ];
        const currentKey = collections.find((collection) =>
          prev[collection].some((pair) => pair.id === pairId),
        );
        if (!currentKey) return prev;
        return {
          ...prev,
          [currentKey]: prev[currentKey].map((pair) => {
            if (pair.id !== pairId) return pair;
            const members = [...pair.members];
            members[playerIndex] = {
              ...(members[playerIndex] ?? { nickname: "" }),
              id: newId,
              name: "",
            };
            return { ...pair, members };
          }),
        };
      });
    },
    [isReadOnly],
  );

  const handleLevelCapToggle = useCallback(
    (index: number) => {
      if (isReadOnly) return;
      setData((prev) => ({
        ...prev,
        levelCaps: prev.levelCaps.map((c, i) =>
          i === index ? { ...c, done: !c.done } : c,
        ),
      }));
    },
    [isReadOnly],
  );

  const handleRivalCapToggleDone = useCallback(
    (index: number) => {
      if (isReadOnly) return;
      setData((prev) => ({
        ...prev,
        rivalCaps: prev.rivalCaps.map((rc, i) =>
          i === index ? { ...rc, done: !rc.done } : rc,
        ),
      }));
    },
    [isReadOnly],
  );

  const handleRivalCapReveal = useCallback(
    (index: number) => {
      if (isReadOnly) return;
      setData((prev) => ({
        ...prev,
        rivalCaps: prev.rivalCaps.map((rc, i) =>
          i === index ? { ...rc, revealed: true } : rc,
        ),
      }));
    },
    [isReadOnly],
  );

  const handleStatChange = (stat: keyof AppState["stats"], value: string) => {
    if (isReadOnly) return;
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setData((prev) => ({
        ...prev,
        stats: { ...prev.stats, [stat]: numValue },
      }));
    }
  };

  const handlePlayerStatChange = (
    group: keyof AppState["stats"],
    playerIndex: number,
    value: string,
  ) => {
    if (isReadOnly) return;
    const numValue = Number(value);
    if (isNaN(numValue)) return;
    setData((prev) => {
      const target = prev.stats[group];
      if (!Array.isArray(target)) return prev;
      const updated = target.map((entry, index) =>
        index === playerIndex ? numValue : entry,
      );
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [group]: updated,
        },
      };
    });
  };

  const handleAddToGraveyard = useCallback(
    (pair: PokemonLink) => {
      if (isReadOnly) return;
      setPendingLossPair(pair);
      setShowLossModal(true);
    },
    [isReadOnly],
  );

  const handleDeleteLink = useCallback(
    (pair: PokemonLink) => {
      if (isReadOnly) return;
      setPendingDeletePair(pair);
      setShowDeleteLinkModal(true);
    },
    [isReadOnly],
  );

  const handleConfirmDeleteLink = useCallback(() => {
    if (isReadOnly || !pendingDeletePair) return;
    setData((prev) => ({
      ...prev,
      team: prev.team.filter((p) => p.id !== pendingDeletePair.id),
      box: prev.box.filter((p) => p.id !== pendingDeletePair.id),
      graveyard: prev.graveyard.filter((p) => p.id !== pendingDeletePair.id),
    }));
    setShowDeleteLinkModal(false);
    setPendingDeletePair(null);
  }, [isReadOnly, pendingDeletePair]);

  const handleConfirmLoss = (playerIndex: number) => {
    if (isReadOnly || !pendingLossPair) return;
    if (!pendingLossPair) return;
    const pair = { ...pendingLossPair, isLost: false };
    setData((prev) => ({
      ...prev,
      graveyard: [...prev.graveyard, pair],
      team: prev.team.filter((p) => p.id !== pair.id),
      box: prev.box.filter((p) => p.id !== pair.id),
      stats: {
        ...prev.stats,
        deaths: prev.stats.deaths.map((count, index) =>
          index === playerIndex ? Number(count || 0) + 1 : count,
        ),
      },
    }));
    setShowLossModal(false);
    setPendingLossPair(null);
  };

  const handleManualAddToGraveyard = (pair: PokemonLink) => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      graveyard: [...prev.graveyard, pair],
    }));
  };

  const handleManualAddFromModal = (payload: LinkEditPayload) => {
    if (isReadOnly) return;
    const newPair: PokemonLink = {
      id: createLinkId(),
      location: payload.location?.trim() || "",
      locationSlug: payload.locationSlug,
      members: payload.members.map((member) => ({
        id: normalizePokemonId(member.id),
        ...(member.name?.trim() ? { name: member.name.trim() } : {}),
        nickname: "",
      })),
      isLost: true,
    };
    handleManualAddToGraveyard(newPair);
    setManualLostSession(null);
  };

  const handleEditGraveyardPair = (
    pairId: LinkId,
    payload: LinkEditPayload,
  ) => {
    handleEditLink("graveyard", pairId, payload);
  };

  const handleAddTeamPair = (payload: LinkEditPayload) => {
    if (isReadOnly) return;
    setData((prev) => {
      if (prev.team.length >= 6) return prev; // enforce 6 max
      return {
        ...prev,
        team: [
          ...prev.team,
          {
            id: createLinkId(),
            location: payload.location?.trim() || "",
            locationSlug: payload.locationSlug,
            fossilSlugs: payload.fossilSlugs,
            members: payload.members.map((member) => ({
              id: normalizePokemonId(member.id),
              ...(member.name?.trim() ? { name: member.name.trim() } : {}),
              nickname: member.nickname.trim(),
            })),
          },
        ],
      };
    });
  };

  const handleAddBoxPair = (payload: LinkEditPayload) => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      box: [
        ...prev.box,
        {
          id: createLinkId(),
          location: payload.location?.trim() || "",
          locationSlug: payload.locationSlug,
          fossilSlugs: payload.fossilSlugs,
          members: payload.members.map((member) => ({
            id: normalizePokemonId(member.id),
            ...(member.name?.trim() ? { name: member.name.trim() } : {}),
            nickname: member.nickname.trim(),
          })),
        },
      ],
    }));
  };

  const syncActiveMetaPlayerNames = useCallback(
    (names: string[]) => {
      if (!activeTrackerId || isReadOnly) return;
      setTrackerMetas((prev) => {
        const existing = prev[activeTrackerId];
        if (!existing) return prev;
        return {
          ...prev,
          [activeTrackerId]: {
            ...existing,
            playerNames: names,
          },
        };
      });
      updateTrackerMetadata(activeTrackerId, {
        playerNames: names,
      }).catch(() => {});
    },
    [activeTrackerId, isReadOnly],
  );

  const handlePlayerNameChange = (index: number, name: string) => {
    if (isReadOnly) return;
    setData((prev) => {
      const playerNames = [...prev.playerNames];
      playerNames[index] = name;
      syncActiveMetaPlayerNames(playerNames);
      return { ...prev, playerNames };
    });
  };

  const handleTitleChange = (title: string) => {
    if (!activeTrackerId || isReadOnly) return;
    setTrackerMetas((prev) => {
      const existing = prev[activeTrackerId];
      if (!existing) return prev;
      return {
        ...prev,
        [activeTrackerId]: {
          ...existing,
          title,
        },
      };
    });
    updateTrackerMetadata(activeTrackerId, { title });
  };

  const handleLegendaryTrackerToggle = (enabled: boolean) => {
    if (isReadOnly) return;
    setData((prev) => ({ ...prev, legendaryTrackerEnabled: enabled }));
  };

  const handleRivalCensorToggle = (mode: RivalCensorMode) => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      rivalCensorMode: mode,
      rivalCensorEnabled: mode !== "off",
    }));
  };

  const handleHardcoreModeToggle = (enabled: boolean) => {
    if (isReadOnly) return;
    setData((prev) => ({ ...prev, hardcoreModeEnabled: enabled }));
  };

  const handleNicknamesToggle = (enabled: boolean) => {
    if (isReadOnly) return;
    setData((prev) => ({ ...prev, nicknamesEnabled: enabled }));
  };

  const handleInfiniteFossilsToggle = (enabled: boolean) => {
    if (isReadOnly) return;
    setData((prev) => ({ ...prev, infiniteFossilsEnabled: enabled }));
  };

  const handleMegaStoneSpriteStyleToggle = (usePokemon: boolean) => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      megaStoneSpriteStyle: usePokemon ? "pokemon" : "item",
    }));
  };

  const handleAddFossil = (
    pIdx: number,
    fossilId: string,
    location: string,
    inBag: boolean,
    locationSlug?: string,
  ) => {
    if (isReadOnly) return;
    setData((prev) => {
      const newFossils = [...(prev.fossils || prev.playerNames.map(() => []))];
      const playerList = Array.isArray(newFossils[pIdx])
        ? [...newFossils[pIdx]]
        : [];
      newFossils[pIdx] = [
        ...playerList,
        {
          fossilId,
          ...(location.trim() ? { location: location.trim() } : {}),
          locationSlug: locationSlug ?? null,
          inBag,
          revived: false,
        },
      ];
      return { ...prev, fossils: newFossils };
    });
  };

  const handleToggleFossilBag = (pIdx: number, fIdx: number) => {
    if (isReadOnly) return;
    setData((prev) => {
      const newFossils = [...(prev.fossils || [])];
      if (!newFossils[pIdx]) return prev;
      newFossils[pIdx] = newFossils[pIdx].map((f, i) =>
        i === fIdx
          ? (() => {
              const next = { ...f, inBag: true, locationSlug: null };
              delete next.location;
              return next;
            })()
          : f,
      );
      return { ...prev, fossils: newFossils };
    });
  };

  const handleReviveFossils = (
    selectedIndices: number[],
    playerLabels: string[],
  ) => {
    if (isReadOnly || !data.fossils) return;

    const selectedFossils = selectedIndices.map(
      (fIdx, pIdx) => data.fossils[pIdx][fIdx].fossilId,
    );

    setReviveSession({
      playerLabels: [...playerLabels],
      targets: selectedIndices.map((originalIndex, playerIndex) => ({
        fossilSlug: selectedFossils[playerIndex],
        originalIndex,
      })),
      initial: {
        fossilSlugs: [...selectedFossils],
        locationSlug: null,
        members: playerLabels.map(() => ({ id: null, nickname: "" })),
      },
    });
  };

  const confirmRevival = (
    revivedIds: (number | null)[],
    revivedNames: string[] = [],
  ) => {
    const targets = reviveSession?.targets;
    if (!targets) return;

    setData((prev) => {
      const newFossils = [...(prev.fossils || [])];
      targets.forEach(({ fossilSlug, originalIndex }, pIdx) => {
        const playerFossils = newFossils[pIdx];
        if (playerFossils) {
          const original = playerFossils[originalIndex];
          const targetIndex =
            original?.fossilId === fossilSlug && !original.revived
              ? originalIndex
              : playerFossils.findIndex(
                  (fossil) => fossil.fossilId === fossilSlug && !fossil.revived,
                );
          if (targetIndex === -1) return;
          newFossils[pIdx] = playerFossils.map((f, index) =>
            index === targetIndex
              ? {
                  ...f,
                  revived: true,
                  pokemonId: revivedIds[pIdx] ?? null,
                  ...(revivedNames[pIdx]?.trim()
                    ? { pokemonName: revivedNames[pIdx].trim() }
                    : {}),
                }
              : f,
          );
        }
      });
      return { ...prev, fossils: newFossils };
    });
  };

  const handleUpdateFossilList = useCallback(
    (newFossils: FossilEntry[][]) => {
      if (isReadOnly) return;
      setData((prev) => ({
        ...prev,
        fossils: newFossils,
      }));
    },
    [isReadOnly],
  );

  const handleAddItem = (
    pIdx: number,
    itemId: string | null,
    location: string,
    inBag: boolean,
    name?: string,
    locationSlug?: string,
  ) => {
    if (isReadOnly) return;
    setData((prev) => {
      const newItems = [...(prev.items || prev.playerNames.map(() => []))];
      const playerList = Array.isArray(newItems[pIdx])
        ? [...newItems[pIdx]]
        : [];
      newItems[pIdx] = [
        ...playerList,
        {
          ...(itemId ? { id: itemId } : {}),
          ...(name?.trim() ? { name: name.trim() } : {}),
          ...(location.trim() ? { location: location.trim() } : {}),
          locationSlug: locationSlug ?? null,
          inBag,
          used: false,
        },
      ];
      return { ...prev, items: newItems };
    });
  };

  const handleToggleItemBag = (pIdx: number, sIdx: number) => {
    if (isReadOnly) return;
    setData((prev) => {
      const newItems = [...(prev.items || [])];
      if (!newItems[pIdx]) return prev;
      newItems[pIdx] = newItems[pIdx].map((s, i) =>
        i === sIdx
          ? (() => {
              const next = { ...s, inBag: true, locationSlug: null };
              delete next.location;
              return next;
            })()
          : s,
      );
      return { ...prev, items: newItems };
    });
  };

  const handleUseStone = (pIdx: number, sIdx: number) => {
    if (isReadOnly || !data.items) return;
    setData((prev) => {
      const newItems = [...(prev.items || [])];
      if (newItems[pIdx] && newItems[pIdx][sIdx]) {
        newItems[pIdx] = newItems[pIdx].map((s, i) =>
          i === sIdx ? { ...s, used: true } : s,
        );
      }
      return { ...prev, items: newItems };
    });
  };

  const handleUpdateStoneList = useCallback(
    (newItems: ItemEntry[][]) => {
      if (isReadOnly) return;
      setData((prev) => ({
        ...prev,
        items: newItems,
      }));
    },
    [isReadOnly],
  );

  const applyRulesetChange = useCallback(
    (rulesetId: string) => {
      if (isReadOnly) return;
      const selected =
        rulesets.find((entry) => entry.id === rulesetId) ??
        PRESET_RULESETS.find((entry) => entry.id === rulesetId);
      const normalizedRules =
        sanitizeRules(selected?.rules) || sanitizeRules(DEFAULT_RULES);
      const finalRules =
        normalizedRules.length > 0 ? normalizedRules : DEFAULT_RULES;
      const resolvedId = selected?.id ?? DEFAULT_RULESET_ID;
      setData((prev) => ({
        ...prev,
        rules: finalRules,
        rulesetId: resolvedId,
      }));
      if (activeTrackerId) {
        setTrackerMetas((prev) => {
          const existing = prev[activeTrackerId];
          if (!existing) return prev;
          return {
            ...prev,
            [activeTrackerId]: {
              ...existing,
              rulesetId: resolvedId,
            },
          };
        });
        updateTrackerMetadata(activeTrackerId, {
          rulesetId: resolvedId,
        });
      }
    },
    [activeTrackerId, isReadOnly, rulesets],
  );

  const openRulesetSaveModal = useCallback(
    (reason: "manual" | "switch", nextRulesetId?: string | null) => {
      setRulesetSaveReason(reason);
      setPendingRulesetId(nextRulesetId ?? null);
      setRulesetSaveError(null);
      setRulesetCopyName(getRulesetCopyName());
      setRulesetOverwriteName(getRulesetOverwriteName());
      setShowRulesetSaveModal(true);
    },
    [getRulesetCopyName, getRulesetOverwriteName],
  );

  const handleRulesetChange = useCallback(
    (rulesetId: string) => {
      if (isReadOnly) return;
      const currentId = data.rulesetId || DEFAULT_RULESET_ID;
      if (rulesetId === currentId) return;
      if (!rulesetInSync) {
        openRulesetSaveModal("switch", rulesetId);
        return;
      }
      applyRulesetChange(rulesetId);
    },
    [
      applyRulesetChange,
      data.rulesetId,
      isReadOnly,
      openRulesetSaveModal,
      rulesetInSync,
    ],
  );

  const handleSynchronizeRules = useCallback(() => {
    if (isReadOnly) return;
    applyRulesetChange(currentRulesetId);
  }, [applyRulesetChange, currentRulesetId, isReadOnly]);

  const handlePublicToggle = (enabled: boolean) => {
    if (!activeTrackerId || isReadOnly) return;
    setTrackerMetas((prev) => {
      const existing = prev[activeTrackerId];
      if (!existing) return prev;
      return {
        ...prev,
        [activeTrackerId]: {
          ...existing,
          isPublic: enabled,
        },
      };
    });
    setTrackerVisibility(activeTrackerId, enabled);
  };

  const handleAllPokemonAndItemsToggle = (enabled: boolean) => {
    if (!activeTrackerId || isReadOnly) return;
    setTrackerMetas((prev) => {
      const existing = prev[activeTrackerId];
      if (!existing) return prev;
      return {
        ...prev,
        [activeTrackerId]: {
          ...existing,
          allPokemonAndItems: enabled,
        },
      };
    });
    updateTrackerMetadata(activeTrackerId, {
      allPokemonAndItems: enabled,
    });
  };

  const closeRulesetSaveModal = () => {
    setShowRulesetSaveModal(false);
    setRulesetSaveError(null);
    setPendingRulesetId(null);
    setRulesetSaveLoading(false);
  };

  const handleSaveRulesetFromTracker = useCallback(
    async (mode: "overwrite" | "copy") => {
      if (!user) {
        setRulesetSaveError("Du musst angemeldet sein.");
        return;
      }
      const baseRulesetIsPreset = Boolean(currentRuleset?.isPreset);
      const effectiveMode =
        baseRulesetIsPreset && mode === "overwrite" ? "copy" : mode;
      const currentId = data.rulesetId || defaultLocaleRulesetId;
      const baseRuleset =
        rulesets.find((entry) => entry.id === currentId) ||
        PRESET_RULESETS.find((entry) => entry.id === currentId);
      const name =
        effectiveMode === "overwrite"
          ? rulesetOverwriteName || getRulesetOverwriteName()
          : rulesetCopyName || getRulesetCopyName();
      const description = baseRuleset?.description || "";
      const tags = baseRuleset?.tags;
      const rulesToPersist =
        normalizedTrackerRules.length > 0
          ? normalizedTrackerRules
          : (baseRuleset?.rules ?? DEFAULT_RULES);

      setRulesetSaveLoading(true);
      setRulesetSaveError(null);
      try {
        await saveRuleset(user.uid, {
          id:
            effectiveMode === "overwrite" && !baseRulesetIsPreset
              ? currentId
              : undefined,
          name,
          description,
          rules: rulesToPersist,
          tags,
        });
        if (rulesetSaveReason === "switch" && pendingRulesetId) {
          applyRulesetChange(pendingRulesetId);
        }
        setPendingRulesetId(null);
        setShowRulesetSaveModal(false);
      } catch (err) {
        const fallback =
          t("settings.rulesets.saveModal.error", {
            defaultValue: "Speichern fehlgeschlagen.",
          }) || "Fehler";
        setRulesetSaveError(
          err instanceof Error ? err.message : String(fallback),
        );
      } finally {
        setRulesetSaveLoading(false);
      }
    },
    [
      activeTrackerMeta?.title,
      applyRulesetChange,
      data.rulesetId,
      defaultLocaleRulesetId,
      normalizedTrackerRules,
      pendingRulesetId,
      rulesetCopyName,
      rulesetOverwriteName,
      rulesets,
      rulesetSaveReason,
      t,
      user,
      getRulesetCopyName,
      getRulesetOverwriteName,
    ],
  );

  const handleSkipRulesetSave = () => {
    if (rulesetSaveReason === "switch" && pendingRulesetId) {
      applyRulesetChange(pendingRulesetId);
    }
    closeRulesetSaveModal();
  };

  const handleLegendaryIncrement = () => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        legendaryEncounters: (prev.stats.legendaryEncounters ?? 0) + 1,
      },
    }));
  };

  const handleLegendaryDecrement = () => {
    if (isReadOnly) return;
    setData((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        legendaryEncounters: Math.max(
          0,
          (prev.stats.legendaryEncounters ?? 0) - 1,
        ),
      },
    }));
  };

  const handleRequestTrackerDeletion = useCallback(
    (trackerId: string) => {
      if (!user) return;
      const meta =
        trackerId === activeTrackerId ? activeTrackerMeta : undefined;
      if (!meta) return;
      const role = meta.members?.[user.uid]?.role;
      if (role !== "owner") return;
      setDeleteTrackerError(null);
      setTrackerPendingDelete(meta);
    },
    [activeTrackerId, activeTrackerMeta, user],
  );

  const handleCloseDeleteModal = () => {
    if (deleteTrackerLoading) return;
    setTrackerPendingDelete(null);
    setDeleteTrackerError(null);
  };

  const handleDeleteTracker = useCallback(async () => {
    if (!trackerPendingDelete) return;
    const trackerId = trackerPendingDelete.id;
    setDeleteTrackerError(null);
    setDeleteTrackerLoading(true);
    setIsExiting(true);
    discardPendingWrites();
    try {
      await deleteTracker(trackerId);
      removeTrackerLocally(trackerId);
      window.localStorage.removeItem(LAST_TRACKER_STORAGE_KEY);
      navigate("/", { replace: true });
      setTrackerPendingDelete(null);
    } catch (error) {
      setIsExiting(false);
      setDeleteTrackerError(
        error instanceof Error
          ? error.message
          : "Tracker konnte nicht gelöscht werden.",
      );
    } finally {
      setDeleteTrackerLoading(false);
    }
  }, [
    trackerPendingDelete,
    removeTrackerLocally,
    discardPendingWrites,
    navigate,
  ]);

  const handleInviteMember = useCallback(
    async (email: string, role: "editor" | "guest") => {
      if (!activeTrackerId) {
        throw new Error("Kein aktiver Tracker ausgewählt.");
      }
      try {
        await addMemberByEmail(activeTrackerId, email, role);
      } catch (error) {
        if (error instanceof TrackerOperationError) {
          const details = Array.isArray(error.details)
            ? ` (${error.details.join(", ")})`
            : "";
          throw new Error(`${error.message}${details}`);
        }
        throw new Error("Mitglied konnte nicht hinzugefügt werden.");
      }
    },
    [activeTrackerId],
  );

  const handleRemoveMember = useCallback(
    async (memberUid: string) => {
      if (!activeTrackerId) {
        throw new Error("Kein aktiver Tracker ausgewählt.");
      }
      const trackerId = activeTrackerId;
      const isLeaving = Boolean(user && memberUid === user.uid);
      if (isLeaving) {
        setIsExiting(true);
        discardPendingWrites();
      }
      try {
        await removeMemberFromTracker(trackerId, memberUid);
        if (user && memberUid === user.uid) {
          removeTrackerLocally(trackerId);
          navigate("/", { replace: true });
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(LAST_TRACKER_STORAGE_KEY);
          }
        }
      } catch (error) {
        if (isLeaving) setIsExiting(false);
        if (error instanceof TrackerOperationError) {
          throw new Error(error.message);
        }
        throw new Error("Mitglied konnte nicht entfernt werden.");
      }
    },
    [
      activeTrackerId,
      user,
      removeTrackerLocally,
      discardPendingWrites,
      navigate,
    ],
  );

  const clearedLocations = useMemo(() => {
    const locations: string[] = [];
    const collect = (arr: PokemonLink[] | undefined | null) => {
      const list = Array.isArray(arr) ? arr : [];
      for (const p of list) {
        const r = resolvePokemonLocationDisplay(p, locale).trim();
        if (r) locations.push(r);
      }
    };
    collect(data?.team);
    collect(data?.box);
    collect(data?.graveyard);
    return Array.from(new Set(locations)).sort((a, b) => a.localeCompare(b));
  }, [data, locale]);

  const trackerMembers = activeTrackerMeta
    ? Object.values(activeTrackerMeta.members ?? {})
    : [];
  const trackerGuests = activeTrackerMeta
    ? Object.values(activeTrackerMeta.guests ?? {})
    : [];
  const canManageMembers = Boolean(
    user && activeTrackerMeta?.members?.[user.uid]?.role === "owner",
  );

  const resolvedPlayerNames = useMemo(() => {
    if (Array.isArray(data.playerNames) && data.playerNames.length > 0) {
      return data.playerNames;
    }
    if (
      Array.isArray(activeTrackerMeta?.playerNames) &&
      activeTrackerMeta.playerNames.length > 0
    ) {
      return sanitizePlayerNames(activeTrackerMeta.playerNames);
    }
    return [];
  }, [data.playerNames, activeTrackerMeta?.playerNames]);
  const editableLinkIds = useMemo(
    () =>
      new Set(
        [...data.team, ...data.box, ...data.graveyard].map((pair) => pair.id),
      ),
    [data.team, data.box, data.graveyard],
  );

  const playerColors = useMemo(
    () => resolvedPlayerNames.map((_, index) => PLAYER_COLORS[index]),
    [resolvedPlayerNames],
  );

  // Backfill runStartedAt for legacy trackers once
  useEffect(() => {
    if (!user || isReadOnly || !dataLoaded || !activeTrackerId) return;
    const hasRunStarted =
      typeof data.runStartedAt === "number" && data.runStartedAt > 0;
    const metaCreated =
      typeof activeTrackerMeta?.createdAt === "number"
        ? activeTrackerMeta.createdAt
        : 0;
    if (!hasRunStarted && metaCreated > 0) {
      setData((prev) => ({ ...prev, runStartedAt: metaCreated }));
    }
  }, [
    user,
    isReadOnly,
    dataLoaded,
    activeTrackerId,
    data.runStartedAt,
    activeTrackerMeta?.createdAt,
  ]);

  const nameTitleFallback = resolvedPlayerNames
    .map((n) => n?.trim())
    .filter(Boolean)
    .join(" • ");
  const trackerTitleDisplay =
    activeTrackerMeta?.title?.trim() ||
    nameTitleFallback ||
    t("common.appName");
  const isPublicTracker = Boolean(activeTrackerMeta?.isPublic);
  const readOnlyNotice = isReadOnly
    ? isGuest
      ? t("app.guestReadOnlyNotice")
      : isPublicTracker
        ? t("app.publicReadOnlyNotice")
        : null
    : null;
  if (!dataLoaded) return <LoadingScreen />;

  return (
    <MultiLocaleSearchContext.Provider value={userMultiLocaleSearch}>
      {stateConflict && (
        <div
          role="alert"
          className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-lg rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-lg dark:border-amber-700 dark:bg-amber-950"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            {t("app.stateConflict.title")}
          </p>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            {t("app.stateConflict.description")}
          </p>
          <button
            type="button"
            onClick={() => void handleReloadAfterStateConflict()}
            className={`mt-3 rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800 ${focusRingClasses}`}
          >
            {t("app.stateConflict.reload")}
          </button>
        </div>
      )}
      <DeleteTrackerModal
        isOpen={Boolean(trackerPendingDelete)}
        trackerTitle={trackerPendingDelete?.title}
        onConfirm={handleDeleteTracker}
        onCancel={handleCloseDeleteModal}
        isDeleting={deleteTrackerLoading}
        error={deleteTrackerError}
      />
      {showRulesetSaveModal && (
        <RulesetSaveModal
          isOpen={showRulesetSaveModal}
          onClose={closeRulesetSaveModal}
          onSkip={handleSkipRulesetSave}
          onSave={handleSaveRulesetFromTracker}
          isLoading={rulesetSaveLoading}
          error={rulesetSaveError}
          reason={rulesetSaveReason}
          currentRuleset={currentRuleset}
          hasUserRulesetWithSameId={hasUserRulesetWithSameId}
          rulesetCopyName={rulesetCopyName}
          rulesetOverwriteName={rulesetOverwriteName}
        />
      )}
      {realtimeStatus !== "idle" && realtimeStatus !== "connected" && (
        <RealtimeConnectionBanner
          status={realtimeStatus}
          onRetry={retryRealtimeSync}
        />
      )}
      {showSettings ? (
        <SettingsPage
          trackerTitle={activeTrackerMeta?.title ?? t("tracker.defaultTitle")}
          onTitleChange={handleTitleChange}
          playerNames={resolvedPlayerNames}
          onPlayerNameChange={handlePlayerNameChange}
          onBack={closeSettingsPanel}
          legendaryTrackerEnabled={data.legendaryTrackerEnabled ?? true}
          onlegendaryTrackerToggle={handleLegendaryTrackerToggle}
          rivalCensorMode={
            data.rivalCensorMode ??
            (data.rivalCensorEnabled === false ? "off" : "on")
          }
          onRivalCensorModeChange={handleRivalCensorToggle}
          hardcoreModeEnabled={data.hardcoreModeEnabled ?? true}
          onHardcoreModeToggle={handleHardcoreModeToggle}
          nicknamesEnabled={data.nicknamesEnabled ?? true}
          onNicknamesToggle={handleNicknamesToggle}
          infiniteFossilsEnabled={data.infiniteFossilsEnabled ?? false}
          onInfiniteFossilsToggle={handleInfiniteFossilsToggle}
          allPokemonAndItems={activeTrackerAllPokemonAndItems}
          onAllPokemonAndItemsToggle={handleAllPokemonAndItemsToggle}
          isPublic={activeTrackerMeta?.isPublic ?? false}
          onPublicToggle={handlePublicToggle}
          members={trackerMembers}
          guests={trackerGuests}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onRequestDeleteTracker={() => {
            if (activeTrackerId) {
              handleRequestTrackerDeletion(activeTrackerId);
            }
          }}
          canManageMembers={canManageMembers}
          currentUserId={user?.uid}
          gameVersion={activeGameVersion}
          rivalPreferences={currentUserRivalPreferences}
          onRivalPreferenceChange={handleRivalPreferenceChange}
          rulesets={rulesets}
          selectedRulesetId={data.rulesetId}
          onRulesetSelect={handleRulesetChange}
          onSynchronizeRules={handleSynchronizeRules}
          onOpenRulesetEditor={handleOpenRulesetEditor}
          isGuest={isGuest}
          onSaveRulesetToCollection={() => openRulesetSaveModal("manual")}
          rulesetDirty={!rulesetInSync}
        />
      ) : (
        <TrackerEditor
          trackerId={activeTrackerId}
          trackerTitle={trackerTitleDisplay}
          isReadOnly={isReadOnly}
          isGuest={isGuest}
          readOnlyNotice={readOnlyNotice}
          onReset={handleReset}
          onOpenSettings={openSettingsPanel}
          onNavigateHome={handleNavigateHome}
          addLostModalProps={
            manualLostSession
              ? {
                  onClose: () => setManualLostSession(null),
                  onAdd: handleManualAddFromModal,
                  playerNames: manualLostSession.playerLabels,
                  initial: manualLostSession.initial,
                  generationLimit: pokemonGenerationLimit,
                  generationSpritePath,
                  gameVersionId: activeGameVersionId || undefined,
                }
              : null
          }
          selectLossModalProps={{
            isOpen: !isReadOnly && showLossModal,
            onClose: () => {
              setShowLossModal(false);
              setPendingLossPair(null);
            },
            onConfirm: handleConfirmLoss,
            pair: pendingLossPair,
            playerNames: resolvedPlayerNames,
            generationSpritePath,
            nicknamesEnabled: data.nicknamesEnabled ?? true,
          }}
          deleteLinkModalProps={{
            isOpen: !isReadOnly && showDeleteLinkModal,
            onClose: () => {
              setShowDeleteLinkModal(false);
              setPendingDeletePair(null);
            },
            onConfirm: handleConfirmDeleteLink,
            pair: pendingDeletePair,
            generationSpritePath,
            playerNames: resolvedPlayerNames,
            nicknamesEnabled: data.nicknamesEnabled ?? true,
          }}
          resetModalProps={{
            isOpen: !isReadOnly && showResetModal,
            onClose: () => setShowResetModal(false),
            onConfirm: handleConfirmReset,
          }}
          searchModalProps={{
            playerNames: resolvedPlayerNames,
            playerColors,
            team: data.team,
            box: data.box,
            graveyard: data.graveyard,
            fossils: data.fossils ?? [],
            items: data.items ?? [],
            generationSpritePath,
            gameVersionId: activeGameVersionId || undefined,
          }}
          teamTableProps={{
            title: t("team.teamTitle"),
            data: data.team,
            playerNames: resolvedPlayerNames,
            playerColors,
            onEditLink: (pairId, payload) =>
              handleEditLink("team", pairId, payload),
            onEvolveLink: (pairId, playerIndex, newId) =>
              handleEvolveLink("team", pairId, playerIndex, newId),
            canonicalLinkIds: editableLinkIds,
            onAddToGraveyard: handleAddToGraveyard,
            onAddLink: handleAddTeamPair,
            emptyMessage: t("team.teamEmpty"),
            addDisabled: data.team.length >= 6,
            addDisabledReason: t("team.teamFull"),
            context: "team",
            onMoveToTeam: () => {},
            onMoveToBox: (pair) => {
              if (isReadOnly) return;
              setData((previous) => ({
                ...previous,
                team: previous.team.filter((entry) => entry.id !== pair.id),
                box: [...previous.box, pair],
              }));
            },
            pokemonGenerationLimit,
            gameVersionId: activeGameVersionId || undefined,
            readOnly: isReadOnly,
            generationSpritePath,
            useSpritesInTeamTable: userUseSpritesInTeamTable,
            wikiId: effectiveWikiId,
            badLinkIds: hiddenLinkIds,
            onToggleBadLink: isReadOnly ? undefined : toggleHiddenLink,
            filtersExpanded: boxFiltersExpanded,
            nicknamesEnabled: data.nicknamesEnabled ?? true,
          }}
          boxTableProps={{
            title: t("team.boxTitle"),
            data: filteredBox,
            playerNames: resolvedPlayerNames,
            playerColors,
            onEditLink: (pairId, payload) =>
              handleEditLink("box", pairId, payload),
            onEvolveLink: (pairId, playerIndex, newId) =>
              handleEvolveLink("box", pairId, playerIndex, newId),
            canonicalLinkIds: editableLinkIds,
            onAddToGraveyard: handleAddToGraveyard,
            onDeleteLink: handleDeleteLink,
            onAddLink: handleAddBoxPair,
            emptyMessage: t("team.boxEmpty"),
            context: "box",
            onMoveToTeam: (pair) =>
              setData((previous) => {
                if (isReadOnly || previous.team.length >= 6) return previous;
                return {
                  ...previous,
                  box: previous.box.filter((entry) => entry.id !== pair.id),
                  team: [...previous.team, pair],
                };
              }),
            onMoveToBox: () => {},
            teamIsFull: data.team.length >= 6,
            pokemonGenerationLimit,
            gameVersionId: activeGameVersionId || undefined,
            readOnly: isReadOnly,
            generationSpritePath,
            useSpritesInTeamTable: userUseSpritesInTeamTable,
            wikiId: effectiveWikiId,
            badLinkIds: hiddenLinkIds,
            onToggleBadLink: isReadOnly ? undefined : toggleHiddenLink,
            filtersExpanded: boxFiltersExpanded,
            nicknamesEnabled: data.nicknamesEnabled ?? true,
          }}
          boxFiltersProps={{
            playerNames: resolvedPlayerNames,
            playerColors,
            typeFilter: boxTypeFilter,
            onTypeFilterChange: handleBoxTypeFilterChange,
            hideHiddenLinks: boxHideHiddenLinks,
            onHideHiddenLinksChange: handleBoxHideHiddenLinksChange,
            hasHiddenLinks: hiddenLinkIds.size > 0,
            onResetHiddenLinks: resetAllHiddenLinks,
            playerTypeSlugs,
            expanded: boxFiltersExpanded,
            onExpandedChange: handleBoxFiltersExpandedChange,
          }}
          infoPanelProps={{
            levelCaps: data.levelCaps,
            rivalCaps: data.rivalCaps,
            stats: data.stats,
            playerNames: resolvedPlayerNames,
            playerColors,
            onLevelCapToggle: handleLevelCapToggle,
            onRivalCapToggleDone: handleRivalCapToggleDone,
            onRivalCapReveal: handleRivalCapReveal,
            onStatChange: handleStatChange,
            onPlayerStatChange: handlePlayerStatChange,
            legendaryTrackerEnabled: data.legendaryTrackerEnabled ?? true,
            rivalCensorEnabled: data.rivalCensorEnabled ?? true,
            rivalCensorMode:
              data.rivalCensorMode ??
              (data.rivalCensorEnabled === false ? "off" : "on"),
            hardcoreModeEnabled: data.hardcoreModeEnabled ?? true,
            onlegendaryIncrement: handleLegendaryIncrement,
            onlegendaryDecrement: handleLegendaryDecrement,
            runStartedAt: data.runStartedAt ?? activeTrackerMeta?.createdAt,
            gameVersion: activeGameVersion,
            rivalPreferences: currentUserRivalPreferences,
            activeTrackerId,
            readOnly: isReadOnly,
            generationSpritePath,
            pokemonGenerationLimit,
          }}
          itemTrackerProps={{
            playerNames: resolvedPlayerNames,
            fossils: data.fossils || resolvedPlayerNames.map(() => []),
            items: data.items || resolvedPlayerNames.map(() => []),
            maxGeneration: itemGenerationLimit,
            infiniteFossilsEnabled: data.infiniteFossilsEnabled ?? false,
            onAddFossil: handleAddFossil,
            onToggleBag: handleToggleFossilBag,
            onRevive: (selectedIndices) =>
              handleReviveFossils(selectedIndices, resolvedPlayerNames),
            onUpdateFossils: handleUpdateFossilList,
            onAddItems: handleAddItem,
            onToggleItemBag: handleToggleItemBag,
            onUseItem: handleUseStone,
            onUpdateItems: handleUpdateStoneList,
            readOnly: isReadOnly,
            gameVersionId: activeGameVersionId || undefined,
            allPokemonAndItems: activeTrackerAllPokemonAndItems,
            generationSpritePath,
            megaStoneSpriteStyle: data.megaStoneSpriteStyle ?? "item",
            onMegaStoneSpriteStyleToggle: handleMegaStoneSpriteStyleToggle,
          }}
          rulesProps={{
            rules: data.rules,
            onRulesChange: (rules) =>
              setData((previous) => ({ ...previous, rules })),
            readOnly: isReadOnly,
          }}
          graveyardProps={{
            graveyard: data.graveyard,
            canonicalLinkIds: editableLinkIds,
            playerNames: resolvedPlayerNames,
            playerColors,
            onManualAddClick: () => {
              const playerLabels = [...resolvedPlayerNames];
              setManualLostSession({
                playerLabels,
                initial: {
                  location: "",
                  locationSlug: null,
                  members: playerLabels.map(() => ({
                    id: null,
                    nickname: "",
                  })),
                },
              });
            },
            onEditPair: handleEditGraveyardPair,
            onDeleteLink: handleDeleteLink,
            readOnly: isReadOnly,
            generationSpritePath,
            pokemonGenerationLimit,
            gameVersionId: activeGameVersionId || undefined,
            wikiId: effectiveWikiId,
            nicknamesEnabled: data.nicknamesEnabled ?? true,
          }}
          clearedLocationsProps={{ locations: clearedLocations }}
          reviveModalProps={
            reviveSession
              ? {
                  onClose: () => setReviveSession(null),
                  onSave: (payload) => {
                    handleAddBoxPair(payload);
                    const pokemonIds = payload.members.map((member) =>
                      normalizePokemonId(member.id),
                    );
                    const pokemonNames = payload.members.map(
                      (member) => member.name ?? "",
                    );
                    confirmRevival(pokemonIds, pokemonNames);
                    setReviveSession(null);
                  },
                  playerLabels: reviveSession.playerLabels,
                  mode: "create",
                  initial: reviveSession.initial,
                  generationLimit: pokemonGenerationLimit,
                  gameVersionId: activeGameVersionId || undefined,
                  generationSpritePath,
                  nicknamesEnabled: data.nicknamesEnabled ?? true,
                }
              : null
          }
        />
      )}
    </MultiLocaleSearchContext.Provider>
  );
};

export default TrackerPage;
