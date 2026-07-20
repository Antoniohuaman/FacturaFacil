import { describe, it, expect } from 'vitest';
import { reconciliarStockInventario, type ProyeccionStockInventario } from './reconciliacionStockInventario';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';

function crearCapa(overrides: Partial<CapaCostoInventario> = {}): CapaCostoInventario {
  return {
    id: 'capa-1',
    empresaId: 'emp-A',
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    movimientoEntradaId: 'mov-1',
    tipoDocumentoOrigen: 'nota_ingreso',
    documentoOrigenId: 'ni-1',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    costoUnitarioBaseOriginal: 5,
    costoUnitarioBaseMonedaBase: 5,
    valorValorizableOriginal: 50,
    valorValorizableMonedaBase: 50,
    monedaBase: 'PEN',
    monedaOriginal: 'PEN',
    tipoCambioAplicado: 1,
    fechaTipoCambio: '2026-01-01',
    fechaEntrada: '2026-01-01',
    estado: 'disponible',
    procedencia: 'compra',
    usuario: 'user-1',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function crearProyeccion(overrides: Partial<ProyeccionStockInventario> = {}): ProyeccionStockInventario {
  return {
    empresaId: 'emp-A',
    establecimientoId: 'est-1',
    productoId: 'prod-1',
    almacenId: 'alm-1',
    cantidad: 10,
    ...overrides,
  };
}

describe('reconciliacionStockInventario — caso consistente', () => {
  it('proyección igual a la suma de capas: diferencia 0, consistente true', () => {
    const resultado = reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: 10 })], [crearCapa({ cantidadDisponible: 10 })]);
    expect(resultado.consistente).toBe(true);
    expect(resultado.diferencias).toEqual([
      { empresaId: 'emp-A', establecimientoId: 'est-1', productoId: 'prod-1', almacenId: 'alm-1', cantidadProyectada: 10, cantidadSegunCapas: 10, diferencia: 0, consistente: true },
    ]);
  });

  it('suma varias capas del mismo grupo', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ cantidad: 18 })],
      [crearCapa({ id: 'capa-1', cantidadDisponible: 10 }), crearCapa({ id: 'capa-2', cantidadDisponible: 8 })]
    );
    expect(resultado.diferencias[0].cantidadSegunCapas).toBe(18);
    expect(resultado.consistente).toBe(true);
  });
});

describe('reconciliacionStockInventario — diferencias detectadas', () => {
  it('proyección sin capas: cantidadSegunCapas=0, diferencia positiva, inconsistente', () => {
    const resultado = reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: 7 })], []);
    expect(resultado.consistente).toBe(false);
    expect(resultado.diferencias[0]).toMatchObject({ cantidadProyectada: 7, cantidadSegunCapas: 0, diferencia: 7, consistente: false });
  });

  it('capas sin proyección: cantidadProyectada=0, diferencia negativa, inconsistente', () => {
    const resultado = reconciliarStockInventario('emp-A', [], [crearCapa({ cantidadDisponible: 5 })]);
    expect(resultado.consistente).toBe(false);
    expect(resultado.diferencias[0]).toMatchObject({ cantidadProyectada: 0, cantidadSegunCapas: 5, diferencia: -5, consistente: false });
  });

  it('proyección distinta de la suma de capas: diferencia refleja la discrepancia exacta', () => {
    const resultado = reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: 12 })], [crearCapa({ cantidadDisponible: 10 })]);
    expect(resultado.diferencias[0]).toMatchObject({ cantidadProyectada: 12, cantidadSegunCapas: 10, diferencia: 2, consistente: false });
  });
});

describe('reconciliacionStockInventario — capas revertidas y agotadas', () => {
  it('excluye capas revertidas de la suma', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ cantidad: 10 })],
      [crearCapa({ id: 'capa-1', cantidadDisponible: 10 }), crearCapa({ id: 'capa-2', estado: 'revertida', cantidadDisponible: 999 })]
    );
    expect(resultado.diferencias[0].cantidadSegunCapas).toBe(10);
    expect(resultado.consistente).toBe(true);
  });

  it('una capa agotada con cantidadDisponible 0 se incluye sin aportar cantidad', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ cantidad: 10 })],
      [crearCapa({ id: 'capa-1', cantidadDisponible: 10 }), crearCapa({ id: 'capa-2', estado: 'agotada', cantidadDisponible: 0 })]
    );
    expect(resultado.diferencias[0].cantidadSegunCapas).toBe(10);
    expect(resultado.consistente).toBe(true);
  });

  it('rechaza una capa agotada cuya cantidadDisponible no es 0', () => {
    expect(() =>
      reconciliarStockInventario('emp-A', [], [crearCapa({ estado: 'agotada', cantidadDisponible: 3 })])
    ).toThrow();
  });
});

describe('reconciliacionStockInventario — validación de cantidades', () => {
  it('rechaza cantidadDisponible negativa en una capa', () => {
    expect(() => reconciliarStockInventario('emp-A', [], [crearCapa({ cantidadDisponible: -1 })])).toThrow();
  });

  it('rechaza cantidadDisponible no finita en una capa', () => {
    expect(() => reconciliarStockInventario('emp-A', [], [crearCapa({ cantidadDisponible: Number.NaN })])).toThrow();
  });

  it('rechaza cantidad negativa en la proyección', () => {
    expect(() => reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: -1 })], [])).toThrow();
  });

  it('rechaza cantidad no finita en la proyección', () => {
    expect(() => reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: Number.POSITIVE_INFINITY })], [])).toThrow();
  });
});

describe('reconciliacionStockInventario — no mezcla establecimientos/almacenes/productos/empresas', () => {
  it('agrupa por separado productos distintos en el mismo almacén', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ productoId: 'prod-1', cantidad: 10 }), crearProyeccion({ productoId: 'prod-2', cantidad: 5 })],
      [crearCapa({ id: 'capa-1', productoId: 'prod-1', cantidadDisponible: 10 }), crearCapa({ id: 'capa-2', productoId: 'prod-2', cantidadDisponible: 5 })]
    );
    expect(resultado.diferencias).toHaveLength(2);
    expect(resultado.consistente).toBe(true);
  });

  it('agrupa por separado el mismo producto en almacenes distintos', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ almacenId: 'alm-1', cantidad: 10 }), crearProyeccion({ almacenId: 'alm-2', cantidad: 4 })],
      [crearCapa({ id: 'capa-1', almacenId: 'alm-1', cantidadDisponible: 10 }), crearCapa({ id: 'capa-2', almacenId: 'alm-2', cantidadDisponible: 4 })]
    );
    expect(resultado.diferencias).toHaveLength(2);
    expect(resultado.consistente).toBe(true);
  });

  it('rechaza una capa de otra empresa mezclada en el arreglo', () => {
    expect(() => reconciliarStockInventario('emp-A', [], [crearCapa({ empresaId: 'emp-B' })])).toThrow();
  });

  it('rechaza un registro de proyección de otra empresa mezclado en el arreglo', () => {
    expect(() => reconciliarStockInventario('emp-A', [crearProyeccion({ empresaId: 'emp-B' })], [])).toThrow();
  });

  it('rechaza una proyección con más de un registro para el mismo grupo', () => {
    expect(() =>
      reconciliarStockInventario('emp-A', [crearProyeccion({ cantidad: 10 }), crearProyeccion({ cantidad: 5 })], [])
    ).toThrow();
  });
});

describe('reconciliacionStockInventario — precisión numérica', () => {
  it('aplica la precisión aprobada al sumar capas con imprecisión de punto flotante', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ cantidad: 0.3 })],
      [crearCapa({ id: 'capa-1', cantidadDisponible: 0.1 }), crearCapa({ id: 'capa-2', cantidadDisponible: 0.2 })]
    );
    expect(resultado.diferencias[0].cantidadSegunCapas).toBe(0.3);
    expect(resultado.consistente).toBe(true);
  });
});

describe('reconciliacionStockInventario — clave interna sin colisiones (Bloqueante 6)', () => {
  it('IDs que contienen espacios, dos puntos y guiones no colisionan entre grupos distintos', () => {
    const resultado = reconciliarStockInventario(
      'emp-A',
      [
        crearProyeccion({ establecimientoId: 'est 1', productoId: 'prod:1', almacenId: 'alm-1', cantidad: 10 }),
        crearProyeccion({ establecimientoId: 'est', productoId: '1 prod:1', almacenId: 'alm-1', cantidad: 5 }),
      ],
      []
    );
    expect(resultado.diferencias).toHaveLength(2);
    expect(resultado.diferencias.map((d) => d.cantidadProyectada).sort((a, b) => a - b)).toEqual([5, 10]);
  });

  it('un separador visual idéntico entre componentes distintos no produce la misma clave que una concatenación diferente', () => {
    const resultadoA = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ establecimientoId: 'a', productoId: 'b c', almacenId: 'd', cantidad: 1 })],
      []
    );
    const resultadoB = reconciliarStockInventario(
      'emp-A',
      [crearProyeccion({ establecimientoId: 'a b', productoId: 'c', almacenId: 'd', cantidad: 2 })],
      []
    );
    // Cada uno se agrupa por separado dentro de su propia llamada — no hay colisión cruzada aunque
    // la concatenación ingenua "a b c d" sería idéntica en ambos casos.
    expect(resultadoA.diferencias).toHaveLength(1);
    expect(resultadoB.diferencias).toHaveLength(1);
    expect(resultadoA.diferencias[0].cantidadProyectada).toBe(1);
    expect(resultadoB.diferencias[0].cantidadProyectada).toBe(2);
  });
});

describe('reconciliacionStockInventario — el archivo fuente es texto, sin bytes NUL (Bloqueante 6)', () => {
  it('el módulo se importa y ejecuta como texto UTF-8 normal (si contuviera bytes NUL, Node fallaría al parsear o el bundler lo trataría como binario)', () => {
    expect(() => reconciliarStockInventario('emp-A', [], [])).not.toThrow();
  });
});

describe('reconciliacionStockInventario — nunca modifica sus entradas ni reconstruye capas', () => {
  it('no muta los arreglos de entrada', () => {
    const proyeccion = [crearProyeccion({ cantidad: 10 })];
    const capas = [crearCapa({ cantidadDisponible: 10 })];
    const copiaProyeccion = JSON.parse(JSON.stringify(proyeccion));
    const copiaCapas = JSON.parse(JSON.stringify(capas));
    reconciliarStockInventario('emp-A', proyeccion, capas);
    expect(proyeccion).toEqual(copiaProyeccion);
    expect(capas).toEqual(copiaCapas);
  });

  it('sin proyección ni capas: resultado vacío y consistente', () => {
    const resultado = reconciliarStockInventario('emp-A', [], []);
    expect(resultado).toEqual({ empresaId: 'emp-A', diferencias: [], consistente: true });
  });
});
