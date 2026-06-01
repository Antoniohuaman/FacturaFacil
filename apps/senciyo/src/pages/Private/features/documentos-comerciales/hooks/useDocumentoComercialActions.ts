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
} from '../models/documentoComercial.types';
import {
  generarIdDocumento,
  generarIdBorrador,
  generarCorrelativoSeguro,
  obtenerFechaHoraISO,
  obtenerFechaHoyISO,
  calcularDesgloseTributos,
} from '../utils/documentoComercial.helpers';
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

      const correlativo = generarCorrelativoSeguro(
        datos.serie,
        state.documentos,
        configState.series,
      );
      const numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      const estadoInicial: EstadoDocumentoComercial = 'Generada';

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
        historial: [crearEvento('Documento generado', session?.userName)],
      };

      agregarDocumento(documento);
      return { exito: true, documento };
    },
    [
      validarDatos,
      state.documentos,
      configState.series,
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

      const otrosDocs = state.documentos.filter((d) => d.id !== id);
      const correlativo = generarCorrelativoSeguro(datos.serie, otrosDocs, configState.series);
      const numero = `${datos.serie}-${correlativo}`;
      const ahora = obtenerFechaHoraISO();

      const eventoGenerado = crearEvento('Documento generado desde borrador', session?.userName);
      const documentoGenerado: DocumentoComercial = {
        ...doc,
        tipo: datos.tipo,
        estado: 'Generada',
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
        historial: [...(doc.historial ?? []), eventoGenerado],
      };

      actualizarEnContext(documentoGenerado);
      return { exito: true, documento: documentoGenerado };
    },
    [
      validarDatos,
      state.documentos,
      configState.series,
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
      const eventoAnulacion = crearEvento(
        'Documento anulado',
        session?.userName,
        `Motivo: ${motivo.trim()}`,
      );
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
    [state.documentos, actualizarEnContext, session],
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

  return {
    generarDocumento,
    generarDesdeBorrador,
    guardarComoBorrador,
    actualizarDocumento,
    anularDocumento,
    duplicarDocumento,
    eliminarBorrador,
    validarDatos,
  };
}
