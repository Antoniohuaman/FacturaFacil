// gastos/contexto/ContextoGastos.tsx
//
// Contexto del módulo Gastos. Las Cuentas por Pagar y los Pagos de un gasto
// NUNCA viven en un estado propio de este contexto: se leen/escriben siempre
// contra el MISMO repositorio compartido de Compras
// (`repositorioCuentasPorPagar.ts`/`repositorioPagosCompra.ts`) — un solo
// almacén de CxP y uno de Pagos para toda la aplicación, filtrado por
// `tipoOrigen` donde corresponda. Reutiliza el mismo motor de
// aplicar/revertir pago, la misma serie "PG", el mismo `useCaja()` y el
// mismo patrón de registrar-antes-de-comprometer ya usado por
// `ContextoCompras.tsx` — nunca una segunda implementación independiente.

import { useEffect, useReducer, useCallback, type ReactNode } from 'react';
import { getTenantEmpresaId } from '@/shared/tenant';
import { ContextoGastos, type ContextoGastosValue, type RegistrarPagoGastoInput, type EstadoGastos } from './useContextoGastos';
import { useUserSession } from '@/contexts/UserSessionContext';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useCaja } from '../../control-caja/context/CajaContext';
import { siguienteNumeroPago } from '../../compras/utilidades/formatearCompras';
import {
  listarCuentasPorPagarPorOrigen,
  agregarOActualizarCxP,
} from '../../compras/repositorios/repositorioCuentasPorPagar';
import {
  cargarPagosCompra,
  listarPagosPorOrigen,
  agregarOActualizarPago,
} from '../../compras/repositorios/repositorioPagosCompra';
import {
  generarCuentaPorPagarDesdeGasto,
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagar,
} from '../../compras/servicios/servicioCuentaPorPagar';
import {
  validarMediosPagoCompra,
  tieneMedioDeCaja,
  esMedioDeCaja,
  buscarPagoPorClaveIdempotencia,
} from '../../compras/servicios/servicioPagoCompra';
import { motivoBloqueoAnulacionPago, round2 } from '../../compras/logica/reglasCompras';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';
import {
  crearGasto,
  validarGastoBasico,
  motivoBloqueoAnulacionGasto,
  type DatosNuevoGasto,
  type ErrorValidacionGasto,
} from '../servicios/servicioGasto';
import { cargarGastos, agregarOActualizarGasto } from '../repositorios/repositorioGastos';

function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ahora(): string {
  return new Date().toISOString();
}

class ErrorValidacionGastoAgregado extends Error {
  errores: ErrorValidacionGasto[];
  constructor(errores: ErrorValidacionGasto[]) {
    super(errores.map((e) => e.mensaje).join(' '));
    this.errores = errores;
  }
}

function lanzarSiHayErrores(errores: ErrorValidacionGasto[]): void {
  if (errores.length > 0) throw new ErrorValidacionGastoAgregado(errores);
}

type AccionGastos =
  | { type: 'ESTABLECER_GASTOS'; payload: Gasto[] }
  | { type: 'AGREGAR_GASTO'; payload: Gasto }
  | { type: 'ACTUALIZAR_GASTO'; payload: Gasto };

function reductorGastos(estado: EstadoGastos, accion: AccionGastos): EstadoGastos {
  switch (accion.type) {
    case 'ESTABLECER_GASTOS':
      return { ...estado, gastos: accion.payload, cargado: true };
    case 'AGREGAR_GASTO':
      return { ...estado, gastos: [accion.payload, ...estado.gastos] };
    case 'ACTUALIZAR_GASTO':
      return { ...estado, gastos: estado.gastos.map((g) => (g.id === accion.payload.id ? accion.payload : g)) };
    default:
      return estado;
  }
}

interface GastosProviderProps {
  children: ReactNode;
}

export function GastosProvider({ children }: GastosProviderProps) {
  const [state, dispatch] = useReducer(reductorGastos, { gastos: [], cargado: false });
  const { state: config } = useConfigurationContext();
  const { status: estadoCaja, agregarMovimiento, activeCajaId } = useCaja();
  const { session } = useUserSession();
  const empresaId = getTenantEmpresaId();

  useEffect(() => {
    dispatch({ type: 'ESTABLECER_GASTOS', payload: cargarGastos() });
  }, [empresaId]);

  const obtenerCuentaPorPagarDeGasto = useCallback((gasto: Gasto): CuentaPorPagar | undefined => {
    if (!gasto.cuentaPorPagarId) return undefined;
    return listarCuentasPorPagarPorOrigen('gasto').find((c) => c.id === gasto.cuentaPorPagarId);
  }, []);

  const obtenerPagosDeGasto = useCallback((gasto: Gasto): PagoCompra[] => {
    const pagos = listarPagosPorOrigen('gasto');
    return pagos.filter((p) => gasto.pagosRelacionados.includes(p.id));
  }, []);

  const registrarGasto = useCallback(
    async (datos: DatosNuevoGasto, usuarioId?: string): Promise<Gasto> => {
      lanzarSiHayErrores(validarGastoBasico(datos));

      const id = generarId('gasto');
      let gasto = crearGasto(datos, id, usuarioId);

      // Todo gasto genera su Cuenta por Pagar (contado o crédito), mismo
      // criterio que ya usa Compras: el saldo pendiente vive únicamente en la
      // CxP, nunca una segunda fuente en el propio Gasto.
      const cxpId = generarId('cxp');
      const cxp = generarCuentaPorPagarDesdeGasto(gasto, cxpId);
      agregarOActualizarCxP(cxp);

      gasto = { ...gasto, cuentaPorPagarId: cxpId };
      agregarOActualizarGasto(gasto);
      dispatch({ type: 'AGREGAR_GASTO', payload: gasto });

      return gasto;
    },
    [],
  );

  const anularGasto = useCallback(
    async (id: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const gasto = state.gastos.find((g) => g.id === id);
      if (!gasto) throw new Error(`Gasto ${id} no encontrado.`);

      const cuentasPorPagar = listarCuentasPorPagarPorOrigen('gasto');
      const pagos = listarPagosPorOrigen('gasto');
      const cxp = cuentasPorPagar.find((c) => c.id === gasto.cuentaPorPagarId);

      const motivoBloqueo = motivoBloqueoAnulacionGasto(gasto, cxp, pagos);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      const ts = ahora();
      if (cxp) {
        const cxpAnulada = anularCuentaPorPagar(cxp, motivo, ts);
        agregarOActualizarCxP(cxpAnulada);
      }

      const gastoAnulado: Gasto = {
        ...gasto,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [...gasto.historial, { fecha: ts, usuario: anuladoPor, accion: 'Gasto anulado', detalle: motivo }],
        fechaActualizacion: ts,
      };
      agregarOActualizarGasto(gastoAnulado);
      dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoAnulado });
    },
    [state.gastos],
  );

  const registrarPagoGasto = useCallback(
    async (input: RegistrarPagoGastoInput, usuarioId?: string): Promise<PagoCompra> => {
      const gasto = state.gastos.find((g) => g.id === input.gastoId);
      if (!gasto) throw new Error(`Gasto ${input.gastoId} no encontrado.`);
      if (!gasto.cuentaPorPagarId) throw new Error('Este gasto no tiene una cuenta por pagar asociada.');

      // Idempotencia del COMANDO completo (Pago + aplicación a CxP + Caja como
      // una sola operación) — comprobado contra los pagos YA PERSISTIDOS de
      // Gastos antes de tocar cualquier otra cosa. Un reintento/doble clic con
      // la MISMA clave devuelve el pago ya creado, sin reaplicar el importe a
      // la CxP ni volver a intentar el movimiento de Caja (esa protección
      // aislada de Caja sigue existiendo como segunda barrera, no la única).
      const pagoExistente = buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), input.claveIdempotencia);
      if (pagoExistente) return pagoExistente;

      const cuentasPorPagar = listarCuentasPorPagarPorOrigen('gasto');
      const cxp = cuentasPorPagar.find((c) => c.id === gasto.cuentaPorPagarId);
      if (!cxp) throw new Error('No se encontró la cuenta por pagar de este gasto.');

      const mediosDisponibles = getConfiguredPaymentMeans();
      if (!input.mediosPago.length) {
        throw new Error('Se requiere al menos un medio de pago.');
      }
      lanzarSiHayErrores(
        validarMediosPagoCompra(input.mediosPago, mediosDisponibles).map((e) => ({ campo: e.campo, mensaje: e.mensaje })),
      );
      const sumaMedios = round2(input.mediosPago.reduce((acc, m) => acc + m.monto, 0));
      if (sumaMedios !== round2(input.montoAplicado)) {
        throw new Error(`La suma de medios de pago (${sumaMedios.toFixed(2)}) no coincide con el importe a aplicar (${input.montoAplicado.toFixed(2)}).`);
      }
      if (input.montoAplicado <= 0 || round2(input.montoAplicado) > round2(cxp.saldoPendiente)) {
        throw new Error(`El importe a pagar no puede superar el saldo pendiente (${cxp.saldoPendiente.toFixed(2)}).`);
      }

      if (tieneMedioDeCaja(input.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error('Abre una caja para registrar el pago en efectivo.');
      }

      const seriePago = config.series.find((s) => s.documentType?.code === 'PG' && s.status === 'ACTIVE' && s.isActive)?.series;
      if (!seriePago) {
        throw new Error('No hay una serie de pago (PG) configurada. Ve a Configuración → Series y crea una serie activa de tipo "Pago de Compra".');
      }

      const id = generarId('pago');
      const ts = ahora();
      const numeroPago = siguienteNumeroPago(cargarPagosCompra(), seriePago);

      // El movimiento de caja se intenta antes de comprometer el pago —
      // mismo criterio que `registrarPagoCompra`: si falla, no queda un pago
      // "fantasma" sin su contraparte en caja.
      for (const medio of input.mediosPago) {
        if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
        await agregarMovimiento({
          tipo: 'Egreso',
          concepto: input.concepto || `Pago de gasto: ${gasto.concepto}`,
          medioPago: 'Efectivo',
          paymentMeanCode: medio.medioPagoCodigo,
          paymentMeanLabel: medio.medioPagoNombre,
          monto: medio.monto,
          referencia: numeroPago,
          usuarioId: session?.userId ?? '',
          usuarioNombre: session?.userName ?? '',
          claveIdempotencia: input.claveIdempotencia,
        });
      }

      const mediosConCaja = input.mediosPago.map((medio) =>
        esMedioDeCaja(medio.medioPagoCodigo) && activeCajaId ? { ...medio, cajaId: activeCajaId } : medio,
      );

      const pago: PagoCompra = {
        id,
        numeroPago,
        fechaPago: ts.slice(0, 10),
        proveedorId: gasto.proveedorId ?? '',
        proveedorNombre: gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor',
        moneda: cxp.moneda,
        tipoCambio: cxp.tipoCambio,
        montoTotalPagado: round2(input.montoAplicado),
        mediosPago: mediosConCaja,
        tipoOrigen: 'gasto',
        claveIdempotencia: input.claveIdempotencia,
        aplicaciones: [
          {
            cuentaPorPagarId: cxp.id,
            tipoOrigen: 'gasto',
            documentoOrigenId: gasto.id,
            comprobanteCompraId: '',
            importeAplicado: round2(input.montoAplicado),
          },
        ],
        cuentasPorPagarAplicadas: [cxp.id],
        comprobantesCompraAplicados: [],
        cajaId: tieneMedioDeCaja(input.mediosPago) ? (activeCajaId ?? undefined) : undefined,
        concepto: input.concepto || `Pago de gasto: ${gasto.concepto}`,
        estadoDocumento: 'registrado',
        historial: [
          { fecha: ts, usuario: usuarioId, accion: 'Pago registrado', detalle: `${numeroPago} — Gasto: ${gasto.concepto}` },
        ],
        creadoPor: usuarioId,
        fechaCreacion: ts,
      };

      agregarOActualizarPago(pago);

      const cxpActualizada = aplicarPagoACuentaPorPagar(cxp, input.montoAplicado, id, ts.slice(0, 10), usuarioId);
      agregarOActualizarCxP(cxpActualizada);

      const gastoActualizado: Gasto = {
        ...gasto,
        pagosRelacionados: [...gasto.pagosRelacionados, id],
        historial: [
          ...gasto.historial,
          { fecha: ts, usuario: usuarioId, accion: 'Pago aplicado', detalle: `${numeroPago} — ${input.montoAplicado.toFixed(2)}` },
        ],
        fechaActualizacion: ts,
      };
      agregarOActualizarGasto(gastoActualizado);
      dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoActualizado });

      return pago;
    },
    [state.gastos, estadoCaja, activeCajaId, agregarMovimiento, session, config.series],
  );

  const anularPagoGasto = useCallback(
    async (pagoId: string, motivo: string, anuladoPor?: string): Promise<void> => {
      const pagos = listarPagosPorOrigen('gasto');
      const pago = pagos.find((p) => p.id === pagoId);
      if (!pago) throw new Error(`Pago ${pagoId} no encontrado.`);

      const motivoBloqueo = motivoBloqueoAnulacionPago(pago);
      if (motivoBloqueo) throw new Error(motivoBloqueo);

      if (tieneMedioDeCaja(pago.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error('No se puede anular el pago porque la caja relacionada está cerrada y no se puede registrar la compensación.');
      }

      const gasto = state.gastos.find((g) => g.pagosRelacionados.includes(pagoId));
      const ts = ahora();

      for (const medio of pago.mediosPago) {
        if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
        await agregarMovimiento({
          tipo: 'Ingreso',
          concepto: `Reversión por anulación de pago ${pago.numeroPago}`,
          medioPago: 'Efectivo',
          paymentMeanCode: medio.medioPagoCodigo,
          paymentMeanLabel: medio.medioPagoNombre,
          monto: medio.monto,
          referencia: pago.numeroPago,
          usuarioId: session?.userId ?? '',
          usuarioNombre: session?.userName ?? '',
          claveIdempotencia: `reversion-${pagoId}`,
        });
      }

      const pagoAnulado: PagoCompra = {
        ...pago,
        estadoDocumento: 'anulado',
        motivoAnulacion: motivo,
        fechaAnulacion: ts,
        anuladoPor,
        historial: [...pago.historial, { fecha: ts, usuario: anuladoPor, accion: 'Pago anulado', detalle: motivo }],
      };
      agregarOActualizarPago(pagoAnulado);

      const cuentasPorPagar = listarCuentasPorPagarPorOrigen('gasto');
      const cxp = cuentasPorPagar.find((c) => c.id === pago.cuentasPorPagarAplicadas[0]);
      if (cxp) {
        const cxpRevertida = revertirPagoDeCuentaPorPagar(cxp, pago.montoTotalPagado, pago.id, ts, anuladoPor);
        agregarOActualizarCxP(cxpRevertida);
      }

      if (gasto) {
        const gastoActualizado: Gasto = {
          ...gasto,
          historial: [
            ...gasto.historial,
            { fecha: ts, usuario: anuladoPor, accion: 'Pago anulado y revertido', detalle: `${pago.numeroPago}` },
          ],
          fechaActualizacion: ts,
        };
        agregarOActualizarGasto(gastoActualizado);
        dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoActualizado });
      }
    },
    [state.gastos, estadoCaja, agregarMovimiento, session],
  );

  const value: ContextoGastosValue = {
    state,
    registrarGasto,
    anularGasto,
    registrarPagoGasto,
    anularPagoGasto,
    obtenerCuentaPorPagarDeGasto,
    obtenerPagosDeGasto,
  };

  return <ContextoGastos.Provider value={value}>{children}</ContextoGastos.Provider>;
}
