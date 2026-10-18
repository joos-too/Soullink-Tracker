import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
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
} from "@/src/utils/wikiPreferences";
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
  updateUserImageLoadingPreference,
} from "@/src/services/repos/profileRepository.ts";
import { ImageLoadingContext } from "@/src/contexts/ImageLoadingContext";
import { ImageConsentContext } from "@/src/contexts/ImageConsentContext";
import { setImageCachingAllowed } from "@/src/services/imageCache";
import ImageConsentModal from "@/src/components/modals/ImageConsentModal";
import { useLocation } from "react-router-dom";

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
  const [imageConsent, setImageConsent] = useState<{
    userId: string;
    value: boolean | null;
  } | null>(null);
  const [imageConsentBlocked, setImageConsentBlocked] = useState<string | null>(
    null,
  );
  const imageConsentVersion = useRef(0);
  const activeUserId = useRef(user?.uid);
  activeUserId.current = user?.uid;
  const imageConsentLoaded = !!user && imageConsent?.userId === user.uid;
  const allowImageLoading = imageConsentLoaded ? imageConsent.value : null;
  const handleImageLoadingChange = useCallback(
    async (allowed: boolean) => {
      if (!user) return;
      imageConsentVersion.current += 1;
      if (!allowed) setImageConsentBlocked(user.uid);
      await updateUserImageLoadingPreference(user.uid, allowed);
      if (activeUserId.current !== user.uid) return;
      imageConsentVersion.current += 1;
      setImageConsent({ userId: user.uid, value: allowed });
      setImageConsentBlocked(allowed ? null : user.uid);
    },
    [user?.uid],
  );
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
    const consentVersion = imageConsentVersion.current;
    if (!user) {
      setUserUseGenerationSprites(false);
      setUserUseSpritesInTeamTable(false);
      setUserWikiId(null);
      setUserMultiLocaleSearch(false);
      setUserDisplayName("");
      setUserDisplayNameRequiresUpdate(false);
      setImageConsent(null);
      setImageConsentBlocked(null);
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
        if (imageConsentVersion.current === consentVersion) {
          setImageConsent({
            userId: user.uid,
            value: preferences.allowImageLoading ?? null,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setUserUseGenerationSprites(false);
        setUserUseSpritesInTeamTable(false);
        setUserWikiId(null);
        setUserMultiLocaleSearch(false);
        setUserDisplayName(getDefaultDisplayName(user.email));
        setUserDisplayNameRequiresUpdate(false);
        if (imageConsentVersion.current === consentVersion) {
          setImageConsent({ userId: user.uid, value: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return {
    user,
    allowImageLoading,
    imageConsentLoaded,
    imageLoadingAllowed:
      allowImageLoading === true && imageConsentBlocked !== user?.uid,
    handleImageLoadingChange,
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
  const { pathname } = useLocation();
  const [anonymousConsent, setAnonymousConsent] = useState<boolean | null>(
    () => {
      try {
        const stored = sessionStorage.getItem("soullink:allowImageLoading");
        return stored === "true" ? true : stored === "false" ? false : null;
      } catch {
        return null;
      }
    },
  );
  const [manualActor, setManualActor] = useState<string | null>(null);
  const actor = session.user?.uid ?? "guest";
  useEffect(() => {
    setManualActor(null);
  }, [actor, pathname]);
  const inApp =
    !["/reset", "/legalnotice", "/privacypolicy"].includes(pathname) &&
    (!!session.user || pathname.startsWith("/tracker/"));
  const imagesAllowed =
    !session.authLoading &&
    (session.user ? session.imageLoadingAllowed : anonymousConsent === true);
  useLayoutEffect(() => {
    void setImageCachingAllowed(imagesAllowed).catch((error) =>
      console.error("Failed to update image cache permission", error),
    );
  }, [imagesAllowed]);
  const ready =
    !session.authLoading && (!session.user || session.imageConsentLoaded);
  const decision = session.user
    ? session.allowImageLoading === null
      ? null
      : session.imageLoadingAllowed
    : anonymousConsent;
  const showConsent =
    inApp && ready && (decision === null || manualActor === actor);
  const openConsent = useCallback(() => setManualActor(actor), [actor]);
  return (
    <AppSessionContext.Provider value={session}>
      <ImageLoadingContext.Provider value={imagesAllowed}>
        <ImageConsentContext.Provider
          value={{
            decision,
            isOpen: showConsent,
            openConsent: inApp && ready ? openConsent : null,
            showGuestFooterEntry:
              ready && !session.user && pathname.startsWith("/tracker/"),
          }}
        >
          {children}
        </ImageConsentContext.Provider>
        {showConsent && (
          <ImageConsentModal
            key={actor}
            requireDecision={decision === null}
            onClose={() => setManualActor(null)}
            onChoose={async (allowed) => {
              if (session.user) await session.handleImageLoadingChange(allowed);
              else {
                try {
                  sessionStorage.setItem(
                    "soullink:allowImageLoading",
                    String(allowed),
                  );
                } catch {
                  /* Keep the choice in memory if storage is unavailable. */
                }
                setAnonymousConsent(allowed);
              }
              setManualActor(null);
            }}
          />
        )}
      </ImageLoadingContext.Provider>
    </AppSessionContext.Provider>
  );
}
export function useAppSession() {
  const session = useContext(AppSessionContext);
  if (!session) throw new Error("AppSessionProvider is required");
  return session;
}
