import { useNavigate } from "react-router-dom";
import UserSettingsPage from "@/src/components/pages/UserSettingsPage";
import { signOutCurrentUser } from "@/src/services/backend/auth";
import { LAST_TRACKER_STORAGE_KEY } from "./trackerStorage";
import { useAppSession } from "./AppSession";
export default function AccountRoute() {
  const {
    user,
    userDisplayName,
    handleDisplayNameChange,
    userUseGenerationSprites,
    handleGenerationSpritesToggle,
    userUseSpritesInTeamTable,
    handleSpritesInTeamTableToggle,
    effectiveWikiId,
    handleWikiChange,
    userMultiLocaleSearch,
    handleMultiLocaleSearchToggle,
  } = useAppSession();
  const navigate = useNavigate();
  const handleNavigateHome = () => navigate("/");
  const handleLogout = () => {
    window.localStorage.removeItem(LAST_TRACKER_STORAGE_KEY);
    navigate("/");
    signOutCurrentUser().catch((error) =>
      console.error("Error signing out", error),
    );
  };
  return (
    <UserSettingsPage
      email={user.email}
      displayName={userDisplayName}
      onDisplayNameChange={handleDisplayNameChange}
      onBack={handleNavigateHome}
      onLogout={handleLogout}
      useGenerationSprites={userUseGenerationSprites}
      onGenerationSpritesToggle={handleGenerationSpritesToggle}
      useSpritesInTeamTable={userUseSpritesInTeamTable}
      onSpritesInTeamTableToggle={handleSpritesInTeamTableToggle}
      wikiId={effectiveWikiId}
      onWikiChange={handleWikiChange}
      multiLocaleSearch={userMultiLocaleSearch}
      onMultiLocaleSearchToggle={handleMultiLocaleSearchToggle}
    />
  );
}
