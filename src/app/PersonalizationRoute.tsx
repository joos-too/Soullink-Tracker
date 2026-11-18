import { useNavigate } from "react-router-dom";
import PersonalizationPage from "@/src/components/pages/PersonalizationPage";
import { completeCurrentUserPersonalization } from "@/src/services/backend/auth";
import LoadingScreen from "./LoadingScreen";
import { useAppSession } from "./AppSession";

export default function PersonalizationRoute() {
  const {
    userUseGenerationSprites,
    handleGenerationSpritesToggle,
    userPokemonImageStyle,
    handlePokemonImageStyleChange,
    effectiveWikiId,
    handleWikiChange,
    userMultiLocaleSearch,
    handleMultiLocaleSearchToggle,
    allowImageLoading,
    imageConsentLoaded,
    imageLoadingAllowed,
    handleImageLoadingChange,
  } = useAppSession();
  const navigate = useNavigate();

  if (!imageConsentLoaded) return <LoadingScreen />;

  return (
    <PersonalizationPage
      initialAllowImageLoading={
        allowImageLoading === true && imageLoadingAllowed
      }
      useGenerationSprites={userUseGenerationSprites}
      onGenerationSpritesToggle={handleGenerationSpritesToggle}
      pokemonImageStyle={userPokemonImageStyle}
      onPokemonImageStyleChange={handlePokemonImageStyleChange}
      wikiId={effectiveWikiId}
      onWikiChange={handleWikiChange}
      multiLocaleSearch={userMultiLocaleSearch}
      onMultiLocaleSearchToggle={handleMultiLocaleSearchToggle}
      onComplete={async (allowed) => {
        await handleImageLoadingChange(allowed);
        await completeCurrentUserPersonalization();
        navigate("/", { replace: true });
      }}
    />
  );
}
