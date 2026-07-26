const ROUTE_NUMBER_REGEX = /\broute[\s-]*(\d+)\b/i;

export const parseRouteNumber = (value: string): number | null => {
  if (!value) return null;
  const match = ROUTE_NUMBER_REGEX.exec(value.trim());
  if (!match) return null;
  const routeNumber = Number(match[1]);
  return Number.isFinite(routeNumber) ? routeNumber : null;
};

export const compareLocations = (a: string, b: string): number => {
  const aRoute = parseRouteNumber(a);
  const bRoute = parseRouteNumber(b);
  if (aRoute !== null && bRoute !== null) {
    if (aRoute !== bRoute) return aRoute - bRoute;
  }
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  if (aLower < bLower) return -1;
  if (aLower > bLower) return 1;
  return 0;
};
