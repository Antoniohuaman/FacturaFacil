// app/web/src/features/documentos-comerciales/services/DocumentoValidationService.ts

import type { 
  DocumentoFormData, 
  DocumentoValidationRules,
  DocumentoCliente 
} from '../models/types';

/**
 * Servicio de validación
 * Interface Segregation: Interfaces específicas para cada tipo de validación
 */
export class DocumentoValidationService {
  private rules: DocumentoValidationRules = {
    cliente: {
      tipoDocumento: {
        RUC: { longitud: 11, pattern: /^[12]\d{10}$/ },
        DNI: { longitud: 8, pattern: /^\d{8}$/ },
        CE: { longitud: [9, 12], pattern: /^[A-Z0-9]+$/ }
      }
    },
    items: {
      cantidadMinima: 1,
      precioMinimo: 0.01,
      descuentoMaximoPorcentaje: 100
    },
    documento: {
      diasCreditoMaximo: 365,
      diasValidezMaximo: 90
    }
  };

  /**
   * Valida el documento completo
   */
  validarDocumento(data: DocumentoFormData): { valido: boolean; errores: string[] } {
    const errores: string[] = [];

    // Validar cliente
    const erroresCliente = this.validarCliente(data.cliente);
    errores.push(...erroresCliente);

    // Validar items
    if (!data.items || data.items.length === 0) {
      errores.push('Debe agregar al menos un item');
    } else {
      data.items.forEach((item, index) => {
        const erroresItem = this.validarItem(item);
        erroresItem.forEach(error => {
          errores.push(`Item ${index + 1}: ${error}`);
        });
      });
    }

    // Validar fechas
    if (data.tipo === 'COTIZACION' && data.validoHasta) {
      const fechaEmision = new Date(data.fechaEmision);
      const fechaVencimiento = new Date(data.validoHasta);
      
      if (fechaVencimiento <= fechaEmision) {
        errores.push('La fecha de validez debe ser posterior a la fecha de emisión');
      }
      
      const diasDiferencia = Math.ceil((fechaVencimiento.getTime() - fechaEmision.getTime()) / (1000 * 60 * 60 * 24));
      if (diasDiferencia > this.rules.documento.diasValidezMaximo) {
        errores.push(`La validez no puede superar ${this.rules.documento.diasValidezMaximo} días`);
      }
    }

    // Validar forma de pago
    if (data.formaPago === 'CREDITO') {
      if (!data.diasCredito || data.diasCredito < 1) {
        errores.push('Debe especificar los días de crédito');
      } else if (data.diasCredito > this.rules.documento.diasCreditoMaximo) {
        errores.push(`Los días de crédito no pueden superar ${this.rules.documento.diasCreditoMaximo}`);
      }
    }

    return {
      valido: errores.length === 0,
      errores
    };
  }

  /**
   * Valida datos del cliente
   */
  private validarCliente(cliente: DocumentoCliente): string[] {
    const errores: string[] = [];

    if (!cliente.razonSocial?.trim()) {
      errores.push('La razón social es requerida');
    }

    if (!cliente.numeroDocumento?.trim()) {
      errores.push('El número de documento es requerido');
    } else {
      // Solo validar tipos conocidos
      const tiposConReglas: ('RUC' | 'DNI' | 'CE')[] = ['RUC', 'DNI', 'CE'];
      if (tiposConReglas.includes(cliente.tipoDocumento as any)) {
        const reglas = this.rules.cliente.tipoDocumento[cliente.tipoDocumento as 'RUC' | 'DNI' | 'CE'];
      
        if (reglas) {
          const longitud = Array.isArray(reglas.longitud) 
            ? reglas.longitud 
            : [reglas.longitud, reglas.longitud];
        
          if (cliente.numeroDocumento.length < longitud[0] || cliente.numeroDocumento.length > longitud[1]) {
            errores.push(`El ${cliente.tipoDocumento} debe tener entre ${longitud[0]} y ${longitud[1]} caracteres`);
          }
        
          if (!reglas.pattern.test(cliente.numeroDocumento)) {
            errores.push(`El formato del ${cliente.tipoDocumento} no es válido`);
          }
        }
      }
    }

    if (!cliente.direccion?.trim()) {
      errores.push('La dirección es requerida');
    }

    if (cliente.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.correo)) {
      errores.push('El formato del correo no es válido');
    }

    return errores;
  }

  /**
   * Valida un item del documento
   */
  private validarItem(item: any): string[] {
    const errores: string[] = [];

    if (!item.descripcion?.trim()) {
      errores.push('La descripción es requerida');
    }

    if (item.cantidad < this.rules.items.cantidadMinima) {
      errores.push(`La cantidad mínima es ${this.rules.items.cantidadMinima}`);
    }

    if (item.precioUnitario < this.rules.items.precioMinimo) {
      errores.push(`El precio mínimo es ${this.rules.items.precioMinimo}`);
    }

    if (item.descuentoItem) {
      if (item.descuentoItem.tipo === 'PORCENTAJE') {
        if (item.descuentoItem.valor < 0 || item.descuentoItem.valor > this.rules.items.descuentoMaximoPorcentaje) {
          errores.push(`El descuento debe estar entre 0% y ${this.rules.items.descuentoMaximoPorcentaje}%`);
        }
      } else if (item.descuentoItem.tipo === 'MONTO') {
        const montoMaximo = item.cantidad * item.precioUnitario;
        if (item.descuentoItem.valor < 0 || item.descuentoItem.valor > montoMaximo) {
          errores.push('El descuento no puede ser mayor al monto del item');
        }
      }
    }

    return errores;
  }
}
