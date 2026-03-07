/* eslint-disable react-refresh/only-export-components -- archivo mezcla context y utilidades; split diferido */
import { createContext, useContext, useEffect, useReducer } from 'react';
import type { ReactNode } from 'react';
import { useTenant } from '../../../../../../shared/tenant/TenantContext';

// ============================================
// TIPOS Y INTERFACES
// ============================================

export interface Comprobante {
  id: string;
  type: string;
  clientDoc: string;
  client: string;
  date: string;
  vendor: string;
  total: number;
  status: string;
  statusColor: 'blue' | 'green' | 'red' | 'orange';
  // Campos opcionales agregados
  currency?: string;
  exchangeRate?: number;
  paymentMethod?: string;
  email?: string;
  dueDate?: string;
  address?: string;
  shippingAddress?: string;
  purchaseOrder?: string;
  costCenter?: string;
  waybill?: string;
  observations?: string;
  internalNote?: string;
  relatedDocumentId?: string;
  relatedDocumentType?: string;
}

interface ComprobanteState {
  comprobantes: Comprobante[];
}

type ComprobanteAction =
  | { type: 'ADD_COMPROBANTE'; payload: Comprobante }
  | { type: 'SET_COMPROBANTES'; payload: Comprobante[] }
  | { type: 'UPDATE_COMPROBANTE'; payload: Comprobante }
  | { type: 'DELETE_COMPROBANTE'; payload: string };

// ============================================
// DATOS INICIALES
// ============================================
// Por defecto la lista de comprobantes se inicia vacía en el contexto.
// Los comprobantes reales se deben agregar mediante la acción `addComprobante`
// cuando se genera un comprobante desde el formulario o se sincroniza desde el backend.
const INITIAL_COMPROBANTES: Comprobante[] = [];

// ============================================
// REDUCER
// ============================================

function comprobanteReducer(
  state: ComprobanteState,
  action: ComprobanteAction
): ComprobanteState {
  switch (action.type) {
    case 'ADD_COMPROBANTE':
      // Agregar al inicio del array para que aparezca primero en la lista
      return {
        ...state,
        comprobantes: [action.payload, ...state.comprobantes]
      };

    case 'SET_COMPROBANTES':
      return {
        ...state,
        comprobantes: action.payload
      };

    case 'UPDATE_COMPROBANTE':
      return {
        ...state,
        comprobantes: state.comprobantes.map(comp =>
          comp.id === action.payload.id ? action.payload : comp
        )
      };

    case 'DELETE_COMPROBANTE':
      return {
        ...state,
        comprobantes: state.comprobantes.filter(comp => comp.id !== action.payload)
      };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

interface ComprobanteContextType {
  state: ComprobanteState;
  dispatch: React.Dispatch<ComprobanteAction>;
  addComprobante: (comprobante: Comprobante) => void;
}

const ComprobanteContext = createContext<ComprobanteContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface ComprobanteProviderProps {
  children: ReactNode;
}

export function ComprobanteProvider({ children }: ComprobanteProviderProps) {
  const [state, dispatch] = useReducer(comprobanteReducer, {
    comprobantes: INITIAL_COMPROBANTES
  });
  const { tenantId } = useTenant();

  useEffect(() => {
    dispatch({ type: 'SET_COMPROBANTES', payload: INITIAL_COMPROBANTES });
  }, [tenantId]);

  // Helper function para agregar un comprobante
  const addComprobante = (comprobante: Comprobante) => {
    dispatch({ type: 'ADD_COMPROBANTE', payload: comprobante });
  };

  return (
    <ComprobanteContext.Provider value={{ state, dispatch, addComprobante }}>
      {children}
    </ComprobanteContext.Provider>
  );
}

// ============================================
// HOOK PERSONALIZADO
// ============================================

export function useComprobanteContext() {
  const context = useContext(ComprobanteContext);
  if (context === undefined) {
    throw new Error(
      'useComprobanteContext must be used within a ComprobanteProvider'
    );
  }
  return context;
}
