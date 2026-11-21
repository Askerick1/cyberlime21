// A study day is a civil date in the learner's time zone, recorded at solve time.
export function studyDay(
  instant = new Date(),
  zone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  let formatter;
  try {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return studyDay(instant, "UTC");
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return [parts.year, parts.month, parts.day].join("-");
}
export function shiftDay(day, offset) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}
export function activitySummary(solves, today = studyDay()) {
  const dates = [
    ...new Set(solves.map((s) => s.day).filter((d) => d <= today)),
  ].sort();
  const active = new Set(dates);
  let best = 0,
    run = 0,
    previous;
  for (const day of dates) {
    run = previous && shiftDay(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const done = active.has(today);
  const current = done || active.has(shiftDay(today, -1)) ? run : 0;
  return {
    current,
    best,
    done,
    week: Array.from({ length: 7 }, (_, i) => {
      const date = shiftDay(today, i - 6);
      return { date, completed: active.has(date) };
    }),
  };
}
// v1 began with these seven entries, in precisely this order, before user activity.
export function stripDemoSolves(solves) {
  const seed = [
    ["sources", 0],
    ["sources", 1],
    ["sources", 2],
    ["forensics", 0],
    ["forensics", 1],
    ["forensics", 2],
    ["linux", 0],
  ];
  const end = solves[6]?.day;
  if (typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return solves;
  const matches = seed.every(
    ([room, task], i) =>
      solves[i]?.room === room &&
      solves[i]?.task === task &&
      solves[i]?.day === shiftDay(end, i - 6),
  );
  return matches ? solves.slice(seed.length) : solves;
}
