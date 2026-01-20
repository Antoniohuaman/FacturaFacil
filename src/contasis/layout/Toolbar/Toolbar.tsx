import React from 'react';
import type { ToolbarProps } from './Toolbar.types';

/**
 * Toolbar - Componente reutilizable para barras de herramientas
 * 
 * @description
 * Contenedor genérico para toolbars de cualquier módulo/página.
 * Mantiene estilos consistentes (padding, altura, layout) pero
 * el contenido se define desde la página que lo usa.
 * 
 * La página/módulo es quien decide:
 * - Qué botones hay
 * - Qué filtros hay
 * - Qué acciones existen
 * 
 * El Toolbar solo proporciona la estructura base.
 * 
 * @example
 * // Uso básico con filtros y acciones
 * <Toolbar
 *   leftContent={
 *     <>
 *       <ToggleButton icon={<Filter />} />
 *       <Button icon={<RefreshCw />} />
 *     </>
 *   }
 *   rightContent={
 *     <>
 *       <Button variant="secondary">Nueva factura</Button>
 *       <Button variant="primary">Nueva boleta</Button>
 *     </>
 *   }
 * />
 */
export const Toolbar: React.FC<ToolbarProps> = ({ 
  leftContent, 
  rightContent,
  className = '',
  sticky = true
}) => {
  const stickyClass = sticky ? 'sticky top-0 z-10' : '';
  
  return (
    <div 
      className={`px-6 h-16 flex items-center justify-between gap-4 bg-surface-0 border-b border-[color:var(--border-default)] shrink-0 ${stickyClass} ${className}`}
    >
      {/* Área izquierda: Filtros, búsqueda, etc. */}
      <div className="flex items-center gap-2">
        {leftContent}
      </div>

      {/* Área derecha: Acciones principales */}
      <div className="flex items-center gap-2">
        {rightContent}
      </div>
    </div>
  );
};
