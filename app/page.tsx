'use client';

import { ChoiceOverlay } from '@/components/ChoiceOverlay';
import { useTimer } from '@/hooks/useTimer';
import { formatMs, formatSeconds } from '@/lib/time';

export default function Home() {
  const {
    state,
    isRunning,
    awaitingChoice,
    displayMs,
    elapsedMs,
    stats,
    totalWorkSeconds,
    stateLabel,
    actionLocked,
    actions
  } = useTimer();

  const isCountdown = state !== 'WORK';
  const timeLabel = isCountdown ? '残り時間' : '経過時間';

  const showStartResume = !awaitingChoice && !isRunning;
  const showSkip = state === 'WORK' && isRunning;

  const isResume = elapsedMs > 0;
  const primaryLabel = state === 'IDLE' ? (isResume ? '再開' : '開始') : '再開';
  const primaryAria =
    state === 'IDLE'
      ? isResume
        ? 'アイドリングを再開'
        : 'アイドリングを開始'
      : state === 'WORK'
        ? '作業を再開'
        : '休憩を再開';

  const handlePrimary = () => {
    if (state === 'IDLE') {
      if (isResume) {
        actions.resume();
      } else {
        actions.startIdle();
      }
      return;
    }
    actions.resume();
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 right-[-120px] h-72 w-72 rounded-full bg-teal-100/60 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] left-[-120px] h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-4 py-8">
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            ADHD Timer
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            1分アイドリング式タイマー
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            強制休憩なし。1分ごとに自分で選ぶ。
          </p>
        </header>

        <section className="rounded-4xl bg-white/80 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
              {timeLabel}
            </div>
            <div className="text-[64px] font-semibold leading-none text-slate-900">
              {formatMs(displayMs)}
            </div>
            <div className="rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-600">
              {stateLabel}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {showStartResume && (
              <button
                type="button"
                aria-label={primaryAria}
                disabled={actionLocked}
                className="min-h-[56px] w-full rounded-2xl bg-teal-600 px-4 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handlePrimary}
              >
                {primaryLabel}
              </button>
            )}

            {showSkip && (
              <button
                type="button"
                aria-label="休憩へスキップ"
                disabled={actionLocked}
                className="min-h-[52px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={actions.startBreak}
              >
                休憩へ（スキップ）
              </button>
            )}

            {!showStartResume && !showSkip && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-500">
                {isRunning ? '進行中…' : '選択を待っています'}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-4xl bg-white/85 p-6 shadow-soft backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            今日の統計
          </h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">合計作業時間</p>
              <p className="text-2xl font-semibold text-slate-900">
                {formatSeconds(totalWorkSeconds)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">アイドリング開始</p>
                <p className="text-xl font-semibold text-slate-900">
                  {stats.idleStartCount}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">休憩回数</p>
                <p className="text-xl font-semibold text-slate-900">
                  {stats.breakCount}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <button
              type="button"
              aria-label="今日の統計をリセット"
              disabled={actionLocked}
              className="min-h-[44px] w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                const ok = window.confirm('今日の統計をリセットしますか？');
                if (ok) {
                  actions.resetToday();
                }
              }}
            >
              今日の統計をリセット
            </button>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400">
          LocalStorageで当日分のみ保存します
        </footer>
      </div>

      {awaitingChoice && (
        <ChoiceOverlay
          onContinue={actions.startWork}
          onBreak={actions.startBreak}
          disabled={actionLocked}
        />
      )}
    </main>
  );
}
