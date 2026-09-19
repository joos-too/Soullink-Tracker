import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { TrackerMeta } from "@/types";
import HomePage from "@/src/components/pages/HomePage";
import CreateTrackerModal from "@/src/components/modals/CreateTrackerModal";
import {
  PRESET_RULESETS,
  DEFAULT_RULESET_ID,
  DEFAULT_RULES,
} from "@/src/data/rulesets";
import { sanitizeRules } from "@/src/services/init";
import { createTracker, TrackerOperationError } from "@/src/services/trackers";
import { useAppSession } from "./AppSession";
export default function HomeRoute() {
  const navigate = useNavigate();
  const {
    user,
    rulesets,
    defaultLocaleRulesetId,
    userTrackerIds,
    trackerMetas,
    trackerSummaries,
    userTrackersLoading,
    userDisplayName,
    userDisplayNameRequiresUpdate,
    handleDisplayNameChange,
  } = useAppSession();
  const handleOpenUserSettings = () => navigate("/account");
  const handleOpenRulesetEditor = () =>
    navigate("/rulesets", { state: { from: "/" } });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTrackerError, setCreateTrackerError] = useState<string | null>(
    null,
  );
  const [createTrackerLoading, setCreateTrackerLoading] = useState(false);
  const openCreateTrackerModal = () => {
    setCreateTrackerError(null);
    setShowCreateModal(true);
  };

  const handleOpenTracker = (trackerId: string) => {
    navigate(`/tracker/${trackerId}`);
  };

  const handleCreateTrackerSubmit = async (payload: {
    title: string;
    playerNames: string[];
    memberInvites: Array<{ email: string; role: "editor" | "guest" }>;
    gameVersionId: string;
    allPokemonAndItems?: boolean;
    rulesetId?: string;
  }) => {
    if (!user) return;
    setCreateTrackerError(null);
    setCreateTrackerLoading(true);
    try {
      const selectedRuleset =
        rulesets.find((entry) => entry.id === payload.rulesetId) ??
        PRESET_RULESETS.find((entry) => entry.id === payload.rulesetId);
      const fallbackRuleset =
        PRESET_RULESETS.find((entry) => entry.id === defaultLocaleRulesetId) ||
        PRESET_RULESETS.find((entry) => entry.id === DEFAULT_RULESET_ID);
      const resolvedRuleset = selectedRuleset ?? fallbackRuleset;
      const rulesetId =
        resolvedRuleset?.id ?? fallbackRuleset?.id ?? defaultLocaleRulesetId;
      const initialRules = sanitizeRules(
        resolvedRuleset?.rules ?? fallbackRuleset?.rules ?? DEFAULT_RULES,
      );
      await createTracker({
        title: payload.title,
        playerNames: payload.playerNames,
        memberInvites: payload.memberInvites,
        owner: user,
        gameVersionId: payload.gameVersionId,
        allPokemonAndItems: payload.allPokemonAndItems,
        rulesetId,
        rules:
          initialRules.length > 0
            ? initialRules
            : (fallbackRuleset?.rules ?? DEFAULT_RULES),
      });
      setShowCreateModal(false);
    } catch (error) {
      if (
        error instanceof TrackerOperationError &&
        error.code === "user-not-found" &&
        Array.isArray(error.details)
      ) {
        setCreateTrackerError(
          `Folgende Emails wurden nicht gefunden: ${error.details.join(", ")}`,
        );
      } else {
        setCreateTrackerError(
          error instanceof Error
            ? error.message
            : "Tracker konnte nicht erstellt werden.",
        );
      }
    } finally {
      setCreateTrackerLoading(false);
    }
  };

  const trackerList = useMemo(
    () =>
      userTrackerIds
        .map((id) => trackerMetas[id])
        .filter((meta): meta is TrackerMeta => Boolean(meta)),
    [userTrackerIds, trackerMetas],
  );
  const trackerListLoading =
    userTrackersLoading ||
    (userTrackerIds.length > 0 && trackerList.length === 0);

  return (
    <>
      <HomePage
        trackers={trackerList}
        onOpenTracker={handleOpenTracker}
        onCreateTracker={openCreateTrackerModal}
        onOpenUserSettings={handleOpenUserSettings}
        onOpenRulesetEditor={handleOpenRulesetEditor}
        isLoading={trackerListLoading}
        activeTrackerId={null}
        userEmail={user?.email ?? undefined}
        currentUserId={user?.uid ?? null}
        displayName={userDisplayName}
        displayNameRequiresUpdate={userDisplayNameRequiresUpdate}
        onDisplayNameChange={handleDisplayNameChange}
        trackerSummaries={trackerSummaries}
      />{" "}
      <CreateTrackerModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateTrackerError(null);
        }}
        onSubmit={handleCreateTrackerSubmit}
        isSubmitting={createTrackerLoading}
        error={createTrackerError}
        rulesets={rulesets}
        defaultRulesetId={defaultLocaleRulesetId}
      />
    </>
  );
}
