import { memo, useCallback, useEffect, useState } from "react";
import type { ConfirmState } from "../types";

const toneStyles: Record<
  ConfirmState["tone"],
  {
    accent: string;
    confirmBg: string;
    confirmHover: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  success: {
    accent: "bg-emerald-500",
    confirmBg: "bg-emerald-600",
    confirmHover: "hover:bg-emerald-700",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
  },
  info: {
    accent: "bg-blue-500",
    confirmBg: "bg-blue-600",
    confirmHover: "hover:bg-blue-700",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  warning: {
    accent: "bg-amber-500",
    confirmBg: "bg-amber-600",
    confirmHover: "hover:bg-amber-700",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  error: {
    accent: "bg-red-500",
    confirmBg: "bg-red-600",
    confirmHover: "hover:bg-red-700",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
  },
};

const iconPaths: Record<
  "warning" | "danger" | "info" | "success" | "question",
  string
> = {
  warning:
    "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z",
  danger:
    "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z",
  info: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  success:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  question:
    "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M10 15.75a.75.75 0 11.75.75.75.75 0 01-.75-.75zm0-13.5a8.25 8.25 0 100 16.5 8.25 8.25 0 000-16.5z",
};

function DialogIcon({
  icon,
  tone,
}: {
  icon?: ConfirmState["icon"];
  tone: ConfirmState["tone"];
}) {
  const styles = toneStyles[tone];
  const iconPath = iconPaths[icon || "info"];

  return (
    <div className="mx-auto mb-4 flex items-center justify-center">
      <span
        className={`
          inline-flex h-16 w-16 items-center justify-center rounded-full
          ${styles.iconBg} ${styles.iconColor}
          ring-8 ring-${tone}-50
          transition-transform duration-300
          animate-in zoom-in-50
        `}
      >
        <svg className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d={iconPath} clipRule="evenodd" />
        </svg>
      </span>
    </div>
  );
}

interface ConfirmDialogProps {
  state: ConfirmState;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDialogComponent({ state, onCancel, onConfirm }: ConfirmDialogProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(true);
  const styles = toneStyles[state.tone];

  useEffect(() => {
    if (state.open) {
      setIsEntering(true);
      const timer = setTimeout(() => setIsEntering(false), 200);
      return () => clearTimeout(timer);
    }
  }, [state.open]);

  const handleCancel = useCallback(() => {
    if (state.loading) return;
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onCancel();
    }, 200);
  }, [state.loading, onCancel]);

  useEffect(() => {
    if (!state.open) return;

    // Prevent body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Handle Escape key
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !state.loading) {
        handleCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state.open, state.loading, handleCancel]);

  const handleBackdropClick = () => {
    handleCancel();
  };

  if (!state.open && !isExiting) return null;

  return (
    <div
      className={`
        fixed inset-0 z-[70] flex items-center justify-center px-4
        transition-opacity duration-200
        ${isExiting ? "opacity-0" : "opacity-100"}
      `}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop with blur - enhanced */}
      <div
        className={`
          absolute inset-0 bg-slate-900/50 backdrop-blur-md
          transition-all duration-200
          ${isEntering ? "backdrop-blur-none" : "backdrop-blur-md"}
        `}
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div
        className={`
          relative w-[500px] max-w-[95vw] overflow-hidden
          rounded-2xl bg-white shadow-2xl
          transition-all duration-200 ease-out
          ${isExiting ? "scale-95 opacity-0 translate-y-4" : "scale-100 opacity-100 translate-y-0"}
          ${isEntering ? "scale-95" : "scale-100"}
        `}
      >
        {/* Accent bar with gradient */}
        <div className={`h-1.5 ${styles.accent} relative`}>
          <div className={`absolute inset-0 ${styles.accent} opacity-60 blur-sm`} />
        </div>

        {/* Content */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1" />
            <button
              type="button"
              className="
                -mr-2 -mt-2 inline-flex h-8 w-8 shrink-0 items-center
                justify-center rounded-lg text-slate-400
                transition-all duration-200
                hover:bg-slate-100 hover:text-slate-700 hover:scale-110
                active:scale-95
                disabled:cursor-not-allowed disabled:opacity-40
              "
              onClick={handleCancel}
              disabled={state.loading}
              aria-label="Cerrar"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          {/* Icon */}
          <DialogIcon icon={state.icon} tone={state.tone} />

          {/* Title */}
          <h3
            id="confirm-title"
            className="text-center text-xl font-bold text-slate-900 mb-2"
          >
            {state.title}
          </h3>

          {/* Message */}
          <p className="text-center whitespace-pre-line text-sm leading-relaxed text-slate-600 px-2">
            {state.message}
          </p>

          {/* Description */}
          {state.description && (
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 px-2 bg-slate-50 rounded-lg py-2">
              {state.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-white px-6 py-5">
          <button
            type="button"
            className="
              flex-1 max-w-[140px] rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-700
              bg-white border border-slate-200
              transition-all duration-200
              hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm
              active:scale-95
              disabled:cursor-not-allowed disabled:opacity-50
            "
            onClick={handleCancel}
            disabled={state.loading}
          >
            {state.cancelText}
          </button>

          <button
            type="button"
            className={`
              flex-1 max-w-[140px] rounded-xl px-5 py-2.5 text-sm font-semibold text-white
              transition-all duration-200
              active:scale-95
              disabled:cursor-not-allowed disabled:opacity-60
              ${styles.confirmBg} ${styles.confirmHover}
              ${state.loading ? "shadow-none" : "shadow-lg shadow-${state.tone}-500/25"}
            `}
            onClick={onConfirm}
            disabled={state.loading}
          >
            {state.loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Procesando...
              </span>
            ) : (
              state.confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export const ConfirmDialog = memo(ConfirmDialogComponent);
