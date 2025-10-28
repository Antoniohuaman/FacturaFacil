import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Documento } from '../models/documento.types';

// ============================================
// TIPOS Y INTERFACES
// ============================================

interface DocumentoState {
  documentos: Documento[];
}

type DocumentoAction =
  | { type: 'ADD_DOCUMENTO'; payload: Documento }
  | { type: 'SET_DOCUMENTOS'; payload: Documento[] }
  | { type: 'UPDATE_DOCUMENTO'; payload: Documento }
  | { type: 'DELETE_DOCUMENTO'; payload: string };

// ============================================
// DATOS INICIALES
// ============================================
const INITIAL_DOCUMENTOS: Documento[] = [];

const initialState: DocumentoState = {
  documentos: INITIAL_DOCUMENTOS
};

// ============================================
// REDUCER
// ============================================

function documentoReducer(state: DocumentoState, action: DocumentoAction): DocumentoState {
  switch (action.type) {
    case 'ADD_DOCUMENTO':
      return {
        ...state,
        documentos: [...state.documentos, action.payload]
      };
    case 'SET_DOCUMENTOS':
      return {
        ...state,
        documentos: action.payload
      };
    case 'UPDATE_DOCUMENTO':
      return {
        ...state,
        documentos: state.documentos.map(doc =>
          doc.id === action.payload.id ? action.payload : doc
        )
      };
    case 'DELETE_DOCUMENTO':
      return {
        ...state,
        documentos: state.documentos.filter(doc => doc.id !== action.payload)
      };
    default:
      return state;
  }
}

// ============================================
// CONTEXTO
// ============================================

interface DocumentoContextValue {
  state: DocumentoState;
  dispatch: React.Dispatch<DocumentoAction>;
  addDocumento: (documento: Documento) => void;
  setDocumentos: (documentos: Documento[]) => void;
  updateDocumento: (documento: Documento) => void;
  deleteDocumento: (id: string) => void;
}

const DocumentoContext = createContext<DocumentoContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface DocumentoProviderProps {
  children: ReactNode;
}

export function DocumentoProvider({ children }: DocumentoProviderProps) {
  const [state, dispatch] = useReducer(documentoReducer, initialState);

  const addDocumento = (documento: Documento) => {
    dispatch({ type: 'ADD_DOCUMENTO', payload: documento });
  };

  const setDocumentos = (documentos: Documento[]) => {
    dispatch({ type: 'SET_DOCUMENTOS', payload: documentos });
  };

  const updateDocumento = (documento: Documento) => {
    dispatch({ type: 'UPDATE_DOCUMENTO', payload: documento });
  };

  const deleteDocumento = (id: string) => {
    dispatch({ type: 'DELETE_DOCUMENTO', payload: id });
  };

  const value = {
    state,
    dispatch,
    addDocumento,
    setDocumentos,
    updateDocumento,
    deleteDocumento
  };

  return (
    <DocumentoContext.Provider value={value}>
      {children}
    </DocumentoContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useDocumentoContext() {
  const context = useContext(DocumentoContext);
  if (context === undefined) {
    throw new Error('useDocumentoContext must be used within a DocumentoProvider');
  }
  return context;
}
