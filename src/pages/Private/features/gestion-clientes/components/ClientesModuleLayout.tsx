import React from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Upload } from 'lucide-react';
import { PageHeader } from '@/contasis';

const CLIENTES_TABS = [
  {
    key: 'listado' as const,
    label: 'Listado',
    path: '/clientes',
    icon: <List className="w-4 h-4" />,
  },
  {
    key: 'importar' as const,
    label: 'Importar',
    path: '/importar-clientes',
    icon: <Upload className="w-4 h-4" />,
  },
];

type ClientesModuleTab = (typeof CLIENTES_TABS)[number]['key'];

interface ClientesModuleLayoutProps {
  activeTab: ClientesModuleTab;
  children: React.ReactNode;
}

export function ClientesModuleLayout({ activeTab, children }: ClientesModuleLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Gestión de clientes"
      />

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex flex-wrap items-center gap-1">
          {CLIENTES_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (!isActive) {
                    navigate(tab.path);
                  }
                }}
                className={`group relative flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'border-[#6F36FF] text-[#6F36FF] dark:text-[#8B5CF6] bg-[#6F36FF]/5 dark:bg-[#6F36FF]/10'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
