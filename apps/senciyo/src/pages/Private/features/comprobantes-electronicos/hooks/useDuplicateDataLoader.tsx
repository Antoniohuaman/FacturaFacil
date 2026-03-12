/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/**
 * Hook para cargar datos de comprobante duplicado
 * Extrae la lógica de duplicación del componente principal
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  esCargaReutilizacionDocumentoComercial,
  extraerDatosRehidratacionDesdeInstantanea,
} from '../models/instantaneaDocumentoComercial';

export interface DuplicateData {
  tipo?: string;
  serie?: string;
  client?: string;
  clientDoc?: string;
  address?: string;
  email?: string;
  items?: any[];
  cartItems?: any[];
  productos?: any[];
  observaciones?: string;
  notaInterna?: string;
  formaPago?: string;
  currency?: string;
  fechaVencimiento?: string;
  direccionEnvio?: string;
  shippingAddress?: string;
  ordenCompra?: string;
  purchaseOrder?: string;
  guiaRemision?: string;
  waybill?: string;
  centroCosto?: string;
  costCenter?: string;
}

export interface DuplicateDataHandlers {
  setClienteSeleccionadoGlobal: (cliente: any) => void;
  addProductsFromSelector: (products: any[]) => void;
  setCartItemsFromDraft?: (items: any[]) => void;
  setModoProductos?: (mode: 'catalogo' | 'libre') => void;
  setObservaciones: (value: string) => void;
  setNotaInterna: (value: string) => void;
  setFormaPago: (value: string) => void;
  changeCurrency: (value: any) => void; // Acepta cualquier tipo para ser compatible
  setTipoComprobante: (tipo: 'boleta' | 'factura' | 'nota_credito') => void;
  setOptionalFields: (fields: Record<string, any>) => void;
}

/**
 * Hook que detecta y carga datos de duplicación O conversión desde location.state
 */
export const useDuplicateDataLoader = (handlers: DuplicateDataHandlers) => {
  const location = useLocation();
  const processedLocationKeyRef = useRef<string | null>(null);

  const {
    setClienteSeleccionadoGlobal,
    addProductsFromSelector,
    setCartItemsFromDraft,
    setModoProductos,
    setObservaciones,
    setNotaInterna,
    setFormaPago,
    changeCurrency,
    setTipoComprobante,
    setOptionalFields,
  } = handlers;

  useEffect(() => {
    const state = location.state as any;

    // Detectar si viene de duplicación o de conversión de cotización/nota de venta
    const duplicateData = state?.duplicate as DuplicateData | undefined;
    const conversionData = state?.conversionData as DuplicateData | undefined;
    const noteCreditData = state?.noteCredit as DuplicateData | undefined;
    const isFromConversion = state?.fromConversion === true;
    const isNoteCreditFlow = Boolean(noteCreditData);

    const dataToLoad = isNoteCreditFlow ? noteCreditData : isFromConversion ? conversionData : duplicateData;

    if (!dataToLoad) return;
    if (processedLocationKeyRef.current === location.key) return;

    processedLocationKeyRef.current = location.key;

    if (esCargaReutilizacionDocumentoComercial(dataToLoad)) {
      const datosRehidratacion = extraerDatosRehidratacionDesdeInstantanea(
        dataToLoad.instantaneaDocumentoComercial,
      );

      if (datosRehidratacion.cliente) {
        setClienteSeleccionadoGlobal({
          clienteId: datosRehidratacion.cliente.clienteId,
          nombre: datosRehidratacion.cliente.nombre,
          dni: datosRehidratacion.cliente.dni,
          direccion: datosRehidratacion.cliente.direccion,
          email: datosRehidratacion.cliente.email,
          tipoDocumento: datosRehidratacion.cliente.tipoDocumento,
          priceProfileId: datosRehidratacion.cliente.priceProfileId,
        });
      }

      if (datosRehidratacion.items.length > 0) {
        if (setCartItemsFromDraft) {
          setCartItemsFromDraft(datosRehidratacion.items);

          if (setModoProductos) {
            setModoProductos(datosRehidratacion.modoDetalle === 'libre' ? 'libre' : 'catalogo');
          }
        } else {
          addProductsFromSelector(
            datosRehidratacion.items.map((item) => ({
              product: item,
              quantity: item.quantity || 1,
            })),
          );
        }
      }

      setObservaciones(datosRehidratacion.observaciones);
      setNotaInterna(datosRehidratacion.notaInterna);

      if (datosRehidratacion.formaPago) {
        setFormaPago(datosRehidratacion.formaPago);
      }

      if (datosRehidratacion.moneda) {
        changeCurrency(datosRehidratacion.moneda);
      }

      if (
        !isNoteCreditFlow
        && (datosRehidratacion.tipoComprobante === 'factura' || datosRehidratacion.tipoComprobante === 'boleta')
      ) {
        setTipoComprobante(datosRehidratacion.tipoComprobante);
      }

      setOptionalFields(datosRehidratacion.camposOpcionales);

      if (isFromConversion) {
        const sourceDocumentId =
          dataToLoad.instantaneaDocumentoComercial.relaciones.idDocumentoFuente
          || dataToLoad.instantaneaDocumentoComercial.relaciones.documentoOrigenId;
        const sourceDocumentType =
          dataToLoad.instantaneaDocumentoComercial.relaciones.tipoDocumentoFuente
          || dataToLoad.instantaneaDocumentoComercial.relaciones.documentoOrigenTipo;

        if (sourceDocumentId) {
          sessionStorage.setItem('conversionSourceId', sourceDocumentId);
          sessionStorage.setItem('conversionSourceType', sourceDocumentType || '');
        }
      }

      window.history.replaceState({}, document.title);
      return;
    }

    // 1. Cargar cliente si existe
    if (dataToLoad.client || (dataToLoad as any).cliente) {
      const clienteData = (dataToLoad as any).cliente || {
        nombre: dataToLoad.client,
        dni: dataToLoad.clientDoc,
        direccion: dataToLoad.address,
        email: dataToLoad.email
      };
      
      setClienteSeleccionadoGlobal({
        nombre: clienteData.nombre || dataToLoad.client || '',
        dni: clienteData.dni || dataToLoad.clientDoc || '',
        direccion: clienteData.direccion || dataToLoad.address || '',
        email: clienteData.email || dataToLoad.email
      });
    }

    // 2. Cargar productos al carrito si existen
    const sourceItems = [
      dataToLoad.items,
      dataToLoad.cartItems,
      dataToLoad.productos,
      (dataToLoad as any).cartItems,
      (dataToLoad as any).productos,
    ].find((value) => Array.isArray(value) && value.length > 0);

    if (Array.isArray(sourceItems) && sourceItems.length > 0) {
      const normalizedItems = sourceItems.map((item: any) => {
        const baseItem = item?.product ? { ...item.product, ...item } : item;
        return {
          ...baseItem,
          quantity: item?.quantity ?? baseItem?.quantity ?? 1,
        };
      });

      if (setCartItemsFromDraft) {
        setCartItemsFromDraft(normalizedItems);

        const hasLibreItems = normalizedItems.some((item: any) => item?.tipoDetalle === 'libre');
        const hasCatalogItems = normalizedItems.some((item: any) => item?.tipoDetalle !== 'libre');

        if (setModoProductos) {
          setModoProductos(hasLibreItems && !hasCatalogItems ? 'libre' : 'catalogo');
        }
      } else {
        const productsToAdd = normalizedItems.map((item: any) => ({
          product: item,
          quantity: item?.quantity || 1
        }));
        addProductsFromSelector(productsToAdd);
      }
    }

    // 3. Cargar observaciones y nota interna
    if (dataToLoad.observaciones) {
      setObservaciones(dataToLoad.observaciones);
    }
    if (dataToLoad.notaInterna) {
      setNotaInterna(dataToLoad.notaInterna);
    }

    // 4. Cargar forma de pago
    if (dataToLoad.formaPago) {
      setFormaPago(dataToLoad.formaPago);
    }

    // 5. Cargar moneda
    if (dataToLoad.currency || (dataToLoad as any).moneda) {
      const currency = dataToLoad.currency || (dataToLoad as any).moneda;
      changeCurrency(currency);
    }

    // 6. Cargar tipo de comprobante
    if (dataToLoad.tipo || (dataToLoad as any).tipoComprobante) {
      const tipo = (dataToLoad.tipo || (dataToLoad as any).tipoComprobante || '').toLowerCase();
      const tipoFinal = tipo === 'factura' ? 'factura' : 'boleta';
      if (!isNoteCreditFlow) {
        setTipoComprobante(tipoFinal);
      }
    }

    // 7. Cargar campos opcionales
    const optionalFields: Record<string, any> = {};

    if (dataToLoad.fechaVencimiento) {
      optionalFields.fechaVencimiento = dataToLoad.fechaVencimiento;
    }
    if (dataToLoad.direccionEnvio || dataToLoad.shippingAddress) {
      optionalFields.direccionEnvio = dataToLoad.direccionEnvio || dataToLoad.shippingAddress;
    }
    if (dataToLoad.ordenCompra || dataToLoad.purchaseOrder) {
      optionalFields.ordenCompra = dataToLoad.ordenCompra || dataToLoad.purchaseOrder;
    }
    if (dataToLoad.guiaRemision || dataToLoad.waybill) {
      optionalFields.guiaRemision = dataToLoad.guiaRemision || dataToLoad.waybill;
    }
    if (dataToLoad.centroCosto || dataToLoad.costCenter) {
      optionalFields.centroCosto = dataToLoad.centroCosto || dataToLoad.costCenter;
    }
    if (dataToLoad.address) {
      optionalFields.direccion = dataToLoad.address;
    }
    if (dataToLoad.email) {
      optionalFields.correo = dataToLoad.email;
    }

    if (Object.keys(optionalFields).length > 0) {
      setOptionalFields(optionalFields);
    }

    // 8. Si es conversión, guardar el ID del documento origen para crear la relación
    if (isFromConversion && (dataToLoad as any).sourceDocumentId) {
      // Guardar en sessionStorage para usarlo al emitir el comprobante
      sessionStorage.setItem('conversionSourceId', (dataToLoad as any).sourceDocumentId);
      sessionStorage.setItem('conversionSourceType', (dataToLoad as any).sourceDocumentType || '');
    }

    // 9. Limpiar el state de navegación para que no se vuelva a cargar
    window.history.replaceState({}, document.title);

  }, [
    location.key,
    location.state,
    addProductsFromSelector,
    changeCurrency,
    setClienteSeleccionadoGlobal,
    setCartItemsFromDraft,
    setModoProductos,
    setFormaPago,
    setNotaInterna,
    setObservaciones,
    setOptionalFields,
    setTipoComprobante,
  ]);

  return null; // Este hook no retorna nada, solo ejecuta efectos
};
