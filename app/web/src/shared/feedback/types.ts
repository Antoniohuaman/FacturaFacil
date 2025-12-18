export type ToastTone = "success" | "info" | "warning" | "error";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  createdAt: number;
  /** si no se define, se usa el default global */
  durationMs?: number;
  /** si true, no se auto-cierra */
  sticky?: boolean;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ToastTone;
  /** si true, muestra estado “cargando” en confirmar */
  loading?: boolean;
};

export type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: ToastTone;
  loading: boolean;
};

export type FeedbackApi = {
  // Toasts
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id" | "createdAt">) => string;
  dismiss: (id: string) => void;
  clear: () => void;

  // Helpers
  success: (message: string, title?: string, opts?: Partial<ToastItem>) => string;
  info: (message: string, title?: string, opts?: Partial<ToastItem>) => string;
  warning: (message: string, title?: string, opts?: Partial<ToastItem>) => string;
  error: (message: string, title?: string, opts?: Partial<ToastItem>) => string;

  // Confirm
  confirmState: ConfirmState;
  openConfirm: (opts: ConfirmOptions) => Promise<boolean>;
  closeConfirm: () => void;
};
