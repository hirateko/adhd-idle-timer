export type TimerState = 'IDLE' | 'WORK' | 'BREAK';

export type DailyStats = {
  date: string;
  workSeconds: number;
  idleStartCount: number;
  breakCount: number;
};

export type SessionState = {
  dateKey: string;
  state: TimerState;
  isRunning: boolean;
  startAt: number | null;
  elapsedMs: number;
  awaitingChoice: boolean;
};

const SESSION_KEY = 'adhd-idle-timer-session';

const isBrowser = () => typeof window !== 'undefined';

const safeParse = (raw: string | null) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const toNonNegative = (value: unknown, fallback = 0) =>
  Math.max(0, toNumber(value, fallback));

const toBoolean = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const toTimerState = (value: unknown): TimerState | null => {
  if (value === 'IDLE' || value === 'WORK' || value === 'BREAK') return value;
  return null;
};

export const getTodayKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createEmptyStats = (dateKey: string): DailyStats => ({
  date: dateKey,
  workSeconds: 0,
  idleStartCount: 0,
  breakCount: 0
});

export const loadStats = (dateKey: string): DailyStats => {
  if (!isBrowser()) return createEmptyStats(dateKey);
  const parsed = safeParse(window.localStorage.getItem(dateKey));
  if (!parsed || typeof parsed !== 'object') return createEmptyStats(dateKey);
  const record = parsed as Partial<DailyStats>;
  return {
    date: dateKey,
    workSeconds: toNonNegative(record.workSeconds),
    idleStartCount: toNonNegative(record.idleStartCount),
    breakCount: toNonNegative(record.breakCount)
  };
};

export const saveStats = (stats: DailyStats) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(stats.date, JSON.stringify(stats));
};

export const loadSession = (): SessionState | null => {
  if (!isBrowser()) return null;
  const parsed = safeParse(window.localStorage.getItem(SESSION_KEY));
  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Partial<SessionState>;
  const dateKey = typeof record.dateKey === 'string' ? record.dateKey : null;
  if (!dateKey) return null;
  const state = toTimerState(record.state) ?? 'IDLE';
  const startAtRaw = toNumber(record.startAt, Number.NaN);
  const startAt = Number.isFinite(startAtRaw) ? startAtRaw : null;
  const elapsedMs = toNonNegative(record.elapsedMs);
  const isRunning = toBoolean(record.isRunning, false);
  const awaitingChoice = state === 'IDLE' ? toBoolean(record.awaitingChoice, false) : false;
  return {
    dateKey,
    state,
    isRunning,
    startAt: isRunning ? startAt : null,
    elapsedMs,
    awaitingChoice
  };
};

export const saveSession = (session: SessionState) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
};
