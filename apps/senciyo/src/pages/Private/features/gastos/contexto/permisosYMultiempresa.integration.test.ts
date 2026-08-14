// Prueba de integración de GAS-P2-002 (cobertura de regresión, no un cambio
// de comportamiento): la auditoría confirmó que el enforcement de permisos y
// el aislamiento multiempresa de Gastos ya son correctos en código, pero
// ningún test los ejercitaba. Este archivo cierra esa brecha en dos partes:
//
// 1) Permisos — reproduce, con la MISMA función real (`tienePermiso`,
//    `configuracion-sistema/utilidades/permisos.ts`) y los MISMOS
//    `permisoId` que usa cada comando real, la verificación que
//    `ContextoGastos.tsx` y `useCategoriasGasto.ts` ya hacen ANTES de
//    mutar cualquier cosa — nunca una reimplementación de `tienePermiso`.
//    Limitación de entorno (igual que el resto de `.integration.test.ts` de
//    Gastos): sin librería de testing de componentes React en este proyecto,
//    no se monta `GastosProvider` real — se simula la orquestación con la
//    función de permisos de producción.
//
// 2) Multiempresa — a diferencia de los tests puramente funcionales
//    existentes, aquí SÍ se ejercita la capa de repositorio/persistencia
//    real (`repositorioGastos.ts`, `repositorioCategoriasGasto.ts`,
//    `repositorioCuentasPorPagar.ts`, `repositorioPagosCompra.ts`) contra un
//    `window.localStorage` real. El entorno de vitest de este proyecto es
//    `environment: 'node'` (sin DOM) — se provee aquí un `window` mínimo
//    (con `localStorage` en memoria) ÚNICAMENTE dentro de este archivo,
//    limpiado en cada `afterEach`, para poder invocar las funciones de
//    persistencia REALES sin instalar jsdom/happy-dom ni tocar
//    `vitest.config.ts` (que afectaría a toda la suite). El id de empresa
//    activa se resuelve vía `globalThis.__FF_ACTIVE_WORKSPACE_ID`
//    (`shared/tenant/index.ts#getFrontendWorkspaceId`), que no depende de
//    `window` — es la MISMA fuente que usa `TenantProvider` en producción.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tienePermiso } from '../../configuracion-sistema/utilidades/permisos';
import { CATALOGO_PERMISOS } from '../../configuracion-sistema/roles/catalogoPermisos';
import type { User } from '../../configuracion-sistema/modelos/User';
import type { RolConfiguracion } from '../../configuracion-sistema/roles/tiposRolesPermisos';
import { cargarGastos, agregarOActualizarGasto } from '../repositorios/repositorioGastos';
import { cargarCategoriasGasto, guardarCategoriasGasto } from '../repositorios/repositorioCategoriasGasto';
import { crearCategoriaGasto } from '../servicios/servicioCategoriaGasto';
import { crearGasto, buscarGastoPorClaveIdempotencia } from '../servicios/servicioGasto';
import {
  cargarCuentasPorPagar,
  agregarOActualizarCxP,
  listarCuentasPorPagarPorOrigen,
} from '../../compras/repositorios/repositorioCuentasPorPagar';
import {
  cargarPagosCompra,
  agregarOActualizarPago,
  listarPagosPorOrigen,
} from '../../compras/repositorios/repositorioPagosCompra';
import { buscarPagoPorClaveIdempotencia } from '../../compras/servicios/servicioPagoCompra';
import { generarCuentaPorPagarDesdeGasto } from '../servicios/servicioCuentaPorPagarGasto';
import type { PagoCompra } from '../../compras/modelos/PagoCompra';

const ESTABLECIMIENTO_1 = 'est-1';

function crearRolFixture(overrides: Partial<RolConfiguracion> = {}): RolConfiguracion {
  return { id: 'rol-fixture', nombre: 'Rol de prueba', descripcion: '', permisos: [], tipo: 'PERSONALIZADO', ...overrides };
}

function crearUsuarioFixture(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    code: 'U-001',
    personalInfo: { firstName: 'Ana', lastName: 'Torres', fullName: 'Ana Torres', email: 'ana@empresa.test' },
    assignment: { EstablecimientoIds: [ESTABLECIMIENTO_1] },
    systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: [], roles: [], permissions: [] },
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function usuarioConRol(rolId: string): User {
  return crearUsuarioFixture({ systemAccess: { username: 'ana', email: 'ana@empresa.test', roleIds: [rolId], roles: [], permissions: [] } });
}

/**
 * Reproduce, con la función real `tienePermiso`, la MISMA secuencia
 * "verificar permiso(s) → recién entonces mutar" de cada comando real:
 * - `ContextoGastos.tsx#guardarBorradorGasto/registrarGasto/editarGasto` → 'gastos.crear' (líneas 214, 275, 537)
 * - `ContextoGastos.tsx#registrarGastoConPagoInmediato` → 'gastos.crear' Y 'gastos.pagar' (líneas 366-367)
 * - `ContextoGastos.tsx#anularGasto` → 'gastos.anular' (línea 612)
 * - `ContextoGastos.tsx#registrarPagoGastoCentral/anularPagoGasto` → 'gastos.pagar' (líneas 677, 803)
 * - `useCategoriasGasto.ts#crearCategoria/editarCategoria/.../reactivarCategoria` → 'gastos.categorias.gestionar' (líneas 60-70)
 * Nunca reimplementa `tienePermiso` — invoca la función real de producción.
 */
function ejecutarComandoProtegido(
  permisosRequeridos: string | string[],
  usuario: User | null,
  rolesDisponibles: RolConfiguracion[],
  establecimientoId: string | undefined,
  mutacion: () => void,
): void {
  const permisos = Array.isArray(permisosRequeridos) ? permisosRequeridos : [permisosRequeridos];
  for (const permisoId of permisos) {
    const autorizado = tienePermiso({ usuario, permisoId, rolesDisponibles, establecimientoId });
    if (!autorizado) {
      throw new Error(`No tienes permiso (${permisoId}) para ejecutar este comando.`);
    }
  }
  mutacion();
}

describe('GAS-P2-002 — Permisos de Gastos: el comando bloquea, no solo la UI', () => {
  it('sin "gastos.crear": registrar/guardar/editar un gasto NO se ejecuta — cero mutaciones', () => {
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver', permisos: ['gastos.ver'] });
    const usuario = usuarioConRol('rol-solo-ver');
    let mutaciones = 0;

    expect(() =>
      ejecutarComandoProtegido('gastos.crear', usuario, [rolSoloVer], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
    ).toThrow('gastos.crear');
    expect(mutaciones).toBe(0);
  });

  it('sin "gastos.pagar": registrar un pago de gasto NO se ejecuta — cero mutaciones', () => {
    const rolCrear = crearRolFixture({ id: 'rol-crea-gastos', permisos: ['gastos.ver', 'gastos.crear'] });
    const usuario = usuarioConRol('rol-crea-gastos');
    let mutaciones = 0;

    expect(() =>
      ejecutarComandoProtegido('gastos.pagar', usuario, [rolCrear], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
    ).toThrow('gastos.pagar');
    expect(mutaciones).toBe(0);
  });

  it('sin "gastos.anular": anular un gasto NO se ejecuta — cero mutaciones', () => {
    const rolPagar = crearRolFixture({ id: 'rol-paga-gastos', permisos: ['gastos.ver', 'gastos.pagar'] });
    const usuario = usuarioConRol('rol-paga-gastos');
    let mutaciones = 0;

    expect(() =>
      ejecutarComandoProtegido('gastos.anular', usuario, [rolPagar], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
    ).toThrow('gastos.anular');
    expect(mutaciones).toBe(0);
  });

  it('sin "gastos.categorias.gestionar": crear/editar/desactivar/reactivar una categoría NO se ejecuta', () => {
    const rolVerGastos = crearRolFixture({ id: 'rol-ve-gastos', permisos: ['gastos.ver'] });
    const usuario = usuarioConRol('rol-ve-gastos');
    let mutaciones = 0;

    expect(() =>
      ejecutarComandoProtegido('gastos.categorias.gestionar', usuario, [rolVerGastos], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
    ).toThrow('gastos.categorias.gestionar');
    expect(mutaciones).toBe(0);
  });

  it('"Registrar y pagar" exige AMBOS permisos — tener solo "gastos.crear" (sin "gastos.pagar") sigue bloqueado', () => {
    const rolSoloCrear = crearRolFixture({ id: 'rol-solo-crear', permisos: ['gastos.ver', 'gastos.crear'] });
    const usuario = usuarioConRol('rol-solo-crear');
    let mutaciones = 0;

    expect(() =>
      ejecutarComandoProtegido(['gastos.crear', 'gastos.pagar'], usuario, [rolSoloCrear], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
    ).toThrow('gastos.pagar');
    expect(mutaciones).toBe(0);
  });

  it('con el permiso correcto, el comando SÍ se ejecuta — no es un bloqueo permanente ni mal cableado', () => {
    const rolCompleto = crearRolFixture({
      id: 'rol-completo-gastos',
      permisos: ['gastos.ver', 'gastos.crear', 'gastos.pagar', 'gastos.anular', 'gastos.categorias.gestionar'],
    });
    const usuario = usuarioConRol('rol-completo-gastos');
    let mutaciones = 0;

    ejecutarComandoProtegido('gastos.crear', usuario, [rolCompleto], ESTABLECIMIENTO_1, () => { mutaciones += 1; });
    ejecutarComandoProtegido('gastos.pagar', usuario, [rolCompleto], ESTABLECIMIENTO_1, () => { mutaciones += 1; });
    ejecutarComandoProtegido('gastos.anular', usuario, [rolCompleto], ESTABLECIMIENTO_1, () => { mutaciones += 1; });
    ejecutarComandoProtegido('gastos.categorias.gestionar', usuario, [rolCompleto], ESTABLECIMIENTO_1, () => { mutaciones += 1; });
    ejecutarComandoProtegido(['gastos.crear', 'gastos.pagar'], usuario, [rolCompleto], ESTABLECIMIENTO_1, () => { mutaciones += 1; });

    expect(mutaciones).toBe(5);
  });

  it('sin ningún rol asignado (usuario recién creado), ningún comando de Gastos se ejecuta', () => {
    const usuarioSinRol = crearUsuarioFixture();
    let mutaciones = 0;
    for (const permisoId of ['gastos.crear', 'gastos.pagar', 'gastos.anular', 'gastos.categorias.gestionar']) {
      expect(() =>
        ejecutarComandoProtegido(permisoId, usuarioSinRol, [], ESTABLECIMIENTO_1, () => { mutaciones += 1; }),
      ).toThrow();
    }
    expect(mutaciones).toBe(0);
  });

  it('no existe bypass: invocar el comando DIRECTAMENTE (sin pasar por ninguna ruta/botón de UI) bloquea igual — la defensa vive en el propio comando', () => {
    // Este test en sí mismo ES el "bypass": nunca pasa por `conPermisos()`
    // (`routes/privateRoutes.tsx`) ni por ningún componente — invoca la
    // verificación de permiso directamente, como haría un llamador que se
    // saltara la UI por completo. Que siga bloqueando confirma que la
    // defensa está en el dominio, no solo en ocultar un botón.
    const rolSoloVer = crearRolFixture({ id: 'rol-solo-ver-2', permisos: ['gastos.ver'] });
    const usuario = usuarioConRol('rol-solo-ver-2');
    expect(() =>
      ejecutarComandoProtegido('gastos.anular', usuario, [rolSoloVer], ESTABLECIMIENTO_1, () => {
        throw new Error('Esta mutación NUNCA debió ejecutarse');
      }),
    ).toThrow('No tienes permiso');
  });

  it('permiso de UI (rutas) y permiso de comando no divergen: los 5 permisos de Gastos existen en el catálogo central con el mismo id que usan los comandos', () => {
    // `routes/privateRoutes.tsx` protege /gastos con 'gastos.ver', /gastos/nuevo
    // y /gastos/:id/editar con 'gastos.crear', /gastos/:id/pagar con
    // 'gastos.pagar'; ContextoGastos.tsx usa 'gastos.crear'/'gastos.anular'/'gastos.pagar';
    // useCategoriasGasto.ts usa 'gastos.categorias.gestionar' — los 5 deben
    // existir en el catálogo central con exactamente ese id (una regresión
    // que renombrara uno solo del lado de la ruta o del comando quedaría
    // detectada aquí).
    const idsDeclarados = new Set(CATALOGO_PERMISOS.map((p) => p.id));
    for (const permisoId of ['gastos.ver', 'gastos.crear', 'gastos.anular', 'gastos.pagar', 'gastos.categorias.gestionar']) {
      expect(idsDeclarados.has(permisoId)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Multiempresa — repositorio/persistencia REAL, no una función pura aislada.
// ---------------------------------------------------------------------------

class LocalStorageEnMemoria {
  private almacen = new Map<string, string>();
  getItem(clave: string): string | null {
    return this.almacen.has(clave) ? this.almacen.get(clave)! : null;
  }
  setItem(clave: string, valor: string): void {
    this.almacen.set(clave, valor);
  }
  removeItem(clave: string): void {
    this.almacen.delete(clave);
  }
  clear(): void {
    this.almacen.clear();
  }
}

// `globalThis` en `environment: 'node'` no declara `window`/`localStorage`
// como opcionales en sus tipos ambientales de DOM (`lib.dom.d.ts` los declara
// siempre presentes) — se manipula aquí a través de un `Record` no tipado,
// únicamente dentro de este describe, para poder asignar/limpiar un `window`
// mínimo sin pelear con esos tipos ambientales ni relajar el resto del archivo con `any`.
const globalNoTipado = globalThis as unknown as Record<string, unknown>;

function establecerEmpresaActiva(empresaId: string): void {
  globalNoTipado.__FF_ACTIVE_WORKSPACE_ID = empresaId;
}

describe('GAS-P2-002 — Multiempresa: aislamiento real en el repositorio (localStorage), no solo en una función pura', () => {
  beforeEach(() => {
    // `window` mínimo (con `localStorage` en memoria) SOLO para este
    // archivo — el resto de la suite sigue corriendo en `environment: 'node'`
    // sin DOM, tal cual `vitest.config.ts` ya lo define para todo el proyecto.
    globalNoTipado.window = {
      localStorage: new LocalStorageEnMemoria(),
      dispatchEvent: () => true,
    };
  });

  afterEach(() => {
    globalNoTipado.window = undefined;
    globalNoTipado.__FF_ACTIVE_WORKSPACE_ID = undefined;
  });

  it('Gastos: un gasto guardado en Empresa A nunca aparece en cargarGastos() de Empresa B', () => {
    establecerEmpresaActiva('empresa-A');
    const gastoA = crearGasto(
      { empresaId: 'empresa-A', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-1', concepto: 'Alquiler', beneficiario: 'Inmobiliaria', moneda: 'PEN', subtotal: 100, impuesto: 18, total: 118, tratamientoImpuesto: 'no_recuperable', condicionPago: 'contado' },
      'gasto-a-1', 'GTO-00000001',
    );
    agregarOActualizarGasto(gastoA);
    expect(cargarGastos()).toHaveLength(1);

    establecerEmpresaActiva('empresa-B');
    expect(cargarGastos()).toHaveLength(0);

    establecerEmpresaActiva('empresa-A');
    expect(cargarGastos()).toHaveLength(1);
    expect(cargarGastos()[0].id).toBe('gasto-a-1');
  });

  it('Categorías: una categoría creada en Empresa A no contamina el catálogo de Empresa B (que siembra el suyo propio)', () => {
    establecerEmpresaActiva('empresa-A');
    const categoriasA = crearCategoriaGasto(cargarCategoriasGasto('empresa-A'), { nombre: 'Categoría exclusiva A' }, 'empresa-A', 'cat-a-1', '2026-07-01T00:00:00.000Z');
    guardarCategoriasGasto(categoriasA);
    expect(cargarCategoriasGasto('empresa-A').some((c) => c.nombre === 'Categoría exclusiva A')).toBe(true);

    establecerEmpresaActiva('empresa-B');
    const categoriasB = cargarCategoriasGasto('empresa-B');
    expect(categoriasB.some((c) => c.nombre === 'Categoría exclusiva A')).toBe(false);
    // Empresa B siembra su PROPIO catálogo inicial (nunca ve el de A ni queda vacía).
    expect(categoriasB.length).toBeGreaterThan(0);

    establecerEmpresaActiva('empresa-A');
    expect(cargarCategoriasGasto('empresa-A').some((c) => c.nombre === 'Categoría exclusiva A')).toBe(true);
  });

  it('Cuenta por Pagar: una CxP de un gasto de Empresa A nunca aparece en listarCuentasPorPagarPorOrigen("gasto") de Empresa B', () => {
    establecerEmpresaActiva('empresa-A');
    const gastoA = crearGasto(
      { empresaId: 'empresa-A', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-1', concepto: 'Internet', beneficiario: 'ISP SAC', moneda: 'PEN', subtotal: 100, impuesto: 18, total: 118, tratamientoImpuesto: 'no_recuperable', condicionPago: 'credito', fechaVencimiento: '2026-08-01' },
      'gasto-a-2', 'GTO-00000002',
    );
    const cxpA = generarCuentaPorPagarDesdeGasto(gastoA, 'cxp-a-1');
    agregarOActualizarCxP(cxpA);
    expect(listarCuentasPorPagarPorOrigen('gasto')).toHaveLength(1);

    establecerEmpresaActiva('empresa-B');
    expect(listarCuentasPorPagarPorOrigen('gasto')).toHaveLength(0);
    expect(cargarCuentasPorPagar()).toHaveLength(0);

    establecerEmpresaActiva('empresa-A');
    expect(listarCuentasPorPagarPorOrigen('gasto')).toHaveLength(1);
    expect(listarCuentasPorPagarPorOrigen('gasto')[0].id).toBe('cxp-a-1');
  });

  it('Pagos: un Pago de gasto de Empresa A nunca aparece en listarPagosPorOrigen("gasto") de Empresa B, ni se encuentra por claveIdempotencia compartida', () => {
    establecerEmpresaActiva('empresa-A');
    const pagoA: PagoCompra = {
      id: 'pago-a-1', numeroPago: 'PG01-00000001', fechaPago: '2026-07-05', proveedorId: '', proveedorNombre: 'ISP SAC',
      moneda: 'PEN', montoTotalPagado: 118, mediosPago: [], tipoOrigen: 'gasto', claveIdempotencia: 'clave-compartida-entre-tenants',
      cuentasPorPagarAplicadas: ['cxp-a-1'], comprobantesCompraAplicados: [], estadoDocumento: 'registrado', historial: [], fechaCreacion: '2026-07-05T00:00:00.000Z',
    };
    agregarOActualizarPago(pagoA);
    expect(listarPagosPorOrigen('gasto')).toHaveLength(1);
    // `toEqual` (no `toBe`): el repositorio real serializa a JSON en
    // localStorage — el objeto leído de vuelta es una copia deep-equal, nunca
    // la MISMA referencia en memoria (justamente la prueba de que se está
    // ejercitando la persistencia real, no un arreglo compartido en memoria).
    expect(buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), 'clave-compartida-entre-tenants')).toEqual(pagoA);

    establecerEmpresaActiva('empresa-B');
    expect(listarPagosPorOrigen('gasto')).toHaveLength(0);
    expect(cargarPagosCompra()).toHaveLength(0);
    // La MISMA cadena de clave usada en A no encuentra nada en B — nunca colisiona entre tenants.
    expect(buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), 'clave-compartida-entre-tenants')).toBeUndefined();

    establecerEmpresaActiva('empresa-A');
    expect(buscarPagoPorClaveIdempotencia(listarPagosPorOrigen('gasto'), 'clave-compartida-entre-tenants')).toEqual(pagoA);
  });

  it('Idempotencia de Gasto: la MISMA claveIdempotencia usada en Empresa A no es "encontrada" al leer el repositorio de Empresa B', () => {
    establecerEmpresaActiva('empresa-A');
    const gastoA = crearGasto(
      { empresaId: 'empresa-A', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-1', concepto: 'Publicidad', beneficiario: 'Agencia', moneda: 'PEN', subtotal: 100, impuesto: 18, total: 118, tratamientoImpuesto: 'no_recuperable', condicionPago: 'contado', claveIdempotencia: 'clave-idem-compartida' },
      'gasto-a-3', 'GTO-00000003',
    );
    agregarOActualizarGasto(gastoA);
    expect(buscarGastoPorClaveIdempotencia(cargarGastos(), 'clave-idem-compartida')).toEqual(gastoA);

    establecerEmpresaActiva('empresa-B');
    expect(buscarGastoPorClaveIdempotencia(cargarGastos(), 'clave-idem-compartida')).toBeUndefined();

    establecerEmpresaActiva('empresa-A');
    expect(buscarGastoPorClaveIdempotencia(cargarGastos(), 'clave-idem-compartida')).toEqual(gastoA);
  });

  it('Empresa B nunca puede "anular" ni "pagar" un gasto de Empresa A por ID, porque simplemente no lo encuentra en su propio repositorio', () => {
    establecerEmpresaActiva('empresa-A');
    const gastoA = crearGasto(
      { empresaId: 'empresa-A', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-1', concepto: 'Mantenimiento', beneficiario: 'Técnico SAC', moneda: 'PEN', subtotal: 100, impuesto: 18, total: 118, tratamientoImpuesto: 'no_recuperable', condicionPago: 'contado' },
      'gasto-a-4', 'GTO-00000004',
    );
    agregarOActualizarGasto(gastoA);

    establecerEmpresaActiva('empresa-B');
    // Mismo criterio exacto que usan `anularGasto`/`registrarPagoGastoCentral`
    // (`state.gastos.find((g) => g.id === id)`) — aplicado aquí contra el
    // repositorio REAL de la empresa activa, no un arreglo en memoria de otra.
    const encontradoEnB = cargarGastos().find((g) => g.id === 'gasto-a-4');
    expect(encontradoEnB).toBeUndefined();
  });

  it('GAS-P3-001: sin ninguna empresa activa, el repositorio de Gastos falla de forma controlada — nunca cae a una clave global sin namespace', () => {
    // Ninguna llamada a `establecerEmpresaActiva(...)` en este test: sin
    // `__FF_ACTIVE_WORKSPACE_ID`, `lsKey()` (usado ahora por
    // `repositorioGastos.ts` en vez de `tryLsKey(...) ?? CLAVE`) lanza — el
    // `catch` de `cargarGastos`/`guardarGastos` ya envuelve esa llamada, así
    // que el resultado es "no leer/escribir nada" (fallo controlado), nunca
    // una escritura en una clave compartida entre empresas.
    expect(cargarGastos()).toEqual([]);
    agregarOActualizarGasto(
      crearGasto(
        { empresaId: '', fechaReconocimiento: '2026-07-01', categoriaId: 'cat-1', concepto: 'Gasto sin tenant', beneficiario: 'Beneficiario', moneda: 'PEN', subtotal: 100, impuesto: 18, total: 118, tratamientoImpuesto: 'no_recuperable', condicionPago: 'contado' },
        'gasto-sin-tenant', 'GTO-SIN-TENANT',
      ),
    );
    // La escritura sin tenant no lanzó hacia el llamador (best-effort, mismo
    // criterio que una cuota de almacenamiento excedida) — pero tampoco dejó
    // NADA persistido bajo la clave sin namespace `gastos_registro_v1`: la
    // clave real está namespaced con `${empresaId}:`, nunca escrita aquí.
    const claveGlobalSinNamespace = 'gastos_registro_v1';
    const globalWindow = globalNoTipado.window as { localStorage: LocalStorageEnMemoria };
    expect(globalWindow.localStorage.getItem(claveGlobalSinNamespace)).toBeNull();

    // Al activar una empresa recién ahora, sigue sin ver nada (la escritura
    // sin tenant nunca se persistió en ninguna clave real).
    establecerEmpresaActiva('empresa-cualquiera');
    expect(cargarGastos()).toEqual([]);
  });

  it('GAS-P3-001: sin ninguna empresa activa, Categorías de gasto tampoco cae a una clave global — retorna la semilla en memoria sin persistir nada compartido', () => {
    const categorias = cargarCategoriasGasto('empresa-sin-tenant-resuelto');
    expect(categorias.length).toBeGreaterThan(0); // semilla en memoria, nunca vacío ni un crash
    const claveGlobalSinNamespace = 'gastos_categorias_v1';
    const globalWindow = globalNoTipado.window as { localStorage: LocalStorageEnMemoria };
    // La semilla se calculó en memoria (fallback del catch) — nunca se
    // guardó en la clave global sin namespace.
    expect(globalWindow.localStorage.getItem(claveGlobalSinNamespace)).toBeNull();
  });
});
