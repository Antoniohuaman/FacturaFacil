import type { ConfiguracionDocumentos } from '../models/types';

/**
 * Servicio generador de números y códigos
 * Single Responsibility: Solo genera identificadores
 */
export class DocumentoGeneratorService {
  private configuracion: ConfiguracionDocumentos = {
    cotizacion: {
      prefijo: 'COT',
      serie: '001',
      siguienteNumero: 1,
      diasValidezDefecto: 15
    },
    notaVenta: {
      prefijo: 'NV',
      serie: '001',
      siguienteNumero: 1
    },
    igvPorcentaje: 0.18,
    monedaDefecto: 'PEN',
    tipoCambioDefecto: 3.75,
    mostrarPreciosConIGV: true,
    permitirEditarImpuestos: false,
    permitirDescuentosItem: true,
    permitirDescuentoGlobal: true,
    uiVisibilityDefecto: {
      establecimiento: true,
      vendedor: true,
      formaPago: true,
      validoHasta: true,
      correo: true,
      telefono: false,
      codigo: true,
      codigoBarras: false,
      marca: true,
      modelo: false,
      descuentoItem: true,
      descuentoGlobal: true,
      condiciones: true,
      bancos: false,
      referencias: true
    }
  };

  generarId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  generarNumeroCotizacion(): string {
    const { prefijo, serie, siguienteNumero } = this.configuracion.cotizacion;
    const numero = siguienteNumero.toString().padStart(8, '0');
    this.configuracion.cotizacion.siguienteNumero++;
    return `${prefijo}${serie}-${numero}`;
  }

  generarNumeroNotaVenta(): string {
    const { prefijo, serie, siguienteNumero } = this.configuracion.notaVenta;
    const numero = siguienteNumero.toString().padStart(8, '0');
    this.configuracion.notaVenta.siguienteNumero++;
    return `${prefijo}${serie}-${numero}`;
  }

  obtenerConfiguracion(): ConfiguracionDocumentos {
    return { ...this.configuracion };
  }

  actualizarConfiguracion(config: Partial<ConfiguracionDocumentos>): void {
    this.configuracion = { ...this.configuracion, ...config };
  }
}

// ============================================================