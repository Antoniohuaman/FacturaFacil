import { useCallback, useEffect } from "react";
import { useFeedback } from "./useFeedback";
import { Toast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";

export function FeedbackHost() {
  const fb = useFeedback();

  // Auto-dismiss por toast
  useEffect(() => {
    const timers = fb.toasts
      .filter((t) => !t.sticky)
      .map((t) => {
        const ms = t.durationMs ?? 4500;
        return window.setTimeout(() => fb.dismiss(t.id), ms);
      });

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [fb, fb.toasts]);

  const handleConfirm = useCallback(async () => {
    // Aquí cerramos el modal; la resolución del promise la maneja el provider
    // (si necesitas lógica async real, se mete antes de cerrar)
    fb.closeConfirm();
  }, [fb]);

  return (
    <>
      {/* Toast stack */}
      <div className="fixed right-4 top-4 z-[60] flex flex-col gap-2">
        {fb.toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={fb.dismiss} />
        ))}
      </div>

      {/* Confirm modal */}
      <ConfirmDialog state={fb.confirmState} onCancel={fb.closeConfirm} onConfirm={handleConfirm} />
    </>
  );
}
