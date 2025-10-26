// app/web/src/features/documentos-comerciales/services/DocumentoCalculoService.ts

import type { 
  DocumentoItem, 
  DocumentoTotales, 
  TipoMoneda, 
  IDocumentoCalculoService 
} from '../models/types';

/**
 * Servicio de cálculo de documentos
 * Single Responsibility: Solo se encarga de cálculos
 */
export class DocumentoCalculoService implements IDocumentoCalculoService {
  private readonly IGV_DEFAULT = 0.18;

  /**
   * Calcula los totales del documento
   */
  calcularTotales(
    items: DocumentoItem[], 
    descuentoGlobal?: DocumentoTotales['descuentoGlobal'],
    igvPorcentaje: number = this.IGV_DEFAULT
  ): DocumentoTotales {
    // Calcular subtotales por tipo de operación
    let opGravada = 0;
    let opExonerada = 0;
    let opInafecta = 0;
    let totalDescuentosItem = 0;

    items.forEach(item => {
      const montoBase = item.cantidad * item.precioUnitario;
      const descuentoItem = item.descuentoItem?.monto || 0;
      const montoNeto = montoBase - descuentoItem;

      totalDescuentosItem += descuentoItem;

      switch (item.impuesto) {
        case 'IGV':
          opGravada += montoNeto;
          break;
        case 'EXONERADO':
          opExonerada += montoNeto;
          break;
        case 'INAFECTO':
          opInafecta += montoNeto;
          break;
      }
    });

    const subtotal = opGravada + opExonerada + opInafecta;

    // Calcular descuento global
    let montoDescuentoGlobal = 0;
    if (descuentoGlobal) {
      montoDescuentoGlobal = descuentoGlobal.tipo === 'PORCENTAJE'
        ? subtotal * (descuentoGlobal.valor / 100)
        : descuentoGlobal.valor;
      
      // Actualizar el monto calculado
      descuentoGlobal.monto = montoDescuentoGlobal;
    }

    // Aplicar descuento global proporcionalmente
    const factorDescuento = subtotal > 0 ? (subtotal - montoDescuentoGlobal) / subtotal : 1;
    opGravada *= factorDescuento;
    opExonerada *= factorDescuento;
    opInafecta *= factorDescuento;

    // Calcular IGV solo sobre operaciones gravadas
    const igv = opGravada * igvPorcentaje;

    // Total final
    const totalDescuentos = totalDescuentosItem + montoDescuentoGlobal;
    const total = opGravada + opExonerada + opInafecta + igv;

    return {
      descuentoGlobal,
      opGravada: this.redondear(opGravada),
      opExonerada: this.redondear(opExonerada),
      opInafecta: this.redondear(opInafecta),
      igv: this.redondear(igv),
      subtotal: this.redondear(subtotal),
      totalDescuentos: this.redondear(totalDescuentos),
      total: this.redondear(total),
      montoEnLetras: this.numeroALetras(total, 'PEN')
    };
  }

  /**
   * Calcula el importe de un item
   */
  calcularImporteItem(item: Partial<DocumentoItem>, conIGV: boolean = true): number {
    const cantidad = item.cantidad || 0;
    const precioUnitario = item.precioUnitario || 0;
    const montoBase = cantidad * precioUnitario;
    
    let descuento = 0;
    if (item.descuentoItem) {
      descuento = item.descuentoItem.tipo === 'PORCENTAJE'
        ? montoBase * (item.descuentoItem.valor / 100)
        : item.descuentoItem.valor;
    }

    const montoNeto = montoBase - descuento;
    
    if (conIGV && item.impuesto === 'IGV') {
      return this.redondear(montoNeto * (1 + this.IGV_DEFAULT));
    }
    
    return this.redondear(montoNeto);
  }

  /**
   * Convierte número a letras
   */
  numeroALetras(numero: number, moneda: TipoMoneda): string {
    const entero = Math.floor(numero);
    const decimal = Math.round((numero - entero) * 100);
    
    const monedaTexto = {
      'PEN': 'SOLES',
      'USD': 'DÓLARES AMERICANOS',
      'EUR': 'EUROS'
    };

    return `${this.convertirNumeroALetras(entero)} CON ${decimal.toString().padStart(2, '0')}/100 ${monedaTexto[moneda]}`;
  }

  private redondear(numero: number, decimales: number = 2): number {
    return Math.round(numero * Math.pow(10, decimales)) / Math.pow(10, decimales);
  }

  private convertirNumeroALetras(numero: number): string {
    // Implementación simplificada - en producción usar librería completa
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    if (numero === 0) return 'CERO';
    if (numero === 100) return 'CIEN';
    if (numero === 1000) return 'MIL';
    
    // Simplificado para el ejemplo
    if (numero < 10) return unidades[numero];
    if (numero < 100) return `${decenas[Math.floor(numero / 10)]} ${unidades[numero % 10]}`.trim();
    if (numero < 1000) return `${centenas[Math.floor(numero / 100)]} ${this.convertirNumeroALetras(numero % 100)}`.trim();
    if (numero < 1000000) {
      const miles = Math.floor(numero / 1000);
      const resto = numero % 1000;
      const milesTexto = miles === 1 ? 'MIL' : `${this.convertirNumeroALetras(miles)} MIL`;
      return resto > 0 ? `${milesTexto} ${this.convertirNumeroALetras(resto)}` : milesTexto;
    }
    
    return numero.toString();
  }
}

