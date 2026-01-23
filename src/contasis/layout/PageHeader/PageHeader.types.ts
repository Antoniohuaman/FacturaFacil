import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /**
   * Título principal del header. Puede ser texto o un elemento React personalizado
   */
  title: ReactNode;
  
  /**
   * Icono decorativo que se muestra junto al título
   */
  icon?: ReactNode;
  
  /**
   * Breadcrumb o navegación contextual (opcional)
   */
  breadcrumb?: ReactNode;
  
  /**
   * Acciones que afectan el layout (fullscreen, settings, etc.)
   */
  actions?: ReactNode;
  
  /**
   * Clase CSS adicional para customización
   */
  className?: string;
}
