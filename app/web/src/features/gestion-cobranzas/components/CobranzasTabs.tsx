import type { CobranzaTabKey } from '../models/cobranzas.types';

interface CobranzasTabsProps {
  activeTab: CobranzaTabKey;
  onChange: (tab: CobranzaTabKey) => void;
}

const tabs: { id: CobranzaTabKey; label: string; description: string }[] = [
  { id: 'cuentas', label: 'Cuentas por cobrar', description: 'Comprobantes con saldo pendiente' },
  { id: 'cobranzas', label: 'Cobranzas', description: 'Pagos registrados' },
];

export const CobranzasTabs = ({ activeTab, onChange }: CobranzasTabsProps) => (
  <div className="mt-6 border-b border-slate-200 dark:border-gray-700">
    <nav className="flex gap-6" aria-label="Tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`pb-3 border-b-2 text-left transition-colors duration-150 ${
              isActive
                ? 'border-blue-500 text-blue-700 dark:text-blue-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide uppercase">{tab.label}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-gray-400">
                {tab.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  </div>
);
