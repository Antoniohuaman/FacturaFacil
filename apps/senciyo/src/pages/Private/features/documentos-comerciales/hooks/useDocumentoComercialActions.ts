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
  descontarStockParaDocumento,
  revertirDescuentoStockDocumento,
} from '../utils/servicioReservaStock';
import { calcularReservasPendientes } from '@/shared/documentosComerciales/postEmisionOrdenVenta';
import type { CartItem, PaymentTotals } from '../models/documentoComercial.types';

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

export interface ResultadoAccionDocumento {
  exito: boolean;
  documento?: DocumentoComercial;
  error?: string;
}

export interface UseDocumentoComercialActionsReturn {
  generarDocumento: (datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  generarDesdeBorrador: (id: string, datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  guardarComoBorrador: (datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  actualizarDocumento: (id: string, datos: Partial<DatosFormularioDocumentoComercial>) => ResultadoAccionDocumento;
  anularDocumento: (id: string, motivo: string) => ResultadoAccionDocumento;
  duplicarDocumento: (id: string, nuevoTipo?: TipoDocumentoComercial) => ResultadoAccionDocumento;
  eliminarBorrador: (id: string) => ResultadoAccionDocumento;
  validarDatos: (datos: DatosFormularioDocumentoComercial) => string | null;
  /** Modo de descuento de stock aplicable a una NV según la configuración actual. */
  getModoDescuentoNV: () => 'automatico' | 'nota_salida' | null;
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
      if (datos.tipo === 'orden_venta' && !datos.cliente) {
        return 'Selecciona un cliente para guardar la orden de venta.';
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

  const generarDocumento = useCallback(
    (datos: DatosFormularioDocumentoComercial): ResultadoAccionDocumento => {
      const errorValidacion = validarDatos(datos);
      if (errorValidacion) return { exito: false, error: errorValidacion };

      const controlStockActivo = configState.salesPreferences?.controlStockActivo ?? false;
      const stockDescuentoNotaVenta = configState.salesPreferences?.stockDescuentoNotaVenta ?? 'automatico';

      // Validación y reserva/descuento de stock según tipo de documento
      let reservasStock: ReservaStockItem[] | undefined;
      let modoDescuentoStock: 'automatico' | 'nota_salida' | undefined;

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

      const correlativo = generarCorrelativoSeguro(
        datos.serie,
        state.documentos,
        configState.series,
      );
      const numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      // OV queda en 'Reservada'; otros documentos en 'Generada'
      const estadoInicial: EstadoDocumentoComercial =
        datos.tipo === 'orden_venta' ? 'Reservada' : 'Generada';

      // Reservar stock OV (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'orden_venta') {
        reservasStock = reservarStockOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
      }

      // Descontar stock NV automático (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico') {
        reservasStock = descontarStockParaDocumento(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
          numero,
          session?.userName ?? 'Usuario',
        );
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
        id: generarIdDocumento(),
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

      agregarDocumento(documento);
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
    ],
  );

  const generarDesdeBorrador = useCallback(
    (id: string, datos: DatosFormularioDocumentoComercial): ResultadoAccionDocumento => {
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

      let modoDescuentoStock: 'automatico' | 'nota_salida' | undefined;
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
      const correlativo = generarCorrelativoSeguro(datos.serie, otrosDocs, configState.series);
      const numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      let reservasStock: ReservaStockItem[] | undefined;

      // Reservar stock OV (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'orden_venta') {
        reservasStock = reservarStockOrden(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
        );
      }

      // Descontar stock NV automático (DESPUÉS de asignar correlativo)
      if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico') {
        reservasStock = descontarStockParaDocumento(
          datos.items,
          configState.almacenes ?? [],
          activeEstablecimientoId ?? '',
          numero,
          session?.userName ?? 'Usuario',
        );
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

      const estadoFinal: EstadoDocumentoComercial =
        datos.tipo === 'orden_venta' ? 'Reservada' : 'Generada';

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

      actualizarEnContext(documentoGenerado);
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

      const items = datos.items ?? documentoExistente.items;
      const ahora = obtenerFechaHoraISO();

      const monedaActualizada = datos.moneda ?? documentoExistente.moneda;
      const eventoActualizado = crearEvento(
        documentoExistente.esBorrador ? 'Borrador actualizado' : 'Documento actualizado',
        session?.userName,
      );
      const documentoActualizado: DocumentoComercial = {
        ...documentoExistente,
        ...datos,
        id,
        items,
        totales:
          datos.items !== undefined
            ? calcularTotalesItems(datos.items, monedaActualizada)
            : documentoExistente.totales,
        fechaActualizacion: ahora,
        historial: [...(documentoExistente.historial ?? []), eventoActualizado],
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

  const getModoDescuentoNV = useCallback((): 'automatico' | 'nota_salida' | null => {
    const controlActivo = configState.salesPreferences?.controlStockActivo ?? false;
    if (!controlActivo) return null;
    return configState.salesPreferences?.stockDescuentoNotaVenta ?? 'automatico';
  }, [configState.salesPreferences]);

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
  };
}
