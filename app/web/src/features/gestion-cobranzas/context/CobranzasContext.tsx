/* eslint-disable react-refresh/only-export-components -- provider expone hook auxiliar en el mismo archivo */
import { createContext, useContext, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { cobranzasMock, cuentasPorCobrarMock } from '../data/mockCobranzas';
import type {
  CobranzaDocumento,
  CobranzaStatus,
  CuentaPorCobrarSummary,
  RegistrarCobranzaInput,
} from '../models/cobranzas.types';

interface CobranzasState {
  cuentas: CuentaPorCobrarSummary[];
  cobranzas: CobranzaDocumento[];
}

type CobranzasAction =
  | { type: 'REGISTER_COBRANZA'; payload: { cuentaId: string; documento: CobranzaDocumento; monto: number } }
  | { type: 'SET_DATA'; payload: CobranzasState };

const INITIAL_STATE: CobranzasState = {
  cuentas: cuentasPorCobrarMock,
  cobranzas: cobranzasMock,
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

    case 'SET_DATA':
      return action.payload;
    default:
      return state;
  }
}

interface CobranzasContextType extends CobranzasState {
  registerCobranza: (input: RegistrarCobranzaInput) => CobranzaDocumento;
}

const CobranzasContext = createContext<CobranzasContextType | undefined>(undefined);

function buildCobranzaDocument(
  cuenta: CuentaPorCobrarSummary,
  monto: number,
  medioPago: string,
  cajaDestino: string,
  payloadNotas?: string,
): CobranzaDocumento {
  const sequential = Math.floor(Math.random() * 9000) + 1000;
  const numero = `C001-${sequential.toString().padStart(6, '0')}`;
  return {
    id: `cbza-${Date.now()}`,
    numero,
    tipo: 'Cobranza',
    fechaCobranza: new Date().toISOString().split('T')[0],
    comprobanteId: cuenta.comprobanteId,
    comprobanteSerie: cuenta.comprobanteSerie,
    comprobanteNumero: cuenta.comprobanteNumero,
    clienteNombre: cuenta.clienteNombre,
    medioPago,
    cajaDestino,
    moneda: cuenta.moneda,
    monto: Number(monto.toFixed(2)),
    estado: 'cancelado',
    referencia: medioPago,
    notas: payloadNotas,
  };
}

export function CobranzasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cobranzasReducer, INITIAL_STATE);

  const registerCobranza = (input: RegistrarCobranzaInput) => {
    const monto = input.payload.lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
    const medioPago = input.payload.lines.length === 1 ? input.payload.lines[0].method : 'Mixto';
    const cajaDestino = input.payload.cajaDestino || 'Caja Principal';
    const documento = buildCobranzaDocument(input.cuenta, monto, medioPago, cajaDestino, input.payload.notes);

    dispatch({
      type: 'REGISTER_COBRANZA',
      payload: {
        cuentaId: input.cuenta.id,
        documento,
        monto,
      },
    });

    return documento;
  };

  const value = useMemo(() => ({
    cuentas: state.cuentas,
    cobranzas: state.cobranzas,
    registerCobranza,
  }), [state.cobranzas, state.cuentas]);

  return <CobranzasContext.Provider value={value}>{children}</CobranzasContext.Provider>;
}

export function useCobranzasContext() {
  const ctx = useContext(CobranzasContext);
  if (!ctx) {
    throw new Error('useCobranzasContext debe usarse dentro de CobranzasProvider');
  }
  return ctx;
}
