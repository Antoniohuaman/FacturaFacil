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
} from '../models/documentoComercial.types';
import {
  generarIdDocumento,
  generarIdBorrador,
  generarCorrelativoSeguro,
  obtenerFechaHoraISO,
  obtenerFechaHoyISO,
} from '../utils/documentoComercial.helpers';
import type { CartItem, PaymentTotals } from '../models/documentoComercial.types';

const calcularTotalesItems = (items: CartItem[]): PaymentTotals => {
  if (!items || items.length === 0) {
    return { subtotal: 0, igv: 0, total: 0, currency: 'PEN' };
  }
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const precio = item.price * item.quantity;
    if (item.igvType === 'igv18') return sum + precio / 1.18;
    if (item.igvType === 'igv10') return sum + precio / 1.1;
    return sum + precio;
  }, 0);
  const igv = total - subtotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    igv: Math.round(igv * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: 'PEN',
  };
};

export interface ResultadoAccionDocumento {
  exito: boolean;
  documento?: DocumentoComercial;
  error?: string;
}

export interface UseDocumentoComercialActionsReturn {
  generarDocumento: (datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  guardarComoBorrador: (datos: DatosFormularioDocumentoComercial) => ResultadoAccionDocumento;
  actualizarDocumento: (id: string, datos: Partial<DatosFormularioDocumentoComercial>) => ResultadoAccionDocumento;
  anularDocumento: (id: string) => ResultadoAccionDocumento;
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
        totales: calcularTotalesItems(datos.items),
        items: datos.items,
        modoItems: datos.modoItems,
        observaciones: datos.observaciones,
        notaInterna: datos.notaInterna,
        camposOpcionales: datos.camposOpcionales,
        trazabilidad: datos.trazabilidad,
        establecimientoId: activeEstablecimientoId ?? undefined,
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
        totales: calcularTotalesItems(datos.items),
        items: datos.items,
        modoItems: datos.modoItems,
        observaciones: datos.observaciones,
        notaInterna: datos.notaInterna,
        camposOpcionales: datos.camposOpcionales,
        trazabilidad: datos.trazabilidad,
        establecimientoId: activeEstablecimientoId ?? undefined,
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

      const documentoActualizado: DocumentoComercial = {
        ...documentoExistente,
        ...datos,
        id,
        items,
        totales:
          datos.items !== undefined
            ? calcularTotalesItems(datos.items)
            : documentoExistente.totales,
        fechaActualizacion: ahora,
      };

      actualizarEnContext(documentoActualizado);
      return { exito: true, documento: documentoActualizado };
    },
    [state.documentos, actualizarEnContext],
  );

  const anularDocumento = useCallback(
    (id: string): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };
      if (doc.esBorrador)
        return { exito: false, error: 'No se puede anular un borrador. Use eliminar borrador.' };

      const actualizado: DocumentoComercial = {
        ...doc,
        estado: 'Anulada',
        fechaActualizacion: obtenerFechaHoraISO(),
      };
      actualizarEnContext(actualizado);
      return { exito: true, documento: actualizado };
    },
    [state.documentos, actualizarEnContext],
  );

  const duplicarDocumento = useCallback(
    (id: string, nuevoTipo?: TipoDocumentoComercial): ResultadoAccionDocumento => {
      const doc = state.documentos.find((d) => d.id === id);
      if (!doc) return { exito: false, error: 'Documento no encontrado.' };

      const ahora = obtenerFechaHoraISO();
      const tipo = nuevoTipo ?? doc.tipo;

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
        trazabilidad: {
          documentoOrigenId: doc.id,
          documentoOrigenTipo: doc.tipo,
          documentoOrigenNumero: doc.numero,
        },
      };

      agregarDocumento(duplicado);
      return { exito: true, documento: duplicado };
    },
    [state.documentos, agregarDocumento],
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
    guardarComoBorrador,
    actualizarDocumento,
    anularDocumento,
    duplicarDocumento,
    eliminarBorrador,
    validarDatos,
  };
}
