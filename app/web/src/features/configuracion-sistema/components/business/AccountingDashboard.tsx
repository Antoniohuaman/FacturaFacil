import { ChevronRight, NotebookPen } from 'lucide-react';

interface AccountingDashboardProps {
  onOpenAccounts: () => void;
}

export function AccountingDashboard({ onOpenAccounts }: AccountingDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-gray-900">Datos contables</h2>
        <p className="text-sm text-gray-600">Configura catálogos contables para integraciones.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={onOpenAccounts}
          className="group flex h-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <NotebookPen className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-gray-900">Cuentas contables</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-blue-600">
            Gestionar
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </button>
      </div>
    </div>
  );
}
