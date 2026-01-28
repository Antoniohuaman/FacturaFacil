// src/features/configuration/components/comunes/ConfigurationCard.tsx
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
  density?: 'default' | 'compact';
}

export function TarjetaConfiguracion({ 
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
  density = 'default'
}: ConfigurationCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const isCompact = density === 'compact';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div
        className={`
          border-b border-gray-200 ${collapsible ? 'cursor-pointer' : ''}
          ${isCompact ? 'px-4 py-2' : 'px-4 py-2.5'}
        `}
           onClick={collapsible ? () => setIsExpanded(!isExpanded) : undefined}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={`${isCompact ? 'w-5 h-5 rounded' : 'w-6 h-6 rounded-md'} bg-blue-50 flex items-center justify-center`}>
                <Icon className={`${isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-blue-600`} />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className={`${isCompact ? 'text-h5 leading-tight' : 'text-h5'} font-display font-semibold text-gray-900`}>
                  {title}
                </h3>
                
                {badge && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {badge}
                  </span>
                )}
                
                {collapsible && (
                  <button className={`ml-2 ${isCompact ? 'p-0.5' : 'p-1'} text-gray-400 hover:text-gray-600 rounded transition-colors`}>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              
              {description && (
                <p className="mt-1 text-xs text-gray-500">
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
                <button className={`${isCompact ? 'p-1' : 'p-1.5'} text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors`}>
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
        <div className={`${isCompact ? 'px-4 py-2.5' : 'px-4 py-3'} transition-all duration-200`}>
          {children}
        </div>
      )}
    </div>
  );
}