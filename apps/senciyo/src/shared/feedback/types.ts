export type ToastTone = "success" | "info" | "warning" | "error";

export type ToastAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
  createdAt: number;
  /** si no se define, se usa el default global (4500ms) */
  durationMs?: number;
  /** si true, no se auto-cierra */
  sticky?: boolean;
  /** botón de acción opcional */
  action?: ToastAction;
  /** descripción adicional (segunda línea) */
  description?: string;
};

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ToastTone;
  /** si true, muestra estado "cargando" en confirmar */
  loading?: boolean;
  /** descripción adicional debajo del mensaje */
  description?: string;
  /** icono personalizado (opcional) */
  icon?: "warning" | "danger" | "info" | "success" | "question";
};

export type ConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: ToastTone;
  loading: boolean;
  description?: string;
  icon?: "warning" | "danger" | "info" | "success" | "question";
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
  closeConfirm: (confirmed?: boolean) => void;
  confirmAction: () => void;
  cancelAction: () => void;
};
