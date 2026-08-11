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

describe('validarGREParaEmitir — GRE Transportista: Remitente + Destinatario + Pagador del flete', () => {
  /** El motivo ya no diferencia nada en Transportista — se fija en '13' (valor inerte) y en su
   * lugar el helper recibe si el transporte está subcontratado (indicador real, booleano). */
  function guiaTransportistaValida(opciones: { subcontratado?: boolean } = {}): GuiaRemision {
    return {
      ...guiaValidaBase(),
      tipo: 'transportista',
      motivoTraslado: '13',
      // GRE Transportista no usa M1/L (exclusivo de Remitente) — a diferencia de `guiaValidaBase`,
      // su transporte privado siempre registra vehículo(s) y conductor(es) reales.
      transportePrivado: {
        fechaInicioTraslado: '2026-08-08',
        vehiculosIds: ['veh-1'],
        conductoresIds: ['cond-1'],
      },
      destinatarioNombre: 'Destinatario Transportista S.A.C.',
      destinatarioNumeroDocumento: '20888888888',
      destinatarioTipoDocumento: 'RUC',
      remitenteNombre: 'Remitente Transportista S.A.C.',
      remitenteNumeroDocumento: '20999999999',
      remitenteTipoDocumento: 'RUC',
      pagadorFlete: 'Remitente',
      ...(opciones.subcontratado
        ? {
            transporteSubcontratado: true,
            subcontratadorNombre: 'Subcontratador S.A.C.',
            subcontratadorNumeroDocumento: '20777777777',
            subcontratadorTipoDocumento: 'RUC',
          }
        : {}),
    };
  }

  it('con Destinatario, Remitente y Pagador completos, no hay errores de actores', () => {
    const errores = validarGREParaEmitir(guiaTransportistaValida());
    expect(errores.destinatario).toBeUndefined();
    expect(errores.remitente).toBeUndefined();
    expect(errores.pagadorFlete).toBeUndefined();
  });

  it('sin Remitente es inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), remitenteNombre: '' });
    expect(errores.remitente).toBe('El Remitente es obligatorio.');
  });

  it('sin Destinatario es inválido — sigue siendo el actor principal, igual que en Remitente', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), destinatarioNombre: '' });
    expect(errores.destinatario).toBe('El Destinatario es obligatorio.');
  });

  it('Destinatario "mismo remitente" (switch ON, snapshot del Remitente) satisface la obligatoriedad', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      destinatarioEsMismoRemitente: true,
      destinatarioNombre: 'Remitente Transportista S.A.C.',
      destinatarioNumeroDocumento: '20999999999',
    });
    expect(errores.destinatario).toBeUndefined();
  });

  it('nunca exige "Especifique el motivo" — Transportista no usa motivo de traslado para nada', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), especificacionMotivo: undefined });
    expect(errores.especificacion).toBeUndefined();
  });

  it('sin Pagador del flete es inválido — es obligatorio en Transportista', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), pagadorFlete: undefined });
    expect(errores.pagadorFlete).toBe('Debe indicar quién paga el flete.');
  });

  it('Pagador = Subcontratador sin transporteSubcontratado activo: inválido — combinación incoherente aunque exista un subcontratadorNombre', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      pagadorFlete: 'Subcontratador',
      transporteSubcontratado: false,
      subcontratadorNombre: 'Sub S.A.C.',
    });
    expect(errores.pagadorFlete).toBeDefined();
  });

  it('Pagador = Subcontratador con transporteSubcontratado activo pero sin Subcontratador consignado: inválido', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida({ subcontratado: true }),
      pagadorFlete: 'Subcontratador',
      subcontratadorNombre: '',
    });
    expect(errores.pagadorFlete).toBeDefined();
  });

  it('Pagador = Subcontratador con transporteSubcontratado activo y Subcontratador consignado: válido', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida({ subcontratado: true }), pagadorFlete: 'Subcontratador' });
    expect(errores.pagadorFlete).toBeUndefined();
  });

  it('Pagador = Otro sin tercero pagador: inválido', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), pagadorFlete: 'Otro', pagadorTerceroNombre: undefined });
    expect(errores.pagadorFlete).toBeDefined();
  });

  it('Pagador = Otro con tercero pagador consignado (mismo buscador real de terceros): válido', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      pagadorFlete: 'Otro',
      pagadorTerceroNombre: 'Tercero Pagador S.A.C.',
      pagadorTerceroNumeroDocumento: '20666666666',
    });
    expect(errores.pagadorFlete).toBeUndefined();
  });

  it('transporteSubcontratado=true exige Subcontratador consignado', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida({ subcontratado: true }), subcontratadorNombre: '' });
    expect(errores.subcontratador).toBe('El Subcontratador es obligatorio cuando el transporte es subcontratado.');
  });

  it('transporteSubcontratado=false (u omitido) no exige Subcontratador', () => {
    expect(validarGREParaEmitir(guiaTransportistaValida()).subcontratador).toBeUndefined();
    expect(validarGREParaEmitir({ ...guiaTransportistaValida(), transporteSubcontratado: false }).subcontratador).toBeUndefined();
  });

  it('GRE Transportista siempre valida contra transportePrivado, sin importar modalidadTransporte — el selector público/privado es exclusivo de Remitente', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), modalidadTransporte: '01', transportePublico: undefined });
    expect(errores.transporte).toBeUndefined();
  });

  it('GRE Transportista con vehículos/conductores propios (no M1/L) sigue validando correctamente contra transportePrivado', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      transportePrivado: {
        fechaInicioTraslado: '2026-08-08',
        vehiculosIds: ['veh-1'],
        conductoresIds: ['cond-1'],
        esM1oL: false,
      },
    });
    expect(errores.transporte).toBeUndefined();
  });

  it('M1/L es exclusivo de GRE Remitente: un valor legacy esM1oL=true en Transportista NUNCA desvía la validación a "solo placa" — sigue exigiendo vehículo y conductor', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      transportePrivado: {
        fechaInicioTraslado: '2026-08-08',
        vehiculosIds: [],
        conductoresIds: [],
        esM1oL: true,
        placaVehiculoM1L: 'ABC-123',
      },
    });
    expect(errores.transporte).toBe('Debe asignar al menos un vehículo.');
  });

  it('M1/L legacy en Transportista con vehículo y conductor asignados: válido (la placa M1/L nunca se exige)', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      transportePrivado: {
        fechaInicioTraslado: '2026-08-08',
        vehiculosIds: ['veh-1'],
        conductoresIds: ['cond-1'],
        esM1oL: true,
      },
    });
    expect(errores.transporte).toBeUndefined();
  });

  it('indicadorTrasladoTotalBienes=true con documento relacionado válido: no exige bienes en el detalle', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      bienes: [],
      indicadorTrasladoTotalBienes: true,
      documentosRelacionados: [{ id: 'doc-1', origen: 'EXTERNO', tipoDocumentoCodigo: '01', numeroDocumento: 'F001-1' }],
    });
    expect(errores.bienes).toBeUndefined();
  });

  it('indicadorTrasladoTotalBienes=true SIN documento relacionado: sigue exigiendo bienes — el indicador solo no basta', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      bienes: [],
      indicadorTrasladoTotalBienes: true,
      documentosRelacionados: [],
    });
    expect(errores.bienes).toBe('Debe incluir al menos un bien.');
  });

  it('indicadorTrasladoTotalBienes=false con documento relacionado pero sin bienes: sigue exigiendo bienes', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      bienes: [],
      indicadorTrasladoTotalBienes: false,
      documentosRelacionados: [{ id: 'doc-1', origen: 'EXTERNO', tipoDocumentoCodigo: '01', numeroDocumento: 'F001-1' }],
    });
    expect(errores.bienes).toBe('Debe incluir al menos un bien.');
  });

  it('indicadorTrasladoTotalBienes=true SIN documento relacionado: inválido en dominio, no solo deshabilitado en UI — protege incluso un borrador legacy que llegó a este estado', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      indicadorTrasladoTotalBienes: true,
      documentosRelacionados: [],
    });
    expect(errores.documentosRelacionados).toBe(
      'El traslado por el total de los bienes consignados requiere al menos un documento relacionado.',
    );
  });

  it('indicadorTrasladoTotalBienes=true CON documento relacionado: sin error de documentos relacionados', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida(),
      indicadorTrasladoTotalBienes: true,
      documentosRelacionados: [{ id: 'doc-1', origen: 'EXTERNO', tipoDocumentoCodigo: '01', numeroDocumento: 'F001-1' }],
    });
    expect(errores.documentosRelacionados).toBeUndefined();
  });

  it('indicadorTrasladoTotalBienes=false (u omitido): nunca exige documentos relacionados por esta regla, con o sin ellos', () => {
    expect(validarGREParaEmitir({ ...guiaTransportistaValida(), indicadorTrasladoTotalBienes: false, documentosRelacionados: [] }).documentosRelacionados).toBeUndefined();
    expect(validarGREParaEmitir(guiaTransportistaValida()).documentosRelacionados).toBeUndefined();
  });

  it('Subcontratador con RUC: válido', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida({ subcontratado: true }),
      subcontratadorTipoDocumento: 'RUC',
    });
    expect(errores.subcontratador).toBeUndefined();
  });

  it('Subcontratador con DNI: inválido — debe identificarse siempre con RUC (es una empresa, no una persona natural)', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida({ subcontratado: true }),
      subcontratadorTipoDocumento: 'DNI',
    });
    expect(errores.subcontratador).toBe('El Subcontratador debe identificarse con RUC.');
  });

  it('Subcontratador con Carné de Extranjería: inválido', () => {
    const errores = validarGREParaEmitir({
      ...guiaTransportistaValida({ subcontratado: true }),
      subcontratadorTipoDocumento: 'CE',
    });
    expect(errores.subcontratador).toBe('El Subcontratador debe identificarse con RUC.');
  });

  it('Pagador sin definir (undefined): sigue siendo obligatorio indicar Remitente, Subcontratador u Otro', () => {
    const errores = validarGREParaEmitir({ ...guiaTransportistaValida(), pagadorFlete: undefined });
    expect(errores.pagadorFlete).toBe('Debe indicar quién paga el flete.');
  });
});
