export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

export type ToastType = Toast['type'];
