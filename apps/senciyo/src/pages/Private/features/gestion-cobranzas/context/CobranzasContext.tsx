/* eslint-disable react-refresh/only-export-components -- provider expone hook auxiliar en el mismo archivo */
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  CobranzaDocumento,
  CobranzaInstallmentState,
  CobranzaStatus,
  CuentaPorCobrarSummary,
  EditarCobranzaInfoInput,
  RegistrarCobranzaInput,
} from '../models/cobranzas.types';
import { useCaja } from '../../control-caja/context/CajaContext';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { mapPaymentMethodToMedioPago } from '../../../../../shared/payments/paymentMapping';
import { lsKey } from '../../../../../shared/tenant';
import { assertBusinessDate, getBusinessTodayISODate, toBusinessDate } from '@/shared/time/businessTime';
import {
  computeAccountStateFromInstallments,
  normalizeCreditTermsToInstallments,
  updateInstallmentsWithAllocations,
} from '../utils/installments';
import { useSeriesCommands } from '../../configuracion-sistema/hooks/useComandosSeries';
import { useTenant } from '../../../../../shared/tenant/TenantContext';
import { resolveCobranzaPaymentMeans } from '../utils/paymentMeans';

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
        cuentaData?: CuentaPorCobrarSummary;
        documento: CobranzaDocumento;
        monto: number;
        cuentaUpdate?: Partial<CuentaPorCobrarSummary>;
      };
    }
  | {
      type: 'EDIT_COBRANZA';
      payload: {
        cobranzaId: string;
        changes: Partial<CobranzaDocumento>;
      };
    }
  | {
      type: 'ANULAR_COBRANZA';
      payload: {
        cobranzaId: string;
        cuentaId: string;
        motivoAnulacion: string;
        fechaAnulacion: string;
        usuarioAnulacion: string;
        cuentaUpdate: Partial<CuentaPorCobrarSummary>;
        cuentaData?: CuentaPorCobrarSummary;
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
      const cuentaExists = state.cuentas.some((c) => c.id === action.payload.cuentaId);

      let updatedCuentas: CuentaPorCobrarSummary[];
      if (cuentaExists) {
        updatedCuentas = state.cuentas.map((cuenta) => {
          if (cuenta.id !== action.payload.cuentaId) {
            return cuenta;
          }
          if (action.payload.cuentaUpdate) {
            return { ...cuenta, ...action.payload.cuentaUpdate };
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
      } else if (action.payload.cuentaData) {
        const merged = action.payload.cuentaUpdate
          ? { ...action.payload.cuentaData, ...action.payload.cuentaUpdate }
          : action.payload.cuentaData;
        updatedCuentas = [...state.cuentas, merged];
      } else {
        updatedCuentas = state.cuentas;
      }

      return {
        cuentas: updatedCuentas,
        cobranzas: [action.payload.documento, ...state.cobranzas],
      };
    }

    case 'EDIT_COBRANZA': {
      return {
        ...state,
        cobranzas: state.cobranzas.map((c) =>
          c.id === action.payload.cobranzaId ? { ...c, ...action.payload.changes } : c,
        ),
      };
    }

    case 'ANULAR_COBRANZA': {
      const cuentaExists = state.cuentas.some((c) => c.id === action.payload.cuentaId);
      let updatedCuentas: CuentaPorCobrarSummary[];
      if (cuentaExists) {
        updatedCuentas = state.cuentas.map((cuenta) =>
          cuenta.id === action.payload.cuentaId
            ? { ...cuenta, ...action.payload.cuentaUpdate }
            : cuenta,
        );
      } else if (action.payload.cuentaData) {
        updatedCuentas = [
          ...state.cuentas,
          { ...action.payload.cuentaData, ...action.payload.cuentaUpdate },
        ];
      } else {
        updatedCuentas = state.cuentas;
      }
      return {
        ...state,
        cobranzas: state.cobranzas.map((c) =>
          c.id === action.payload.cobranzaId
            ? {
                ...c,
                estado: 'anulado' as CobranzaStatus,
                motivoAnulacion: action.payload.motivoAnulacion,
                fechaAnulacion: action.payload.fechaAnulacion,
                usuarioAnulacion: action.payload.usuarioAnulacion,
              }
            : c,
        ),
        cuentas: updatedCuentas,
      };
    }

    default:
      return state;
  }
}

interface CobranzasContextType extends CobranzasState {
  registerCobranza: (input: RegistrarCobranzaInput) => Promise<CobranzaDocumento>;
  upsertCuenta: (cuenta: CuentaPorCobrarSummary) => void;
  editarCobranza: (cobranzaId: string, input: EditarCobranzaInfoInput) => Promise<void>;
  anularCobranza: (cobranzaId: string, motivo: string) => Promise<void>;
}

const CobranzasContext = createContext<CobranzasContextType | undefined>(undefined);

const fallbackCollectionNumber = () => {
  const now = new Date();
  return `C${now.getFullYear()}-${String(now.getTime()).slice(-6)}`;
};

export function CobranzasProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cobranzasReducer, INITIAL_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const { status: cajaStatus, agregarMovimiento, activeCajaId, activeCajaMediosPago } = useCaja();
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

      // Validar que la caja destino del payload coincida con la caja abierta (cuando se especifica ID).
      if (payload.cajaDestinoId && payload.cajaDestinoId !== activeCajaId) {
        throw new Error('La caja destino seleccionada no coincide con la caja abierta.');
      }

      const usuarioId = session?.userId || 'usuario-desconocido';
      const usuarioNombre = session?.userName || 'Usuario';

      // Primera pasada: validar todas las líneas y resolver medios de pago SIN registrar movimientos.
      const movimientosARegistrar = payload.lines.reduce<{
        lineId: string;
        monto: number;
        medioPago: ReturnType<typeof mapPaymentMethodToMedioPago>;
        medioPagoNombre: string;
        referencia: string | undefined;
        observaciones?: string;
      }[]>((acc, line) => {
        const monto = Number(line.amount) || 0;
        if (monto <= 0) {
          return acc;
        }

        const medioPagoNombre = line.methodLabel ?? line.method;

        const observaciones = [
          line.bank ? `Caja: ${line.bank}` : null,
          line.reference ? `Ref: ${line.reference}` : null,
          line.operationNumber ? `Op: ${line.operationNumber}` : null,
          payload.notes,
        ]
          .filter(Boolean)
          .join(' | ') || undefined;

        const medioPago = mapPaymentMethodToMedioPago(line.method, medioPagoNombre);

        // Validar que el medio de pago esté permitido por la caja activa
        if (Array.isArray(activeCajaMediosPago) && activeCajaMediosPago.length > 0 && !activeCajaMediosPago.includes(medioPago)) {
          throw new Error(`El medio de pago "${medioPago}" no está permitido en la caja seleccionada.`);
        }

        acc.push({
          lineId: line.id,
          monto,
          medioPago,
          medioPagoNombre,
          referencia: line.reference || documento.numero,
          observaciones,
        });
        return acc;
      }, []);

      // Segunda pasada: ya todo validado, registrar movimientos en caja.
      for (const mov of movimientosARegistrar) {
        try {
          await agregarMovimiento({
            tipo: 'Ingreso',
            concepto: `Cobranza ${documento.numero}`,
            medioPago: mov.medioPago,
            paymentMeanCode: payload.lines.find((line) => line.id === mov.lineId)?.method,
            paymentMeanLabel: mov.medioPagoNombre,
            monto: mov.monto,
            referencia: mov.referencia,
            usuarioId,
            usuarioNombre,
            comprobante: documento.comprobanteId,
            observaciones: mov.observaciones,
          });
        } catch (error) {
          console.error('Error registrando movimiento en caja para cobranza:', error);
          throw new Error('No se pudo registrar el movimiento en caja. Intenta nuevamente.');
        }
      }
    },
    [activeCajaId, activeCajaMediosPago, agregarMovimiento, cajaStatus, session?.userId, session?.userName]
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

      const paymentLinesSnapshot = input.payload.lines.map((line) => ({
        id: line.id,
        method: line.method,
        methodLabel: line.methodLabel,
        amount: Number(Number(line.amount ?? 0).toFixed(2)),
        operationNumber: line.operationNumber,
      }));

      const paymentMeansSummary = resolveCobranzaPaymentMeans({
        paymentLines: paymentLinesSnapshot,
        medioPago: undefined,
      });

      const documento: CobranzaDocumento = {
        id: `cbza-${Date.now()}`,
        numero: numeroDocumento,
        tipo: 'Cobranza',
        fechaCobranza,
        comprobanteId: input.cuenta.comprobanteId,
        comprobanteSerie: input.cuenta.comprobanteSerie,
        comprobanteNumero: input.cuenta.comprobanteNumero,
        clienteNombre: input.cuenta.clienteNombre,
        medioPago: paymentMeansSummary.summaryLabel,
        cajaDestino: input.payload.cajaDestino || input.payload.lines[0]?.bank,
        cajaDestinoId: input.payload.cajaDestinoId,
        moneda: input.cuenta.moneda,
        monto: montoRedondeado,
        estado: estadoDocumento,
        referencia: collectionDocument?.fullNumber,
        notas: input.payload.notes,
        collectionSeriesId: collectionDocument?.seriesId,
        installmentsInfo: documentInstallmentsInfo,
        installmentApplication,
        paymentLines: paymentLinesSnapshot,
        appliedAllocations: allocations.length > 0 ? allocations : undefined,
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
          cuentaData: input.cuenta,
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

  const editarCobranza = useCallback(
    async (cobranzaId: string, input: EditarCobranzaInfoInput): Promise<void> => {
      const EDIT_TOLERANCE = 0.01;
      const cobranza = state.cobranzas.find((c) => c.id === cobranzaId);
      if (!cobranza) throw new Error('Cobranza no encontrada.');
      if (cobranza.estado === 'anulado') throw new Error('No se puede editar una cobranza anulada.');

      if (input.paymentLines?.length) {
        const newTotal = Number(
          input.paymentLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0).toFixed(2),
        );
        if (Math.abs(newTotal - cobranza.monto) > EDIT_TOLERANCE) {
          throw new Error(
            `La suma de los medios de pago (${newTotal.toFixed(2)}) debe ser igual al importe cobrado (${cobranza.monto.toFixed(2)}).`,
          );
        }
      }

      const usuarioId = session?.userId || 'usuario-desconocido';
      const usuarioNombre = session?.userName || 'Usuario';

      if (input.paymentLines && cajaStatus === 'abierta') {
        const oldLines = cobranza.paymentLines ?? [];
        const newLines = input.paymentLines;
        const linesChanged =
          oldLines.length !== newLines.length ||
          oldLines.some((ol) => {
            const nl = newLines.find((l) => l.id === ol.id);
            return !nl || nl.method !== ol.method || Math.abs(nl.amount - ol.amount) > EDIT_TOLERANCE;
          });

        if (linesChanged) {
          for (const line of oldLines) {
            if (line.amount > EDIT_TOLERANCE) {
              try {
                await agregarMovimiento({
                  tipo: 'Egreso',
                  concepto: `Reverso por edición de cobranza ${cobranza.numero}`,
                  medioPago: mapPaymentMethodToMedioPago(line.method, line.methodLabel),
                  paymentMeanCode: line.method,
                  paymentMeanLabel: line.methodLabel,
                  monto: line.amount,
                  referencia: cobranza.numero,
                  usuarioId,
                  usuarioNombre,
                  comprobante: cobranza.comprobanteId,
                });
              } catch (e) {
                console.warn('[Cobranzas] No se pudo registrar reverso en caja por edición:', e);
              }
            }
          }
          for (const line of newLines) {
            if (line.amount > EDIT_TOLERANCE) {
              try {
                await agregarMovimiento({
                  tipo: 'Ingreso',
                  concepto: `Ingreso corregido por edición de cobranza ${cobranza.numero}`,
                  medioPago: mapPaymentMethodToMedioPago(line.method, line.methodLabel),
                  paymentMeanCode: line.method,
                  paymentMeanLabel: line.methodLabel,
                  monto: line.amount,
                  referencia: cobranza.numero,
                  usuarioId,
                  usuarioNombre,
                  comprobante: cobranza.comprobanteId,
                });
              } catch (e) {
                console.warn('[Cobranzas] No se pudo registrar ingreso corregido en caja:', e);
              }
            }
          }
        }
      }

      const newMedioPago = input.paymentLines
        ? resolveCobranzaPaymentMeans({ paymentLines: input.paymentLines, medioPago: undefined }).summaryLabel
        : cobranza.medioPago;

      const changes: Partial<CobranzaDocumento> = {
        ...(input.fechaCobranza !== undefined && { fechaCobranza: input.fechaCobranza }),
        ...(input.moneda !== undefined && { moneda: input.moneda }),
        ...(input.paymentLines !== undefined && { paymentLines: input.paymentLines, medioPago: newMedioPago }),
        ...(input.notas !== undefined && { notas: input.notas }),
        ...(input.attachments !== undefined && { attachments: input.attachments }),
        ...(input.cajaDestino !== undefined && { cajaDestino: input.cajaDestino }),
        ...(input.cajaDestinoId !== undefined && { cajaDestinoId: input.cajaDestinoId }),
        updatedAt: getBusinessTodayISODate(),
        updatedBy: input.updatedBy || usuarioNombre,
      };

      dispatch({ type: 'EDIT_COBRANZA', payload: { cobranzaId, changes } });
    },
    [agregarMovimiento, cajaStatus, session, state.cobranzas],
  );

  const anularCobranza = useCallback(
    async (cobranzaId: string, motivo: string): Promise<void> => {
      const trimmedMotivo = motivo.trim();
      if (trimmedMotivo.length < 10) throw new Error('El motivo debe tener al menos 10 caracteres.');

      const cobranza = state.cobranzas.find((c) => c.id === cobranzaId);
      if (!cobranza) throw new Error('Cobranza no encontrada.');
      if (cobranza.estado === 'anulado') throw new Error('Esta cobranza ya fue anulada.');

      const cuenta = state.cuentas.find((c) => c.comprobanteId === cobranza.comprobanteId);
      // Si no hay cuenta en state (pago contado inmediato nunca persistido), construimos una sintética.
      const cuentaSintetica: CuentaPorCobrarSummary | undefined = cuenta
        ? undefined
        : {
            id: cobranza.comprobanteId,
            comprobanteId: cobranza.comprobanteId,
            comprobanteSerie: cobranza.comprobanteSerie,
            comprobanteNumero: cobranza.comprobanteNumero,
            tipoComprobante: '',
            clienteNombre: cobranza.clienteNombre,
            clienteDocumento: '',
            fechaEmision: cobranza.fechaCobranza,
            formaPago: 'contado',
            moneda: cobranza.moneda,
            total: cobranza.monto,
            cobrado: cobranza.monto,
            saldo: 0,
            estado: 'cancelado' as CobranzaStatus,
            vencido: false,
          };
      const cuentaEfectiva = cuenta ?? cuentaSintetica!;

      const usuarioId = session?.userId || 'usuario-desconocido';
      const usuarioNombre = session?.userName || 'Usuario';

      if (cajaStatus === 'abierta') {
        const paymentLines = cobranza.paymentLines ?? [];
        for (const line of paymentLines) {
          if (line.amount > 0.01) {
            try {
              await agregarMovimiento({
                tipo: 'Egreso',
                concepto: `Ajuste por anulación de cobranza ${cobranza.numero}`,
                medioPago: mapPaymentMethodToMedioPago(line.method, line.methodLabel),
                paymentMeanCode: line.method,
                paymentMeanLabel: line.methodLabel,
                monto: line.amount,
                referencia: cobranza.numero,
                usuarioId,
                usuarioNombre,
                comprobante: cobranza.comprobanteId,
              });
            } catch (e) {
              console.warn('[Cobranzas] No se pudo registrar reverso en caja por anulación:', e);
            }
          }
        }
      }

      const otrasCobranzasActivas = state.cobranzas.filter(
        (c) => c.comprobanteId === cobranza.comprobanteId && c.id !== cobranzaId && c.estado !== 'anulado',
      );

      const nuevoCobrado = Number(
        otrasCobranzasActivas.reduce((sum, c) => sum + c.monto, 0).toFixed(2),
      );
      const nuevoSaldo = Number(Math.max(0, cuentaEfectiva.total - nuevoCobrado).toFixed(2));
      const nuevoEstado = computeEstadoCuenta(cuentaEfectiva, nuevoSaldo);

      let cuentaUpdate: Partial<CuentaPorCobrarSummary> = {
        cobrado: nuevoCobrado,
        saldo: nuevoSaldo,
        estado: nuevoEstado,
        vencido: nuevoEstado === 'vencido',
      };

      if (cuentaEfectiva.creditTerms?.schedule?.length) {
        const baseInstallments = normalizeCreditTermsToInstallments(cuentaEfectiva.creditTerms);
        const hasAllocationData = otrasCobranzasActivas.some((c) => c.appliedAllocations?.length);

        let currentInstallments: CobranzaInstallmentState[];
        if (hasAllocationData) {
          currentInstallments = baseInstallments;
          for (const oc of [...otrasCobranzasActivas].sort((a, b) =>
            a.fechaCobranza.localeCompare(b.fechaCobranza),
          )) {
            if (oc.appliedAllocations?.length) {
              currentInstallments = updateInstallmentsWithAllocations(currentInstallments, oc.appliedAllocations);
            }
          }
        } else {
          currentInstallments = baseInstallments.map((installment) => {
            const proportion = cuentaEfectiva.total > 0 ? installment.amountOriginal / cuentaEfectiva.total : 0;
            const paid = Number(Math.min(installment.amountOriginal, nuevoCobrado * proportion).toFixed(2));
            const remaining = Number(Math.max(0, installment.amountOriginal - paid).toFixed(2));
            const INST_TOLERANCE = 0.01;
            const instStatus: CobranzaInstallmentState['status'] =
              remaining <= INST_TOLERANCE ? 'CANCELADA' : paid > INST_TOLERANCE ? 'PARCIAL' : 'PENDIENTE';
            return { ...installment, amountPaid: paid, remaining, status: instStatus };
          });
        }

        const stats = computeAccountStateFromInstallments(currentInstallments);
        const estadoFinal = computeEstadoCuenta(cuentaEfectiva, stats.saldo);
        cuentaUpdate = {
          ...cuentaUpdate,
          installments: currentInstallments,
          totalInstallments: stats.totalInstallments,
          pendingInstallmentsCount: stats.pendingInstallmentsCount,
          partialInstallmentsCount: stats.partialInstallmentsCount,
          cobrado: stats.cobrado,
          saldo: stats.saldo,
          estado: estadoFinal,
          vencido: estadoFinal === 'vencido',
        };
      }

      dispatch({
        type: 'ANULAR_COBRANZA',
        payload: {
          cobranzaId,
          cuentaId: cuentaEfectiva.id,
          motivoAnulacion: trimmedMotivo,
          fechaAnulacion: getBusinessTodayISODate(),
          usuarioAnulacion: usuarioNombre,
          cuentaUpdate,
          cuentaData: cuentaSintetica,
        },
      });
    },
    [agregarMovimiento, cajaStatus, session, state.cobranzas, state.cuentas],
  );

  const value = useMemo(
    () => ({
      cuentas: state.cuentas,
      cobranzas: state.cobranzas,
      registerCobranza,
      upsertCuenta,
      editarCobranza,
      anularCobranza,
    }),
    [registerCobranza, state.cobranzas, state.cuentas, upsertCuenta, editarCobranza, anularCobranza]
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

