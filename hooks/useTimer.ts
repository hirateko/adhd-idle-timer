'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEmptyStats,
  DailyStats,
  getTodayKey,
  loadSession,
  loadStats,
  saveSession,
  saveStats,
  SessionState,
  TimerState
} from '@/lib/storage';

const DURATION_MS = 60_000;
const ACTION_LOCK_MS = 350;

const createInitialSession = (dateKey: string): SessionState => ({
  dateKey,
  state: 'IDLE',
  isRunning: false,
  startAt: null,
  elapsedMs: 0,
  awaitingChoice: false
});

export const useTimer = () => {
  const [hydrated, setHydrated] = useState(false);
  const [actionLocked, setActionLocked] = useState(false);
  const [stats, setStats] = useState<DailyStats>(() =>
    createEmptyStats(getTodayKey())
  );
  const [session, setSession] = useState<SessionState>(() =>
    createInitialSession(getTodayKey())
  );
  const [now, setNow] = useState(Date.now());
  const actionLockRef = useRef(false);
  const lockTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const todayKey = getTodayKey();
    const loadedStats = loadStats(todayKey);
    setStats(loadedStats);

    const loadedSession = loadSession();
    if (loadedSession && loadedSession.dateKey === todayKey) {
      setSession({
        ...loadedSession,
        isRunning: false,
        startAt: null
      });
    } else {
      const freshSession = createInitialSession(todayKey);
      setSession(freshSession);
      saveSession(freshSession);
    }

    setNow(Date.now());
    setHydrated(true);
  }, []);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        window.clearTimeout(lockTimeoutRef.current);
      }
    };
  }, []);

  const withActionLock = useCallback((fn: () => void) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionLocked(true);
    fn();
    if (lockTimeoutRef.current) {
      window.clearTimeout(lockTimeoutRef.current);
    }
    lockTimeoutRef.current = window.setTimeout(() => {
      actionLockRef.current = false;
      setActionLocked(false);
      lockTimeoutRef.current = null;
    }, ACTION_LOCK_MS);
  }, []);

  const resetForNewDay = useCallback((todayKey: string) => {
    const freshStats = createEmptyStats(todayKey);
    setStats(freshStats);
    saveStats(freshStats);

    const freshSession = createInitialSession(todayKey);
    setSession(freshSession);
    saveSession(freshSession);

    setNow(Date.now());
  }, []);

  const ensureToday = useCallback(() => {
    // 日付跨ぎ時は進行中の作業を破棄する（安全側仕様）
    const todayKey = getTodayKey();
    if (stats.date !== todayKey) {
      resetForNewDay(todayKey);
      return { todayKey, needsReset: true };
    }
    return { todayKey, needsReset: false };
  }, [resetForNewDay, stats.date]);

  useEffect(() => {
    if (!hydrated) return;
    // フォーカスイベントがなくても日付跨ぎを検知するための保険
    const nowDate = new Date();
    const nextMidnight = new Date(nowDate);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilNext = nextMidnight.getTime() - nowDate.getTime();
    const timeoutId = window.setTimeout(() => {
      const todayKey = getTodayKey();
      if (stats.date !== todayKey) {
        resetForNewDay(todayKey);
      }
    }, Math.max(1000, msUntilNext));

    return () => window.clearTimeout(timeoutId);
  }, [hydrated, resetForNewDay, stats.date]);

  useEffect(() => {
    if (!hydrated) return;
    const handleFocus = () => ensureToday();
    const handleVisibility = () => {
      if (!document.hidden) ensureToday();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ensureToday, hydrated]);

  useEffect(() => {
    if (!session.isRunning) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 250);
    return () => window.clearInterval(id);
  }, [session.isRunning, session.state]);

  const effectiveElapsedMs = useMemo(() => {
    if (session.isRunning && session.startAt) {
      return Math.max(0, session.elapsedMs + (now - session.startAt));
    }
    return Math.max(0, session.elapsedMs);
  }, [now, session.elapsedMs, session.isRunning, session.startAt]);

  const cappedElapsedMs = useMemo(() => {
    if (session.state === 'WORK') return effectiveElapsedMs;
    return Math.min(DURATION_MS, effectiveElapsedMs);
  }, [effectiveElapsedMs, session.state]);

  const displayMs = useMemo(() => {
    if (session.state === 'WORK') return cappedElapsedMs;
    return Math.max(0, DURATION_MS - cappedElapsedMs);
  }, [cappedElapsedMs, session.state]);

  const totalWorkSeconds = useMemo(() => {
    if (session.state === 'WORK') {
      return stats.workSeconds + Math.floor(cappedElapsedMs / 1000);
    }
    return stats.workSeconds;
  }, [cappedElapsedMs, session.state, stats.workSeconds]);

  const getEffectiveElapsedMs = useCallback(
    (at: number) => {
      if (session.isRunning && session.startAt) {
        return Math.max(0, session.elapsedMs + (at - session.startAt));
      }
      return Math.max(0, session.elapsedMs);
    },
    [session.elapsedMs, session.isRunning, session.startAt]
  );

  const startIdle = useCallback(() => {
    if (!hydrated) return;
    withActionLock(() => {
      const { todayKey, needsReset } = ensureToday();
      const baseStats = needsReset ? createEmptyStats(todayKey) : stats;
      const nextStats: DailyStats = {
        ...baseStats,
        date: todayKey,
        idleStartCount: baseStats.idleStartCount + 1
      };
      setStats(nextStats);
      saveStats(nextStats);

      setSession({
        dateKey: todayKey,
        state: 'IDLE',
        isRunning: true,
        startAt: Date.now(),
        elapsedMs: 0,
        awaitingChoice: false
      });
      setNow(Date.now());
    });
  }, [ensureToday, hydrated, stats, withActionLock]);

  const startWork = useCallback(() => {
    if (!hydrated) return;
    if (session.state !== 'IDLE' || !session.awaitingChoice) return;
    withActionLock(() => {
      const { todayKey } = ensureToday();
      setSession({
        dateKey: todayKey,
        state: 'WORK',
        isRunning: true,
        startAt: Date.now(),
        elapsedMs: 0,
        awaitingChoice: false
      });
      setNow(Date.now());
    });
  }, [ensureToday, hydrated, session.awaitingChoice, session.state, withActionLock]);

  const startBreak = useCallback(() => {
    if (!hydrated) return;
    const canStartFromIdle = session.state === 'IDLE' && session.awaitingChoice;
    const canStartFromWork = session.state === 'WORK' && session.isRunning;
    if (!canStartFromIdle && !canStartFromWork) return;

    withActionLock(() => {
      const { todayKey, needsReset } = ensureToday();
      const baseStats = needsReset ? createEmptyStats(todayKey) : stats;
      const nowMs = Date.now();
      const addSeconds =
        // 日付リセット時は前日分の作業秒数を新日に加算しない
        !needsReset && session.state === 'WORK'
          ? Math.floor(getEffectiveElapsedMs(nowMs) / 1000)
          : 0;

      const nextStats: DailyStats = {
        ...baseStats,
        date: todayKey,
        workSeconds: baseStats.workSeconds + addSeconds,
        breakCount: baseStats.breakCount + 1
      };
      setStats(nextStats);
      saveStats(nextStats);

      setSession({
        dateKey: todayKey,
        state: 'BREAK',
        isRunning: true,
        startAt: nowMs,
        elapsedMs: 0,
        awaitingChoice: false
      });
      setNow(nowMs);
    });
  }, [
    ensureToday,
    getEffectiveElapsedMs,
    hydrated,
    session.awaitingChoice,
    session.isRunning,
    session.state,
    stats,
    withActionLock
  ]);

  const resume = useCallback(() => {
    if (!hydrated) return;
    if (session.isRunning || session.awaitingChoice) return;
    withActionLock(() => {
      const { todayKey } = ensureToday();
      setSession(prev => ({
        ...prev,
        dateKey: todayKey,
        isRunning: true,
        startAt: Date.now()
      }));
      setNow(Date.now());
    });
  }, [ensureToday, hydrated, session.awaitingChoice, session.isRunning, withActionLock]);

  const resetToday = useCallback(() => {
    if (!hydrated) return;
    withActionLock(() => {
      const todayKey = getTodayKey();
      resetForNewDay(todayKey);
    });
  }, [hydrated, resetForNewDay, withActionLock]);

  useEffect(() => {
    if (!hydrated) return;
    if (!session.isRunning) return;

    if (session.state === 'IDLE' && cappedElapsedMs >= DURATION_MS) {
      setSession(prev => ({
        ...prev,
        isRunning: false,
        startAt: null,
        elapsedMs: DURATION_MS,
        awaitingChoice: true
      }));
      setNow(Date.now());
    }

    if (session.state === 'BREAK' && cappedElapsedMs >= DURATION_MS) {
      startIdle();
    }
  }, [cappedElapsedMs, hydrated, session.isRunning, session.state, startIdle]);

  useEffect(() => {
    if (!hydrated) return;
    const sessionToSave: SessionState = {
      ...session,
      elapsedMs: cappedElapsedMs,
      startAt: session.isRunning ? session.startAt : null
    };
    saveSession(sessionToSave);
  }, [cappedElapsedMs, hydrated, session]);

  const stateLabelMap: Record<TimerState, string> = {
    IDLE: 'IDLE / アイドリング準備',
    WORK: 'WORK / 作業中',
    BREAK: 'BREAK / 休憩中'
  };

  return {
    hydrated,
    state: session.state,
    isRunning: session.isRunning,
    awaitingChoice: session.awaitingChoice,
    displayMs,
    elapsedMs: cappedElapsedMs,
    stats,
    totalWorkSeconds,
    stateLabel: stateLabelMap[session.state],
    actionLocked,
    actions: {
      startIdle,
      startWork,
      startBreak,
      resume,
      resetToday
    }
  };
};
