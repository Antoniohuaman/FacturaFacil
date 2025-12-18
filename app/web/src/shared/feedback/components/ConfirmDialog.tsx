import { useEffect } from "react";
import type { ConfirmState } from "../types";

export function ConfirmDialog({
  state,
  onCancel,
  onConfirm,
}: {
  state: ConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!state.open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.loading) onCancel();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state.open, state.loading, onCancel]);

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/35" onClick={() => (!state.loading ? onCancel() : null)} />

      <div className="relative w-[520px] max-w-[95vw] rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <div className="text-base font-semibold text-slate-900">{state.title}</div>
            <div className="mt-2 text-sm text-slate-700 whitespace-pre-line">{state.message}</div>
          </div>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            onClick={() => (!state.loading ? onCancel() : null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            onClick={onCancel}
            disabled={state.loading}
          >
            {state.cancelText}
          </button>

          <button
            type="button"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            onClick={onConfirm}
            disabled={state.loading}
          >
            {state.loading ? "Procesando..." : state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
