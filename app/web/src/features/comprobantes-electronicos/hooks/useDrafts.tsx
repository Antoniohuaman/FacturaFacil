// ===================================================================
// HOOK PARA MANEJO DE BORRADORES
// ===================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  DraftData,
  DraftAction,
  CartItem,
  TipoComprobante,
  ClientData,
  PaymentTotals,
  Currency
} from '../models/comprobante.types';
import { SYSTEM_CONFIG } from '../models/constants';
import {
  appendDraftToStorage,
  readDraftsFromStorage
} from '../shared/drafts/draftStorage';
import { validateComprobanteNormativa } from '../shared/core/comprobanteValidation';

interface DraftSaveParams {
  tipoComprobante: TipoComprobante;
  serieSeleccionada: string;
  cartItems: CartItem[];
  onClearCart?: () => void;
  cliente?: ClientData;
  totals?: PaymentTotals;
  currency?: Currency;
  observaciones?: string;
  notaInterna?: string;
  vendedor?: string;
}

export interface UseDraftsReturn {
  // Estados del borrador
  showDraftToast: boolean;
  showDraftModal: boolean;
  draftExpiryDate: string;
  draftAction: DraftAction;
  
  // Setters
  setShowDraftToast: (show: boolean) => void;
  setShowDraftModal: (show: boolean) => void;
  setDraftExpiryDate: (date: string) => void;
  setDraftAction: (action: DraftAction) => void;
  
  // Funciones principales
  handleSaveDraft: (params: DraftSaveParams) => void;
  
  handleDraftModalSave: (params: DraftSaveParams) => void;
  
  closeDraftToast: () => void;
  closeDraftModal: () => void;
  
  // Utilidades
  generateDraftId: (serie: string) => string;
  getDraftsFromStorage: () => DraftData[];
  saveDraftToStorage: (draft: DraftData) => void;
}

export const useDrafts = (): UseDraftsReturn => {
  // ===================================================================
  // ESTADOS DEL BORRADOR
  // ===================================================================
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftExpiryDate, setDraftExpiryDate] = useState<string>('');
  const [draftAction, setDraftAction] = useState<DraftAction>('terminar');

  const navigate = useNavigate();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup effect para el timeout
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // ===================================================================
  // FUNCIONES DE UTILIDAD
  // ===================================================================

  /**
   * Generar ID único para borrador
   * Mantiene exactamente la misma lógica del archivo original
   */
  const generateDraftId = useCallback((serie: string): string => {
    const randomNumber = Math.floor(Math.random() * 100000).toString().padStart(8, '0');
    return `${SYSTEM_CONFIG.DRAFT_ID_PREFIX}${serie}-${randomNumber}`;
  }, []);

  /**
   * Obtener borradores desde localStorage
   */
  const getDraftsFromStorage = useCallback((): DraftData[] => {
    return readDraftsFromStorage();
  }, []);

  /**
   * Guardar borrador en localStorage
   */
  const saveDraftToStorage = useCallback((draft: DraftData) => {
    appendDraftToStorage(draft);
  }, []);

  // ===================================================================
  // FUNCIONES PRINCIPALES DE BORRADOR
  // ===================================================================

  /**
   * Guardar borrador (función principal)
   * Mantiene exactamente la misma lógica del archivo original
   */
  const handleSaveDraft = useCallback((params: DraftSaveParams) => {
    const {
      tipoComprobante,
      serieSeleccionada,
      cartItems,
      cliente,
      totals,
      currency,
      observaciones,
      notaInterna,
      vendedor
    } = params;

    const validation = validateComprobanteNormativa({
      tipoComprobante,
      serieSeleccionada,
      cliente,
      formaPago: undefined,
      fechaEmision: undefined,
      moneda: currency,
      cartItems,
      totals,
    });

    if (!validation.isValid) {
      // No mostrar toast de guardado; la capa superior debe manejar mensajes si es necesario
      return;
    }
    
    // Recopilar datos relevantes del formulario
    const draftData: DraftData = {
      id: generateDraftId(serieSeleccionada),
      tipo: tipoComprobante,
      serie: serieSeleccionada,
      productos: cartItems,
      fechaEmision: new Date().toISOString().slice(0, 10),
      fechaVencimiento: draftExpiryDate || undefined,
      cliente,
      observaciones,
      notaInterna,
      totals,
      currency,
      vendedor,
      createdAt: new Date().toISOString(),
      // Aquí se pueden agregar más campos según necesidad
    };
    
    // Guardar en localStorage
    saveDraftToStorage(draftData);
    
    // Auto-ocultar toast después del tiempo configurado
    setTimeout(() => {
      setShowDraftToast(false);
    }, SYSTEM_CONFIG.TOAST_DURATION);
  }, [draftExpiryDate, generateDraftId, saveDraftToStorage]);

  /**
   * Manejar guardado desde el modal con navegación
   * Mantiene exactamente la misma lógica del archivo original
   */
  const handleDraftModalSave = useCallback((params: DraftSaveParams) => {
    const { onClearCart } = params;
    
    // Cerrar modal
    setShowDraftModal(false);
    
    // Guardar borrador
    handleSaveDraft(params);
    
    // Ejecutar acciones según la opción seleccionada
    if (draftAction === 'continuar') {
      // Limpiar carrito para continuar con nuevo comprobante
      onClearCart?.();
    } else if (draftAction === 'borradores') {
      // Navegar a comprobantes y mostrar tab de borradores
      navigate('/comprobantes');
      // Limpiar timeout anterior si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Guardar referencia al nuevo timeout
      timeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('showBorradoresTab'));
        timeoutRef.current = null;
      }, 100);
    } else {
      // Terminar - ir a lista de comprobantes
      navigate('/comprobantes');
    }
  }, [draftAction, handleSaveDraft, navigate]);

  // ===================================================================
  // FUNCIONES DE CONTROL DE UI
  // ===================================================================

  /**
   * Cerrar toast de borrador
   */
  const closeDraftToast = useCallback(() => {
    setShowDraftToast(false);
  }, []);

  /**
   * Cerrar modal de borrador
   */
  const closeDraftModal = useCallback(() => {
    setShowDraftModal(false);
  }, []);

  // ===================================================================
  // RETORNO DEL HOOK
  // ===================================================================
  return {
    // Estados
    showDraftToast,
    showDraftModal,
    draftExpiryDate,
    draftAction,
    
    // Setters
    setShowDraftToast,
    setShowDraftModal,
    setDraftExpiryDate,
    setDraftAction,
    
    // Funciones principales
    handleSaveDraft,
    handleDraftModalSave,
    closeDraftToast,
    closeDraftModal,
    
    // Utilidades
    generateDraftId,
    getDraftsFromStorage,
    saveDraftToStorage,
  };
};