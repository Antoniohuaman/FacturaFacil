import { useState } from 'react';

/**
 * Hook para manejar el estado de expansión de módulos del sidebar
 * @returns {Object} - Estado y funciones para manejar módulos expandidos
 */
export const useExpandableModules = () => {
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  /**
   * Alterna el estado de expansión de un módulo
   * @param moduleId - ID del módulo a expandir/colapsar
   */
  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  /**
   * Verifica si un módulo está expandido
   * @param moduleId - ID del módulo a verificar
   * @returns true si el módulo está expandido
   */
  const isModuleExpanded = (moduleId: string): boolean => {
    return expandedModules.includes(moduleId);
  };

  return {
    expandedModules,
    toggleModule,
    isModuleExpanded
  };
};
