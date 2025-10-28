/**
 * Hook para cargar datos de comprobante duplicado
 * Extrae la lógica de duplicación del componente principal
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface DuplicateData {
  tipo?: string;
  serie?: string;
  client?: string;
  clientDoc?: string;
  address?: string;
  email?: string;
  items?: any[];
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
  setObservaciones: (value: string) => void;
  setNotaInterna: (value: string) => void;
  setFormaPago: (value: string) => void;
  changeCurrency: (value: any) => void; // Acepta cualquier tipo para ser compatible
  setTipoComprobante: (tipo: 'boleta' | 'factura') => void;
  setOptionalFields: (fields: Record<string, any>) => void;
}

/**
 * Hook que detecta y carga datos de duplicación O conversión desde location.state
 */
export const useDuplicateDataLoader = (handlers: DuplicateDataHandlers) => {
  const location = useLocation();

  useEffect(() => {
    const state = location.state as any;
    
    // Detectar si viene de duplicación o de conversión de cotización/nota de venta
    const duplicateData = state?.duplicate as DuplicateData | undefined;
    const conversionData = state?.conversionData as DuplicateData | undefined;
    const isFromConversion = state?.fromConversion === true;
    
    const dataToLoad = isFromConversion ? conversionData : duplicateData;

    if (!dataToLoad) return;

    if (isFromConversion) {
      console.log('� Cargando datos desde conversión de documento:', dataToLoad);
    } else {
      console.log('�📋 Cargando datos de comprobante duplicado:', dataToLoad);
    }

    // 1. Cargar cliente si existe
    if (dataToLoad.client || (dataToLoad as any).cliente) {
      const clienteData = (dataToLoad as any).cliente || {
        nombre: dataToLoad.client,
        dni: dataToLoad.clientDoc,
        direccion: dataToLoad.address,
        email: dataToLoad.email
      };
      
      handlers.setClienteSeleccionadoGlobal({
        nombre: clienteData.nombre || dataToLoad.client || '',
        dni: clienteData.dni || dataToLoad.clientDoc || '',
        direccion: clienteData.direccion || dataToLoad.address || '',
        email: clienteData.email || dataToLoad.email
      });
    }

    // 2. Cargar productos al carrito si existen
    if (dataToLoad.items && Array.isArray(dataToLoad.items) && dataToLoad.items.length > 0) {
      const productsToAdd = dataToLoad.items.map((item: any) => ({
        product: item,
        quantity: item.quantity || 1
      }));
      handlers.addProductsFromSelector(productsToAdd);
    }

    // 3. Cargar observaciones y nota interna
    if (dataToLoad.observaciones) {
      handlers.setObservaciones(dataToLoad.observaciones);
    }
    if (dataToLoad.notaInterna) {
      handlers.setNotaInterna(dataToLoad.notaInterna);
    }

    // 4. Cargar forma de pago
    if (dataToLoad.formaPago) {
      handlers.setFormaPago(dataToLoad.formaPago);
    }

    // 5. Cargar moneda
    if (dataToLoad.currency || (dataToLoad as any).moneda) {
      const currency = dataToLoad.currency || (dataToLoad as any).moneda;
      handlers.changeCurrency(currency);
    }

    // 6. Cargar tipo de comprobante
    if (dataToLoad.tipo || (dataToLoad as any).tipoComprobante) {
      const tipo = (dataToLoad.tipo || (dataToLoad as any).tipoComprobante || '').toLowerCase();
      const tipoFinal = tipo === 'factura' ? 'factura' : 'boleta';
      handlers.setTipoComprobante(tipoFinal);
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
      handlers.setOptionalFields(optionalFields);
    }

    // 8. Si es conversión, guardar el ID del documento origen para crear la relación
    if (isFromConversion && (dataToLoad as any).sourceDocumentId) {
      // Guardar en sessionStorage para usarlo al emitir el comprobante
      sessionStorage.setItem('conversionSourceId', (dataToLoad as any).sourceDocumentId);
      sessionStorage.setItem('conversionSourceType', (dataToLoad as any).sourceDocumentType || '');
    }

    // 9. Limpiar el state de navegación para que no se vuelva a cargar
    window.history.replaceState({}, document.title);

  }, [location.state]); // Dependencia: location.state para que se ejecute cuando cambie

  return null; // Este hook no retorna nada, solo ejecuta efectos
};
