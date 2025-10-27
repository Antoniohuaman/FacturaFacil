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
 * Hook que detecta y carga datos de duplicación desde location.state
 */
export const useDuplicateDataLoader = (handlers: DuplicateDataHandlers) => {
  const location = useLocation();

  useEffect(() => {
    const duplicateData = (location.state as any)?.duplicate as DuplicateData | undefined;

    if (!duplicateData) return;

    console.log('📋 Cargando datos de comprobante duplicado:', duplicateData);

    // 1. Cargar cliente si existe
    if (duplicateData.client) {
      handlers.setClienteSeleccionadoGlobal({
        nombre: duplicateData.client,
        dni: duplicateData.clientDoc || '',
        direccion: duplicateData.address || '',
        email: duplicateData.email
      });
    }

    // 2. Cargar productos al carrito si existen
    if (duplicateData.items && Array.isArray(duplicateData.items) && duplicateData.items.length > 0) {
      const productsToAdd = duplicateData.items.map((item: any) => ({
        product: item,
        quantity: item.quantity || 1
      }));
      handlers.addProductsFromSelector(productsToAdd);
    }

    // 3. Cargar observaciones y nota interna
    if (duplicateData.observaciones) {
      handlers.setObservaciones(duplicateData.observaciones);
    }
    if (duplicateData.notaInterna) {
      handlers.setNotaInterna(duplicateData.notaInterna);
    }

    // 4. Cargar forma de pago
    if (duplicateData.formaPago) {
      handlers.setFormaPago(duplicateData.formaPago);
    }

    // 5. Cargar moneda
    if (duplicateData.currency) {
      handlers.changeCurrency(duplicateData.currency);
    }

    // 6. Cargar tipo de comprobante
    if (duplicateData.tipo) {
      const tipo = duplicateData.tipo.toLowerCase() === 'factura' ? 'factura' : 'boleta';
      handlers.setTipoComprobante(tipo);
    }

    // 7. Cargar campos opcionales
    const optionalFields: Record<string, any> = {};

    if (duplicateData.fechaVencimiento) {
      optionalFields.fechaVencimiento = duplicateData.fechaVencimiento;
    }
    if (duplicateData.direccionEnvio || duplicateData.shippingAddress) {
      optionalFields.direccionEnvio = duplicateData.direccionEnvio || duplicateData.shippingAddress;
    }
    if (duplicateData.ordenCompra || duplicateData.purchaseOrder) {
      optionalFields.ordenCompra = duplicateData.ordenCompra || duplicateData.purchaseOrder;
    }
    if (duplicateData.guiaRemision || duplicateData.waybill) {
      optionalFields.guiaRemision = duplicateData.guiaRemision || duplicateData.waybill;
    }
    if (duplicateData.centroCosto || duplicateData.costCenter) {
      optionalFields.centroCosto = duplicateData.centroCosto || duplicateData.costCenter;
    }
    if (duplicateData.address) {
      optionalFields.direccion = duplicateData.address;
    }
    if (duplicateData.email) {
      optionalFields.correo = duplicateData.email;
    }

    if (Object.keys(optionalFields).length > 0) {
      handlers.setOptionalFields(optionalFields);
    }

    // 8. Limpiar el state de navegación para que no se vuelva a cargar
    window.history.replaceState({}, document.title);

  }, [location.state]); // Dependencia: location.state para que se ejecute cuando cambie

  return null; // Este hook no retorna nada, solo ejecuta efectos
};
