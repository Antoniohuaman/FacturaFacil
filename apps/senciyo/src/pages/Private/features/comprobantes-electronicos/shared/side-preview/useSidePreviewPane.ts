// ===================================================================
// SIDE PREVIEW PANE - HOOK
// Hook para gestionar estado del panel (open/close, ancho, persistencia)
// ===================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PREVIEW_WIDTH_CONFIG, type UseSidePreviewPaneResult } from './types';

export function useSidePreviewPane(): UseSidePreviewPaneResult {
  // Estado NO persistente - siempre cerrado al inicializar
  const [isOpen, setIsOpen] = useState(false);

  const [width, setWidthState] = useState(() => {
    try {
      const saved = localStorage.getItem(`${PREVIEW_WIDTH_CONFIG.PERSIST_KEY}:width`);
      const parsedWidth = saved ? parseInt(saved, 10) : PREVIEW_WIDTH_CONFIG.DEFAULT;
      // Validar rango
      return Math.max(
        PREVIEW_WIDTH_CONFIG.MIN,
        Math.min(PREVIEW_WIDTH_CONFIG.MAX, parsedWidth)
      );
    } catch {
      return PREVIEW_WIDTH_CONFIG.DEFAULT;
    }
  });

  // Detectar viewport para modo responsive
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modo overlay si viewport < 1280px
  const isResponsiveOverlay = useMemo(() => viewportWidth < 1280, [viewportWidth]);

  // Persistir SOLO el ancho (NO el estado isOpen)
  useEffect(() => {
    try {
      localStorage.setItem(`${PREVIEW_WIDTH_CONFIG.PERSIST_KEY}:width`, width.toString());
    } catch {
      // Silent fail
    }
  }, [width]);

  // Handlers
  const openPane = useCallback(() => setIsOpen(true), []);
  const closePane = useCallback(() => setIsOpen(false), []);
  const togglePane = useCallback(() => setIsOpen(prev => !prev), []);

  const setWidth = useCallback((newWidth: number) => {
    const clamped = Math.max(
      PREVIEW_WIDTH_CONFIG.MIN,
      Math.min(PREVIEW_WIDTH_CONFIG.MAX, newWidth)
    );
    
    // Ya NO auto-colapsa, solo mantiene el ancho dentro del rango
    setWidthState(clamped);
  }, []);

  // Snap to predefined widths con auto-ajuste
  const snapWidth = useCallback((direction: 'left' | 'right') => {
    const snaps = [480, 560, 640]; // Snaps predefinidos
    const currentIndex = snaps.findIndex(snap => Math.abs(snap - width) < 20);
    
    if (direction === 'right' && currentIndex < snaps.length - 1) {
      setWidthState(snaps[currentIndex + 1]);
    } else if (direction === 'left' && currentIndex > 0) {
      setWidthState(snaps[currentIndex - 1]);
    } else {
      // Si no está cerca de ningún snap, ir al más cercano
      const closest = snaps.reduce((prev, curr) => 
        Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
      );
      setWidthState(closest);
    }
  }, [width]);

  return {
    isOpen,
    width,
    openPane,
    closePane,
    togglePane,
    setWidth,
    snapWidth,
    isResponsiveOverlay
  };
}
