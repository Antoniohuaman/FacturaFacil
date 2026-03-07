export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export type NotificationSource = 'sunat' | 'stock' | 'caja' | 'cobranza' | 'sistema';

export interface HeaderNotification {
  id: string;
  title: string;
  message?: string;
  createdAt: string | number;
  severity: NotificationSeverity;
  source: NotificationSource;
  link?: string;
  entityId?: string;
  read?: boolean;
}

export interface UseHeaderNotificationsResult {
  notifications: HeaderNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}
