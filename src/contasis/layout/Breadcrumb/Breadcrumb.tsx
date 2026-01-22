import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

/**
 * Breadcrumb - Componente de navegación jerárquica
 * 
 * @example
 * <Breadcrumb 
 *   items={[
 *     { label: 'Inicio', href: '/' },
 *     { label: 'Facturación', href: '/facturas' },
 *     { label: 'Nueva Emisión' }
 *   ]}
 * />
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items,
  separator = <ChevronRight className="w-4 h-4" />
}) => {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.href || item.onClick ? (
              <a
                href={item.href}
                onClick={item.onClick}
                className={`hover:text-primary transition-colors ${
                  isLast 
                    ? 'text-primary font-medium' 
                    : 'text-tertiary'
                }`}
              >
                {item.label}
              </a>
            ) : (
              <span className="text-primary font-medium">
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <span className="text-tertiary flex-shrink-0">
                {separator}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};