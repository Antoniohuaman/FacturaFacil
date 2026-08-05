import { describe, it, expect } from 'vitest';
import { prepararDatosNIDesdeCC, calcularCostoValorizableLineaCompra } from './mapeadorCCaNI';
import type { ComprobanteCompra } from '../modelos/ComprobanteCompra';
import type { LineaCompra } from '../modelos/LineaCompra';
import type { ContextoCostoValorizableCC } from './mapeadorCCaNI';

const CONTEXTO_BASE: ContextoCostoValorizableCC = { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' };

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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas[0].cantidad).toBe(30);
  });

  it('excluye líneas no inventariables (servicio)', () => {
    const cc = crearCC([crearLinea({ id: 'linea-servicio', clasificacion: 'servicio', esInventariable: false, afectaInventario: false })]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(0);
  });

  it('excluye líneas con afectaInventario=false aunque sean inventariables', () => {
    const cc = crearCC([crearLinea({ afectaInventario: false })], 'no_afecta_inventario');
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(0);
  });

  it('cantidadRecibida=0 no excluye la línea: la elegibilidad nunca depende de la recepción — la NI es el documento que la confirma', () => {
    const cc = crearCC([
      crearLinea({ cantidadRecibida: 0, cantidadDocumentadaInventariable: 24, factorConversionAplicado: 12 }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidad).toBe(24);
  });

  it('cantidadRecibida=100 no altera el resultado: la cantidad siempre viene de cantidadDocumentadaInventariable', () => {
    const cc = crearCC([
      crearLinea({ cantidadRecibida: 100, cantidadDocumentadaInventariable: 24, factorConversionAplicado: 12 }),
    ]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].cantidad).toBe(24);
  });

  it('cantidadDocumentadaInventariable=0 no produce una línea válida (cantidad ≤ 0 queda pendiente de validación)', () => {
    const cc = crearCC([crearLinea({ cantidadDocumentadaInventariable: 0, factorConversionAplicado: 12 })]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
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
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
  });

  it('es determinista: la misma entrada produce exactamente el mismo resultado', () => {
    const cc = crearCC([crearLinea()]);
    const a = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    const b = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(a).toEqual(b);
  });

  it('no muta el ComprobanteCompra de entrada (sin efectos secundarios)', () => {
    const cc = crearCC([crearLinea()]);
    const snapshot = JSON.parse(JSON.stringify(cc));
    prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(cc).toEqual(snapshot);
  });

  it('corrige el bug de auditoría: costoUnitario resultante es el costo por unidad mínima (total/cantidad), nunca el costo comercial bruto copiado sin dividir por el factor', () => {
    // factor 12, cantidad en unidad mínima 24, total=240 (subtotal=total, igv=0 en el fixture).
    // El bug auditado habría copiado costoUnitario=120 (el bruto comercial) tal cual.
    const cc = crearCC([crearLinea()]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].costoUnitario).toBe(10); // 240 / 24, NUNCA 120
    expect(resultado.lineas[0].costoUnitario).not.toBe(120);
    // La reconstrucción comercial (costoUnitarioBaseOriginal * factor) coincide con el costo bruto original
    // porque no hubo descuento ni exclusión de impuesto en este fixture — confirma el invariante, no una coincidencia forzada.
    expect(resultado.lineas[0].costoUnitarioComercialOriginal).toBe(120);
  });

  it('propaga el descuento por unidad aplicado en la línea de origen (informativo)', () => {
    const cc = crearCC([crearLinea({ descuentoUnitario: 5 })]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas[0].descuentoAplicado).toBe(5);
  });

  it('sin descuentoUnitario, descuentoAplicado es 0 (nunca undefined)', () => {
    const cc = crearCC([crearLinea()]);
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas[0].descuentoAplicado).toBe(0);
  });

  it('moneda extranjera con tipo de cambio histórico: propaga monedaOriginal y tipoCambioAplicado, convierte a moneda base', () => {
    const cc = crearCC([crearLinea({ subtotal: 100, total: 118, tipoAfectacion: 'gravado' })]);
    cc.moneda = 'USD';
    cc.tipoCambio = 3.8;
    const contextoUsd: ContextoCostoValorizableCC = { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' };
    const resultado = prepararDatosNIDesdeCC(cc, contextoUsd);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].monedaOriginal).toBe('USD');
    expect(resultado.lineas[0].tipoCambioAplicado).toBe(3.8);
  });

  it('moneda extranjera SIN tipo de cambio histórico válido: la línea queda pendiente de validación (nunca asume TC=1 ni lanza para todo el lote)', () => {
    const cc = crearCC([crearLinea()]);
    cc.moneda = 'USD';
    cc.tipoCambio = undefined;
    const resultado = prepararDatosNIDesdeCC(cc, CONTEXTO_BASE);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
    expect(resultado.lineasPendientesDeValidacion[0].motivo).toMatch(/tipo de cambio histórico/);
  });

  it('tratamientoImpuestoCompra pendiente_configuracion: la línea queda pendiente de validación, no lanza para todo el lote', () => {
    const cc = crearCC([crearLinea()]);
    const contextoPendiente: ContextoCostoValorizableCC = { tratamientoImpuestoCompra: 'pendiente_configuracion', monedaBase: 'PEN' };
    const resultado = prepararDatosNIDesdeCC(cc, contextoPendiente);
    expect(resultado.lineas).toHaveLength(0);
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(1);
    expect(resultado.lineasPendientesDeValidacion[0].motivo).toMatch(/pendiente de configuración/);
  });

  it('segun_afectacion sobre línea gravada no bloquea: esImpuestoRecuperable queda null y el costo conserva el impuesto (nunca se asume recuperabilidad)', () => {
    const cc = crearCC([crearLinea()]);
    const contextoSegunAfectacion: ContextoCostoValorizableCC = { tratamientoImpuestoCompra: 'segun_afectacion', monedaBase: 'PEN' };
    const resultado = prepararDatosNIDesdeCC(cc, contextoSegunAfectacion);
    expect(resultado.lineas).toHaveLength(1);
    expect(resultado.lineas[0].esImpuestoRecuperable).toBeNull();
    expect(resultado.lineasPendientesDeValidacion).toHaveLength(0);
  });
});

describe('calcularCostoValorizableLineaCompra', () => {
  const ccBase: Pick<ComprobanteCompra, 'moneda' | 'tipoCambio' | 'fechaRegistro'> = {
    moneda: 'PEN',
    tipoCambio: undefined,
    fechaRegistro: '2026-01-01',
  };

  it('factor 1, moneda base = moneda original, impuesto no recuperable: costo unitario = total / cantidad, TC=1', () => {
    const resultado = calcularCostoValorizableLineaCompra(
      { subtotal: 200, total: 236, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
      2,
      1,
      ccBase,
      { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
    );
    expect(resultado.esImpuestoRecuperable).toBe(false);
    expect(resultado.costoUnitarioBaseOriginal).toBe(118);
    expect(resultado.costoUnitarioBaseMonedaBase).toBe(118);
    expect(resultado.tipoCambioAplicado).toBe(1);
    expect(resultado.monedaOriginal).toBe('PEN');
    expect(resultado.costoUnitarioComercialOriginal).toBe(118);
  });

  it('factor 12, cantidad comercial ≠1, impuesto recuperable: excluye el impuesto (usa subtotal) y reconstruye el costo comercial multiplicando por el factor', () => {
    const resultado = calcularCostoValorizableLineaCompra(
      { subtotal: 2400, total: 2832, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
      24,
      12,
      ccBase,
      { tratamientoImpuestoCompra: 'impuesto_recuperable', monedaBase: 'PEN' }
    );
    expect(resultado.esImpuestoRecuperable).toBe(true);
    expect(resultado.costoUnitarioBaseOriginal).toBe(100);
    expect(resultado.costoUnitarioBaseMonedaBase).toBe(100);
    expect(resultado.costoUnitarioComercialOriginal).toBe(1200);
  });

  it('moneda extranjera con tipo de cambio histórico válido: convierte a moneda base con ese TC, nunca uno vigente', () => {
    const resultado = calcularCostoValorizableLineaCompra(
      { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
      1,
      1,
      { moneda: 'USD', tipoCambio: 3.8, fechaRegistro: '2026-01-01' },
      { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
    );
    expect(resultado.monedaOriginal).toBe('USD');
    expect(resultado.tipoCambioAplicado).toBe(3.8);
    expect(resultado.costoUnitarioBaseOriginal).toBe(118);
    expect(resultado.costoUnitarioBaseMonedaBase).toBe(448.4);
  });

  it('moneda extranjera sin tipo de cambio histórico válido: lanza, nunca asume TC=1', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1,
        1,
        { moneda: 'USD', tipoCambio: undefined, fechaRegistro: '2026-01-01' },
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
      )
    ).toThrow(/tipo de cambio histórico/);
  });

  it('segun_afectacion sobre categoría gravada: esImpuestoRecuperable queda null (sin determinación por línea) y el costo conserva el impuesto', () => {
    const resultado = calcularCostoValorizableLineaCompra(
      { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
      1,
      1,
      ccBase,
      { tratamientoImpuestoCompra: 'segun_afectacion', monedaBase: 'PEN' }
    );
    expect(resultado.esImpuestoRecuperable).toBeNull();
    expect(resultado.costoUnitarioBaseOriginal).toBe(118);
  });

  // PR-10/PR-11 (Corrección 5 / VAL-P1-007 / VAL-P2-004): el snapshot ya congelado en la línea
  // (`esImpuestoRecuperable`) es la ÚNICA fuente usada aquí — nunca se vuelve a derivar de
  // `contexto.tratamientoImpuestoCompra`, ni siquiera si ese contexto cambió después de que la
  // línea se registró.
  describe('snapshot de recuperabilidad (nunca se recalcula con la configuración vigente)', () => {
    it('PR-10: dos líneas del mismo comprobante, cada una con su propio snapshot, producen costos distintos y correctos', () => {
      const lineaExcluida = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0, esImpuestoRecuperable: true },
        1, 1, ccBase, { tratamientoImpuestoCompra: 'segun_afectacion', monedaBase: 'PEN' },
      );
      const lineaIncluida = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0, esImpuestoRecuperable: false },
        1, 1, ccBase, { tratamientoImpuestoCompra: 'segun_afectacion', monedaBase: 'PEN' },
      );
      expect(lineaExcluida.esImpuestoRecuperable).toBe(true);
      expect(lineaExcluida.costoUnitarioBaseOriginal).toBe(100); // subtotal, sin IGV
      expect(lineaIncluida.esImpuestoRecuperable).toBe(false);
      expect(lineaIncluida.costoUnitarioBaseOriginal).toBe(118); // total, con IGV
    });

    it('PR-11: un snapshot esImpuestoRecuperable=true se respeta aunque el CONTEXTO diga "impuesto_no_recuperable" (cambio posterior de configuración)', () => {
      const resultado = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0, esImpuestoRecuperable: true },
        1, 1, ccBase,
        // La configuración "vigente ahora" es la opuesta a lo que dice el snapshot de la línea —
        // el snapshot debe ganar siempre, nunca la configuración vigente al momento del cálculo.
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' },
      );
      expect(resultado.esImpuestoRecuperable).toBe(true);
      expect(resultado.costoUnitarioBaseOriginal).toBe(100);
    });

    it('PR-11: un snapshot esImpuestoRecuperable=false se respeta aunque el contexto diga "impuesto_recuperable"', () => {
      const resultado = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0, esImpuestoRecuperable: false },
        1, 1, ccBase,
        { tratamientoImpuestoCompra: 'impuesto_recuperable', monedaBase: 'PEN' },
      );
      expect(resultado.esImpuestoRecuperable).toBe(false);
      expect(resultado.costoUnitarioBaseOriginal).toBe(118);
    });

    it('línea histórica sin snapshot (esImpuestoRecuperable undefined) cae al fallback: se resuelve en vivo con el contexto, igual que antes de esta corrección', () => {
      const resultado = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1, 1, ccBase,
        { tratamientoImpuestoCompra: 'impuesto_recuperable', monedaBase: 'PEN' },
      );
      expect(resultado.esImpuestoRecuperable).toBe(true);
      expect(resultado.costoUnitarioBaseOriginal).toBe(100);
    });

    it('un snapshot esImpuestoRecuperable=null (indeterminado, ya resuelto así) nunca se reintenta con el contexto vigente', () => {
      const resultado = calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0, esImpuestoRecuperable: null },
        1, 1, ccBase,
        // Si se recalculara con el contexto, esto sería 'true' — el snapshot null debe prevalecer.
        { tratamientoImpuestoCompra: 'impuesto_recuperable', monedaBase: 'PEN' },
      );
      expect(resultado.esImpuestoRecuperable).toBeNull();
      expect(resultado.costoUnitarioBaseOriginal).toBe(118);
    });
  });

  it('categoría no gravada (exonerado): esImpuestoRecuperable siempre null sin importar el tratamiento de la empresa, costo = total', () => {
    const resultado = calcularCostoValorizableLineaCompra(
      { subtotal: 100, total: 100, tipoAfectacion: 'exonerado', descuentoUnitario: 0 },
      1,
      1,
      ccBase,
      { tratamientoImpuestoCompra: 'impuesto_recuperable', monedaBase: 'PEN' }
    );
    expect(resultado.esImpuestoRecuperable).toBeNull();
    expect(resultado.costoUnitarioBaseOriginal).toBe(100);
  });

  it('tratamientoImpuestoCompra pendiente_configuracion: lanza, nunca asume una regla', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1,
        1,
        ccBase,
        { tratamientoImpuestoCompra: 'pendiente_configuracion', monedaBase: 'PEN' }
      )
    ).toThrow(/pendiente de configuración/);
  });

  it('factor de conversión inválido (0): lanza, nunca asume factor 1', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1,
        0,
        ccBase,
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
      )
    ).toThrow(/factor de conversión/);
  });

  it('cantidad en unidad mínima inválida (0): lanza, nunca divide entre cero', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        0,
        1,
        ccBase,
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
      )
    ).toThrow(/cantidad en unidad mínima/);
  });

  it('importe neto de la línea no mayor a 0: lanza, nunca produce un costo cero o negativo', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 0, total: 0, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1,
        1,
        ccBase,
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: 'PEN' }
      )
    ).toThrow(/importe neto de la línea/);
  });

  it('moneda base no configurada (cadena vacía): lanza, nunca continúa sin moneda base real', () => {
    expect(() =>
      calcularCostoValorizableLineaCompra(
        { subtotal: 100, total: 118, tipoAfectacion: 'gravado', descuentoUnitario: 0 },
        1,
        1,
        ccBase,
        { tratamientoImpuestoCompra: 'impuesto_no_recuperable', monedaBase: '' }
      )
    ).toThrow(/moneda base configurada/);
  });
});
