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
import { ContextoGastos, type ContextoGastosValue, type RegistrarGastoConPagoInmediatoInput, type EstadoGastos } from './useContextoGastos';
import { useUserSession } from '@/contexts/UserSessionContext';
import { getConfiguredPaymentMeans } from '@/shared/payments/paymentMeans';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useSeriesCommands } from '../../configuracion-sistema/hooks/useComandosSeries';
import { useCaja } from '../../control-caja/context/CajaContext';
import { siguienteNumeroPago } from '../../compras/utilidades/formatearCompras';
import { getNextExpenseDocument } from '@/shared/series/expenseSeries';
import { formatBusinessDateTimeIso } from '@/shared/time/businessTime';
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
  aplicarPagoACuentaPorPagar,
  revertirPagoDeCuentaPorPagar,
  anularCuentaPorPagar,
} from '../../compras/servicios/servicioCuentaPorPagar';
import {
  validarMediosPagoCompra,
  validarPagoCompraBasico,
  validarAplicacionesPagoCompra,
  tieneMedioDeCaja,
  esMedioDeCaja,
  buscarPagoPorClaveIdempotencia,
} from '../../compras/servicios/servicioPagoCompra';
import { motivoBloqueoAnulacionPago, validarTipoCambioRequerido, round2 } from '../../compras/logica/reglasCompras';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, AplicacionPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';
import {
  crearGasto,
  validarGastoBasico,
  validarMinimoBorradorGasto,
  motivoBloqueoAnulacionGasto,
  nivelEdicionGasto,
  puedeDescartarBorradorGasto,
  MOTIVO_DESCARTE_BORRADOR_GASTO,
  resolverSerieGastoSeleccionada,
  referenciaTecnicaBorradorGasto,
  convertirBorradorEnRegistrado,
  buscarGastoPorClaveIdempotencia,
  type DatosNuevoGasto,
  type ErrorValidacionGasto,
} from '../servicios/servicioGasto';
import { cargarGastos, agregarOActualizarGasto } from '../repositorios/repositorioGastos';
import { generarCuentaPorPagarDesdeGasto } from '../servicios/servicioCuentaPorPagarGasto';

function generarId(prefijo: string): string {
  return `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Hora de negocio real (America/Lima) — nunca UTC crudo, que puede mostrar
// el día siguiente entre las 19:00 y 23:59 hora Lima (corrección técnica
// final §5/§17). Único punto de "ahora" reutilizado por cada comando de
// este contexto (anular, descartar, registrar pago...).
function ahora(): string {
  return formatBusinessDateTimeIso();
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

interface MovimientoCajaIntentadoGasto {
  claveMovimiento: string;
  monto: number;
  medioPagoCodigo: string;
  medioPagoNombre: string;
}

export function GastosProvider({ children }: GastosProviderProps) {
  const [state, dispatch] = useReducer(reductorGastos, { gastos: [], cargado: false });
  const { state: config } = useConfigurationContext();
  const { incrementSeriesCorrelative } = useSeriesCommands();
  const { status: estadoCaja, agregarMovimiento, activeCajaId } = useCaja();
  const { session } = useUserSession();
  const empresaId = getTenantEmpresaId();

  /**
   * Revierte movimientos de Caja ya aplicados cuando el resto de la
   * operación (Gasto/CxP/Pago/serie) falla después (corrección técnica
   * final §13) — un Ingreso compensatorio por cada Egreso intentado, con su
   * PROPIA clave derivada (`reversion-...`, mismo criterio que
   * `anularPagoGasto`) para que la reversión en sí sea idempotente y nunca
   * se aplique dos veces.
   */
  const compensarMovimientosCajaGasto = useCallback(
    async (movimientos: readonly MovimientoCajaIntentadoGasto[], concepto: string) => {
      for (const m of movimientos) {
        await agregarMovimiento({
          tipo: 'Ingreso',
          concepto: `Reversión automática — no se pudo completar: ${concepto}`,
          medioPago: 'Efectivo',
          paymentMeanCode: m.medioPagoCodigo,
          paymentMeanLabel: m.medioPagoNombre,
          monto: m.monto,
          referencia: m.claveMovimiento,
          usuarioId: session?.userId ?? '',
          usuarioNombre: session?.userName ?? '',
          claveIdempotencia: `reversion-${m.claveMovimiento}`,
        });
      }
    },
    [agregarMovimiento, session],
  );

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


  /**
   * Guardar borrador (§4 de la corrección): sin serie/correlativo oficial,
   * sin CxP, sin Pago, sin efecto en Caja ni Rentabilidad. `gastoExistenteId`
   * presente = actualiza un borrador ya guardado (mismo id/referencia
   * técnica); ausente = crea uno nuevo.
   */
  const guardarBorradorGasto = useCallback(
    async (datos: DatosNuevoGasto, usuarioId?: string, gastoExistenteId?: string): Promise<Gasto> => {
      lanzarSiHayErrores(validarMinimoBorradorGasto(datos));

      if (gastoExistenteId) {
        const existente = state.gastos.find((g) => g.id === gastoExistenteId);
        if (!existente) throw new Error(`Gasto ${gastoExistenteId} no encontrado.`);
        if (existente.estadoDocumento !== 'borrador') throw new Error('Este gasto ya no es un borrador.');
        const ts = ahora();
        const reconstruido = crearGasto(datos, existente.id, existente.referenciaInterna, existente.creadoPor, 'borrador');
        const actualizado: Gasto = {
          ...reconstruido,
          historial: [...existente.historial, { fecha: ts, usuario: usuarioId, accion: 'Borrador actualizado', detalle: datos.concepto }],
          creadoPor: existente.creadoPor,
          fechaCreacion: existente.fechaCreacion,
          fechaActualizacion: ts,
        };
        agregarOActualizarGasto(actualizado);
        dispatch({ type: 'ACTUALIZAR_GASTO', payload: actualizado });
        return actualizado;
      }

      const id = generarId('gasto');
      const gasto = crearGasto(datos, id, referenciaTecnicaBorradorGasto(id), usuarioId, 'borrador');
      agregarOActualizarGasto(gasto);
      dispatch({ type: 'AGREGAR_GASTO', payload: gasto });
      return gasto;
    },
    [state.gastos],
  );

  const descartarBorradorGasto = useCallback(
    async (id: string, usuarioId?: string): Promise<void> => {
      const gasto = state.gastos.find((g) => g.id === id);
      if (!gasto) throw new Error(`Gasto ${id} no encontrado.`);
      if (!puedeDescartarBorradorGasto(gasto)) {
        throw new Error('Solo un borrador puede descartarse.');
      }
      const ts = ahora();
      // Reutiliza el estado terminal 'anulado' (§3: solo existen tres estados
      // documentales) — nunca elimina físicamente el registro, preserva
      // auditoría. La acción se llama "Descartar" (nunca "Anular") porque el
      // borrador nunca fue registrado oficialmente.
      const gastoDescartado: Gasto = {
        ...gasto,
        estadoDocumento: 'anulado',
        motivoAnulacion: MOTIVO_DESCARTE_BORRADOR_GASTO,
        tipoCierre: 'descarte_borrador',
        fechaAnulacion: ts,
        anuladoPor: usuarioId,
        historial: [...gasto.historial, { fecha: ts, usuario: usuarioId, accion: 'Borrador descartado' }],
        fechaActualizacion: ts,
      };
      agregarOActualizarGasto(gastoDescartado);
      dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoDescartado });
    },
    [state.gastos],
  );

  const registrarGasto = useCallback(
    async (datos: DatosNuevoGasto, usuarioId?: string, gastoExistenteId?: string): Promise<Gasto> => {
      lanzarSiHayErrores(validarGastoBasico(datos));

      // Idempotencia del COMANDO "Registrar gasto"/conversión de borrador
      // (§13 de la corrección final, fortalecida en la corrección técnica
      // final §15) — un reintento (doble clic, reenvío) con la MISMA clave
      // nunca crea un segundo gasto, una segunda CxP ni consume el
      // correlativo dos veces. Se comprueba contra `cargarGastos()` (la
      // fuente REALMENTE persistida), nunca contra `state.gastos` — el
      // estado de React puede estar desactualizado (p. ej. si otra pestaña
      // ya registró el mismo gasto, o si el dispatch del primer intento aún
      // no re-renderizó cuando llega el reintento). Se comprueba ANTES de
      // resolver la serie/correlativo, mismo criterio que
      // `registrarGastoConPagoInmediato`.
      const gastoExistentePorClave = buscarGastoPorClaveIdempotencia(cargarGastos(), datos.claveIdempotencia);
      if (gastoExistentePorClave) return gastoExistentePorClave;

      // Serie elegida en el formulario, revalidada aquí contra el catálogo
      // central (activa, del tipo documental "Gasto") — bloquea únicamente
      // "Registrar"/"Registrar y pagar" (nunca "Guardar borrador") cuando no
      // es válida. El correlativo se reserva/consume ÚNICAMENTE desde
      // `Series.correlativeNumber` (`getNextExpenseDocument` +
      // `incrementSeriesCorrelative`, mismo mecanismo canónico que ya usa
      // Cobranzas) — nunca escaneando gastos existentes ni generando una
      // referencia local de respaldo.
      const serieGasto = resolverSerieGastoSeleccionada(config.series, datos.serieId);
      if (!serieGasto) {
        throw new Error('Selecciona una serie de Gasto activa antes de registrar. Ve a Configuración → Series si no existe ninguna.');
      }
      const { correlative, fullNumber: referenciaInterna } = getNextExpenseDocument(serieGasto);

      // Convierte un borrador ya persistido — conserva id/fechaCreacion/historial,
      // asigna recién ahora la referencia oficial (§5/§16 de la corrección).
      // Se busca contra la fuente REALMENTE persistida (§15 de la corrección
      // técnica final), no contra `state.gastos`, por la misma razón que la
      // comprobación de idempotencia de arriba.
      if (gastoExistenteId) {
        const borrador = cargarGastos().find((g) => g.id === gastoExistenteId);
        if (!borrador) throw new Error(`Gasto ${gastoExistenteId} no encontrado.`);
        if (borrador.estadoDocumento !== 'borrador') throw new Error('Este gasto ya no es un borrador.');

        const actualizadoConDatos = crearGasto(datos, borrador.id, borrador.referenciaInterna, borrador.creadoPor, 'borrador');
        let gasto = convertirBorradorEnRegistrado({ ...actualizadoConDatos, historial: borrador.historial, fechaCreacion: borrador.fechaCreacion }, referenciaInterna, usuarioId);

        const cxpId = generarId('cxp');
        const cxp = generarCuentaPorPagarDesdeGasto(gasto, cxpId);
        agregarOActualizarCxP(cxp);
        gasto = { ...gasto, cuentaPorPagarId: cxpId };
        agregarOActualizarGasto(gasto);
        incrementSeriesCorrelative(serieGasto.id, correlative);
        dispatch({ type: 'ACTUALIZAR_GASTO', payload: gasto });
        return gasto;
      }

      const id = generarId('gasto');
      let gasto = crearGasto(datos, id, referenciaInterna, usuarioId, 'registrado');

      // Todo gasto registrado genera su Cuenta por Pagar (forma de pago
      // contado o crédito), mismo criterio que ya usa Compras: el saldo
      // pendiente vive únicamente en la CxP, nunca una segunda fuente en el
      // propio Gasto.
      const cxpId = generarId('cxp');
      const cxp = generarCuentaPorPagarDesdeGasto(gasto, cxpId);
      agregarOActualizarCxP(cxp);

      gasto = { ...gasto, cuentaPorPagarId: cxpId };
      agregarOActualizarGasto(gasto);
      incrementSeriesCorrelative(serieGasto.id, correlative);
      dispatch({ type: 'AGREGAR_GASTO', payload: gasto });

      return gasto;
    },
    [config.series, incrementSeriesCorrelative],
  );

  /**
   * Registrar y pagar: registrar gasto + CxP + pago como una sola operación
   * (§6 de la corrección) — disponible para cualquier forma de pago, nunca
   * limitada a "Contado" (ya no se impone Contado = pago obligatorio
   * inmediato). Reutiliza las MISMAS reglas y helpers que
   * `registrarGasto`/`registrarPagoGastoCentral` (crearGasto,
   * generarCuentaPorPagarDesdeGasto, validarMediosPagoCompra,
   * aplicarPagoACuentaPorPagar), nunca una segunda implementación de esas
   * reglas. Valida TODO antes de escribir nada: si algo falla (medios
   * inválidos, caja cerrada, sin serie de Gasto o de Pago), no se persiste
   * ni el gasto ni la CxP — nunca queda una CxP huérfana ni un registro a
   * medio guardar. `gastoExistenteId` presente = convierte un borrador ya
   * persistido (§16), ausente = crea un gasto nuevo.
   */
  const registrarGastoConPagoInmediato = useCallback(
    async (input: RegistrarGastoConPagoInmediatoInput, usuarioId?: string): Promise<Gasto> => {
      lanzarSiHayErrores(validarGastoBasico(input.datos));

      // Idempotencia del COMANDO completo (gasto + CxP + pago + Caja) — un
      // reintento con la MISMA clave nunca crea un segundo gasto ni un
      // segundo pago, mismo criterio que `registrarPagoGastoCentral`.
      const pagoExistente = buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), input.claveIdempotencia);
      if (pagoExistente) {
        const gastoExistente = state.gastos.find((g) => g.pagosRelacionados.includes(pagoExistente.id));
        if (gastoExistente) return gastoExistente;
      }

      const mediosDisponibles = getConfiguredPaymentMeans();
      if (!input.mediosPago.length) {
        throw new Error('"Registrar y pagar" exige al menos un medio de pago.');
      }
      lanzarSiHayErrores(
        validarMediosPagoCompra(input.mediosPago, mediosDisponibles).map((e) => ({ campo: e.campo, mensaje: e.mensaje })),
      );
      const sumaMedios = round2(input.mediosPago.reduce((acc, m) => acc + m.monto, 0));
      const totalGasto = round2(input.datos.total);
      if (sumaMedios !== totalGasto) {
        throw new Error(`La suma de medios de pago (${sumaMedios.toFixed(2)}) debe ser igual al total del gasto (${totalGasto.toFixed(2)}) — "Registrar y pagar" paga el gasto por completo.`);
      }
      if (tieneMedioDeCaja(input.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error('Abre una caja para registrar el pago en efectivo.');
      }
      const serieGasto = resolverSerieGastoSeleccionada(config.series, input.datos.serieId);
      if (!serieGasto) {
        throw new Error('Selecciona una serie de Gasto activa antes de registrar. Ve a Configuración → Series si no existe ninguna.');
      }
      const seriePago = config.series.find((s) => s.documentType?.code === 'PG' && s.status === 'ACTIVE' && s.isActive)?.series;
      if (!seriePago) {
        throw new Error('No hay una serie de pago (PG) configurada. Ve a Configuración → Series y crea una serie activa de tipo "Pago a proveedor".');
      }
      const { correlative, fullNumber: referenciaInterna } = getNextExpenseDocument(serieGasto);

      // Solo AHORA que todo fue validado se construyen/convierten gasto, CxP
      // y pago — ninguno se persiste hasta el final de la función.
      let gasto: Gasto;
      if (input.gastoExistenteId) {
        const borrador = state.gastos.find((g) => g.id === input.gastoExistenteId);
        if (!borrador) throw new Error(`Gasto ${input.gastoExistenteId} no encontrado.`);
        if (borrador.estadoDocumento !== 'borrador') throw new Error('Este gasto ya no es un borrador.');
        const actualizadoConDatos = crearGasto(input.datos, borrador.id, borrador.referenciaInterna, borrador.creadoPor, 'borrador');
        gasto = convertirBorradorEnRegistrado({ ...actualizadoConDatos, historial: borrador.historial, fechaCreacion: borrador.fechaCreacion }, referenciaInterna, usuarioId);
      } else {
        const gastoId = generarId('gasto');
        gasto = crearGasto(input.datos, gastoId, referenciaInterna, usuarioId, 'registrado');
      }

      const cxpId = generarId('cxp');
      const cxp = generarCuentaPorPagarDesdeGasto(gasto, cxpId);

      const pagoId = generarId('pago');
      const ts = ahora();
      const numeroPago = siguienteNumeroPago(cargarPagosCompra(), seriePago);

      // A partir de aquí se comprometen efectos reales (Caja, luego
      // Gasto/CxP/Pago/serie) — un fallo en CUALQUIER paso posterior revierte
      // los movimientos de Caja ya aplicados antes de propagar el error
      // (corrección técnica final §13): nunca un movimiento de Caja huérfano
      // sin su Pago correspondiente. Clave DETERMINISTA por línea
      // (`{claveOperacion}:{medioPagoId}`, §14) — nunca la misma clave para
      // dos medios de caja de la misma operación (que provocaría que
      // `esMovimientoDuplicadoPorIdempotencia` descarte silenciosamente el
      // segundo movimiento como si fuera un reintento del primero). Un
      // reintento real de la MISMA operación reenvía los MISMOS `medio.id`
      // (estado ya construido, nunca regenerado), así que produce
      // exactamente las mismas claves.
      const movimientosCajaIntentados: MovimientoCajaIntentadoGasto[] = [];
      try {
        for (const medio of input.mediosPago) {
          if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
          const claveMovimiento = `${input.claveIdempotencia}:${medio.id}`;
          await agregarMovimiento({
            tipo: 'Egreso',
            concepto: `Pago de gasto: ${gasto.concepto}`,
            medioPago: 'Efectivo',
            paymentMeanCode: medio.medioPagoCodigo,
            paymentMeanLabel: medio.medioPagoNombre,
            monto: medio.monto,
            referencia: numeroPago,
            usuarioId: session?.userId ?? '',
            usuarioNombre: session?.userName ?? '',
            claveIdempotencia: claveMovimiento,
          });
          movimientosCajaIntentados.push({ claveMovimiento, monto: medio.monto, medioPagoCodigo: medio.medioPagoCodigo, medioPagoNombre: medio.medioPagoNombre });
        }

        const mediosConCaja = input.mediosPago.map((medio) =>
          esMedioDeCaja(medio.medioPagoCodigo) && activeCajaId ? { ...medio, cajaId: activeCajaId } : medio,
        );

        const pago: PagoCompra = {
          id: pagoId,
          numeroPago,
          fechaPago: ts.slice(0, 10),
          proveedorId: gasto.proveedorId ?? '',
          proveedorNombre: gasto.proveedorNombre ?? gasto.beneficiario ?? 'Sin proveedor',
          moneda: cxp.moneda,
          tipoCambio: cxp.tipoCambio,
          montoTotalPagado: totalGasto,
          mediosPago: mediosConCaja,
          tipoOrigen: 'gasto',
          claveIdempotencia: input.claveIdempotencia,
          aplicaciones: [
            { cuentaPorPagarId: cxp.id, tipoOrigen: 'gasto', documentoOrigenId: gasto.id, comprobanteCompraId: '', importeAplicado: totalGasto },
          ],
          cuentasPorPagarAplicadas: [cxp.id],
          comprobantesCompraAplicados: [],
          cajaId: tieneMedioDeCaja(input.mediosPago) ? (activeCajaId ?? undefined) : undefined,
          concepto: `Pago de gasto: ${gasto.concepto}`,
          estadoDocumento: 'registrado',
          historial: [
            { fecha: ts, usuario: usuarioId, accion: 'Pago registrado', detalle: `${numeroPago} — Gasto: ${gasto.concepto}` },
          ],
          creadoPor: usuarioId,
          fechaCreacion: ts,
        };

        const cxpPagada = aplicarPagoACuentaPorPagar(cxp, totalGasto, pagoId, ts.slice(0, 10), usuarioId);

        const gastoFinal: Gasto = {
          ...gasto,
          cuentaPorPagarId: cxpId,
          pagosRelacionados: [pagoId],
          historial: [
            ...gasto.historial,
            { fecha: ts, usuario: usuarioId, accion: 'Pago registrado', detalle: `${numeroPago} — ${totalGasto.toFixed(2)}` },
          ],
          fechaActualizacion: ts,
        };

        agregarOActualizarPago(pago);
        agregarOActualizarCxP(cxpPagada);
        agregarOActualizarGasto(gastoFinal);
        incrementSeriesCorrelative(serieGasto.id, correlative);
        dispatch({ type: input.gastoExistenteId ? 'ACTUALIZAR_GASTO' : 'AGREGAR_GASTO', payload: gastoFinal });

        return gastoFinal;
      } catch (error) {
        await compensarMovimientosCajaGasto(movimientosCajaIntentados, `Pago de gasto: ${gasto.concepto}`);
        throw error;
      }
    },
    [state.gastos, estadoCaja, activeCajaId, agregarMovimiento, compensarMovimientosCajaGasto, session, config.series, incrementSeriesCorrelative],
  );

  const editarGasto = useCallback(
    async (id: string, datos: DatosNuevoGasto, usuarioId?: string): Promise<Gasto> => {
      const gastoActual = state.gastos.find((g) => g.id === id);
      if (!gastoActual) throw new Error(`Gasto ${id} no encontrado.`);
      const nivel = nivelEdicionGasto(gastoActual, obtenerCuentaPorPagarDeGasto(gastoActual), obtenerPagosDeGasto(gastoActual));
      if (nivel === 'bloqueada') {
        throw new Error('Este gasto ya no puede editarse: está anulado.');
      }

      const ts = ahora();

      // Con pagos aplicados (§12 de la corrección): edición LIMITADA — solo
      // observaciones/adjuntos, nunca total/moneda/proveedor/forma de
      // pago/cronograma/tratamiento tributario/fecha del gasto (desincronizarían
      // la CxP/Pago/Caja ya comprometidos). El resto de `datos` se ignora
      // deliberadamente, nunca se recalcula en este nivel.
      if (nivel === 'limitada') {
        const gastoActualizado: Gasto = {
          ...gastoActual,
          observaciones: datos.observaciones,
          adjuntos: datos.adjuntos ?? gastoActual.adjuntos,
          historial: [
            ...gastoActual.historial,
            { fecha: ts, usuario: usuarioId, accion: 'Gasto editado (edición limitada)', detalle: 'Observaciones/adjuntos' },
          ],
          fechaActualizacion: ts,
        };
        agregarOActualizarGasto(gastoActualizado);
        dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoActualizado });
        return gastoActualizado;
      }

      lanzarSiHayErrores(validarGastoBasico(datos));

      // Edición completa (borrador, o registrado sin pagos aplicados).
      // Reconstruye los campos editables desde `crearGasto` (misma fórmula de
      // construcción que al registrar, nunca una segunda), preservando
      // identidad/auditoría/relaciones que la edición nunca debe tocar y el
      // estadoDocumento ACTUAL (un borrador editado sigue siendo borrador —
      // la conversión a registrado es una acción explícita distinta).
      const reconstruido = crearGasto(datos, gastoActual.id, gastoActual.referenciaInterna, gastoActual.creadoPor, gastoActual.estadoDocumento);
      const gastoActualizado: Gasto = {
        ...reconstruido,
        pagosRelacionados: gastoActual.pagosRelacionados,
        cuentaPorPagarId: gastoActual.cuentaPorPagarId,
        gastoOrigenDuplicadoId: gastoActual.gastoOrigenDuplicadoId,
        historial: [
          ...gastoActual.historial,
          { fecha: ts, usuario: usuarioId, accion: 'Gasto editado', detalle: gastoActual.concepto },
        ],
        creadoPor: gastoActual.creadoPor,
        fechaCreacion: gastoActual.fechaCreacion,
        fechaActualizacion: ts,
      };
      agregarOActualizarGasto(gastoActualizado);

      // Resincroniza la CxP (aún sin pagos, garantizado por el nivel de edición
      // 'completa') con los importes/condición de pago editados — mismo
      // criterio que `resincronizarCuentaPorPagar` en Compras para un CC
      // editado antes de cualquier pago. Un borrador nunca tiene CxP todavía.
      if (gastoActualizado.cuentaPorPagarId) {
        const cxpActual = listarCuentasPorPagarPorOrigen('gasto').find((c) => c.id === gastoActualizado.cuentaPorPagarId);
        if (cxpActual) {
          const cxpResincronizada = generarCuentaPorPagarDesdeGasto(gastoActualizado, cxpActual.id);
          agregarOActualizarCxP(cxpResincronizada);
        }
      }

      dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoActualizado });
      return gastoActualizado;
    },
    [state.gastos, obtenerCuentaPorPagarDeGasto, obtenerPagosDeGasto],
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
        tipoCierre: 'anulacion',
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

  /**
   * Registrar pago desde el FORMULARIO CENTRAL generalizado (§11 de la
   * corrección) — MISMA firma que `ContextoCompras.tsx#registrarPagoCompra`,
   * para que `useFormularioPagoCompra` (compartido, sin cambios propios de
   * Gasto) pueda invocar indistintamente uno u otro según el origen
   * inyectado. Un gasto siempre tiene una única CxP (`datos.aplicaciones`
   * trae un solo elemento), a diferencia del pago múltiple de Compras.
   * Reutiliza exactamente las mismas reglas/funciones que la contraparte de
   * Compras (`aplicarPagoACuentaPorPagar`, `validarMediosPagoCompra`,
   * `validarPagoCompraBasico`, `validarAplicacionesPagoCompra`,
   * `validarTipoCambioRequerido`) — nunca un segundo motor de CxP/Pago.
   * A diferencia de `registrarPagoCompra`, SÍ valida idempotencia por
   * `claveIdempotencia` (mismo criterio que `registrarGastoConPagoInmediato`)
   * — un reintento nunca duplica el pago ni reaplica el importe.
   */
  const registrarPagoGastoCentral = useCallback(
    async (
      datos: Omit<
        PagoCompra,
        | 'id'
        | 'numeroPago'
        | 'estadoDocumento'
        | 'historial'
        | 'fechaCreacion'
        | 'montoTotalPagado'
        | 'cuentasPorPagarAplicadas'
        | 'comprobantesCompraAplicados'
      > & { aplicaciones: AplicacionPagoCompra[] },
      usuarioId?: string,
      seriePago?: string,
    ): Promise<PagoCompra> => {
      const pagoExistente = buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), datos.claveIdempotencia);
      if (pagoExistente) return pagoExistente;

      const aplicacion = datos.aplicaciones[0];
      if (!aplicacion) throw new Error('No hay ninguna aplicación de pago seleccionada.');
      const gasto = state.gastos.find((g) => g.id === aplicacion.documentoOrigenId);
      if (!gasto) throw new Error(`Gasto ${aplicacion.documentoOrigenId} no encontrado.`);

      const mediosDisponibles = getConfiguredPaymentMeans();
      const monedaBase = config.currencies.find((c) => c.isBaseCurrency)?.code ?? datos.moneda;
      const montoTotalPagado = round2(datos.aplicaciones.reduce((acc, a) => acc + a.importeAplicado, 0));

      lanzarSiHayErrores(validarPagoCompraBasico({ ...datos, montoTotalPagado }, 'gasto').map((e) => ({ campo: e.campo, mensaje: e.mensaje })));
      lanzarSiHayErrores(validarMediosPagoCompra(datos.mediosPago, mediosDisponibles).map((e) => ({ campo: e.campo, mensaje: e.mensaje })));
      lanzarSiHayErrores(validarTipoCambioRequerido(datos.moneda, monedaBase, datos.tipoCambio).map((e) => ({ campo: e.campo, mensaje: e.mensaje })));
      lanzarSiHayErrores(
        validarAplicacionesPagoCompra(datos.aplicaciones, listarCuentasPorPagarPorOrigen('gasto')).map((e) => ({ campo: e.campo, mensaje: e.mensaje })),
      );

      if (tieneMedioDeCaja(datos.mediosPago) && estadoCaja !== 'abierta') {
        throw new Error('Abre una caja para registrar el pago en efectivo.');
      }
      if (!seriePago) {
        throw new Error('No hay una serie de pago (PG) configurada. Ve a Configuración → Series y crea una serie activa de tipo "Pago a proveedor".');
      }

      const cxp = listarCuentasPorPagarPorOrigen('gasto').find((c) => c.id === aplicacion.cuentaPorPagarId);
      if (!cxp) throw new Error(`Cuenta por pagar ${aplicacion.cuentaPorPagarId} no encontrada.`);

      const id = generarId('pago');
      const ts = ahora();
      const numeroPago = siguienteNumeroPago(cargarPagosCompra(), seriePago);

      // Clave determinista por línea + compensación ante fallo posterior —
      // mismo criterio que `registrarGastoConPagoInmediato` (§13/§14 de la
      // corrección técnica final).
      const movimientosCajaIntentados: MovimientoCajaIntentadoGasto[] = [];
      try {
        for (const medio of datos.mediosPago) {
          if (medio.monto <= 0 || !esMedioDeCaja(medio.medioPagoCodigo)) continue;
          const claveMovimiento = `${datos.claveIdempotencia}:${medio.id}`;
          await agregarMovimiento({
            tipo: 'Egreso',
            concepto: datos.concepto || `Pago de gasto: ${gasto.concepto}`,
            medioPago: 'Efectivo',
            paymentMeanCode: medio.medioPagoCodigo,
            paymentMeanLabel: medio.medioPagoNombre,
            monto: medio.monto,
            referencia: numeroPago,
            usuarioId: session?.userId ?? '',
            usuarioNombre: session?.userName ?? '',
            claveIdempotencia: claveMovimiento,
          });
          movimientosCajaIntentados.push({ claveMovimiento, monto: medio.monto, medioPagoCodigo: medio.medioPagoCodigo, medioPagoNombre: medio.medioPagoNombre });
        }

        const mediosConCaja = datos.mediosPago.map((medio) =>
          esMedioDeCaja(medio.medioPagoCodigo) && activeCajaId ? { ...medio, cajaId: activeCajaId } : medio,
        );

        const pago: PagoCompra = {
          ...datos,
          mediosPago: mediosConCaja,
          cajaId: tieneMedioDeCaja(datos.mediosPago) ? (activeCajaId ?? undefined) : undefined,
          id,
          numeroPago,
          montoTotalPagado,
          cuentasPorPagarAplicadas: [aplicacion.cuentaPorPagarId],
          // Nunca un array con un id vacío (corrección técnica final §9) — un
          // pago de origen Gasto no aplica ningún ComprobanteCompra real.
          comprobantesCompraAplicados: [],
          tipoOrigen: 'gasto',
          estadoDocumento: 'registrado',
          historial: [
            { fecha: ts, usuario: usuarioId, accion: 'Pago registrado', detalle: `${numeroPago} — Gasto: ${gasto.concepto}` },
          ],
          creadoPor: usuarioId,
          fechaCreacion: ts,
        };

        const cxpActualizada = aplicarPagoACuentaPorPagar(cxp, aplicacion.importeAplicado, id, ts.slice(0, 10), usuarioId, aplicacion.asignacionesCuotas);

        const gastoActualizado: Gasto = {
          ...gasto,
          pagosRelacionados: [...gasto.pagosRelacionados, id],
          historial: [
            ...gasto.historial,
            { fecha: ts, usuario: usuarioId, accion: 'Pago aplicado', detalle: `${numeroPago} — ${aplicacion.importeAplicado.toFixed(2)}` },
          ],
          fechaActualizacion: ts,
        };

        agregarOActualizarPago(pago);
        agregarOActualizarCxP(cxpActualizada);
        agregarOActualizarGasto(gastoActualizado);
        dispatch({ type: 'ACTUALIZAR_GASTO', payload: gastoActualizado });

        return pago;
      } catch (error) {
        await compensarMovimientosCajaGasto(movimientosCajaIntentados, datos.concepto || `Pago de gasto: ${gasto.concepto}`);
        throw error;
      }
    },
    [state.gastos, estadoCaja, activeCajaId, agregarMovimiento, compensarMovimientosCajaGasto, session, config.currencies],
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
    guardarBorradorGasto,
    descartarBorradorGasto,
    registrarGasto,
    registrarGastoConPagoInmediato,
    editarGasto,
    anularGasto,
    registrarPagoGastoCentral,
    anularPagoGasto,
    obtenerCuentaPorPagarDeGasto,
    obtenerPagosDeGasto,
  };

  return <ContextoGastos.Provider value={value}>{children}</ContextoGastos.Provider>;
}
