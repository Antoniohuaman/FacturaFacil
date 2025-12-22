import { PageHeader } from '@/components/PageHeader';

export function NotificationsCenterPage() {
  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <PageHeader title="Centro de Notificaciones" />
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Historial de notificaciones
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Aquí verás próximamente el historial completo de eventos importantes del sistema
            (SUNAT, stock, caja, cobranzas y más). Por ahora, revisa las alertas recientes
            desde la campanita del encabezado.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NotificationsCenterPage;
