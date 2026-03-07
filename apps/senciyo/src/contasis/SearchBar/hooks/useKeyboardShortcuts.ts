import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = (
  onTogglePalette: () => void,
  onEscape: () => void,
  isDialogOpen: boolean = false
) => {
  const isEditableTarget = useCallback((target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }

    if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return true;
    }

    return Boolean(target.closest('input, textarea, select, [contenteditable]'));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditable = isEditableTarget(e.target) || isEditableTarget(document.activeElement);
      const wantsPaletteToggle = (e.ctrlKey || e.metaKey) && e.key === 'k';

      // Escapar para cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onEscape();
        return;
      }

      // Ctrl+K para abrir/cerrar command palette
      const allowPaletteToggle = !isEditable || isDialogOpen;
      if (wantsPaletteToggle && allowPaletteToggle) {
        e.preventDefault();
        e.stopPropagation();
        onTogglePalette();
        return;
      }
    };
    
    // Usar capture: true para interceptar eventos antes que otros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [onTogglePalette, onEscape, isEditableTarget, isDialogOpen]);

  // Controlar overflow del body cuando hay diálogos abiertos
  useEffect(() => {
    if (isDialogOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isDialogOpen]);
};