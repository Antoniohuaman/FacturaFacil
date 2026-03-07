// ===================================================================
// CONFIGURATION CARD - Componente reutilizable premium
// Copiado del módulo de configuración para mantener consistencia
// ===================================================================

import { useState } from 'react';
import type { ReactNode } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ConfigurationCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  helpText?: string;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  actions?: ReactNode;
  contentClassName?: string; // permite ajustar padding interno por caso de uso
  compactLabel?: string;
  headerPaddingClassName?: string;
  titleClassName?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
}

export function ConfigurationCard({
  title,
  description,
  children,
  helpText,
  className = '',
  collapsible = false,
  defaultExpanded = true,
  icon: Icon,
  badge,
  actions,
  contentClassName,
  compactLabel,
  headerPaddingClassName,
  titleClassName,
  iconWrapperClassName,
  iconClassName
}: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasTitle = Boolean(title);
  const hasDescription = Boolean(description);
  const isCompactHeader = !hasTitle && !hasDescription;
  const headerPadding = headerPaddingClassName ?? (
    isCompactHeader
      ? (compactLabel ? 'px-6 py-2' : 'px-4 py-2.5')
      : 'px-6 py-4'
  );
  const iconWrapperSize = isCompactHeader ? 'w-7 h-7' : 'w-8 h-8';
  const baseIconClass = iconClassName ?? (isCompactHeader ? 'w-3.5 h-3.5 text-blue-600' : 'w-4 h-4 text-blue-600');
  const baseIconWrapperClass = iconWrapperClassName ?? `${iconWrapperSize} bg-blue-50 rounded-lg flex items-center justify-center`;
  const renderCollapsibleButton = () => (
    <button className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
      {isExpanded ? (
        <ChevronUp className="w-4 h-4" />
      ) : (
        <ChevronDown className="w-4 h-4" />
      )}
    </button>
  );

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div
        className={`${headerPadding} border-b border-gray-200 ${collapsible ? 'cursor-pointer' : ''}`}
           onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              isCompactHeader && compactLabel ? (
                <div className="inline-flex items-center gap-2 px-0 py-0 max-w-[200px]">
                  <Icon className="w-4 h-4 text-sky-600" />
                  <span className="text-[15px] font-semibold text-slate-700 leading-tight truncate">
                    {compactLabel}
                  </span>
                </div>
              ) : (
                <div className={baseIconWrapperClass}>
                  <Icon className={baseIconClass} />
                </div>
              )
            )}

            {!isCompactHeader && (
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {hasTitle && (
                    <h3 className={titleClassName ?? 'text-lg font-semibold text-gray-900'}>
                      {title}
                    </h3>
                  )}

                  {badge && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {badge}
                    </span>
                  )}

                  {collapsible && renderCollapsibleButton()}
                </div>

                {hasDescription && (
                  <p className="mt-1 text-sm text-gray-500">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {collapsible && isCompactHeader && renderCollapsibleButton()}
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}

            {helpText && (
              <div className="group relative">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                  <HelpCircle className="w-4 h-4" />
                </button>

                {/* Tooltip */}
                <div className="
                  invisible group-hover:visible
                  absolute right-0 top-8 w-64
                  bg-gray-900 text-white text-xs rounded-lg p-3 z-50
                  opacity-0 group-hover:opacity-100
                  transition-all duration-200
                  shadow-lg
                ">
                  {helpText}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className={`${contentClassName ?? 'p-6'} transition-all duration-200`}>
          {children}
        </div>
      )}
    </div>
  );
}
