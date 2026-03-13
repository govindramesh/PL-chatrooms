export function formatKickoff(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function timeUntil(date: Date) {
  const ms = date.getTime() - Date.now();
  const hours = Math.round(ms / (1000 * 60 * 60));

  if (hours > 0) {
    return `in ${hours}h`;
  }

  if (hours < 0) {
    return `${Math.abs(hours)}h ago`;
  }

  return "now";
}
