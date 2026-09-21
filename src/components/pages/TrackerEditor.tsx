import React, { useEffect, useState, type ComponentProps } from "react";
import { FaGithub } from "react-icons/fa";
import {
  FiHome,
  FiMenu,
  FiMoon,
  FiRotateCw,
  FiSearch,
  FiSliders,
  FiSun,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import AddLostPokemonModal from "@/src/components/modals/AddLostPokemonModal.tsx";
import DeleteLinkModal from "@/src/components/modals/DeleteLinkModal.tsx";
import EditPairModal from "@/src/components/modals/EditPairModal.tsx";
import ResetModal from "@/src/components/modals/ResetModal.tsx";
import SelectLossModal from "@/src/components/modals/SelectLossModal.tsx";
import TrackerSearchModal from "@/src/components/modals/TrackerSearchModal.tsx";
import ReadOnlyNoticeBanner from "@/src/components/banners/ReadOnlyNoticeBanner.tsx";
import BoxFilters from "@/src/components/widgets/BoxFilters.tsx";
import ClearedLocations from "@/src/components/widgets/ClearedLocations.tsx";
import Graveyard from "@/src/components/widgets/Graveyard.tsx";
import InfoPanel from "@/src/components/widgets/InfoPanel.tsx";
import ItemTracker from "@/src/components/widgets/ItemTracker.tsx";
import Rules from "@/src/components/widgets/Rules.tsx";
import TeamTable from "@/src/components/widgets/TeamTable.tsx";
import DarkModeToggle, {
  getDarkMode,
  setDarkMode,
} from "@/src/components/toggles/DarkModeToggle.tsx";
import { focusRingClasses } from "@/src/styles/focusRing.ts";

interface TrackerEditorProps {
  trackerId: string;
  trackerTitle: string;
  isReadOnly: boolean;
  isGuest: boolean;
  readOnlyNotice: string | null;
  onReset: () => void;
  onOpenSettings: () => void;
  onNavigateHome: () => void;
  addLostModalProps: ComponentProps<typeof AddLostPokemonModal> | null;
  selectLossModalProps: ComponentProps<typeof SelectLossModal>;
  deleteLinkModalProps: ComponentProps<typeof DeleteLinkModal>;
  resetModalProps: ComponentProps<typeof ResetModal>;
  searchModalProps: Omit<
    ComponentProps<typeof TrackerSearchModal>,
    "isOpen" | "onClose"
  >;
  teamTableProps: ComponentProps<typeof TeamTable>;
  boxTableProps: ComponentProps<typeof TeamTable>;
  boxFiltersProps: ComponentProps<typeof BoxFilters>;
  infoPanelProps: ComponentProps<typeof InfoPanel>;
  itemTrackerProps: ComponentProps<typeof ItemTracker>;
  rulesProps: ComponentProps<typeof Rules>;
  graveyardProps: ComponentProps<typeof Graveyard>;
  clearedLocationsProps: ComponentProps<typeof ClearedLocations>;
  reviveModalProps: ComponentProps<typeof EditPairModal> | null;
}

const TrackerEditor: React.FC<TrackerEditorProps> = ({
  trackerId,
  trackerTitle,
  isReadOnly,
  isGuest,
  readOnlyNotice,
  onReset,
  onOpenSettings,
  onNavigateHome,
  addLostModalProps,
  selectLossModalProps,
  deleteLinkModalProps,
  resetModalProps,
  searchModalProps,
  teamTableProps,
  boxTableProps,
  boxFiltersProps,
  infoPanelProps,
  itemTrackerProps,
  rulesProps,
  graveyardProps,
  clearedLocationsProps,
  reviveModalProps,
}) => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isDark, setIsDark] = useState(getDarkMode());

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(getDarkMode()));
    observer.observe(target, { attributes: true, attributeFilter: ["class"] });
    const onStorage = (event: StorageEvent) => {
      if (event.key === "color-theme") setIsDark(getDarkMode());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const handleTrackerSearchShortcut = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.key.toLowerCase() !== "f"
      ) {
        return;
      }
      event.preventDefault();
      setMobileMenuOpen(false);
      setShowSearchModal(true);
    };
    window.addEventListener("keydown", handleTrackerSearchShortcut);
    return () =>
      window.removeEventListener("keydown", handleTrackerSearchShortcut);
  }, []);

  const openSettings = () => {
    setMobileMenuOpen(false);
    onOpenSettings();
  };
  const navigateHome = () => {
    setMobileMenuOpen(false);
    onNavigateHome();
  };

  return (
    <div className="bg-[#f0f0f0] dark:bg-gray-900 min-h-screen p-2 sm:p-4 md:p-8 text-gray-800 dark:text-gray-200">
      {addLostModalProps && <AddLostPokemonModal {...addLostModalProps} />}
      <SelectLossModal {...selectLossModalProps} />
      <DeleteLinkModal {...deleteLinkModalProps} />
      <ResetModal {...resetModalProps} />
      {showSearchModal && (
        <TrackerSearchModal
          {...searchModalProps}
          isOpen
          onClose={() => setShowSearchModal(false)}
        />
      )}
      {readOnlyNotice && (
        <ReadOnlyNoticeBanner
          key={trackerId}
          trackerId={trackerId}
          notice={readOnlyNotice}
        />
      )}
      <div className="max-w-480 mx-auto bg-white dark:bg-gray-800 shadow-lg p-4 rounded-lg">
        <header className="relative py-4 border-b-2 border-gray-300 dark:border-gray-700">
          <div className="mx-auto max-w-full px-2 pr-14 sm:pr-16 xl:px-0 xl:pr-0 text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-3xl 2xl:text-4xl font-bold font-press-start tracking-tighter dark:text-gray-100">
              {trackerTitle}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t("tracker.header.subtitle")}
            </p>
          </div>
          <div className="absolute right-2 sm:right-4 top-2 sm:top-3 flex items-center gap-1 sm:gap-2 z-30">
            <div className="hidden xl:flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowSearchModal(true)}
                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                aria-label={t("tracker.search.openWithShortcut")}
                title={t("tracker.search.openWithShortcut")}
              >
                <FiSearch size={28} />
              </button>
              {!isReadOnly && (
                <button
                  onClick={onReset}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                  aria-label={t("tracker.actions.resetRun")}
                  title={t("tracker.actions.resetRun")}
                >
                  <FiRotateCw size={28} />
                </button>
              )}
              <span
                aria-hidden
                className="h-8 w-px bg-gray-300 dark:bg-gray-600"
              />
              <DarkModeToggle />
              {(!isReadOnly || isGuest) && (
                <button
                  onClick={openSettings}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                  aria-label={t("tracker.actions.settings")}
                  title={t("tracker.actions.settings")}
                >
                  <FiSliders size={28} />
                </button>
              )}
              <button
                onClick={navigateHome}
                className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                aria-label={t("common.overview")}
                title={t("common.overview")}
              >
                <FiHome size={28} />
              </button>
            </div>
            <button
              className={`xl:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 ${focusRingClasses}`}
              aria-label={t("tracker.menu.open")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              <FiMenu size={26} />
            </button>
          </div>
        </header>

        <div className="xl:hidden">
          <div
            className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-40`}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden
          />
          <div
            className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"} z-50`}
            role="dialog"
            aria-label={t("tracker.menu.dialog")}
          >
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("tracker.menu.title")}
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 ${focusRingClasses}`}
                aria-label={t("tracker.menu.close")}
              >
                ✕
              </button>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSearchModal(true);
                }}
                className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                title={t("tracker.search.open")}
              >
                <FiSearch size={18} /> {t("tracker.search.open")}
              </button>
              {!isReadOnly && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onReset();
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                  title={t("tracker.menu.resetRun")}
                >
                  <FiRotateCw size={18} /> {t("tracker.menu.resetRun")}
                </button>
              )}
              <div
                aria-hidden
                className="border-t border-gray-200 dark:border-gray-700"
              />
              <button
                onClick={() => {
                  const next = !isDark;
                  setDarkMode(next);
                  setIsDark(next);
                }}
                className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                title={
                  isDark
                    ? t("tracker.menu.lightMode")
                    : t("tracker.menu.darkMode")
                }
              >
                {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                {isDark
                  ? t("tracker.menu.lightMode")
                  : t("tracker.menu.darkMode")}
              </button>
              {(!isReadOnly || isGuest) && (
                <button
                  onClick={openSettings}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm inline-flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                  title={t("tracker.menu.settings")}
                >
                  <FiSliders size={18} /> {t("tracker.menu.settings")}
                </button>
              )}
              <button
                onClick={navigateHome}
                className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                title={t("common.overview")}
              >
                <FiHome size={18} /> {t("tracker.menu.overview")}
              </button>
            </div>
          </div>
        </div>

        <main className="grid grid-cols-1 xl:grid-cols-[64fr_36fr] gap-6 mt-6">
          <div className="space-y-8">
            <TeamTable key={`team-${trackerId}`} {...teamTableProps} />
            <TeamTable
              key={`box-${trackerId}`}
              {...boxTableProps}
              filterBar={<BoxFilters {...boxFiltersProps} />}
            />
          </div>
          <div className="space-y-6">
            <InfoPanel {...infoPanelProps} />
            <ItemTracker {...itemTrackerProps} />
            <Rules {...rulesProps} />
            <Graveyard key={`graveyard-${trackerId}`} {...graveyardProps} />
            <ClearedLocations {...clearedLocationsProps} />
          </div>
        </main>
        <footer className="text-center mt-8 py-4 border-t-2 border-gray-200 dark:border-gray-700">
          <a
            href="https://github.com/joos-too/soullink-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            title={t("tracker.footer.github")}
          >
            <FaGithub size={18} aria-hidden="true" />
            <span className="text-sm">Coded by joos-too & FreakMediaLP</span>
          </a>
        </footer>
      </div>
      {reviveModalProps && <EditPairModal {...reviveModalProps} />}
    </div>
  );
};

export default TrackerEditor;
