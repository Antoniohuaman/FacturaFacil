import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

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
// DATOS MOCK INICIALES (los mismos que están en ListaComprobantes)
// ============================================

const INITIAL_COMPROBANTES: Comprobante[] = [
  {
    id: 'B001-00000052',
    type: 'Boleta de venta',
    clientDoc: '08661829',
    client: 'Apolo Guerra Lu',
    date: '20 ago. 2025 19:17',
    vendor: 'Carlos Rueda',
    total: 120.00,
    status: 'Enviado',
    statusColor: 'blue'
  },
  {
    id: 'B001-00000051',
    type: 'Boleta de venta',
    clientDoc: '08664589',
    client: 'María Martínez Sánchez',
    date: '18 ago. 2025 09:03',
    vendor: 'Bertha Flores',
    total: 79.99,
    status: 'Aceptado',
    statusColor: 'green'
  },
  {
    id: 'B001-00000050',
    type: 'Boleta de venta',
    clientDoc: '45878965',
    client: 'Gonzalo Romero Castillo',
    date: '17 ago. 2025 08:41',
    vendor: 'Carlos Rueda',
    total: 58.00,
    status: 'Rechazado',
    statusColor: 'red'
  },
  {
    id: 'B001-00000049',
    type: 'Boleta de venta',
    clientDoc: '00000000',
    client: 'Clientes varios',
    date: '15 ago. 2025 20:56',
    vendor: 'Carlos Rueda',
    total: 99.90,
    status: 'Enviado',
    statusColor: 'blue'
  },
  {
    id: 'B001-00000048',
    type: 'Boleta de venta',
    clientDoc: '89658965',
    client: 'Alex Guerrero Londres',
    date: '11 ago. 2025 16:23',
    vendor: 'Carlos Rueda',
    total: 100.20,
    status: 'Corregir',
    statusColor: 'orange'
  },
  {
    id: 'B001-00000047',
    type: 'Boleta de venta',
    clientDoc: '36598789',
    client: 'Anahí Montes Torres',
    date: '10 ago. 2025 15:38',
    vendor: 'Carlos Rueda',
    total: 30.50,
    status: 'Rechazado',
    statusColor: 'red'
  },
  {
    id: 'F001-00000011',
    type: 'Factura',
    clientDoc: '20236523658',
    client: 'Tienda S.A.C.',
    date: '05 ago. 2025 20:44',
    vendor: 'Carlos Rueda',
    total: 280.00,
    status: 'Enviado',
    statusColor: 'blue'
  },
  {
    id: 'B001-00000044',
    type: 'Boleta de venta',
    clientDoc: '00058965',
    client: 'Renzo Alba Vázques',
    date: '04 ago. 2025 13:12',
    vendor: 'Carlos Rueda',
    total: 23.00,
    status: 'Rechazado',
    statusColor: 'red'
  },
  {
    id: 'F001-00000009',
    type: 'Boleta de venta',
    clientDoc: '10236526589',
    client: 'Market S.A.C.',
    date: '03 ago. 2025 18:22',
    vendor: 'Carlos Rueda',
    total: 320.20,
    status: 'Aceptado',
    statusColor: 'green'
  },
  {
    id: 'B001-00000040',
    type: 'Boleta de venta',
    clientDoc: '00000000',
    client: 'Clientes varios',
    date: '02 ago. 2025 10:55',
    vendor: 'Carlos Rueda',
    total: 102.00,
    status: 'Aceptado',
    statusColor: 'green'
  }
];

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
