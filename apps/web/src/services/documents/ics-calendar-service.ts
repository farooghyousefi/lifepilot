export interface CalendarEventInput {
  alarmMinutesBefore?: number;
  calendarTitle: string;
  description: string;
  endDateIso?: string;
  endTime?: string;
  startDateIso: string;
  startTime?: string;
  summary: string;
}

export function createIcsCalendar(event: CalendarEventInput): string {
  const now = formatUtcDateTime(new Date());
  const uid = createEventUid(event);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LifePilot//Action Engine v1//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(event.calendarTitle)}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...createDateLines(event),
  ];

  if (typeof event.alarmMinutesBefore === "number") {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.summary)}`,
      `TRIGGER:-PT${Math.max(0, Math.round(event.alarmMinutesBefore))}M`,
      "END:VALARM",
    );
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return `${foldIcsLines(lines).join("\r\n")}\r\n`;
}

export function downloadIcsFile({
  content,
  fileName,
}: {
  content: string;
  fileName: string;
}): void {
  const blob = new Blob([content], {
    type: "text/calendar;charset=utf-8",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = sanitizeIcsFileName(fileName);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function createDateLines(event: CalendarEventInput): string[] {
  if (event.startTime) {
    const start = createLocalDateTime(event.startDateIso, event.startTime);
    const end = event.endDateIso && event.endTime
      ? createLocalDateTime(event.endDateIso, event.endTime)
      : createDefaultTimedEventEnd(event.startDateIso, event.startTime);

    return [`DTSTART:${start}`, `DTEND:${end}`];
  }

  return [
    `DTSTART;VALUE=DATE:${event.startDateIso.replaceAll("-", "")}`,
    `DTEND;VALUE=DATE:${addDays(event.endDateIso ?? event.startDateIso, 1).replaceAll("-", "")}`,
  ];
}

function createLocalDateTime(dateIso: string, time: string): string {
  return `${dateIso.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function createDefaultTimedEventEnd(dateIso: string, time: string): string {
  const [hour, minute] = time.split(":").map(Number);
  const date = new Date(Date.UTC(Number(dateIso.slice(0, 4)), Number(dateIso.slice(5, 7)) - 1, Number(dateIso.slice(8, 10)), hour, minute + 60));

  return formatFloatingDateTime(date);
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(
    Date.UTC(
      Number(dateIso.slice(0, 4)),
      Number(dateIso.slice(5, 7)) - 1,
      Number(dateIso.slice(8, 10)) + days,
    ),
  );

  return date.toISOString().slice(0, 10);
}

function formatUtcDateTime(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`;
}

function formatFloatingDateTime(date: Date): string {
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    "T",
    String(date.getUTCHours()).padStart(2, "0"),
    String(date.getUTCMinutes()).padStart(2, "0"),
    "00",
  ].join("");
}

function createEventUid(event: CalendarEventInput): string {
  const seed = `${event.summary}-${event.startDateIso}-${event.startTime ?? "all-day"}-${event.description}`;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `lifepilot-${hash.toString(16)}@local-demo`;
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLines(lines: string[]): string[] {
  return lines.flatMap((line) => {
    if (line.length <= 75) {
      return [line];
    }

    const folded = [];
    let remaining = line;

    folded.push(remaining.slice(0, 75));
    remaining = remaining.slice(75);

    while (remaining.length > 0) {
      folded.push(` ${remaining.slice(0, 74)}`);
      remaining = remaining.slice(74);
    }

    return folded;
  });
}

function sanitizeIcsFileName(fileName: string): string {
  const baseName = fileName
    .replace(/\.ics$/i, "")
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  return `${baseName || "lifepilot-kalendereintrag"}.ics`;
}
