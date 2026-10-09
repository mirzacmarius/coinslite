/** Times on printable documents: the reader's time zone and file-name dates. Pure. */

/** A time zone the runtime knows, or UTC. */
export function knownTimeZone(timeZone: string | undefined) {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** The date in `timeZone` as "YYYY-MM-DD", for a file name. */
export function calendarDate(time: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(time);
  const part = (type: string) =>
    parts.find((each) => each.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
