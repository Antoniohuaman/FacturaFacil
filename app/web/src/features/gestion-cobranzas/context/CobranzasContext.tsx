/* eslint-disable react-refresh/only-export-components -- provider expone hook auxiliar en el mismo archivo */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CobranzaDocumento,
  CobranzaInstallmentState,
  CobranzaStatus,
  CuentaPorCobrarSummary,
  RegistrarCobranzaInput,
} from '../models/cobranzas.types';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useUserSession } from '../../../contexts/UserSessionContext';
import { mapPaymentMethodToMedioPago } from '../../../shared/payments/paymentMapping';
import { lsKey } from '../../../shared/tenant';
import { assertBusinessDate, getBusinessTodayISODate, toBusinessDate } from '@/shared/time/businessTime';
import {
  computeAccountStateFromInstallments,
  normalizeCreditTermsToInstallments,
  updateInstallmentsWithAllocations,
} from '../utils/installments';
import { useSeriesCommands } from '../../configuracion-sistema/hooks/useSeriesCommands';
import { useTenant } from '../../../shared/tenant/TenantContext';

interface CobranzasState {
  cuentas: CuentaPorCobrarSummary[];
  cobranzas: CobranzaDocumento[];
}

type CobranzasAction =
  | { type: 'SET_DATA'; payload: CobranzasState }
  | { type: 'UPSERT_CUENTA'; payload: CuentaPorCobrarSummary }
  | {
      type: 'REGISTER_COBRANZA';
      payload: {
        cuentaId: string;
        documento: CobranzaDocumento;
        monto: number;
        cuentaUpdate?: Partial<CuentaPorCobrarSummary>;
      };
    };

const INITIAL_STATE: CobranzasState = {
  cuentas: [],
  cobranzas: [],
};

const STORAGE_KEYS = {
  cuentas: 'gestion_cobranzas_cuentas',
  cobranzas: 'gestion_cobranzas_documentos',
} as const;

const getStorageKey = (base: string, options?: { allowFallback?: boolean }): string | null => {
  try {
    return lsKey(base);
  } catch {
    if (options?.allowFallback) {
      return base;
    }
    return null;
  }
};

const loadStateFromStorage = (): CobranzasState => {
  if (typeof window === 'undefined') {
    return INITIAL_STATE;
  }

  try {
    const cuentasKey = getStorageKey(STORAGE_KEYS.cuentas, { allowFallback: true });
    const cobranzasKey = getStorageKey(STORAGE_KEYS.cobranzas, { allowFallback: true });
    const cuentasRaw = cuentasKey ? window.localStorage.getItem(cuentasKey) : null;
    const cobranzasRaw = cobranzasKey ? window.localStorage.getItem(cobranzasKey) : null;
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
    const cuentasKey = getStorageKey(STORAGE_KEYS.cuentas);
    const cobranzasKey = getStorageKey(STORAGE_KEYS.cobranzas);
    if (!cuentasKey || !cobranzasKey) {
      return;
    }
    window.localStorage.setItem(cuentasKey, JSON.stringify(state.cuentas));
    window.localStorage.setItem(cobranzasKey, JSON.stringify(state.cobranzas));
  } catch (persistError) {
    console.warn('[Cobranzas] No se pudo guardar el estado:', persistError);
  }
};

function computeEstadoCuenta(cuenta: CuentaPorCobrarSummary, newSaldo: number): CobranzaStatus {
  if (newSaldo <= 0) {
    return 'cancelado';
  }

  const rawDueDate = cuenta.fechaVencimiento || cuenta.creditTerms?.fechaVencimientoGlobal;
  const dueDate = rawDueDate ? toBusinessDate(rawDueDate, 'end') : null;
  const todayCutoff = assertBusinessDate(getBusinessTodayISODate(), 'end');
  if (dueDate && dueDate.getTime() < todayCutoff.getTime()) {
    return 'vencido';
  }

  if (newSaldo < cuenta.total) {
    return 'parcial';
  }

  return 'pendiente';
}

const cloneInstallments = (installments?: CobranzaInstallmentState[]) =>
  installments?.map((installment) => ({ ...installment })) ?? [];

const getInstallmentsSnapshot = (cuenta: CuentaPorCobrarSummary) => {
  if (cuenta.installments?.length) {
    return cloneInstallments(cuenta.installments);
  }
  return normalizeCreditTermsToInstallments(cuenta.creditTerms);
};

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

    case 'REGISTER_COBRANZA': {
      const updatedCuentas = state.cuentas.map((cuenta) => {
        if (cuenta.id !== action.payload.cuentaId) {
          return cuenta;
        }

        if (action.payload.cuentaUpdate) {
          return {
            ...cuenta,
            ...action.payload.cuentaUpdate,
          };
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
  registerCobranza: (input: RegistrarCobranzaInput) => Promise<CobranzaDocumento>;
  upsertCuenta: (cuenta: CuentaPorCobrarSummary) => void;
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
  const { incrementSeriesCorrelative } = useSeriesCommands();
  const { tenantId } = useTenant();

  useEffect(() => {
    setIsHydrated(false);
    const stored = loadStateFromStorage();
    if (stored.cuentas.length || stored.cobranzas.length) {
      dispatch({ type: 'SET_DATA', payload: stored });
    } else {
      dispatch({ type: 'SET_DATA', payload: INITIAL_STATE });
    }
    setIsHydrated(true);
  }, [tenantId]);

  useEffect(() => {
    if (!isHydrated) return;
    persistStateToStorage(state);
  }, [state, isHydrated, tenantId]);

  const registrarEnCaja = useCallback(
    async (documento: CobranzaDocumento, payload: RegistrarCobranzaInput['payload']) => {
      if (payload.mode !== 'contado' || payload.lines.length === 0) {
        return;
      }

      if (cajaStatus !== 'abierta') {
        throw new Error('Abre una caja para registrar el cobro.');
      }

      const usuarioId = session?.userId || 'usuario-desconocido';
      const usuarioNombre = session?.userName || 'Usuario';

      for (const line of payload.lines) {
        const monto = Number(line.amount) || 0;
        if (monto <= 0) {
          continue;
        }

        const observaciones = [
          line.bank ? `Caja: ${line.bank}` : null,
          line.reference ? `Ref: ${line.reference}` : null,
          line.operationNumber ? `Op: ${line.operationNumber}` : null,
          payload.notes,
        ]
          .filter(Boolean)
          .join(' | ') || undefined;

        try {
          await agregarMovimiento({
            tipo: 'Ingreso',
            concepto: `Cobranza ${documento.numero}`,
            medioPago: mapPaymentMethodToMedioPago(line.method),
            monto,
            referencia: line.reference || documento.numero,
            usuarioId,
            usuarioNombre,
            comprobante: documento.comprobanteId,
            observaciones,
          });
        } catch (error) {
          console.error('Error registrando movimiento en caja para cobranza:', error);
          throw new Error('No se pudo registrar el movimiento en caja. Intenta nuevamente.');
        }
      }
    },
    [agregarMovimiento, cajaStatus, session?.userId, session?.userName]
  );

  const upsertCuenta = useCallback((cuenta: CuentaPorCobrarSummary) => {
    dispatch({ type: 'UPSERT_CUENTA', payload: cuenta });
  }, []);

  const registerCobranza = useCallback(
    async (input: RegistrarCobranzaInput): Promise<CobranzaDocumento> => {
      if (!input.cuenta) {
        throw new Error('Debes proporcionar la cuenta por cobrar que se está cobrando.');
      }

      const monto = input.payload.lines.reduce((acc, line) => acc + (Number(line.amount) || 0), 0);
      const montoRedondeado = Number(monto.toFixed(2));
      if (montoRedondeado <= 0) {
        throw new Error('El monto cobrado debe ser mayor a cero.');
      }

      const requiereDocumento = input.payload.mode === 'contado';
      const collectionDocument = input.payload.collectionDocument;
      if (requiereDocumento && !collectionDocument) {
        throw new Error('Configura una serie de cobranza activa antes de registrar pagos.');
      }

      const allocations = input.payload.allocations ?? [];
      const hasAllocations = allocations.length > 0;
      const baseInstallments = hasAllocations ? getInstallmentsSnapshot(input.cuenta) : [];
      const installmentsAfterPayment = hasAllocations
        ? updateInstallmentsWithAllocations(baseInstallments, allocations)
        : baseInstallments;
      const installmentsSummary = hasAllocations && installmentsAfterPayment.length
        ? computeAccountStateFromInstallments(installmentsAfterPayment)
        : null;

      const totalInstallmentsAfterPayment = installmentsSummary?.totalInstallments
        ?? input.cuenta.totalInstallments
        ?? input.cuenta.creditTerms?.schedule?.length
        ?? 0;
      const pendingInstallmentsAfterPayment = installmentsSummary?.pendingInstallmentsCount
        ?? input.cuenta.pendingInstallmentsCount
        ?? (totalInstallmentsAfterPayment > 0 ? totalInstallmentsAfterPayment : 0);
      const paidInstallmentsAfterPayment = Math.max(0, totalInstallmentsAfterPayment - pendingInstallmentsAfterPayment);
      const documentInstallmentsInfo = totalInstallmentsAfterPayment > 0
        ? {
            total: totalInstallmentsAfterPayment,
            pending: pendingInstallmentsAfterPayment,
            paid: paidInstallmentsAfterPayment,
          }
        : undefined;

      const nuevoCobrado = installmentsSummary
        ? installmentsSummary.cobrado
        : Math.min(input.cuenta.total, input.cuenta.cobrado + montoRedondeado);
      const nuevoSaldo = installmentsSummary
        ? installmentsSummary.saldo
        : Math.max(0, input.cuenta.total - nuevoCobrado);

      const estadoPorCuotas: CobranzaStatus = installmentsSummary?.accountStatus ?? (nuevoSaldo <= 0 ? 'cancelado' : 'parcial');
      const estadoPorFecha = computeEstadoCuenta(input.cuenta, nuevoSaldo);
      const estadoCuenta = estadoPorFecha === 'vencido' ? 'vencido' : estadoPorCuotas;
      const estadoDocumento: CobranzaStatus = documentInstallmentsInfo
        ? documentInstallmentsInfo.pending === 0
          ? 'cancelado'
          : 'parcial'
        : nuevoSaldo <= 0
          ? 'cancelado'
          : 'parcial';

      const installmentApplication: CobranzaDocumento['installmentApplication'] | undefined = hasAllocations
        ? allocations.some((allocation) => {
            if (typeof allocation.remaining === 'number') {
              return allocation.remaining <= 0;
            }
            const status = allocation.status?.toLowerCase();
            return status === 'cancelado' || status === 'cancelada';
          })
          ? 'cuota_cancelada'
          : 'abono_parcial'
        : undefined;

      const numeroDocumento = collectionDocument?.fullNumber || fallbackCollectionNumber();
      const fechaCobranza = collectionDocument?.issuedAt || input.payload.fechaCobranza || getBusinessTodayISODate();

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
          input.payload.lines.length === 0
            ? 'Sin definir'
            : input.payload.lines.length === 1
              ? mapPaymentMethodToMedioPago(input.payload.lines[0].method)
              : 'Mixto',
        cajaDestino: input.payload.cajaDestino || input.payload.lines[0]?.bank || 'Caja Principal',
        moneda: input.cuenta.moneda,
        monto: montoRedondeado,
        estado: estadoDocumento,
        referencia: collectionDocument?.fullNumber,
        notas: input.payload.notes,
        collectionSeriesId: collectionDocument?.seriesId,
        installmentsInfo: documentInstallmentsInfo,
        installmentApplication,
      };

      const cuentaUpdate: Partial<CuentaPorCobrarSummary> = {
        cobrado: Number(nuevoCobrado.toFixed(2)),
        saldo: Number(nuevoSaldo.toFixed(2)),
        estado: estadoCuenta,
        vencido: estadoCuenta === 'vencido',
      };

      if (installmentsSummary) {
        cuentaUpdate.installments = installmentsAfterPayment;
        cuentaUpdate.totalInstallments = installmentsSummary.totalInstallments;
        cuentaUpdate.pendingInstallmentsCount = installmentsSummary.pendingInstallmentsCount;
        cuentaUpdate.partialInstallmentsCount = installmentsSummary.partialInstallmentsCount;
      }

      await registrarEnCaja(documento, input.payload);

      dispatch({
        type: 'REGISTER_COBRANZA',
        payload: {
          cuentaId: input.cuenta.id,
          documento,
          monto: montoRedondeado,
          cuentaUpdate,
        },
      });

      if (collectionDocument) {
        incrementSeriesCorrelative(collectionDocument.seriesId, collectionDocument.correlative);
      }

      return documento;
    },
    [incrementSeriesCorrelative, registrarEnCaja]
  );

  const value = useMemo(
    () => ({
      cuentas: state.cuentas,
      cobranzas: state.cobranzas,
      registerCobranza,
      upsertCuenta,
    }),
    [registerCobranza, state.cobranzas, state.cuentas, upsertCuenta]
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

