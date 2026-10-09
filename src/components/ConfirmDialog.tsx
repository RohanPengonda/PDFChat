import { useState } from "react";
import { clsx } from "clsx";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  isDark?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  isDark = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  const panel = isDark
    ? "bg-[#1e2433] border-[#2d3548] text-[#e8eaf0]"
    : "bg-white border-gray-200 text-gray-900";
  const subtext = isDark ? "text-[#6b7a99]" : "text-gray-500";
  const cancelBtn = isDark
    ? "border-[#2d3548] text-[#a0b0cc] hover:bg-[#252d40]"
    : "border-gray-300 text-gray-600 hover:bg-gray-100";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className={clsx(
          "relative w-full max-w-sm rounded-2xl border shadow-2xl p-5",
          panel,
        )}
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className={clsx("mt-2 text-sm", subtext)}>{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className={clsx(
              "px-3.5 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50",
              cancelBtn,
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="px-3.5 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
