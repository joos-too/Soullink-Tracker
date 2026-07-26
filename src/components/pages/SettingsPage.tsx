import React, { useId, useMemo, useState } from "react";
import {
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
  PLAYER_COLORS,
} from "@/src/services/init.ts";
import type {
  GameVersion,
  RivalCensorMode,
  RivalGender,
  Ruleset,
  TrackerMember,
  UserSettings,
  VariableRival,
} from "@/types.ts";
import {
  FiArrowLeft,
  FiAlertTriangle,
  FiEdit,
  FiEye,
  FiInfo,
  FiLogOut,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiTrash2,
  FiUserPlus,
  FiX,
} from "react-icons/fi";
import {
  focusRingClasses,
  focusRingInputClasses,
  focusRingRedClasses,
} from "@/src/styles/focusRing.ts";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch.tsx";
import TriStateToggle from "@/src/components/toggles/TriStateToggle.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { useTranslation } from "react-i18next";
import { getLocalizedRivalEntry } from "@/src/services/gameLocalization.ts";
import RulesetPicker from "@/src/components/pickers/RulesetPicker.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import RulesetSyncModal from "@/src/components/modals/RulesetSyncModal.tsx";

type InviteRoleOption = "editor" | "guest";

interface SettingsPageProps {
  trackerTitle: string;
  playerNames: string[];
  onTitleChange: (title: string) => void;
  onPlayerNameChange: (index: number, name: string) => void;
  onBack: () => void;
  legendaryTrackerEnabled: boolean;
  onlegendaryTrackerToggle: (enabled: boolean) => void;
  rivalCensorMode: RivalCensorMode;
  onRivalCensorModeChange: (mode: RivalCensorMode) => void;
  hardcoreModeEnabled: boolean;
  onHardcoreModeToggle: (enabled: boolean) => void;
  nicknamesEnabled: boolean;
  onNicknamesToggle: (enabled: boolean) => void;
  infiniteFossilsEnabled: boolean;
  onInfiniteFossilsToggle: (enabled: boolean) => void;
  allPokemonAndItems: boolean;
  onAllPokemonAndItemsToggle: (enabled: boolean) => void;
  isPublic: boolean;
  onPublicToggle: (enabled: boolean) => void;
  members: TrackerMember[];
  guests: TrackerMember[];
  onInviteMember: (email: string, role: InviteRoleOption) => Promise<void>;
  onRemoveMember: (memberUid: string) => Promise<void>;
  onRequestDeleteTracker: () => void;
  canManageMembers: boolean;
  currentUserEmail?: string | null;
  currentUserId?: string | null;
  gameVersion?: GameVersion;
  rivalPreferences?: UserSettings["rivalPreferences"];
  onRivalPreferenceChange: (key: string, gender: RivalGender) => void;
  rulesets: Ruleset[];
  selectedRulesetId?: string;
  onRulesetSelect: (rulesetId: string) => void;
  onSynchronizeRules: () => void;
  onOpenRulesetEditor: () => void;
  isGuest?: boolean;
  onSaveRulesetToCollection: () => void;
  rulesetDirty?: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  trackerTitle,
  playerNames,
  onTitleChange,
  onPlayerNameChange,
  onBack,
  legendaryTrackerEnabled,
  onlegendaryTrackerToggle,
  rivalCensorMode,
  onRivalCensorModeChange,
  hardcoreModeEnabled,
  onHardcoreModeToggle,
  nicknamesEnabled,
  onNicknamesToggle,
  infiniteFossilsEnabled,
  onInfiniteFossilsToggle,
  allPokemonAndItems,
  onAllPokemonAndItemsToggle,
  isPublic,
  onPublicToggle,
  members,
  guests,
  onInviteMember,
  onRemoveMember,
  onRequestDeleteTracker,
  canManageMembers,
  currentUserEmail,
  currentUserId,
  gameVersion,
  rivalPreferences,
  onRivalPreferenceChange,
  rulesets,
  selectedRulesetId,
  onRulesetSelect,
  onSynchronizeRules,
  onOpenRulesetEditor,
  isGuest = false,
  onSaveRulesetToCollection,
  rulesetDirty = false,
}) => {
  const { t } = useTranslation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRoleOption>("editor");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [memberActionError, setMemberActionError] = useState<string | null>(
    null,
  );
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [memberPendingRemoval, setMemberPendingRemoval] =
    useState<TrackerMember | null>(null);
  const [showRulesetPicker, setShowRulesetPicker] = useState(false);
  const [showRulesetSyncModal, setShowRulesetSyncModal] = useState(false);
  const { containerRef: removeModalRef } = useFocusTrap(
    Boolean(memberPendingRemoval),
  );
  const removeModalTitleId = useId();
  const playerCount = Math.min(
    Math.max(playerNames.length, MIN_PLAYER_COUNT),
    MAX_PLAYER_COUNT,
  );
  const playerCountTagFilter = useMemo(
    () =>
      ({
        1: "Solo",
        2: "Duo",
        3: "Trio",
      })[playerCount] ?? "Duo",
    [playerCount],
  );

  const variableRivals = useMemo(() => {
    if (!gameVersion) {
      return [];
    }
    const seen = new Set<string>();
    const result: VariableRival[] = [];
    for (const cap of gameVersion.rivalCaps) {
      if (typeof cap.rival === "object" && cap.rival.key) {
        if (!seen.has(cap.rival.key)) {
          result.push(cap.rival);
          seen.add(cap.rival.key);
        }
      }
    }
    return result;
  }, [gameVersion]);

  const versionId = gameVersion?.id;
  const localizedRivalOptions = useMemo(() => {
    if (!versionId) return {} as Record<string, Record<string, string>>;
    const out: Record<string, Record<string, string>> = {};
    variableRivals.forEach((rival) => {
      const localized = getLocalizedRivalEntry(t, rival);
      if (
        localized &&
        typeof localized === "object" &&
        (localized as any).options &&
        (localized as any).key === rival.key
      ) {
        out[rival.key] = { ...(localized as any).options };
      }
    });
    return out;
  }, [variableRivals, versionId, t]);

  const selectedRuleset = useMemo(
    () => rulesets.find((entry) => entry.id === selectedRulesetId),
    [rulesets, selectedRulesetId],
  );
  const rulesetLabel = selectedRuleset?.name || t("settings.rulesets.fallback");

  const handleInvite = async (event: React.SubmitEvent) => {
    event.preventDefault();
    setInviteError(null);
    setInviteMessage(null);
    setInviteLoading(true);
    try {
      await onInviteMember(inviteEmail, inviteRole);
      setInviteMessage(t("settings.members.inviteSuccess"));
      setInviteEmail("");
      setInviteRole("editor");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("settings.members.inviteError");
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberPendingRemoval) return;
    setMemberActionError(null);
    setRemovingMemberId(memberPendingRemoval.uid);
    try {
      await onRemoveMember(memberPendingRemoval.uid);
      setMemberPendingRemoval(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("settings.members.removeError");
      setMemberActionError(message);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCancelRemoveMember = () => {
    if (removingMemberId) return;
    setMemberPendingRemoval(null);
    setMemberActionError(null);
  };

  const handleOpenRulesetSyncModal = () => {
    if (isGuest) return;
    setShowRulesetSyncModal(true);
  };

  const handleCloseRulesetSyncModal = () => {
    setShowRulesetSyncModal(false);
  };

  const handleConfirmRulesetSync = () => {
    onSynchronizeRules();
    setShowRulesetSyncModal(false);
  };

  const participantsMap = new Map<string, TrackerMember>();
  [...members, ...guests].forEach((participant) => {
    if (!participantsMap.has(participant.uid)) {
      participantsMap.set(participant.uid, participant);
    }
  });
  const sortedMembers = Array.from(participantsMap.values()).sort((a, b) => {
    if (a.role === b.role) return a.email.localeCompare(b.email);
    if (a.role === "owner") return -1;
    if (b.role === "owner") return 1;
    if (a.role === "editor" && b.role === "guest") return -1;
    if (a.role === "guest" && b.role === "editor") return 1;
    return a.email.localeCompare(b.email);
  });

  const currentMember = currentUserId
    ? sortedMembers.find((member) => member.uid === currentUserId)
    : undefined;
  const pendingRemovalIsSelf =
    memberPendingRemoval && memberPendingRemoval.uid === currentUserId;

  const formatSlug = (slug: string): string =>
    slug
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  const getRivalOptionLabel = (
    rivalKey: string,
    gender: "male" | "female",
    fallbackSlug: string,
  ): string => {
    const localized = localizedRivalOptions[rivalKey]?.[gender];
    if (typeof localized === "string" && localized.trim().length > 0) {
      return localized;
    }
    return formatSlug(fallbackSlug);
  };

  return (
    <div className="bg-[#f0f0f0] dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-100 px-3 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ${focusRingClasses}`}
        >
          <FiArrowLeft /> {t("settings.buttons.back")}
        </button>

        <div className="w-full bg-white dark:bg-gray-800 shadow-lg p-6 rounded-lg">
          <header className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-green-600">
                  {t("settings.header.badge")}
                </p>
                <h1 className="text-2xl font-bold font-press-start dark:text-gray-100 mt-2">
                  {t("settings.header.title")}
                </h1>
              </div>
              {canManageMembers ? (
                <button
                  type="button"
                  onClick={onRequestDeleteTracker}
                  className={`text-red-600 hover:text-red-800 p-2 rounded-full ${focusRingRedClasses}`}
                  title={t("settings.header.deleteTrackerTitle")}
                >
                  <FiTrash2 size={24} />
                </button>
              ) : currentMember ? (
                <button
                  type="button"
                  onClick={() => setMemberPendingRemoval(currentMember)}
                  disabled={removingMemberId === currentMember.uid}
                  className="text-red-600 hover:text-red-800 p-2 disabled:opacity-60"
                  title={t("settings.header.leaveTrackerTitle")}
                >
                  <FiLogOut size={24} />
                </button>
              ) : null}
            </div>
          </header>

          <main className="mt-6 space-y-8">
            <section>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="trackerTitle"
                    className="block text-sm font-bold mb-2 text-gray-800 dark:text-gray-200"
                  >
                    {t("settings.inputs.trackerTitle")}
                  </label>
                  <input
                    id="trackerTitle"
                    type="text"
                    value={trackerTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    disabled={isGuest}
                    className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed ${focusRingInputClasses}`}
                    placeholder={t("settings.inputs.trackerTitlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Array.from({ length: playerCount }, (_, index) => {
                      const fullWidth =
                        (playerCount === 3 && index === 2) || playerCount === 1;
                      return (
                        <div
                          key={`player-${index}`}
                          className={fullWidth ? "sm:col-span-2" : undefined}
                        >
                          <label
                            className="block text-sm font-bold mb-2"
                            style={{ color: PLAYER_COLORS[index] ?? "#4b5563" }}
                          >
                            {t("settings.inputs.playerLabel", {
                              index: index + 1,
                            })}
                          </label>
                          <input
                            type="text"
                            value={playerNames[index]}
                            onChange={(e) =>
                              onPlayerNameChange(index, e.target.value)
                            }
                            disabled={isGuest}
                            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed ${focusRingInputClasses}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 mb-4">
                {t("settings.sections.gameplay")}
              </h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.rivalCensor.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.rivalCensor.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.rivalCensor.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.rivalCensor.description")}
                  </div>
                </div>
                <TriStateToggle
                  id="rival-censor-toggle"
                  value={rivalCensorMode}
                  options={[
                    {
                      value: "off" as const,
                      label: t("settings.features.rivalCensor.modes.off"),
                    },
                    {
                      value: "showLevels" as const,
                      label: t(
                        "settings.features.rivalCensor.modes.showLevels",
                      ),
                    },
                    {
                      value: "on" as const,
                      label: t("settings.features.rivalCensor.modes.on"),
                    },
                  ]}
                  onChange={onRivalCensorModeChange}
                  ariaLabel={t("settings.features.rivalCensor.title")}
                  disabled={isGuest}
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.hardcore.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.hardcore.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.hardcore.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.hardcore.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="hardcore-toggle"
                  checked={hardcoreModeEnabled}
                  onChange={onHardcoreModeToggle}
                  ariaLabel={t("settings.features.hardcore.title")}
                  disabled={isGuest}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.infiniteFossils.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.infiniteFossils.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.infiniteFossils.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.infiniteFossils.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="infinite-fossils-toggle"
                  checked={infiniteFossilsEnabled}
                  onChange={onInfiniteFossilsToggle}
                  ariaLabel={t("settings.features.infiniteFossils.title")}
                  disabled={isGuest}
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 mb-4">
                {t("settings.sections.general")}
              </h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.nicknames.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.nicknames.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.nicknames.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.nicknames.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="nicknames-toggle"
                  checked={!nicknamesEnabled}
                  onChange={(checked) => onNicknamesToggle(!checked)}
                  ariaLabel={t("settings.features.nicknames.title")}
                  disabled={isGuest}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.legendary.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.legendary.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.legendary.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.legendary.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="legendary-toggle"
                  checked={legendaryTrackerEnabled}
                  onChange={onlegendaryTrackerToggle}
                  ariaLabel={t("settings.features.legendary.title")}
                  disabled={isGuest}
                />
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 mb-4">
                {t("settings.sections.configuration")}
              </h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.allPokemonAndItems.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t(
                        "settings.features.allPokemonAndItems.tooltip",
                      )}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.allPokemonAndItems.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.allPokemonAndItems.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="all-pokemon-and-items-toggle"
                  checked={allPokemonAndItems}
                  onChange={onAllPokemonAndItemsToggle}
                  ariaLabel={t("settings.features.allPokemonAndItems.title")}
                  disabled={isGuest}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {t("settings.features.publicTracker.title")}
                    </div>
                    <Tooltip
                      side="top"
                      content={t("settings.features.publicTracker.tooltip")}
                    >
                      <span
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                        aria-label={t(
                          "settings.features.publicTracker.tooltipLabel",
                        )}
                      >
                        <FiInfo size={16} />
                      </span>
                    </Tooltip>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.features.publicTracker.description")}
                  </div>
                </div>
                <ToggleSwitch
                  id="public-toggle"
                  checked={isPublic}
                  onChange={onPublicToggle}
                  ariaLabel={t("settings.features.publicTracker.title")}
                  disabled={isGuest}
                />
              </div>
            </section>

            {variableRivals.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 mb-4">
                  {t("settings.sections.variableRivals")}
                </h2>
                {variableRivals.map((rival) => (
                  <div key={rival.key} className="mb-4">
                    <div className="flex items-center gap-4 text-gray-800 dark:text-gray-200">
                      <label
                        className={`flex items-center gap-2 ${
                          isGuest
                            ? "cursor-not-allowed opacity-70"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`rival-${rival.key}`}
                          value="female"
                          checked={
                            (rivalPreferences?.[rival.key] ??
                              gameVersion?.defaultRivalPreferences?.[
                                rival.key
                              ] ??
                              "male") === "female"
                          }
                          onChange={() =>
                            onRivalPreferenceChange(rival.key, "female")
                          }
                          disabled={isGuest}
                          className="h-4 w-4 accent-green-600 disabled:opacity-60"
                        />{" "}
                        {getRivalOptionLabel(
                          rival.key,
                          "female",
                          rival.options.female,
                        )}
                      </label>
                      <label
                        className={`flex items-center gap-2 ${
                          isGuest
                            ? "cursor-not-allowed opacity-70"
                            : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`rival-${rival.key}`}
                          value="male"
                          checked={
                            (rivalPreferences?.[rival.key] ??
                              gameVersion?.defaultRivalPreferences?.[
                                rival.key
                              ] ??
                              "male") === "male"
                          }
                          onChange={() =>
                            onRivalPreferenceChange(rival.key, "male")
                          }
                          disabled={isGuest}
                          className="h-4 w-4 accent-green-600 disabled:opacity-60"
                        />{" "}
                        {getRivalOptionLabel(
                          rival.key,
                          "male",
                          rival.options.male,
                        )}
                      </label>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {t("settings.sections.variableRivalsDescription")}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                    {t("settings.members.title")}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {canManageMembers
                      ? t("settings.members.managerNotice")
                      : t("settings.members.viewerNotice")}
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {t("settings.members.count", { count: sortedMembers.length })}
                </span>
              </div>

              <ul className="space-y-3 mb-4">
                {sortedMembers.map((member) => (
                  <li
                    key={member.uid}
                    className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <span>{member.email}</span>
                        {currentUserEmail &&
                          member.email === currentUserEmail && (
                            <span className="text-xs text-green-600">
                              {t("settings.members.youBadge")}
                            </span>
                          )}
                        {canManageMembers &&
                          member.role !== "owner" &&
                          member.email !== currentUserEmail && (
                            <button
                              type="button"
                              onClick={() => setMemberPendingRemoval(member)}
                              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                              aria-label={t(
                                "settings.members.removeAriaLabel",
                                { email: member.email },
                              )}
                            >
                              <FiX size={14} />
                            </button>
                          )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {member.addedAt
                          ? new Date(member.addedAt).toLocaleDateString()
                          : t("settings.members.unknownDate")}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        member.role === "owner"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                          : member.role === "guest"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {member.role === "owner" && <FiShield />}
                      {member.role === "guest" && <FiEye />}
                      {member.role === "owner"
                        ? t("settings.members.roles.owner")
                        : member.role === "guest"
                          ? t("settings.members.roles.guest")
                          : t("settings.members.roles.member")}
                    </span>
                  </li>
                ))}
                {sortedMembers.length === 0 && (
                  <li className="text-sm text-gray-500 dark:text-gray-400">
                    Keine Mitglieder gefunden.
                  </li>
                )}
              </ul>
              {memberActionError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                  {memberActionError}
                </p>
              )}

              {canManageMembers && (
                <form
                  onSubmit={handleInvite}
                  className="space-y-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <FiUserPlus /> {t("settings.members.inviteTitle")}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex min-w-0 gap-2 sm:flex-1">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        placeholder="trainer@example.com"
                        className={`min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) =>
                          setInviteRole(e.target.value as InviteRoleOption)
                        }
                        className={`w-24 sm:w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-sm text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                      >
                        <option value="editor">
                          {t("common.roles.member")}
                        </option>
                        <option value="guest">{t("common.roles.guest")}</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className={`w-full shrink-0 inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 sm:w-auto ${focusRingClasses}`}
                    >
                      <FiUserPlus size={16} />
                      {inviteLoading
                        ? t("settings.members.inviteButton.loading")
                        : t("settings.members.inviteButton.default")}
                    </button>
                  </div>
                  {inviteError && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {inviteError}
                    </p>
                  )}
                  {inviteMessage && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {inviteMessage}
                    </p>
                  )}
                </form>
              )}
            </section>

            <section className="space-y-3">
              <div className="items-center justify-between mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                  {t("settings.rulesets.label")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("settings.rulesets.description")}
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                <div
                  className={
                    rulesetDirty
                      ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                      : "flex flex-wrap items-center justify-between gap-2"
                  }
                >
                  <div className="min-w-0 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {rulesetLabel}
                  </div>
                  <div
                    className={
                      rulesetDirty
                        ? "flex w-full flex-wrap justify-start gap-2 sm:w-auto sm:justify-end"
                        : "flex shrink-0 flex-wrap gap-2"
                    }
                  >
                    <button
                      type="button"
                      onClick={onOpenRulesetEditor}
                      className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 ${focusRingClasses}`}
                      disabled={isGuest}
                    >
                      <FiEdit /> {t("settings.rulesets.manage")}
                    </button>
                    {rulesetDirty && (
                      <button
                        type="button"
                        onClick={onSaveRulesetToCollection}
                        className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 ${focusRingClasses}`}
                        disabled={isGuest}
                      >
                        <FiSave /> {t("settings.rulesets.saveCurrent")}
                      </button>
                    )}
                    {rulesetDirty && (
                      <button
                        type="button"
                        onClick={handleOpenRulesetSyncModal}
                        className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-60 ${focusRingClasses}`}
                        disabled={isGuest}
                      >
                        <FiRefreshCw /> {t("settings.rulesets.sync")}
                      </button>
                    )}
                  </div>
                </div>
                {rulesetDirty && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
                    <FiAlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{t("settings.rulesets.unsavedWarning")}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowRulesetPicker((v) => !v)}
                  aria-expanded={showRulesetPicker}
                  aria-controls="settings-ruleset-picker-panel"
                  className={`w-full inline-flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses} disabled:opacity-60`}
                  disabled={isGuest}
                >
                  <span>{t("settings.rulesets.selectButton")}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {rulesetLabel}
                  </span>
                </button>
                <div
                  id="settings-ruleset-picker-panel"
                  aria-hidden={!showRulesetPicker}
                  inert={!showRulesetPicker}
                  className={`transform-gpu ${showRulesetPicker ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"} transition-all duration-300 ease-in-out overflow-hidden`}
                >
                  <div className="pt-1">
                    <RulesetPicker
                      value={selectedRulesetId || ""}
                      rulesets={rulesets}
                      isInteractive={showRulesetPicker && !isGuest}
                      enableTagFilter
                      defaultTagFilter={playerCountTagFilter}
                      defaultTagFilterGroup={["Solo", "Duo", "Trio"]}
                      listMaxHeightClass="max-h-56"
                      onSelect={(value) => {
                        onRulesetSelect(value);
                        setShowRulesetPicker(false);
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
      <RulesetSyncModal
        isOpen={showRulesetSyncModal}
        rulesetName={rulesetLabel}
        onClose={handleCloseRulesetSyncModal}
        onConfirm={handleConfirmRulesetSync}
      />
      {memberPendingRemoval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div
            ref={removeModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={removeModalTitleId}
            tabIndex={-1}
            className="w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-red-500">
                  {pendingRemovalIsSelf
                    ? t("settings.removeModal.badgeSelf")
                    : t("settings.removeModal.badgeMember")}
                </p>
                <h2
                  id={removeModalTitleId}
                  className="text-xl font-semibold mt-1 text-gray-900 dark:text-gray-100"
                >
                  {pendingRemovalIsSelf
                    ? trackerTitle
                    : memberPendingRemoval.email}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCancelRemoveMember}
                className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
                aria-label={t("common.close")}
                disabled={removingMemberId === memberPendingRemoval.uid}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="px-5 py-6 space-y-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-100">
                {pendingRemovalIsSelf
                  ? t("settings.removeModal.confirmSelf")
                  : t("settings.removeModal.confirmMember")}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {pendingRemovalIsSelf
                  ? t("settings.removeModal.descriptionSelf")
                  : t("settings.removeModal.descriptionMember")}
              </p>
              {memberActionError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                  {memberActionError}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end border-t border-gray-200 dark:border-gray-700 px-5 py-4">
              <button
                type="button"
                onClick={handleCancelRemoveMember}
                disabled={removingMemberId === memberPendingRemoval.uid}
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={removingMemberId === memberPendingRemoval.uid}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:opacity-60"
              >
                {pendingRemovalIsSelf ? <FiLogOut /> : <FiX />}
                {removingMemberId === memberPendingRemoval.uid
                  ? t("settings.removeModal.processing")
                  : pendingRemovalIsSelf
                    ? t("settings.removeModal.confirmSelfButton")
                    : t("settings.removeModal.confirmMemberRemoval")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
