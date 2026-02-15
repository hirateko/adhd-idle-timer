'use client';

type ChoiceOverlayProps = {
  onContinue: () => void;
  onBreak: () => void;
  disabled?: boolean;
};

export const ChoiceOverlay = ({
  onContinue,
  onBreak,
  disabled = false
}: ChoiceOverlayProps) => {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="1分終了後の選択"
    >
      <div className="w-full max-w-sm rounded-4xl bg-white p-6 shadow-soft">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Time Up
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            1分終了。次は？
          </h2>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            aria-label="続行して作業を開始"
            disabled={disabled}
            className="min-h-[52px] w-full rounded-2xl bg-teal-600 px-4 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onContinue}
          >
            続行（WORKへ）
          </button>
          <button
            type="button"
            aria-label="1分休憩を開始"
            disabled={disabled}
            className="min-h-[52px] w-full rounded-2xl border border-teal-200 bg-teal-50 px-4 text-lg font-semibold text-teal-700 transition hover:bg-teal-100 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onBreak}
          >
            1分休憩（BREAKへ）
          </button>
        </div>
      </div>
    </div>
  );
};
