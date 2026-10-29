function calendarParts(timestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(timestamp);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

function sameDay(left, right) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

// `now` and the optional timezone are explicit so calendar boundaries are testable.
export function formatActivityTime(createdAt, now, { timeZone } = {}) {
  if (
    typeof createdAt !== "string" ||
    !createdAt.trim() ||
    !Number.isFinite(now)
  )
    return null;
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return null;

  const elapsed = Math.max(0, now - timestamp);
  const eventDay = calendarParts(timestamp, timeZone);
  const today = calendarParts(now, timeZone);
  // Calendar arithmetic, rather than subtracting 24h, also handles DST days.
  const previous = new Date(
    Date.UTC(today.year, today.month - 1, today.day - 1),
  );
  const yesterday = {
    year: previous.getUTCFullYear(),
    month: previous.getUTCMonth() + 1,
    day: previous.getUTCDate(),
  };
  let label;
  if (elapsed < 60_000) label = "Just now";
  else if (sameDay(eventDay, today)) {
    label =
      elapsed < 3_600_000
        ? `${Math.floor(elapsed / 60_000)} min ago`
        : `${Math.floor(elapsed / 3_600_000)} hr ago`;
  } else if (sameDay(eventDay, yesterday)) label = "Yesterday";
  else
    label = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      ...(eventDay.year !== today.year && { year: "numeric" }),
    }).format(timestamp);

  return {
    dateTime: new Date(timestamp).toISOString(),
    label,
    exact: new Intl.DateTimeFormat("en-GB", {
      timeZone,
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(timestamp),
  };
}
