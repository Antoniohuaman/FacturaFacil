import { memo, useMemo } from "react";
import { useFeedback } from "./useFeedback";
import { Toast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";

function FeedbackHostComponent() {
  const { toasts, dismiss, confirmState, cancelAction, confirmAction } = useFeedback();

  // Memoizar los toasts para evitar re-renders innecesarios
  // El auto-dismiss ahora es manejado internamente por cada Toast
  const toastElements = useMemo(
    () => toasts.map((t) => <Toast key={t.id} toast={t} onClose={dismiss} />),
    [toasts, dismiss]
  );

  return (
    <>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      {/* Toast stack - posicionado en top-right con animaciones elegantes */}
      <div
        className="fixed right-4 top-4 z-[60] flex flex-col gap-3 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="pointer-events-auto flex flex-col gap-3">
          {toastElements}
        </div>
      </div>

      {/* Confirm modal - z-index más alto para estar siempre encima */}
      <ConfirmDialog state={confirmState} onCancel={cancelAction} onConfirm={confirmAction} />
    </>
  );
}

export const FeedbackHost = memo(FeedbackHostComponent);
