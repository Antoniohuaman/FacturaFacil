import { useCallback, useMemo, useRef, useState } from "react";
import { FeedbackContext } from "./FeedbackContext";
import type { ConfirmOptions, ConfirmState, FeedbackApi, ToastItem } from "./types";


function uid(prefix = "t") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const DEFAULT_TOAST_MS = 4500;

const initialConfirmState: ConfirmState = {
  open: false,
  title: "",
  message: "",
  confirmText: "Confirmar",
  cancelText: "Cancelar",
  tone: "info",
  loading: false,
  description: undefined,
  icon: undefined,
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>(initialConfirmState);

  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const push = useCallback((t: Omit<ToastItem, "id" | "createdAt">) => {
    const id = uid("toast");
    const item: ToastItem = {
      id,
      createdAt: Date.now(),
      title: t.title,
      message: t.message,
      tone: t.tone,
      sticky: t.sticky ?? false,
      durationMs: t.durationMs ?? DEFAULT_TOAST_MS,
    };

    setToasts((prev) => (prev[0]?.id === item.id ? prev : [item, ...prev]).slice(0, 5));
    return id;
  }, []);

  // ✅ Helpers SIN useMemo -> no warnings exhaustive-deps
  const success = useCallback(
    (message: string, title?: string, opts?: Partial<ToastItem>) =>
      push({
        tone: "success",
        message,
        title,
        sticky: opts?.sticky,
        durationMs: opts?.durationMs,
      }),
    [push]
  );

  const info = useCallback(
    (message: string, title?: string, opts?: Partial<ToastItem>) =>
      push({
        tone: "info",
        message,
        title,
        sticky: opts?.sticky,
        durationMs: opts?.durationMs,
      }),
    [push]
  );

  const warning = useCallback(
    (message: string, title?: string, opts?: Partial<ToastItem>) =>
      push({
        tone: "warning",
        message,
        title,
        sticky: opts?.sticky,
        durationMs: opts?.durationMs,
      }),
    [push]
  );

  const error = useCallback(
    (message: string, title?: string, opts?: Partial<ToastItem>) =>
      push({
        tone: "error",
        message,
        title,
        sticky: opts?.sticky,
        durationMs: opts?.durationMs,
      }),
    [push]
  );

  const closeConfirm = useCallback((confirmed = false) => {
    setConfirmState((s) => ({ ...s, open: false, loading: false }));
    if (confirmResolveRef.current) {
      confirmResolveRef.current(confirmed);
      confirmResolveRef.current = null;
    }
  }, []);

  const confirmAction = useCallback(() => {
    closeConfirm(true);
  }, [closeConfirm]);

  const cancelAction = useCallback(() => {
    closeConfirm(false);
  }, [closeConfirm]);

  const openConfirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolveRef.current = resolve;

      setConfirmState({
        open: true,
        title: opts.title ?? "Confirmación",
        message: opts.message,
        confirmText: opts.confirmText ?? "Confirmar",
        cancelText: opts.cancelText ?? "Cancelar",
        tone: opts.tone ?? "info",
        loading: opts.loading ?? false,
        description: opts.description,
        icon: opts.icon,
      });
    });
  }, []);

  const api: FeedbackApi = useMemo(
    () => ({
      toasts,
      push,
      dismiss,
      clear,

      success,
      info,
      warning,
      error,

      confirmState,
      openConfirm,
      closeConfirm,
      confirmAction,
      cancelAction,
    }),
    [
      toasts,
      push,
      dismiss,
      clear,
      success,
      info,
      warning,
      error,
      confirmState,
      openConfirm,
      closeConfirm,
      confirmAction,
      cancelAction,
    ]
  );

  return <FeedbackContext.Provider value={api}>{children}</FeedbackContext.Provider>;
}
