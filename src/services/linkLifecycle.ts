import type { AppState, LinkId } from "@/types.ts";

export const killLink = (
  state: AppState,
  linkId: LinkId,
  playerIndex: number,
): AppState => {
  const pair = [...state.team, ...state.box].find((link) => link.id === linkId);
  if (
    !pair ||
    !Number.isInteger(playerIndex) ||
    playerIndex < 0 ||
    playerIndex >= state.playerNames.length
  )
    return state;

  return {
    ...state,
    team: state.team.filter((link) => link.id !== linkId),
    box: state.box.filter((link) => link.id !== linkId),
    graveyard: [
      ...state.graveyard,
      { ...pair, isLost: false, deathPlayerIndex: playerIndex },
    ],
    stats: {
      ...state.stats,
      deaths: state.stats.deaths.map((count, index) =>
        index === playerIndex ? Number(count || 0) + 1 : count,
      ),
    },
  };
};

export const restoreLink = (
  state: AppState,
  linkId: LinkId,
  legacyPlayerIndex?: number,
): AppState => {
  const pair = state.graveyard.find((link) => link.id === linkId);
  if (!pair || pair.isLost) return state;
  const playerIndex = pair.deathPlayerIndex ?? legacyPlayerIndex;
  if (
    !Number.isInteger(playerIndex) ||
    playerIndex < 0 ||
    playerIndex >= state.playerNames.length
  )
    return state;
  const {
    deathPlayerIndex: _deathPlayerIndex,
    isLost: _isLost,
    ...restoredPair
  } = pair;

  return {
    ...state,
    graveyard: state.graveyard.filter((link) => link.id !== linkId),
    box: [...state.box, restoredPair],
    stats: {
      ...state.stats,
      deaths: state.stats.deaths.map((count, index) =>
        index === playerIndex ? Math.max(0, count - 1) : count,
      ),
    },
  };
};
