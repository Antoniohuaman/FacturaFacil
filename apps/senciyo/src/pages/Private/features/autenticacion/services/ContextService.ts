// src/features/autenticacion/services/ContextService.ts
import type { WorkspaceContext } from '../types/auth.types';

/**
 * ============================================
 * CONTEXT SERVICE - Persistencia de Contexto
 * ============================================
 */

const STORAGE_KEY = 'senciyo_workspace_context';
const LAST_EMPRESA_KEY = 'senciyo_last_empresa_id';
const LAST_ESTABLECIMIENTO_KEY = 'senciyo_last_establecimiento_id';

class ContextService {
  /**
   * Guarda el contexto actual
   */
  saveContext(context: WorkspaceContext): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
      localStorage.setItem(LAST_EMPRESA_KEY, context.empresaId);
      localStorage.setItem(LAST_ESTABLECIMIENTO_KEY, context.establecimientoId);
    } catch (error) {
      console.error('Error guardando contexto:', error);
    }
  }

  /**
   * Obtiene el contexto guardado
   */
  getContext(): WorkspaceContext | null {
    try {
      const contextStr = localStorage.getItem(STORAGE_KEY);
      if (!contextStr) return null;
      return JSON.parse(contextStr);
    } catch (error) {
      console.error('Error leyendo contexto:', error);
      return null;
    }
  }

  /**
   * Obtiene el último contexto usado (solo IDs)
   */
  getLastContext(): { empresaId: string; establecimientoId: string } | null {
    const empresaId = localStorage.getItem(LAST_EMPRESA_KEY);
    const establecimientoId = localStorage.getItem(LAST_ESTABLECIMIENTO_KEY);
    
    if (!empresaId || !establecimientoId) return null;
    
    return { empresaId, establecimientoId };
  }

  /**
   * Limpia el contexto
   */
  clearContext(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LAST_EMPRESA_KEY);
    localStorage.removeItem(LAST_ESTABLECIMIENTO_KEY);
  }

  /**
   * Verifica si hay un contexto válido
   */
  hasContext(): boolean {
    return !!this.getContext();
  }
}

export const contextService = new ContextService();
