import { describe, it, expect } from 'vitest';
import { crearEjecutorBloqueoInventario, ejecutarConBloqueoEnMemoria } from './bloqueoInventario';

describe('bloqueoInventario — fallback en memoria: serialización dentro de la misma empresa', () => {
  it('la segunda ejecución de la misma empresa nunca empieza antes de que la primera termine', async () => {
    const orden: string[] = [];
    const p1 = ejecutarConBloqueoEnMemoria('emp-A', async () => {
      orden.push('inicio-1');
      await Promise.resolve();
      await Promise.resolve();
      orden.push('fin-1');
    });
    const p2 = ejecutarConBloqueoEnMemoria('emp-A', async () => {
      orden.push('inicio-2');
    });
    await Promise.all([p1, p2]);
    expect(orden).toEqual(['inicio-1', 'fin-1', 'inicio-2']);
  });

  it('tres ejecuciones concurrentes de la misma empresa se ejecutan en el orden en que se solicitaron', async () => {
    const orden: string[] = [];
    const crear = (etiqueta: string) => () => {
      orden.push(etiqueta);
      return Promise.resolve();
    };
    const p1 = ejecutarConBloqueoEnMemoria('emp-A', crear('uno'));
    const p2 = ejecutarConBloqueoEnMemoria('emp-A', crear('dos'));
    const p3 = ejecutarConBloqueoEnMemoria('emp-A', crear('tres'));
    await Promise.all([p1, p2, p3]);
    expect(orden).toEqual(['uno', 'dos', 'tres']);
  });

  it('libera el bloqueo aunque fn rechace: la siguiente ejecución de la misma empresa continúa', async () => {
    const p1 = ejecutarConBloqueoEnMemoria('emp-A', async () => {
      throw new Error('falla intencional');
    });
    await expect(p1).rejects.toThrow('falla intencional');

    let segundaEjecuto = false;
    await ejecutarConBloqueoEnMemoria('emp-A', async () => {
      segundaEjecuto = true;
    });
    expect(segundaEjecuto).toBe(true);
  });

  it('el resultado devuelto por fn se propaga íntegro al llamador', async () => {
    const resultado = await ejecutarConBloqueoEnMemoria('emp-A', async () => ({ ok: true, valor: 42 }));
    expect(resultado).toEqual({ ok: true, valor: 42 });
  });
});

describe('bloqueoInventario — fallback en memoria: empresas distintas no se bloquean entre sí', () => {
  it('la empresa B no espera a que termine una ejecución larga de la empresa A', async () => {
    const orden: string[] = [];
    const pA = ejecutarConBloqueoEnMemoria('emp-A', async () => {
      orden.push('A-inicio');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      orden.push('A-fin');
    });
    const pB = ejecutarConBloqueoEnMemoria('emp-B', async () => {
      orden.push('B-inicio');
    });
    await Promise.all([pA, pB]);
    expect(orden.indexOf('B-inicio')).toBeLessThan(orden.indexOf('A-fin'));
  });
});

describe('bloqueoInventario — selección de implementación por entorno', () => {
  it('crearEjecutorBloqueoInventario devuelve un ejecutor funcional en este entorno (sin navigator.locks, usa el fallback)', async () => {
    const ejecutar = crearEjecutorBloqueoInventario();
    const resultado = await ejecutar('emp-A', async () => 42);
    expect(resultado).toBe(42);
  });

  it('el ejecutor seleccionado también serializa por empresa (comportamiento observable, no solo selección)', async () => {
    const ejecutar = crearEjecutorBloqueoInventario();
    const orden: string[] = [];
    const p1 = ejecutar('emp-A', async () => {
      orden.push('inicio-1');
      await Promise.resolve();
      orden.push('fin-1');
    });
    const p2 = ejecutar('emp-A', async () => {
      orden.push('inicio-2');
    });
    await Promise.all([p1, p2]);
    expect(orden).toEqual(['inicio-1', 'fin-1', 'inicio-2']);
  });
});
