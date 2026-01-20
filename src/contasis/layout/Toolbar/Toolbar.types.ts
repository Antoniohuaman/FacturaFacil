import { ReactNode } from 'react';

export interface ToolbarProps {
  /**
   * Contenido del lado izquierdo (filtros, búsqueda, etc.)
   */
  leftContent?: ReactNode;
  
  /**
   * Contenido del lado derecho (acciones primarias, botones, etc.)
   */
  rightContent?: ReactNode;
  
  /**
   * Clase CSS adicional para customización
   */
  className?: string;
  
  /**
   * Si debe ser sticky (pegado al top al hacer scroll)
   * @default true
   */
  sticky?: boolean;
}
