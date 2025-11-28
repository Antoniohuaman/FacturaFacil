/* eslint-disable react-refresh/only-export-components -- provider expone hook auxiliar en el mismo archivo */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CobranzaDocumento,
  CobranzaStatus,
  CuentaPorCobrarSummary,
  RegistrarCobranzaInput,
} from '../models/cobranzas.types';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { mapPaymentMethodToMedioPago } from '../../../shared/payments/paymentMapping';
import { lsKey } from '../../../shared/tenant';

interface CobranzasState {
  cuentas: CuentaPorCobrarSummary[];
  cobranzas: CobranzaDocumento[];
}

type CobranzasAction =
  | { type: 'SET_DATA'; payload: CobranzasState }
  | { type: 'UPSERT_CUENTA'; payload: CuentaPorCobrarSummary }
  | { type: 'ADD_COBRANZA'; payload: CobranzaDocumento }
  | { type: 'REGISTER_COBRANZA'; payload: { cuentaId: string; documento: CobranzaDocumento; monto: number } };

const INITIAL_STATE: CobranzasState = {
  cuentas: [],
  cobranzas: [],
};

const STORAGE_KEYS = {
  cuentas: 'gestion_cobranzas_cuentas',
  cobranzas: 'gestion_cobranzas_documentos',
} as const;

const getStorageKey = (base: string): string => {
  try {
    return lsKey(base);
  } catch {
    return base;
  }
};

const loadStateFromStorage = (): CobranzasState => {
  if (typeof window === 'undefined') {
    return INITIAL_STATE;
  }

  try {
    const cuentasRaw = window.localStorage.getItem(getStorageKey(STORAGE_KEYS.cuentas));
    const cobranzasRaw = window.localStorage.getItem(getStorageKey(STORAGE_KEYS.cobranzas));
    const cuentas = cuentasRaw ? (JSON.parse(cuentasRaw) as CuentaPorCobrarSummary[]) : [];
    const cobranzas = cobranzasRaw ? (JSON.parse(cobranzasRaw) as CobranzaDocumento[]) : [];
    return { cuentas, cobranzas };
  } catch (loadError) {
    console.warn('[Cobranzas] No se pudo cargar el estado almacenado:', loadError);
    return INITIAL_STATE;
  }
};

const persistStateToStorage = (state: CobranzasState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(STORAGE_KEYS.cuentas), JSON.stringify(state.cuentas));
    window.localStorage.setItem(getStorageKey(STORAGE_KEYS.cobranzas), JSON.stringify(state.cobranzas));
  } catch (persistError) {
    console.warn('[Cobranzas] No se pudo guardar el estado:', persistError);
  }
};

function computeEstadoCuenta(cuenta: CuentaPorCobrarSummary, newSaldo: number): CobranzaStatus {
  if (newSaldo <= 0) {
    return 'cancelado';
  }

  const dueDate = cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento) : null;
  const today = new Date();
  if (dueDate && dueDate < today) {
    return 'vencido';
  }

  if (newSaldo < cuenta.total) {
    return 'parcial';
  }

  return 'pendiente';
}

function cobranzasReducer(state: CobranzasState, action: CobranzasAction): CobranzasState {
  switch (action.type) {
    case 'SET_DATA':
      return action.payload;

    case 'UPSERT_CUENTA': {
      const exists = state.cuentas.some((cuenta) => cuenta.id === action.payload.id);
      const cuentasActualizadas = exists
        ? state.cuentas.map((cuenta) => (cuenta.id === action.payload.id ? action.payload : cuenta))
        : [action.payload, ...state.cuentas];
      return { ...state, cuentas: cuentasActualizadas };
    }

    case 'ADD_COBRANZA':
      return { ...state, cobranzas: [action.payload, ...state.cobranzas] };

    case 'REGISTER_COBRANZA': {
      const updatedCuentas = state.cuentas.map((cuenta) => {
        if (cuenta.id !== action.payload.cuentaId) {
          return cuenta;
        }

        const nuevoCobrado = Math.min(cuenta.total, cuenta.cobrado + action.payload.monto);
        const nuevoSaldo = Math.max(0, cuenta.total - nuevoCobrado);
        const nextEstado = computeEstadoCuenta(cuenta, nuevoSaldo);

        return {
          ...cuenta,
          cobrado: Number(nuevoCobrado.toFixed(2)),
          saldo: Number(nuevoSaldo.toFixed(2)),
          estado: nextEstado,
          vencido: nextEstado === 'vencido',
        };
      });

      return {
        cuentas: updatedCuentas,
        cobranzas: [action.payload.documento, ...state.cobranzas],
      };
    }

    default:
      return state;
  }
}

interface CobranzasContextType extends CobranzasState {
  registerCobranza: (input: RegistrarCobranzaInput) => CobranzaDocumento;
  upsertCuenta: (cuenta: CuentaPorCobrarSummary) => void;
  addCobranzaDocument: (documento: CobranzaDocumento) => void;
}

const CobranzasContext = createContext<CobranzasContextType | undefined>(undefined);

const fallbackCollectionNumber = () => {
  const now = new Date();
  return `C${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;
};

export function CobranzasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cobranzasReducer, INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const { status: cajaStatus, agregarMovimiento } = useCaja();
  const { session } = useUserSession();

  useEffect(() => {
    const stored = loadStateFromStorage();
    if (stored.cuentas.length || stored.cobranzas.length) {
      dispatch({ type: 'SET_DATA', payload: stored });
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    persistStateToStorage(state);
  }, [state, isHydrated]);

  const registrarEnCaja = useCallback(
    (documento: CobranzaDocumento, payload: RegistrarCobranzaInput['payload']) => {
      if (cajaStatus !== 'abierta' || payload.mode !== 'contado' || payload.lines.length === 0) {
        return;
      }

      const usuarioId = session?.userId || 'usuario-desconocido';
      const usuarioNombre = session?.userName || 'Usuario';

      payload.lines.forEach((line) => {
        const monto = Number(line.amount) || 0;
        if (monto <= 0) {
          return;
        }

        const observaciones = [
          line.bank ? `Caja: ${line.bank}` : null,
          line.reference ? `Ref: ${line.reference}` : null,
          line.operationNumber ? `Op: ${line.operationNumber}` : null,
          payload.notes,
        ]
          .filter(Boolean)
          .join(' | ') || undefined;

        void agregarMovimiento({
          tipo: 'Ingreso',
          concepto: `Cobranza ${documento.numero}`,
          medioPago: mapPaymentMethodToMedioPago(line.method),
          monto,
          referencia: line.reference || documento.numero,
          usuarioId,
          usuarioNombre,
          comprobante: documento.comprobanteId,
          observaciones,
        }).catch((error) => {
          console.error('Error registrando movimiento en caja para cobranza:', error);
        });
      });
    },
    [agregarMovimiento, cajaStatus, session?.userId, session?.userName]
  );

  const upsertCuenta = useCallback((cuenta: CuentaPorCobrarSummary) => {
    dispatch({ type: 'UPSERT_CUENTA', payload: cuenta });
  }, []);

  const addCobranzaDocument = useCallback((documento: CobranzaDocumento) => {
    dispatch({ type: 'ADD_COBRANZA', payload: documento });
  }, []);

  const registerCobranza = useCallback(
    (input: RegistrarCobranzaInput): CobranzaDocumento => {
      const monto = input.payload.lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
      const montoRedondeado = Number(monto.toFixed(2));
      const nuevoCobrado = Math.min(input.cuenta.total, input.cuenta.cobrado + montoRedondeado);
      const nuevoSaldo = Math.max(0, input.cuenta.total - nuevoCobrado);
      const estadoCobranza: CobranzaStatus = nuevoSaldo <= 0 ? 'cancelado' : 'parcial';

      const collectionDocument = input.payload.collectionDocument;
      const numeroDocumento = collectionDocument?.fullNumber || fallbackCollectionNumber();
      const fechaCobranza = collectionDocument?.issuedAt || input.payload.fechaCobranza || new Date().toISOString().split('T')[0];

      const documento: CobranzaDocumento = {
        id: `cbza-${Date.now()}`,
        numero: numeroDocumento,
        tipo: 'Cobranza',
        fechaCobranza,
        comprobanteId: input.cuenta.comprobanteId,
        comprobanteSerie: input.cuenta.comprobanteSerie,
        comprobanteNumero: input.cuenta.comprobanteNumero,
        clienteNombre: input.cuenta.clienteNombre,
        medioPago:
          input.payload.lines.length === 1
            ? mapPaymentMethodToMedioPago(input.payload.lines[0].method)
            : 'Mixto',
        cajaDestino: input.payload.cajaDestino || input.payload.lines[0]?.bank || 'Caja Principal',
        moneda: input.cuenta.moneda,
        monto: montoRedondeado,
        estado: estadoCobranza,
        referencia: collectionDocument?.fullNumber,
        notas: input.payload.notes,
        collectionSeriesId: collectionDocument?.seriesId,
      };

      dispatch({
        type: 'REGISTER_COBRANZA',
        payload: {
          cuentaId: input.cuenta.id,
          documento,
          monto: montoRedondeado,
        },
      });

      registrarEnCaja(documento, input.payload);

      return documento;
    },
    [registrarEnCaja]
  );

  const value = useMemo(
    () => ({
      cuentas: state.cuentas,
      cobranzas: state.cobranzas,
      registerCobranza,
      upsertCuenta,
      addCobranzaDocument,
    }),
    [addCobranzaDocument, registerCobranza, state.cobranzas, state.cuentas, upsertCuenta]
  );

  return <CobranzasContext.Provider value={value}>{children}</CobranzasContext.Provider>;
}

export function useCobranzasContext() {
  const ctx = useContext(CobranzasContext);
  if (!ctx) {
    throw new Error('useCobranzasContext debe usarse dentro de CobranzasProvider');
  }
  return ctx;
}
