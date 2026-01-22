import React from 'react';
import type { PageHeaderProps } from './PageHeader.types';

/**
 * PageHeader - Componente reutilizable para encabezados de página
 * 
 * @description
 * Contenedor genérico para el header de cualquier módulo/página.
 * Mantiene estilos consistentes (padding, altura, layout) pero
 * el contenido se define desde la página que lo usa.
 * 
 * @example
 * // Uso básico con solo título
 * <PageHeader title="Comprobantes Electrónicos" />
 * 
 * @example
 * // Con breadcrumb y acciones
 * <PageHeader
 *   breadcrumb={<Breadcrumb items={[...]} />}
 *   title="Nueva Emisión"
 *   actions={
 *     <>
 *       <Button iconOnly icon={<Maximize2 />} />
 *       <Button iconOnly icon={<Settings />} />
 *     </>
 *   }
 * />
 */
export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  breadcrumb, 
  actions,
  className = '' 
}) => {
  return (
    <div 
      className={`px-6 h-14 bg-surface-0 border-b border-[color:var(--border-default)] shrink-0 flex items-center justify-between sticky top-0 z-10 ${className}`}
    >
      {/* Área izquierda: Breadcrumb + Título */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {breadcrumb}
        
        {/* Si title es string, usar h1, sino renderizar como está */}
        {typeof title === 'string' ? (
          <h1 className="text-h3 font-poppins text-primary truncate">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>

      {/* Área derecha: Acciones del layout */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
