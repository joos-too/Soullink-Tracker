import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useMatch } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthSession } from "@/src/hooks/useAuthSession";
import { useTrackerList } from "@/src/hooks/useTrackerList";
import { useRulesets } from "@/src/hooks/useRulesets";
import { synchronizeCurrentUserLanguage } from "@/src/services/backend/auth";
import { normalizeLanguage } from "@/src/utils/language";
import {
  DEFAULT_WIKI_DE,
  DEFAULT_WIKI_EN,
  type WikiId,
} from "@/src/utils/wiki";
import { DEFAULT_RULESET_ID, DEFAULT_RULESET_ID_EN } from "@/src/data/rulesets";
import { isTrackerUuid } from "./trackerStorage";
import {
  ensureUserProfile,
  getDefaultDisplayName,
  getUserProfilePreferences,
  updateUserDisplayName,
  updateUserGenerationSpritePreference,
  updateUserMultiLocaleSearchPreference,
  updateUserSpritesInTeamTablePreference,
  updateUserWikiPreference,
} from "@/src/services/repos/profileRepository.ts";

function useSession() {
  const { user, loading } = useAuthSession();
  const match = useMatch("/tracker/:trackerId");
  const routeId = match?.params.trackerId ?? null;
  const trackers = useTrackerList(
    user?.uid,
    isTrackerUuid(routeId) ? routeId : null,
  );
  const rulesets = useRulesets(user?.uid);
  const { i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const defaultLocaleRulesetId = useMemo(() => {
    const language = (
      i18n.resolvedLanguage ||
      i18n.language ||
      ""
    ).toLowerCase();
    return language.startsWith("en")
      ? DEFAULT_RULESET_ID_EN
      : DEFAULT_RULESET_ID;
  }, [i18n.language, i18n.resolvedLanguage]);
  const [userUseGenerationSprites, setUserUseGenerationSprites] =
    useState(false);
  const [userUseSpritesInTeamTable, setUserUseSpritesInTeamTable] =
    useState(false);
  const [userWikiId, setUserWikiId] = useState<string | null>(null);
  const [userMultiLocaleSearch, setUserMultiLocaleSearch] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userDisplayNameRequiresUpdate, setUserDisplayNameRequiresUpdate] =
    useState(false);
  const handleGenerationSpritesToggle = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      try {
        await updateUserGenerationSpritePreference(user.uid, enabled);
        setUserUseGenerationSprites(enabled);
      } catch (error) {
        console.error("Failed to update generation sprites preference:", error);
      }
    },
    [user],
  );

  const handleSpritesInTeamTableToggle = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      try {
        await updateUserSpritesInTeamTablePreference(user.uid, enabled);
        setUserUseSpritesInTeamTable(enabled);
      } catch (error) {
        console.error(
          "Failed to update sprites in team table preference:",
          error,
        );
      }
    },
    [user],
  );

  const handleWikiChange = useCallback(
    async (id: WikiId) => {
      if (!user) return;
      try {
        await updateUserWikiPreference(user.uid, id);
        setUserWikiId(id);
      } catch (error) {
        console.error("Failed to update wiki preference:", error);
      }
    },
    [user],
  );

  const handleMultiLocaleSearchToggle = useCallback(
    async (enabled: boolean) => {
      if (!user) return;
      try {
        await updateUserMultiLocaleSearchPreference(user.uid, enabled);
        setUserMultiLocaleSearch(enabled);
      } catch (error) {
        console.error(
          "Failed to update multi-locale search preference:",
          error,
        );
      }
    },
    [user],
  );

  const handleDisplayNameChange = useCallback(
    async (displayName: string) => {
      if (!user) return;
      setUserDisplayName(await updateUserDisplayName(user.uid, displayName));
      setUserDisplayNameRequiresUpdate(false);
    },
    [user],
  );

  const effectiveWikiId: WikiId =
    (userWikiId as WikiId | null) ??
    ((i18n.resolvedLanguage || i18n.language || "")
      .toLowerCase()
      .startsWith("de")
      ? DEFAULT_WIKI_DE
      : DEFAULT_WIKI_EN);

  useEffect(() => {
    if (!user || user.language === locale) return;
    synchronizeCurrentUserLanguage(user.language, locale).catch((error) => {
      console.error("Failed to synchronize authentication language", error);
    });
  }, [locale, user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setUserUseGenerationSprites(false);
      setUserUseSpritesInTeamTable(false);
      setUserWikiId(null);
      setUserMultiLocaleSearch(false);
      setUserDisplayName("");
      setUserDisplayNameRequiresUpdate(false);
      return;
    }
    ensureUserProfile(user).catch(() => {});
    getUserProfilePreferences(user.uid, user.email)
      .then((preferences) => {
        if (cancelled) return;
        setUserUseGenerationSprites(preferences.useGenerationSprites);
        setUserUseSpritesInTeamTable(preferences.useSpritesInTeamTable);
        setUserWikiId(preferences.wikiId);
        setUserMultiLocaleSearch(preferences.multiLocaleSearch);
        setUserDisplayName(preferences.displayName);
        setUserDisplayNameRequiresUpdate(preferences.displayNameRequiresUpdate);
      })
      .catch(() => {
        if (cancelled) return;
        setUserUseGenerationSprites(false);
        setUserUseSpritesInTeamTable(false);
        setUserWikiId(null);
        setUserMultiLocaleSearch(false);
        setUserDisplayName(getDefaultDisplayName(user.email));
        setUserDisplayNameRequiresUpdate(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    user,
    ...trackers,
    authLoading: loading,
    userTrackersLoading: trackers.loading,
    rulesets,
    locale,
    defaultLocaleRulesetId,
    userUseGenerationSprites,
    userUseSpritesInTeamTable,
    userMultiLocaleSearch,
    userDisplayName,
    userDisplayNameRequiresUpdate,
    effectiveWikiId,
    handleGenerationSpritesToggle,
    handleSpritesInTeamTableToggle,
    handleWikiChange,
    handleMultiLocaleSearchToggle,
    handleDisplayNameChange,
  };
}
const AppSessionContext = createContext<ReturnType<typeof useSession> | null>(
  null,
);
export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = useSession();
  return (
    <AppSessionContext.Provider value={session}>
      {children}
    </AppSessionContext.Provider>
  );
}
export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) throw new Error("AppSessionProvider is required");
  return session;
}
