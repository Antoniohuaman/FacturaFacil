import { useCallback } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import { useUserSession } from '@/contexts/UserSessionContext';
import { useTenant } from '@/shared/tenant/TenantContext';
import { useDocumentosComercialesContext } from '../contexts/DocumentosComercialesContext';
import type {
  DocumentoComercial,
  DatosFormularioDocumentoComercial,
  TipoDocumentoComercial,
  EstadoDocumentoComercial,
  EventoHistorial,
  Currency,
  ReservaStockItem,
} from '../models/documentoComercial.types';
import {
  generarIdDocumento,
  generarIdBorrador,
  generarCorrelativoSeguro,
  obtenerFechaHoraISO,
  obtenerFechaHoyISO,
  calcularDesgloseTributos,
} from '../utils/documentoComercial.helpers';
import {
  validarStockParaOrden,
  reservarStockOrden,
  liberarReservaOrden,
  revertirDescuentoStockDocumento,
  ejecutarDescuentoStockNV as ejecutarDescuentoStockNVReal,
  cancelarNotaVentaPendiente as cancelarNotaVentaPendienteReal,
} from '../utils/servicioReservaStock';
import { calcularReservasPendientes, EVENTO_RECARGA } from '@/shared/documentosComerciales/postEmisionOrdenVenta';
import { persistirDocumentos } from '../utils/documentoComercial.storage';
import { obtenerNSActivasPorDocumento } from '../../gestion-inventario/repositories/notaSalida.repository';
import type { CartItem, PaymentTotals } from '../models/documentoComercial.types';
import { getTenantEmpresaId, tryGetTenantEmpresaId } from '../../../../../shared/tenant';

/**
 * Calcula el estado resultante de una cotización no-borrador basándose en
 * camposOpcionales actuales. Centraliza las reglas de re-evaluación al editar.
 * No devuelve nunca 'Aceptada' — editar siempre invalida la aceptación.
 */
function calcularEstadoResultanteCotizacion(
  camposOpcionales: DocumentoComercial['camposOpcionales'],
): EstadoDocumentoComercial {
  const hoy = obtenerFechaHoyISO();
  const fechaVenc = camposOpcionales?.fechaVencimiento;
  if (fechaVenc != null && fechaVenc < hoy) return 'Vencida';
  return camposOpcionales?.requiereAprobacion ? 'Pendiente aprobación' : 'Vigente';
}

const calcularTotalesItems = (items: CartItem[], moneda: Currency = 'PEN'): PaymentTotals => {
  if (!items || items.length === 0) {
    return { subtotal: 0, igv: 0, total: 0, currency: moneda };
  }
  const desglose = calcularDesgloseTributos(items);
  const subtotal = desglose.reduce((s, g) => s + g.taxableBase, 0);
  const igv = desglose.reduce((s, g) => s + g.taxAmount, 0);
  const total = Math.round((subtotal + igv) * 100) / 100;
  const taxBreakdown = desglose.map((d) => ({
    key: d.key,
    kind: d.kind,
    igvRate: d.igvRate,
    taxableBase: d.taxableBase,
    taxAmount: d.taxAmount,
    totalAmount: Math.round((d.taxableBase + d.taxAmount) * 100) / 100,
  }));
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    igv: Math.round(igv * 100) / 100,
    total,
    currency: moneda,
    taxBreakdown,
  };
};

function crearEvento(accion: string, usuario?: string, detalle?: string): EventoHistorial {
  return { fecha: obtenerFechaHoraISO(), usuario, accion, detalle };
}

function persistirOVConRollback(
  listaNueva: DocumentoComercial[],
  documento: DocumentoComercial,
  reservasStock: ReservaStockItem[] | undefined,
  actualizarFn: (doc: DocumentoComercial) => void,
): ResultadoAccionDocumento {
  const resultado = persistirDocumentos(listaNueva);
  if (!resultado.exito) {
    if (reservasStock?.length) {
      liberarReservaOrden(reservasStock);
    }
    return { exito: false, error: resultado.error };
  }
  actualizarFn(documento);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(EVENTO_RECARGA));
  }
  return { exito: true, documento };
}

export interface ResultadoAccionDocumento {
  exito: boolean;
  documento?: DocumentoComercial;
  error?: string;
}

export interface UseDocumentoComercialActionsReturn {
  generarDocumento: (datos: DatosFormularioDocumentoComercial) => Promise<ResultadoAccionDocumento>;
  generarDesdeBorrador: (id: string, datos: DatosFormularioDocumentoComercial) => Promise<ResultadoAccionDocumento>;
  guardarComoBorrador: (datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  actualizarDocumento: (id: string, datos: Partial<DatosFormularioDocumentoComercial>) => ResultadoAccionDocumento;
  anularDocumento: (id: string, motivo: string) => ResultadoAccionDocumento;
  duplicarDocumento: (id: string, nuevoTipo?: TipoDocumentoComercial) => ResultadoAccionDocumento;
  eliminarBorrador: (id: string) => ResultadoAccionDocumento;
  validarDatos: (datos: DatosFormularioDocumentoComercial) => string | null;
  /** Modo de descuento de stock aplicable a una NV según la configuración actual. */
  getModoDescuentoNV: () => 'automatico' | 'nota_salida' | 'sin_control' | null;
  aprobarCotizacion: (id: string, comentario?: string) => ResultadoAccionDocumento;
  rechazarCotizacion: (id: string, motivo?: string) => ResultadoAccionDocumento;
  cerrarCotizacionComoPerdida: (id: string, motivo: string) => ResultadoAccionDocumento;
  /** Marca la cotización como Convertida y registra el documento destino en su trazabilidad.
   *  Acepta `dadosComerciais` para sincronizar en un único update cuando el usuario confirmó
   *  cambios comerciales durante la conversión (evita problemas de estado obsoleto). */
  vincularDocumentoConCotizacion: (
    cotizacionId: string,
    docDestinoId: string,
    docDestinoNumero: string,
    docDestinoTipo: TipoDocumentoComercial,
    dadosComerciais?: {
      items: CartItem[];
      cliente?: DocumentoComercial['cliente'];
      moneda: Currency;
      formaPago?: string;
      totales?: PaymentTotals;
    },
  ) => ResultadoAccionDocumento;
  evaluarVencimientosCotizaciones: () => void;
  agregarComentario: (id: string, comentario: string) => ResultadoAccionDocumento;
  marcarComoAceptada: (id: string) => ResultadoAccionDocumento;
  /** Sincroniza datos comerciales (cliente, ítems, totales, observaciones) de una NV/OV
   *  a la cotización origen cuando el documento relacionado es editado. */
  sincronizarCotizacionDesdeDocumento: (docId: string) => void;
  /** Limpia explícitamente la sesión pendiente de descuento de stock de Nota de Venta — llamar al cancelar el formulario o iniciar otro documento. */
  cancelarNotaVentaPendiente: () => void;
}

export function useDocumentoComercialActions(): UseDocumentoComercialActionsReturn {
  const { state: configState } = useConfigurationContext();
  const { session } = useUserSession();
  const { activeEstablecimientoId } = useTenant();
  const { state, agregarDocumento, actualizarDocumento: actualizarEnContext, eliminarDocumento } =
    useDocumentosComercialesContext();

  const validarDatos = useCallback(
    (datos: DatosFormularioDocumentoComercial): string | null => {
      if (!datos.serie || datos.serie.trim() === '') {
        return 'Debe seleccionar una serie para generar el documento.';
      }
      if ((datos.tipo === 'orden_venta' || datos.tipo === 'cotizacion') && !datos.cliente) {
        return 'Selecciona un cliente para generar el documento.';
      }
      if (!datos.items || datos.items.length === 0) {
        return 'Debe agregar al menos un producto o servicio.';
      }
      const hayItemSinPrecio = datos.items.some(
        (item) => item.price <= 0 || item.quantity <= 0,
      );
      if (hayItemSinPrecio) {
        return 'Todos los ítems deben tener precio y cantidad válidos.';
      }
      return null;
    },
    [],
  );

  /**
   * Envoltorio delgado sobre `ejecutarDescuentoStockNV` (servicioReservaStock.ts) — la orquestación
   * real vive en un módulo plano, testeable sin React, compartida por `generarDocumento` y
   * `generarDesdeBorrador` (Etapa 1D, §10; corrección post-1D, §3).
   */
  const ejecutarDescuentoStockNV = useCallback(
    (
      datos: DatosFormularioDocumentoComercial,
      documentoIdExistente: string | undefined,
      resolverNumeroFallback: () => { numero: string; correlativo: string },
    ) => ejecutarDescuentoStockNVReal({
      datos,
      almacenes: configState.almacenes ?? [],
      establecimientoId: activeEstablecimientoId ?? '',
      empresaId: getTenantEmpresaId(),
      usuario: session?.userName ?? 'Usuario',
      documentoIdExistente,
      resolverNumeroFallback,
    }),
    [activeEstablecimientoId, configState.almacenes, session],
  );

  /**
   * Limpia explícitamente la sesión pendiente de `nota_venta_salida` — corrección post-1D, §2:
   * debe invocarse al cancelar el formulario o al iniciar otro documento, nunca durante un fallo
   * incierto de la propia preparación/confirmación.
   */
  const cancelarNotaVentaPendiente = useCallback((): void => {
    const empresaId = tryGetTenantEmpresaId();
    if (!empresaId) return;
    cancelarNotaVentaPendienteReal(empresaId);
  }, []);

  const generarDocumento = useCallback(
    async (datos: DatosFormularioDocumentoComercial): Promise<ResultadoAccionDocumento> => {
      const errorValidacion = validarDatos(datos);
      if (errorValidacion) return { exito: false, error: errorValidacion };

      const controlStockActivo = configState.salesPreferences?.controlStockActivo ?? false;
      const stockDescuentoNotaVenta = configState.salesPreferences?.stockDescuentoNotaVenta ?? 'automatico';

      // Validación y reserva/descuento de stock según tipo de documento
      let reservasStock: ReservaStockItem[] | undefined;
      let modoDescuentoStock: 'automatico' | 'nota_salida' | 'sin_control' | undefined;
      let documentoIdNV: string | undefined;
      let limpiarSesionNV: (() => void) | undefined;

      if (datos.tipo === 'orden_venta') {
        const validacion = validarStockParaOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
        if (!validacion.valido) {
          return { exito: false, error: validacion.error };
        }
      }

      if (datos.tipo === 'nota_venta' && controlStockActivo) {
        modoDescuentoStock = stockDescuentoNotaVenta;
        if (stockDescuentoNotaVenta === 'automatico') {
          const validacion = validarStockParaOrden(
            datos.items,
            configState.almacenes ?? [],
            activeEstablecimientoId ?? '',
          );
          if (!validacion.valido) {
            return { exito: false, error: validacion.error };
          }
        }
      }

      // Fallback: correlativo/numero recién calculados, solo se usan si esta es la primera
      // preparación real para esta huella (corrección post-1D, §3: nunca se genera OTRO
      // correlativo cuando ya existe una sesión pendiente con la misma intención).
      let correlativo = generarCorrelativoSeguro(
        datos.serie,
        state.documentos,
        configState.series,
      );
      let numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      // OV → Reservada; cotización con aprobación → Pendiente aprobación; resto → Generada/Vigente
      let estadoInicial: EstadoDocumentoComercial;
      if (datos.tipo === 'orden_venta') {
        estadoInicial = 'Reservada';
      } else if (datos.tipo === 'cotizacion') {
        estadoInicial = datos.camposOpcionales?.requiereAprobacion === true
          ? 'Pendiente aprobación'
          : 'Vigente';
      } else {
        estadoInicial = 'Generada';
      }

      // Reservar stock OV (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'orden_venta') {
        reservasStock = reservarStockOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
      }

      // Descontar stock NV automático (DESPUÉS de asignar correlativo) — motor central de salidas
      // (Etapa 1D, §1): validación previa (arriba) + hash canónico + reserva idempotente +
      // preparación pura + confirmación, sin segunda persistencia. `documentoIdNV`/`numero`/
      // `correlativo` (resueltos de forma estable, reutilizando el snapshot cacheado en un
      // reintento) se reutilizan abajo como identidad real del documento — nunca un id técnico.
      if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico') {
        const correlativoFallback = correlativo;
        const numeroFallback = numero;
        const resultado = await ejecutarDescuentoStockNV(
          datos,
          undefined,
          () => ({ numero: numeroFallback, correlativo: correlativoFallback }),
        );
        reservasStock = resultado.reservasStock;
        documentoIdNV = resultado.documentoId;
        limpiarSesionNV = resultado.limpiarSesion;
        numero = resultado.numero;
        correlativo = resultado.correlativo;
      }

      let accionHistorial: string;
      let detalleHistorial: string | undefined;

      if (datos.tipo === 'orden_venta') {
        accionHistorial = 'Orden de venta reservada';
        detalleHistorial = reservasStock?.length
          ? `Productos reservados: ${reservasStock.map((r) => `${r.nombre} (${r.cantidad})`).join(', ')}`
          : undefined;
      } else if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico' && reservasStock?.length) {
        accionHistorial = 'Documento generado — stock descontado automáticamente';
        detalleHistorial = `Productos descontados: ${reservasStock.map((r) => `${r.nombre} (${r.cantidad})`).join(', ')}`;
      } else if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'nota_salida') {
        accionHistorial = 'Documento generado — pendiente de Nota de Salida';
        detalleHistorial = undefined;
      } else {
        accionHistorial = 'Documento generado';
        detalleHistorial = undefined;
      }

      const documento: DocumentoComercial = {
        id: documentoIdNV ?? generarIdDocumento(),
        tipo: datos.tipo,
        estado: estadoInicial,
        esBorrador: false,
        serie: datos.serie,
        correlativo,
        numero,
        fechaEmision: datos.fechaEmision || obtenerFechaHoyISO(),
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        cliente: datos.cliente,
        vendedor: session?.userName ?? undefined,
        vendedorId: session?.userId ?? undefined,
        moneda: datos.moneda,
        formaPago: datos.formaPago,
        creditTerms: datos.creditTerms,
        totales: calcularTotalesItems(datos.items, datos.moneda),
        items: datos.items,
        modoItems: datos.modoItems,
        observaciones: datos.observaciones,
        notaInterna: datos.notaInterna,
        camposOpcionales: datos.camposOpcionales,
        trazabilidad: datos.trazabilidad,
        establecimientoId: activeEstablecimientoId ?? undefined,
        reservasStock,
        modoDescuentoStock,
        historial: [crearEvento(accionHistorial, session?.userName, detalleHistorial)],
      };

      // OV: flujo transaccional — persistir antes de actualizar UI.
      // Si la persistencia falla, revertir la reserva en Zustand para evitar reserva huérfana.
      if (datos.tipo === 'orden_venta') {
        return persistirOVConRollback(
          [documento, ...state.documentos],
          documento,
          reservasStock,
          agregarDocumento,
        );
      }

      agregarDocumento(documento);
      // La sesión pendiente de venta_salida solo se limpia AHORA — inventario ya quedó
      // confirmado/repetido Y el documento comercial quedó correctamente persistido (recién
      // arriba). Si `agregarDocumento` hubiera fallado, la sesión seguiría viva para que un
      // reintento reconstruya la MISMA identidad sin descontar stock de nuevo.
      limpiarSesionNV?.();
      return { exito: true, documento };
    },
    [
      validarDatos,
      state.documentos,
      configState.series,
      configState.almacenes,
      configState.salesPreferences,
      session,
      activeEstablecimientoId,
      agregarDocumento,
      ejecutarDescuentoStockNV,
    ],
  );

  const generarDesdeBorrador = useCallback(
    async (id: string, datos: DatosFormularioDocumentoComercial): Promise<ResultadoAccionDocumento> => {
      const errorValidacion = validarDatos(datos);
      if (errorValidacion) return { exito: false, error: errorValidacion };

      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (!doc.esBorrador) return { exito: false, error: 'El documento no es un borrador.' };

      const controlStockActivo = configState.salesPreferences?.controlStockActivo ?? false;
      const stockDescuentoNotaVenta = configState.salesPreferences?.stockDescuentoNotaVenta ?? 'automatico';

      // Validación de stock para OV y NV automática antes de asignar correlativo
      if (datos.tipo === 'orden_venta') {
        const validacion = validarStockParaOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
        if (!validacion.valido) {
          return { exito: false, error: validacion.error };
        }
      }

      let modoDescuentoStock: 'automatico' | 'nota_salida' | 'sin_control' | undefined;
      if (datos.tipo === 'nota_venta' && controlStockActivo) {
        modoDescuentoStock = stockDescuentoNotaVenta;
        if (stockDescuentoNotaVenta === 'automatico') {
          const validacion = validarStockParaOrden(
            datos.items,
            configState.almacenes ?? [],
            activeEstablecimientoId ?? '',
          );
          if (!validacion.valido) {
            return { exito: false, error: validacion.error };
          }
        }
      }

      const otrosDocs = state.documentos.filter((d) => d.id !== id);
      // Fallback: solo se usa si esta es la primera preparación real para esta huella (corrección
      // post-1D, §3).
      let correlativo = generarCorrelativoSeguro(datos.serie, otrosDocs, configState.series);
      let numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      let reservasStock: ReservaStockItem[] | undefined;
      let limpiarSesionNV: (() => void) | undefined;

      // Reservar stock OV (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'orden_venta') {
        reservasStock = reservarStockOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
      }

      // Descontar stock NV automático (DESPUÉS de asignar correlativo) — motor central de salidas.
      // `doc.id` (el borrador ya persistido) es la identidad REAL y estable del documento — se pasa
      // directamente, nunca se resuelve un id técnico de sesión distinto.
      if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico') {
        const correlativoFallback = correlativo;
        const numeroFallback = numero;
        const resultado = await ejecutarDescuentoStockNV(
          datos,
          doc.id,
          () => ({ numero: numeroFallback, correlativo: correlativoFallback }),
        );
        reservasStock = resultado.reservasStock;
        limpiarSesionNV = resultado.limpiarSesion;
        numero = resultado.numero;
        correlativo = resultado.correlativo;
      }

      let accionHistorial: string;
      let detalleHistorial: string | undefined;

      if (datos.tipo === 'orden_venta') {
        accionHistorial = 'Orden de venta reservada desde borrador';
        detalleHistorial = reservasStock?.length
          ? `Productos reservados: ${reservasStock.map((r) => `${r.nombre} (${r.cantidad})`).join(', ')}`
          : undefined;
      } else if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico' && reservasStock?.length) {
        accionHistorial = 'Documento generado desde borrador — stock descontado automáticamente';
        detalleHistorial = `Productos descontados: ${reservasStock.map((r) => `${r.nombre} (${r.cantidad})`).join(', ')}`;
      } else if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'nota_salida') {
        accionHistorial = 'Documento generado desde borrador — pendiente de Nota de Salida';
        detalleHistorial = undefined;
      } else {
        accionHistorial = 'Documento generado desde borrador';
        detalleHistorial = undefined;
      }

      let estadoFinal: EstadoDocumentoComercial;
      if (datos.tipo === 'orden_venta') {
        estadoFinal = 'Reservada';
      } else if (datos.tipo === 'cotizacion') {
        estadoFinal = datos.camposOpcionales?.requiereAprobacion === true
          ? 'Pendiente aprobación'
          : 'Vigente';
      } else {
        estadoFinal = 'Generada';
      }

      const eventoGenerado = crearEvento(accionHistorial, session?.userName, detalleHistorial);
      const documentoGenerado: DocumentoComercial = {
        ...doc,
        tipo: datos.tipo,
        estado: estadoFinal,
        esBorrador: false,
        serie: datos.serie,
        correlativo,
        numero,
        fechaEmision: datos.fechaEmision || obtenerFechaHoyISO(),
        fechaActualizacion: ahora,
        cliente: datos.cliente,
        vendedor: session?.userName ?? doc.vendedor,
        vendedorId: session?.userId ?? doc.vendedorId,
        moneda: datos.moneda,
        formaPago: datos.formaPago,
        creditTerms: datos.creditTerms,
        totales: calcularTotalesItems(datos.items, datos.moneda),
        items: datos.items,
        modoItems: datos.modoItems,
        observaciones: datos.observaciones,
        notaInterna: datos.notaInterna,
        camposOpcionales: datos.camposOpcionales,
        trazabilidad: datos.trazabilidad,
        establecimientoId: activeEstablecimientoId ?? doc.establecimientoId,
        motivoAnulacion: undefined,
        fechaAnulacion: undefined,
        usuarioAnulacion: undefined,
        reservasStock,
        modoDescuentoStock,
        historial: [...(doc.historial ?? []), eventoGenerado],
      };

      // OV desde borrador: flujo transaccional — persistir antes de actualizar UI.
      // Si la persistencia falla, revertir la reserva en Zustand para evitar reserva huérfana.
      if (datos.tipo === 'orden_venta') {
        return persistirOVConRollback(
          state.documentos.map((d) => (d.id === id ? documentoGenerado : d)),
          documentoGenerado,
          reservasStock,
          actualizarEnContext,
        );
      }

      actualizarEnContext(documentoGenerado);
      // La sesión pendiente solo se limpia AHORA — inventario ya quedó confirmado/repetido Y el
      // documento comercial quedó correctamente persistido (recién arriba).
      limpiarSesionNV?.();
      return { exito: true, documento: documentoGenerado };
    },
    [
      validarDatos,
      state.documentos,
      configState.series,
      configState.almacenes,
      configState.salesPreferences,
      session,
      activeEstablecimientoId,
      actualizarEnContext,
      ejecutarDescuentoStockNV,
    ],
  );

  const guardarComoBorrador = useCallback(
    (datos: DatosFormularioDocumentoComercial): ResultadoAccionDocumento => {
      const ahora = obtenerFechaHoraISO();

      const borrador: DocumentoComercial = {
        id: generarIdBorrador(),
        tipo: datos.tipo,
        estado: 'Borrador',
        esBorrador: true,
        serie: datos.serie,
        correlativo: undefined,
        numero: undefined,
        fechaEmision: datos.fechaEmision || obtenerFechaHoyISO(),
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        cliente: datos.cliente,
        vendedor: session?.userName ?? undefined,
        vendedorId: session?.userId ?? undefined,
        moneda: datos.moneda,
        formaPago: datos.formaPago,
        creditTerms: datos.creditTerms,
        totales: calcularTotalesItems(datos.items, datos.moneda),
        items: datos.items,
        modoItems: datos.modoItems,
        observaciones: datos.observaciones,
        notaInterna: datos.notaInterna,
        camposOpcionales: datos.camposOpcionales,
        trazabilidad: datos.trazabilidad,
        establecimientoId: activeEstablecimientoId ?? undefined,
        historial: [crearEvento('Borrador creado', session?.userName)],
      };

      agregarDocumento(borrador);
      return { exito: true, documento: borrador };
    },
    [session, activeEstablecimientoId, agregarDocumento],
  );

  const actualizarDocumento = useCallback(
    (id: string, datos: Partial<DatosFormularioDocumentoComercial>): ResultadoAccionDocumento => {
      const documentoExistente = state.documentos.find((d) => d.id === id);
      if (!documentoExistente) {
        return { exito: false, error: 'Documento no encontrado.' };
      }

      // OVs generadas no pueden editarse: la reserva ya está comprometida en el catálogo
      if (documentoExistente.tipo === 'orden_venta' && !documentoExistente.esBorrador) {
        return { exito: false, error: 'Las Órdenes de Venta generadas no pueden editarse. Anule y cree una nueva.' };
      }

      const items = datos.items ?? documentoExistente.items;
      const ahora = obtenerFechaHoraISO();
      const monedaActualizada = datos.moneda ?? documentoExistente.moneda;

      // Re-evaluación centralizada del estado para cotizaciones no-borrador.
      // Los estados reevaluables son todos los editables activos.
      let nuevoEstado: EstadoDocumentoComercial = documentoExistente.estado;
      let accionHistorial = documentoExistente.esBorrador ? 'Borrador actualizado' : 'Documento actualizado';

      if (documentoExistente.tipo === 'cotizacion' && !documentoExistente.esBorrador) {
        const estadosReevaluables: string[] = ['Vigente', 'Pendiente aprobación', 'Aceptada', 'Vencida'];
        if (estadosReevaluables.includes(documentoExistente.estado)) {
          const camposResultantes = datos.camposOpcionales ?? documentoExistente.camposOpcionales;
          nuevoEstado = calcularEstadoResultanteCotizacion(camposResultantes);
          if (documentoExistente.estado === 'Aceptada') {
            accionHistorial = 'Cotización editada — aceptación invalidada';
          } else if (documentoExistente.estado === 'Vencida' && nuevoEstado !== 'Vencida') {
            accionHistorial = 'Cotización renovada — vencimiento actualizado';
          } else if (documentoExistente.estado === 'Pendiente aprobación' && nuevoEstado === 'Vigente') {
            accionHistorial = 'Cotización editada — aprobación ya no requerida';
          }
        }
      }

      const documentoActualizado: DocumentoComercial = {
        ...documentoExistente,
        ...datos,
        id,
        estado: nuevoEstado,
        items,
        totales:
          datos.items !== undefined
            ? calcularTotalesItems(datos.items, monedaActualizada)
            : documentoExistente.totales,
        fechaActualizacion: ahora,
        historial: [...(documentoExistente.historial ?? []), crearEvento(accionHistorial, session?.userName)],
      };

      actualizarEnContext(documentoActualizado);
      return { exito: true, documento: documentoActualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const anularDocumento = useCallback(
    (id: string, motivo: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.esBorrador)
        return { exito: false, error: 'No se puede anular un borrador. Use eliminar borrador.' };
      if (!motivo || motivo.trim() === '')
        return { exito: false, error: 'El motivo de anulación es obligatorio.' };

      // Guards de negocio para Órdenes de Venta
      if (doc.tipo === 'orden_venta') {
        if (doc.estado === 'Pendiente de salida') {
          return { exito: false, error: 'No se puede anular una OV con Comprobante activo. Anule primero el Comprobante.' };
        }
        if (doc.estado === 'Atendida parcialmente') {
          try {
            const nsActivas = obtenerNSActivasPorDocumento({
              ordenVentaOrigenId: doc.id,
              notaSalidaIds: doc.notaSalidaIds,
              notaSalidaIdLegacy: doc.notaSalidaId,
            });
            if (nsActivas.length > 0) {
              return { exito: false, error: 'No se puede anular una OV con Notas de Salida activas. Anule primero las Notas de Salida.' };
            }
          } catch {
            return { exito: false, error: 'No se pudo verificar el estado de las Notas de Salida. Inténtalo de nuevo.' };
          }
        }
        if (doc.estado === 'Atendida') {
          return { exito: false, error: 'No se puede anular una OV ya atendida.' };
        }
      }

      const ahora = obtenerFechaHoraISO();

      // Liberar reserva/descuento de stock según tipo de documento
      let accionHistorial = 'Documento anulado';
      let detalleHistorial = `Motivo: ${motivo.trim()}`;

      if (
        doc.tipo === 'orden_venta' &&
        (doc.estado === 'Reservada' || doc.estado === 'Pendiente de salida' || doc.estado === 'Atendida parcialmente') &&
        doc.reservasStock?.length
      ) {
        // Para OVs con despacho parcial, liberar solo la reserva pendiente (original - despachado)
        const aLiberar: ReservaStockItem[] = doc.despachado?.length
          ? calcularReservasPendientes(doc.reservasStock, doc.despachado)
          : doc.reservasStock;
        if (aLiberar.length > 0) {
          liberarReservaOrden(aLiberar);
        }
        accionHistorial = 'Reserva liberada por anulación';
        const productosLiberados = aLiberar
          .map((r) => `${r.nombre} (${r.cantidad})`)
          .join(', ');
        detalleHistorial = `Motivo: ${motivo.trim()}. Productos liberados: ${productosLiberados}`;
      }

      if (doc.tipo === 'nota_venta' && doc.modoDescuentoStock === 'automatico' && doc.reservasStock?.length) {
        revertirDescuentoStockDocumento(
          doc.reservasStock,
          configState.almacenes ?? [],
          doc.numero ?? doc.id,
          session?.userName ?? 'Usuario',
        );
        accionHistorial = 'Descuento de stock revertido por anulación';
        const productosRevertidos = doc.reservasStock
          .map((r) => `${r.nombre} (${r.cantidad})`)
          .join(', ');
        detalleHistorial = `Motivo: ${motivo.trim()}. Stock repuesto: ${productosRevertidos}`;
      }

      const eventoAnulacion = crearEvento(accionHistorial, session?.userName, detalleHistorial);
      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Anulada',
        fechaActualizacion: ahora,
        motivoAnulacion: motivo.trim(),
        fechaAnulacion: ahora,
        usuarioAnulacion: session?.userName ?? undefined,
        historial: [...(doc.historial ?? []), eventoAnulacion],
      };
      actualizarEnContext(actualizado);

      // Cascade: si este doc fue generado desde una cotización, restaurarla.
      // Solo Aceptada puede convertir (Regla 5), por tanto se restaura siempre a Aceptada.
      const cotizacionVinculada = state.documentos.find(
        (d) =>
          d.tipo === 'cotizacion' &&
          d.estado === 'Convertida' &&
          d.trazabilidad?.documentoDestinoId === id,
      );
      if (cotizacionVinculada) {
        const estadoAnterior: EstadoDocumentoComercial = 'Aceptada';
        const labelAnulado = doc.tipo === 'nota_venta' ? 'Nota de Venta' : 'Orden de Venta';
        actualizarEnContext({
          ...cotizacionVinculada,
          estado: estadoAnterior,
          fechaActualizacion: ahora,
          trazabilidad: {
            ...cotizacionVinculada.trazabilidad,
            documentoDestinoId: undefined,
            documentoDestinoTipo: undefined,
            documentoDestinoNumero: undefined,
          },
          historial: [
            ...(cotizacionVinculada.historial ?? []),
            crearEvento(
              `Cotización reabierta por anulación de ${labelAnulado}`,
              session?.userName,
              `${labelAnulado} ${doc.numero ?? doc.serie} anulada. Estado restaurado: ${estadoAnterior}. Motivo: ${motivo.trim()}`,
            ),
          ],
        });
      }

      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session, configState.almacenes],
  );

  const duplicarDocumento = useCallback(
    (id: string, nuevoTipo?: TipoDocumentoComercial): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };

      const ahora = obtenerFechaHoraISO();
      const tipo = nuevoTipo ?? doc.tipo;

      const origenNumero = doc.numero ?? doc.serie;
      const eventoDuplicado = crearEvento(
        `Borrador creado por duplicación de ${origenNumero}`,
        session?.userName,
      );
      const duplicado: DocumentoComercial = {
        ...doc,
        id: generarIdBorrador(),
        tipo,
        estado: 'Borrador',
        esBorrador: true,
        serie: tipo === doc.tipo ? doc.serie : '',
        correlativo: undefined,
        numero: undefined,
        fechaEmision: obtenerFechaHoyISO(),
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        trazabilidad: undefined,
        motivoAnulacion: undefined,
        fechaAnulacion: undefined,
        usuarioAnulacion: undefined,
        reservasStock: undefined, // el borrador duplicado no hereda reservas
        historial: [eventoDuplicado],
      };

      agregarDocumento(duplicado);
      return { exito: true, documento: duplicado };
    },
    [state.documentos, agregarDocumento, session],
  );

  const eliminarBorrador = useCallback(
    (id: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (!doc.esBorrador) {
        return { exito: false, error: 'Solo se pueden eliminar borradores.' };
      }
      eliminarDocumento(id);
      return { exito: true };
    },
    [state.documentos, eliminarDocumento],
  );

  const getModoDescuentoNV = useCallback((): 'automatico' | 'nota_salida' | 'sin_control' | null => {
    const controlActivo = configState.salesPreferences?.controlStockActivo ?? false;
    if (!controlActivo) return null;
    return configState.salesPreferences?.stockDescuentoNotaVenta ?? 'automatico';
  }, [configState.salesPreferences]);

  const aprobarCotizacion = useCallback(
    (id: string, comentario?: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.tipo !== 'cotizacion') return { exito: false, error: 'Solo se pueden aprobar cotizaciones.' };
      if (doc.estado !== 'Pendiente aprobación') return { exito: false, error: 'Solo se pueden aprobar cotizaciones en estado Pendiente aprobación.' };
      if (!doc.cliente) return { exito: false, error: 'La cotización requiere un cliente para ser aprobada.' };
      if (!doc.items?.length) return { exito: false, error: 'La cotización debe tener al menos un producto o servicio.' };
      const hayItemInvalido = doc.items.some((item) => item.price <= 0 || item.quantity <= 0);
      if (hayItemInvalido) return { exito: false, error: 'Todos los ítems deben tener precio y cantidad válidos.' };

      const ahora = obtenerFechaHoraISO();
      const comentarioTrimmed = comentario?.trim();
      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Aprobada',
        fechaActualizacion: ahora,
        historial: [
          ...(doc.historial ?? []),
          crearEvento('Cotización aprobada', session?.userName, comentarioTrimmed || undefined),
        ],
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const rechazarCotizacion = useCallback(
    (id: string, motivo?: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.tipo !== 'cotizacion') return { exito: false, error: 'Solo se pueden rechazar cotizaciones.' };
      if (doc.estado !== 'Pendiente aprobación') return { exito: false, error: 'Solo se puede aplicar a cotizaciones en estado Pendiente aprobación.' };

      const ahora = obtenerFechaHoraISO();
      const motivoTrimmed = motivo?.trim();
      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'No aprobada',
        fechaActualizacion: ahora,
        motivoRechazo: motivoTrimmed || undefined,
        fechaRechazo: ahora,
        usuarioRechazo: session?.userName ?? undefined,
        historial: [
          ...(doc.historial ?? []),
          crearEvento('Cotización no aprobada', session?.userName, motivoTrimmed ? `Motivo: ${motivoTrimmed}` : undefined),
        ],
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const cerrarCotizacionComoPerdida = useCallback(
    (id: string, motivo: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.tipo !== 'cotizacion') return { exito: false, error: 'Solo aplica a cotizaciones.' };
      const estadosCierrePerdida: string[] = ['Vigente', 'Aprobada', 'Aceptada'];
      if (!estadosCierrePerdida.includes(doc.estado)) {
        return { exito: false, error: 'Solo se puede cerrar como perdida una cotización Vigente, Aprobada o Aceptada.' };
      }
      if (!motivo?.trim()) return { exito: false, error: 'El motivo de cierre es obligatorio.' };

      const ahora = obtenerFechaHoraISO();
      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Cerrada perdida',
        fechaActualizacion: ahora,
        motivoCierrePerdido: motivo.trim(),
        fechaCierrePerdido: ahora,
        usuarioCierrePerdido: session?.userName ?? undefined,
        historial: [
          ...(doc.historial ?? []),
          crearEvento('Cotización cerrada como perdida', session?.userName, `Motivo: ${motivo.trim()}`),
        ],
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const vincularDocumentoConCotizacion = useCallback(
    (
      cotizacionId: string,
      docDestinoId: string,
      docDestinoNumero: string,
      docDestinoTipo: TipoDocumentoComercial,
      dadosComerciais?: {
        items: CartItem[];
        cliente?: DocumentoComercial['cliente'];
        moneda: Currency;
        formaPago?: string;
        totales?: PaymentTotals;
      },
    ): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === cotizacionId);
      if (!doc) return { exito: false, error: 'Cotización no encontrada.' };
      if (doc.tipo !== 'cotizacion') return { exito: false, error: 'Solo aplica a cotizaciones.' };

      const labelDestino = docDestinoTipo === 'nota_venta' ? 'Nota de Venta' : 'Orden de Venta';
      const ahora = obtenerFechaHoraISO();

      const historialEventos: EventoHistorial[] = [
        ...(doc.historial ?? []),
        crearEvento(
          `Cotización convertida a ${labelDestino}`,
          session?.userName,
          `${labelDestino}: ${docDestinoNumero}`,
        ),
      ];
      if (dadosComerciais) {
        historialEventos.push(
          crearEvento(
            'Datos comerciales actualizados en conversión',
            session?.userName,
            `Cambios confirmados al generar ${labelDestino}`,
          ),
        );
      }

      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Convertida',
        ...(dadosComerciais ? {
          items: dadosComerciais.items,
          ...(dadosComerciais.cliente !== undefined && { cliente: dadosComerciais.cliente }),
          moneda: dadosComerciais.moneda,
          ...(dadosComerciais.formaPago !== undefined && { formaPago: dadosComerciais.formaPago }),
          ...(dadosComerciais.totales ? { totales: dadosComerciais.totales } : {}),
        } : {}),
        fechaActualizacion: ahora,
        trazabilidad: {
          ...(doc.trazabilidad ?? {}),
          documentoDestinoId: docDestinoId,
          documentoDestinoTipo: docDestinoTipo,
          documentoDestinoNumero: docDestinoNumero,
        },
        historial: historialEventos,
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const agregarComentario = useCallback(
    (id: string, comentario: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (!comentario.trim()) return { exito: false, error: 'El comentario no puede estar vacío.' };

      const ahora = obtenerFechaHoraISO();
      const evento: EventoHistorial = {
        fecha: ahora,
        usuario: session?.userName,
        accion: comentario.trim(),
        tipo: 'comentario',
      };
      const actualizado: DocumentoComercial = {
        ...doc,
        fechaActualizacion: ahora,
        historial: [...(doc.historial ?? []), evento],
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const evaluarVencimientosCotizaciones = useCallback((): void => {
    const hoy = obtenerFechaHoyISO();
    const ahora = obtenerFechaHoraISO();
    const estadosVencibles: string[] = ['Vigente', 'Aprobada', 'Pendiente aprobación', 'Aceptada'];
    const vencidas = state.documentos.filter(
      (d) =>
        d.tipo === 'cotizacion' &&
        !d.esBorrador &&
        estadosVencibles.includes(d.estado) &&
        d.camposOpcionales?.fechaVencimiento != null &&
        d.camposOpcionales.fechaVencimiento < hoy,
    );
    vencidas.forEach((doc) => {
      actualizarEnContext({
        ...doc,
        estado: 'Vencida',
        fechaActualizacion: ahora,
        historial: [
          ...(doc.historial ?? []),
          crearEvento(
            'Vencimiento automático',
            undefined,
            `Fecha de vencimiento: ${doc.camposOpcionales?.fechaVencimiento}`,
          ),
        ],
      });
    });
  }, [state.documentos, actualizarEnContext]);

  const marcarComoAceptada = useCallback(
    (id: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.tipo !== 'cotizacion') return { exito: false, error: 'Solo aplica a cotizaciones.' };
      const estadosPermitidos: string[] = ['Vigente', 'Aprobada'];
      if (!estadosPermitidos.includes(doc.estado)) {
        return { exito: false, error: 'Solo se puede aceptar una cotización Vigente o Aprobada.' };
      }
      // Regla 6: si requiere aprobación, debe estar Aprobada antes de aceptar.
      if (doc.camposOpcionales?.requiereAprobacion && doc.estado !== 'Aprobada') {
        return {
          exito: false,
          error: 'Esta cotización requiere aprobación interna previa. Apruébela primero.',
        };
      }
      const ahora = obtenerFechaHoraISO();
      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Aceptada',
        fechaActualizacion: ahora,
        historial: [
          ...(doc.historial ?? []),
          crearEvento('Cotización aceptada por el cliente', session?.userName),
        ],
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext, session],
  );

  const sincronizarCotizacionDesdeDocumento = useCallback(
    (docId: string): void => {
      const doc = state.documentos.find((d) => d.id === docId);
      if (!doc) return;
      const cotizacionId = doc.trazabilidad?.documentoOrigenId;
      if (!cotizacionId) return;
      const cotizacion = state.documentos.find(
        (d) => d.id === cotizacionId && d.tipo === 'cotizacion' && d.estado === 'Convertida',
      );
      if (!cotizacion) return;
      const ahora = obtenerFechaHoraISO();
      actualizarEnContext({
        ...cotizacion,
        cliente: doc.cliente,
        items: doc.items,
        totales: doc.totales,
        observaciones: doc.observaciones,
        formaPago: doc.formaPago,
        moneda: doc.moneda,
        fechaActualizacion: ahora,
        historial: [
          ...(cotizacion.historial ?? []),
          crearEvento(
            'Datos comerciales sincronizados desde documento relacionado',
            session?.userName,
            `Sincronizado desde: ${doc.numero ?? doc.id}`,
          ),
        ],
      });
    },
    [state.documentos, actualizarEnContext, session],
  );

  return {
    generarDocumento,
    generarDesdeBorrador,
    guardarComoBorrador,
    actualizarDocumento,
    anularDocumento,
    duplicarDocumento,
    eliminarBorrador,
    validarDatos,
    getModoDescuentoNV,
    aprobarCotizacion,
    rechazarCotizacion,
    cerrarCotizacionComoPerdida,
    vincularDocumentoConCotizacion,
    evaluarVencimientosCotizaciones,
    agregarComentario,
    marcarComoAceptada,
    sincronizarCotizacionDesdeDocumento,
    cancelarNotaVentaPendiente,
  };
}
