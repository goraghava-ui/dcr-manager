/**
 * Show Auto-Scheduler
 * 
 * Automatically:
 * 1. Creates show time slots for each day based on theatre config
 * 2. Tracks show status transitions (locked → pending → submitted → approved)
 * 3. Sends CDR submission reminders when shows end
 * 4. Auto-locks old shows after configurable window
 * 
 * Default interval: 4 hours 30 minutes between shows
 * Configurable per theatre via system_config
 */

export interface ShowSchedule {
  showNumber: number;
  startTime: string;    // "11:00"
  endTime: string;      // "13:30"
  dbTiming: string;     // "11:00:00"
  displayTime: string;  // "11:00 AM"
  status: "upcoming" | "running" | "ended" | "locked";
}

export interface ScheduleConfig {
  firstShowTime: string;  // "11:00" (24h format)
  intervalMinutes: number; // 270 = 4h30m
  showCount: number;       // 4
  showDurationMinutes: number; // 150 = 2h30m
  cdrWindowMinutes: number; // 60 — minutes after show ends to submit CDR
}

const DEFAULT_CONFIG: ScheduleConfig = {
  firstShowTime: "11:00",
  intervalMinutes: 270, // 4 hours 30 minutes
  showCount: 4,
  showDurationMinutes: 150, // 2 hours 30 minutes  
  cdrWindowMinutes: 60, // 1 hour after show to submit
};

/** Parse "HH:MM" to minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Minutes since midnight to "HH:MM" */
function toTime24(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Minutes since midnight to "h:mm AM/PM" */
function toTime12(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Generate today's show schedule based on config */
export function generateDailySchedule(
  config: ScheduleConfig = DEFAULT_CONFIG
): ShowSchedule[] {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const firstStart = parseTime(config.firstShowTime);

  const shows: ShowSchedule[] = [];

  for (let i = 0; i < config.showCount; i++) {
    const startMins = firstStart + i * config.intervalMinutes;
    const endMins = startMins + config.showDurationMinutes;
    const cdrDeadline = endMins + config.cdrWindowMinutes;

    let status: ShowSchedule["status"];
    if (currentMinutes < startMins) {
      status = "upcoming";
    } else if (currentMinutes >= startMins && currentMinutes < endMins) {
      status = "running";
    } else if (currentMinutes >= endMins && currentMinutes < cdrDeadline) {
      status = "ended"; // CDR can be submitted
    } else {
      status = "locked"; // CDR window closed
    }

    shows.push({
      showNumber: i + 1,
      startTime: toTime24(startMins),
      endTime: toTime24(endMins),
      dbTiming: toTime24(startMins) + ":00",
      displayTime: toTime12(startMins),
      status,
    });
  }

  return shows;
}

/** Map CDR status to show status — combines schedule + DB data */
export function getShowStatus(
  scheduleStatus: ShowSchedule["status"],
  cdrStatus: string | null
): string {
  if (cdrStatus) return cdrStatus; // DB status takes priority
  switch (scheduleStatus) {
    case "upcoming": return "locked";    // Can't submit yet
    case "running": return "locked";     // Show still running
    case "ended": return "pending";      // Ready for CDR submission
    case "locked": return "locked";      // CDR window closed
    default: return "locked";
  }
}

/** Check if a show's CDR can be submitted right now */
export function canSubmitCDR(
  showSchedule: ShowSchedule,
  existingCdrStatus: string | null
): boolean {
  // Already submitted/approved — no
  if (existingCdrStatus === "submitted" || existingCdrStatus === "approved") return false;
  // Show hasn't ended yet — no
  if (showSchedule.status === "upcoming" || showSchedule.status === "running") return false;
  // CDR window closed and no draft — no
  if (showSchedule.status === "locked" && !existingCdrStatus) return false;
  // Draft exists or show just ended — yes
  return true;
}

/** Get next show info for display */
export function getNextShowInfo(schedule: ShowSchedule[]): {
  nextShow: ShowSchedule | null;
  minutesUntilNext: number;
  currentShow: ShowSchedule | null;
} {
  const currentShow = schedule.find((s) => s.status === "running") || null;
  const nextShow = schedule.find((s) => s.status === "upcoming") || null;

  let minutesUntilNext = 0;
  if (nextShow) {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    minutesUntilNext = parseTime(nextShow.startTime) - currentMins;
  }

  return { nextShow, minutesUntilNext, currentShow };
}

/** Auto-refresh timer — calls callback when show status should change */
export function createScheduleTimer(
  schedule: ShowSchedule[],
  onStatusChange: () => void
): () => void {
  // Find next status transition time
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const transitionTimes: number[] = [];
  schedule.forEach((s) => {
    const start = parseTime(s.startTime);
    const end = parseTime(s.endTime);
    if (start > currentMins) transitionTimes.push(start);
    if (end > currentMins) transitionTimes.push(end);
  });

  if (transitionTimes.length === 0) return () => {};

  const nextTransition = Math.min(...transitionTimes);
  const msUntilNext = (nextTransition - currentMins) * 60 * 1000;

  const timer = setTimeout(() => {
    onStatusChange();
  }, Math.max(msUntilNext, 1000)); // minimum 1 second

  return () => clearTimeout(timer);
}

/** Format time remaining for display */
export function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return "Now";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Get default show timings for a 4-show day with 4h30m intervals */
export function getDefaultShowTimings(): string[] {
  const schedule = generateDailySchedule();
  return schedule.map((s) => s.displayTime);
}

/** Get DB-format timings */
export function getDefaultDbTimings(): string[] {
  const schedule = generateDailySchedule();
  return schedule.map((s) => s.dbTiming);
}
