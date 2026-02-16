/** Returns a human-readable "time remaining" string like "23h left" or "45m left". Returns "Expired" if the time has passed. */
export function timeRemaining(expiresAt: string): string {
  const now = Date.now();
  const expires = new Date(expiresAt).getTime();
  const diff = expires - now;

  if (diff <= 0) return "Expired";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours >= 1) {
    const remainingMin = minutes % 60;
    return remainingMin > 0 ? `${hours}h ${remainingMin}m left` : `${hours}h left`;
  }

  return `${minutes}m left`;
}
