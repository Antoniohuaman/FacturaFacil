import { describe, it, expect } from 'vitest';
import { validarGREParaEmitir, hayErrores } from './validacionGRE';
import { GUIA_REMISION_BORRADOR } from '../modelos/GuiaRemision';
import type { GuiaRemision, BienGRE } from '../modelos/GuiaRemision';

function bien(overrides: Partial<BienGRE> = {}): BienGRE {
  return {
    id: 'bien-1',
    descripcion: 'Producto A',
    unidad: 'NIU',
    cantidad: 1,
    normalizado: false,
    ...overrides,
  };
}

/** Guía Remitente, motivo '01' (regla base), con todos los campos mínimos completos — el punto de
 * partida de todas las pruebas de esta suite: se anula UN campo por prueba, nunca varios a la vez. */
function guiaValidaBase(): GuiaRemision {
  return {
    ...GUIA_REMISION_BORRADOR('remitente'),
    serie: 'T001',
    destinatarioNombre: 'Cliente de prueba',
    destinatarioTipoDocumento: 'RUC',
    destinatarioNumeroDocumento: '20123456789',
    bienes: [bien()],
    pesoTotal: 10,
    puntoPartida: { direccion: 'Av. Origen 123' },
    puntoLlegada: { direccion: 'Av. Destino 456' },
    modalidadTransporte: '02',
    transportePrivado: {
      fechaInicioTraslado: '2026-08-08',
      vehiculosIds: [],
      conductoresIds: [],
      esM1oL: true,
      placaVehiculoM1L: 'ABC-123',
    },
  };
}

describe('validarGREParaEmitir — guía válida de referencia', () => {
  it('la guía base de la suite no tiene errores', () => {
    expect(hayErrores(validarGREParaEmitir(guiaValidaBase()))).toBe(false);
  });
});

describe('validarGREParaEmitir — campos ya existentes', () => {
  it('serie vacía es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), serie: '' });
    expect(errores.serie).toBeDefined();
  });

  it('sin bienes es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [] });
    expect(errores.bienes).toBe('Debe incluir al menos un bien.');
  });

  it('peso total <= 0 es inválido', () => {
    expect(validarGREParaEmitir({ ...guiaValidaBase(), pesoTotal: 0 }).pesoTotal).toBeDefined();
    expect(validarGREParaEmitir({ ...guiaValidaBase(), pesoTotal: undefined }).pesoTotal).toBeDefined();
  });

  it('punto de partida sin dirección es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), puntoPartida: { direccion: '' } });
    expect(errores.puntoPartida).toBeDefined();
  });

  it('punto de llegada sin dirección es inválido cuando el motivo lo exige (motivo 01)', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), puntoLlegada: { direccion: '' } });
    expect(errores.puntoLlegada).toBeDefined();
  });

  it('sin datos de transporte privado es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), transportePrivado: undefined });
    expect(errores.transporte).toBeDefined();
  });
});

// GRE-P1-005 — cantidad de bienes: cada línea debe tener cantidad > 0 y finita.
describe('validarGREParaEmitir — cantidad de bienes (GRE-P1-005)', () => {
  it('cantidad entera positiva es válida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 1 })] });
    expect(errores.bienes).toBeUndefined();
  });

  it('cantidad decimal positiva es válida (el modelo lo permite)', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 2.5 })] });
    expect(errores.bienes).toBeUndefined();
  });

  it('cantidad 0 es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: 0 })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad negativa es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: -5 })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad NaN es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: NaN })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad Infinity es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: Infinity })] });
    expect(errores.bienes).toBeDefined();
  });

  it('cantidad -Infinity es inválida', () => {
    const errores = validarGREParaEmitir({ ...guiaValidaBase(), bienes: [bien({ cantidad: -Infinity })] });
    expect(errores.bienes).toBeDefined();
  });

  it('con varios bienes, basta que UNO tenga cantidad inválida para rechazar la emisión completa', () => {
    const errores = validarGREParaEmitir({
      ...guiaValidaBase(),
      bienes: [bien({ id: 'b1', cantidad: 3 }), bien({ id: 'b2', descripcion: 'Producto B', cantidad: 0 })],
    });
    expect(errores.bienes).toBeDefined();
  });

  it('el mensaje identifica el bien con la cantidad inválida', () => {
    const errores = validarGREParaEmitir({
      ...guiaValidaBase(),
      bienes: [bien({ descripcion: 'Producto Defectuoso', cantidad: -1 })],
    });
    expect(errores.bienes).toContain('Producto Defectuoso');
  });
});

describe('validarGREParaEmitir — motivo 03 (Venta con entrega a terceros): Destinatario + Comprador, ambos obligatorios', () => {
  function guiaVentaTercerosValida(): GuiaRemision {
    return {
      ...guiaValidaBase(),
      motivoTraslado: '03',
      destinatarioNombre: 'La Bodega de Lima S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20502380673',
      compradorNombre: 'Fundo La Bodega S.A.C.',
      compradorTipoDocumento: 'RUC',
      compradorNumeroDocumento: '20600638131',
    };
  }

  it('con Destinatario y Comprador completos, no hay errores de actores', () => {
    const errores = validarGREParaEmitir(guiaVentaTercerosValida());
    expect(errores.destinatario).toBeUndefined();
    expect(errores.comprador).toBeUndefined();
  });

  it('sin Comprador es inválido — el Comprador es obligatorio en Venta con entrega a terceros', () => {
    const errores = validarGREParaEmitir({ ...guiaVentaTercerosValida(), compradorNombre: '' });
    expect(errores.comprador).toBe('El Comprador es obligatorio.');
  });

  it('sin Destinatario (receptor) es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaVentaTercerosValida(), destinatarioNombre: '' });
    expect(errores.destinatario).toBeDefined();
  });
});

describe('validarGREParaEmitir — motivo 02 (Compra): Destinatario auto-derivado + Proveedor obligatorio', () => {
  function guiaCompraValida(): GuiaRemision {
    return {
      ...guiaValidaBase(),
      motivoTraslado: '02',
      // Destinatario = la propia empresa, ya poblado por el flujo de cambio de motivo (snapshot).
      destinatarioNombre: 'Empresa Emisora S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20111111111',
      proveedorNombre: 'Proveedor S.A.C.',
      proveedorTipoDocumento: 'RUC',
      proveedorNumeroDocumento: '20999999999',
    };
  }

  it('con destinatario (empresa) y Proveedor completos, no hay errores de actores', () => {
    const errores = validarGREParaEmitir(guiaCompraValida());
    expect(errores.destinatario).toBeUndefined();
    expect(errores.proveedor).toBeUndefined();
  });

  it('sin Proveedor (proveedorNombre vacío) es inválido — el Proveedor es obligatorio en Compra', () => {
    const errores = validarGREParaEmitir({ ...guiaCompraValida(), proveedorNombre: '' });
    expect(errores.proveedor).toBe('El Proveedor es obligatorio.');
  });

  it('sin destinatario (empresa no derivada) es inválido, con el mensaje bajo la etiqueta Destinatario', () => {
    const errores = validarGREParaEmitir({ ...guiaCompraValida(), destinatarioNombre: '' });
    expect(errores.destinatario).toBe('El Destinatario es obligatorio.');
  });
});

describe('validarGREParaEmitir — motivo 07 (Recojo de bienes transformados): misma regla central que Compra', () => {
  function guiaRecojoValida(): GuiaRemision {
    return {
      ...guiaValidaBase(),
      motivoTraslado: '07',
      destinatarioNombre: 'Empresa Emisora S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20111111111',
      proveedorNombre: 'Proveedor Transformador S.A.C.',
      proveedorTipoDocumento: 'RUC',
      proveedorNumeroDocumento: '20999999999',
    };
  }

  it('con destinatario (empresa) y Proveedor completos, no hay errores de actores', () => {
    const errores = validarGREParaEmitir(guiaRecojoValida());
    expect(errores.destinatario).toBeUndefined();
    expect(errores.proveedor).toBeUndefined();
  });

  it('sin Proveedor es inválido — el Proveedor es obligatorio en Recojo de bienes transformados', () => {
    const errores = validarGREParaEmitir({ ...guiaRecojoValida(), proveedorNombre: '' });
    expect(errores.proveedor).toBe('El Proveedor es obligatorio.');
  });

  it('sin destinatario (empresa no derivada) es inválido, con el mensaje bajo la etiqueta Destinatario', () => {
    const errores = validarGREParaEmitir({ ...guiaRecojoValida(), destinatarioNombre: '' });
    expect(errores.destinatario).toBe('El Destinatario es obligatorio.');
  });
});

describe('validarGREParaEmitir — motivo 13 (Otros): especificación obligatoria + Destinatario (switch) + Proveedor/Comprador opcionales y coexistentes', () => {
  function guiaOtrosValida(): GuiaRemision {
    return {
      ...guiaValidaBase(),
      motivoTraslado: '13',
      especificacionMotivo: 'Traslado por préstamo de maquinaria',
      destinatarioNombre: 'Tercero Destinatario S.A.C.',
      destinatarioTipoDocumento: 'RUC',
      destinatarioNumeroDocumento: '20555555555',
    };
  }

  it('sin especificación es inválido (obligatoria en Otros)', () => {
    const errores = validarGREParaEmitir({ ...guiaOtrosValida(), especificacionMotivo: '' });
    expect(errores.especificacion).toBe('Debe especificar el motivo de traslado.');
  });

  it('con especificación completa, no hay error de especificación — la validación de dominio es la que decide, no un modal', () => {
    const errores = validarGREParaEmitir(guiaOtrosValida());
    expect(errores.especificacion).toBeUndefined();
  });

  it('sin Proveedor ni Comprador es válido — ninguno es obligatorio por regla real de SUNAT para Otros', () => {
    const errores = validarGREParaEmitir(guiaOtrosValida());
    expect(errores.proveedor).toBeUndefined();
    expect(errores.comprador).toBeUndefined();
  });

  it('Destinatario switch OFF, sin tercero seleccionado: inválido (sigue siendo obligatorio como cualquier Destinatario)', () => {
    const errores = validarGREParaEmitir({ ...guiaOtrosValida(), destinatarioNombre: '' });
    expect(errores.destinatario).toBe('El Destinatario es obligatorio.');
  });

  it('Destinatario switch ON (empresa emisora auto-derivada) satisface la obligatoriedad igual que un tercero', () => {
    const errores = validarGREParaEmitir({
      ...guiaOtrosValida(),
      destinatarioEsMismoRemitente: true,
      destinatarioNombre: 'Empresa Emisora S.A.C.',
      destinatarioNumeroDocumento: '20111111111',
    });
    expect(errores.destinatario).toBeUndefined();
  });

  it('Proveedor y Comprador coexisten sin pisarse: ambos completos, ninguno reporta error', () => {
    const errores = validarGREParaEmitir({
      ...guiaOtrosValida(),
      proveedorNombre: 'Proveedor Otros S.A.C.',
      proveedorNumeroDocumento: '20666666666',
      compradorNombre: 'Comprador Otros S.A.C.',
      compradorNumeroDocumento: '20777777777',
    });
    expect(errores.proveedor).toBeUndefined();
    expect(errores.comprador).toBeUndefined();
  });

  it('solo Proveedor informado (sin Comprador): válido, y viceversa — ninguno depende de la presencia del otro', () => {
    const soloProveedor = validarGREParaEmitir({ ...guiaOtrosValida(), proveedorNombre: 'Proveedor Otros S.A.C.' });
    expect(soloProveedor.proveedor).toBeUndefined();
    expect(soloProveedor.comprador).toBeUndefined();

    const soloComprador = validarGREParaEmitir({ ...guiaOtrosValida(), compradorNombre: 'Comprador Otros S.A.C.' });
    expect(soloComprador.proveedor).toBeUndefined();
    expect(soloComprador.comprador).toBeUndefined();
  });
});
