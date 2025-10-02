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
  actions
}: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b border-gray-200 ${collapsible ? 'cursor-pointer' : ''}`}
           onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>

                {badge && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {badge}
                  </span>
                )}

                {collapsible && (
                  <button className="ml-2 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {description && (
                <p className="mt-1 text-sm text-gray-500">
                  {description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
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
        <div className="p-6 transition-all duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
