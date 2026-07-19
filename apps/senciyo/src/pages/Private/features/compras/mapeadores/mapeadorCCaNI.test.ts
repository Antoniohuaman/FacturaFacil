import { describe, it, expect } from 'vitest';
import { prepararDatosNIDesdeCC } from './mapeadorCCaNI';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';

function crearLinea(overrides: Partial<LineaCompra> = {}): LineaCompra {
  return {
    id: 'linea-1',
    nombreProducto: 'Producto de prueba',
    clasificacion: 'producto',
    esInventariable: true,
    afectaInventario: true,
    unidadMedida: 'Caja x 12',
    unidadMedidaCodigo: 'BX',
    unidadesDisponibles: [
      { code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 },
      { code: 'BX', label: 'Caja x 12', factorConversion: 12 },
    ],
    factorConversionAplicado: 12,
    cantidadDocumentadaInventariable: 24,
    cantidadSolicitada: 2,
    cantidadRecibida: 2,
    cantidadFacturada: 2,
    cantidadIngresadaInventario: 0,
    cantidadPendienteRecepcion: 0,
    cantidadPendienteFacturacion: 0,
    cantidadPendienteInventario: 2,
    costoUnitario: 120,
    subtotal: 240,
    tipoAfectacion: 'gravado',
    igv: 0,
    total: 240,
    ...overrides,
  };
}

function crearCC(lineas: LineaCompra[], modalidadInventario: ComprobanteCompra['modalidadInventario'] = 'con_nota_ingreso'): ComprobanteCompra {
  return {
    id: 'cc-1',
    tipoRegistro: 'comprobante_compra',
    fechaRegistro: '2026-01-01',
    proveedorId: 'prov-1',
    proveedorTipoDocumento: 'RUC',
    proveedorNumeroDocumento: '20123456789',
    proveedorNombre: 'Proveedor de prueba',
    moneda: 'PEN',
    formaPago: 'contado',
    modalidadInventario,
    lineas,
    totales: { subtotal: 0, subtotalExonerado: 0, subtotalInafecto: 0, descuentoTotal: 0, igv: 0, total: 0, moneda: 'PEN' },
    adjuntos: [],
    historial: [],
    fechaCreacion: '2026-01-01',
    fechaActualizacion: '2026-01-01',
    estadoDocumento: 'registrado',
    estadoPago: 'pendiente',
    estadoInventario: 'pendiente',
  };
}

describe('prepararDatosNIDesdeCC', () => {
  it('caso obligatorio: línea con snapshot canónico (cantidadDocumentadaInventariable=24) produce cantidad 24', () => {
    const cc = crearCC([crearLinea()]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidadComercialOriginal).toBe(2);
    expect(resultado.lineas[0].unidadComercialOriginal).toBe('Caja x 12');
    expect(resultado.lineas[0].factorConversionAplicado).toBe(12);
    expect(resultado.lineas[0].cantidad).toBe(24);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(0);
  });

  it('la fuente canónica es cantidadDocumentadaInventariable, NUNCA cantidadRecibida — cantidadRecibida=1 no altera el resultado', () => {
    const cc = crearCC([
      crearLinea({
        cantidadDocumentadaInventariable: 24,
        factorConversionAplicado: 12,
        cantidadSolicitada: 2,
        cantidadRecibida: 1, // deliberadamente distinto — no debe gobernar el snapshot
      }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidad).toBe(24);
  });

  it('el snapshot no se multiplica dos veces: se copia tal cual, incluso si difiere de cantidadSolicitada×factor', () => {
    // Snapshot deliberadamente "inconsistente" con cantidadSolicitada×factor (2×12=24 ≠ 30) para
    // demostrar que el mapeador COPIA el valor ya persistido, nunca lo recalcula multiplicando.
    const cc = crearCC([
      crearLinea({
        cantidadDocumentadaInventariable: 30,
        factorConversionAplicado: 12,
        cantidadSolicitada: 2,
      }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas[0].cantidad).toBe(30);
  });

  it('excluye líneas no inventariables (servicio)', () => {
    const cc = crearCC([crearLinea({ id: 'linea-servicio', clasificacion: 'servicio', esInventariable: false, afectaInventario: false })]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(0);
  });

  it('excluye líneas con afectaInventario=false aunque sean inventariables', () => {
    const cc = crearCC([crearLinea({ afectaInventario: false })], 'no_afecta_inventario');
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(0);
  });

  it('cantidadRecibida=0 no excluye la línea: la elegibilidad nunca depende de la recepción — la NI es el documento que la confirma', () => {
    const cc = crearCC([
      crearLinea({ cantidadRecibida: 0, cantidadDocumentadaInventariable: 24, factorConversionAplicado: 12 }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidad).toBe(24);
  });

  it('cantidadRecibida=100 no altera el resultado: la cantidad siempre viene de cantidadDocumentadaInventariable', () => {
    const cc = crearCC([
      crearLinea({ cantidadRecibida: 100, cantidadDocumentadaInventariable: 24, factorConversionAplicado: 12 }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidad).toBe(24);
  });

  it('cantidadDocumentadaInventariable=0 no produce una línea válida (cantidad ≤ 0 queda pendiente de validación)', () => {
    const cc = crearCC([crearLinea({ cantidadDocumentadaInventariable: 0, factorConversionAplicado: 12 })]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
  });

  it('línea histórica sin snapshot canónico, con unidad ambigua (factor no disponible en unidadesDisponibles), queda pendiente de validación (no asume factor 1)', () => {
    const cc = crearCC([
      crearLinea({
        factorConversionAplicado: undefined,
        cantidadDocumentadaInventariable: undefined,
        // unidadesDisponibles anterior al saneamiento: sin factorConversion por opción.
        unidadesDisponibles: [
          { code: 'NIU', label: 'Unidad', isBase: true },
          { code: 'BX', label: 'Caja x 12' },
        ],
      }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
    expect(resultado.lineasPendientesDeValidacion[0].lineaCompraId).toBe('linea-1');
  });

  it('línea histórica sin snapshot canónico, pero con unidad mínima demostrable, resuelve factor 1', () => {
    const cc = crearCC([
      crearLinea({
        factorConversionAplicado: undefined,
        cantidadDocumentadaInventariable: undefined,
        unidadMedidaCodigo: 'NIU',
        unidadesDisponibles: [{ code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 }],
      }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].factorConversionAplicado).toBe(1);
    expect(resultado.lineas[0].cantidad).toBe(2);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(0);
  });

  it('línea histórica con factor inválido (0) queda pendiente de validación, nunca asume un valor', () => {
    const cc = crearCC([
      crearLinea({
        factorConversionAplicado: undefined,
        cantidadDocumentadaInventariable: undefined,
        unidadesDisponibles: [
          { code: 'NIU', label: 'Unidad', isBase: true, factorConversion: 1 },
          { code: 'BX', label: 'Caja x 12', factorConversion: 0 },
        ],
      }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
  });

  it('es determinista: la misma entrada produce exactamente el mismo resultado', () => {
    const cc = crearCC([crearLinea()]);
    const a = prepararDatosNIDesdeCC(cc);
    const b = prepararDatosNIDesdeCC(cc);
    expect(a).toEqual(b);
  });

  it('no muta el ComprobanteCompra de entrada (sin efectos secundarios)', () => {
    const cc = crearCC([crearLinea()]);
    const snapshot = JSON.parse(JSON.stringify(cc));
    prepararDatosNIDesdeCC(cc);
    expect(cc).toEqual(snapshot);
  });
});
