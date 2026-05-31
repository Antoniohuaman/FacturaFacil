/* eslint-disable react-refresh/only-export-components -- archivo mezcla provider y hook de contexto; split diferido */
import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { DocumentoComercial } from '../models/documentoComercial.types';
import {
  cargarDocumentosDesdeStorage,
  guardarDocumentosEnStorage,
  migrarDocumentosLegacy,
} from '../utils/documentoComercial.storage';

interface DocumentosComercialesState {
  documentos: DocumentoComercial[];
}

type DocumentosComercialesAccion =
  | { type: 'AGREGAR_DOCUMENTO'; payload: DocumentoComercial }
  | { type: 'ESTABLECER_DOCUMENTOS'; payload: DocumentoComercial[] }
  | { type: 'ACTUALIZAR_DOCUMENTO'; payload: DocumentoComercial }
  | { type: 'ELIMINAR_DOCUMENTO'; payload: string };

function reducer(
  state: DocumentosComercialesState,
  accion: DocumentosComercialesAccion,
): DocumentosComercialesState {
  switch (accion.type) {
    case 'AGREGAR_DOCUMENTO':
      return { documentos: [accion.payload, ...state.documentos] };
    case 'ESTABLECER_DOCUMENTOS':
      return { documentos: accion.payload };
    case 'ACTUALIZAR_DOCUMENTO':
      return {
        documentos: state.documentos.map((d) =>
          d.id === accion.payload.id ? accion.payload : d,
        ),
      };
    case 'ELIMINAR_DOCUMENTO':
      return {
        documentos: state.documentos.filter((d) => d.id !== accion.payload),
      };
    default:
      return state;
  }
}

interface DocumentosComercialesContextValue {
  state: DocumentosComercialesState;
  agregarDocumento: (documento: DocumentoComercial) => void;
  actualizarDocumento: (documento: DocumentoComercial) => void;
  eliminarDocumento: (id: string) => void;
  recargarDesdeStorage: () => void;
}

const DocumentosComercialesContext = createContext<DocumentosComercialesContextValue | null>(null);

export function DocumentosComercialesProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { documentos: [] });

  useEffect(() => {
    migrarDocumentosLegacy();
    const documentos = cargarDocumentosDesdeStorage();
    dispatch({ type: 'ESTABLECER_DOCUMENTOS', payload: documentos });
  }, []);

  useEffect(() => {
    guardarDocumentosEnStorage(state.documentos);
  }, [state.documentos]);

  const agregarDocumento = useCallback((documento: DocumentoComercial) => {
    dispatch({ type: 'AGREGAR_DOCUMENTO', payload: documento });
  }, []);

  const actualizarDocumento = useCallback((documento: DocumentoComercial) => {
    dispatch({ type: 'ACTUALIZAR_DOCUMENTO', payload: documento });
  }, []);

  const eliminarDocumento = useCallback((id: string) => {
    dispatch({ type: 'ELIMINAR_DOCUMENTO', payload: id });
  }, []);

  const recargarDesdeStorage = useCallback(() => {
    const documentos = cargarDocumentosDesdeStorage();
    dispatch({ type: 'ESTABLECER_DOCUMENTOS', payload: documentos });
  }, []);

  return (
    <DocumentosComercialesContext.Provider
      value={{ state, agregarDocumento, actualizarDocumento, eliminarDocumento, recargarDesdeStorage }}
    >
      {children}
    </DocumentosComercialesContext.Provider>
  );
}

export function useDocumentosComercialesContext(): DocumentosComercialesContextValue {
  const ctx = useContext(DocumentosComercialesContext);
  if (!ctx) {
    throw new Error(
      'useDocumentosComercialesContext debe usarse dentro de DocumentosComercialesProvider',
    );
  }
  return ctx;
}

export function useDocumentosComercialesContextOpcional(): DocumentosComercialesContextValue | null {
  return useContext(DocumentosComercialesContext);
}
