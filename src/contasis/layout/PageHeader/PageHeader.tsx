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
  icon,
  breadcrumb, 
  actions,
  className = '' 
}) => {
  const titleContent = typeof title === 'string'
    ? (
      <h1 className="text-h3 font-poppins text-primary truncate">
        {title}
      </h1>
    )
    : title;

  const renderedTitle = icon ? (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        {titleContent}
      </div>
    </div>
  ) : (
    titleContent
  );

  return (
    <div 
      className={`px-6 py-4 bg-surface-0 border-b border-[color:var(--border-default)] shrink-0 flex items-stretch justify-between sticky top-0 z-10 ${className}`}
    >
      {/* Área izquierda: Breadcrumb + Título (vertical) */}
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="text-sm">
            {breadcrumb}
          </div>
        )}
        
        {/* Título */}
        {typeof title === 'string' ? (
          <h1 className="text-h3 font-semibold font-poppins text-primary truncate">
            {title}
          </h1>
        ) : (
          title
        )}

        {renderedTitle}

      </div>

      {/* Área derecha: Acciones del layout */}
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {actions}
        </div>
      )}
    </div>
  );
};
