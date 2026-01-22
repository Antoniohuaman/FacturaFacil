// Componente compartido para headers de módulos
// Basado en el estándar del módulo de Indicadores de Negocio
import React from 'react';

interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, icon, actions }: PageHeaderProps) {
  const TitleContent = icon ? (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1478D4' }}>
        {icon}
      </div>
      <h1 className="legacy-page-header-title text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
    </div>
  ) : (
    <h1 className="legacy-page-header-title text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
  );

  return (
    <div className="legacy-page-header bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600 py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        {TitleContent}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;