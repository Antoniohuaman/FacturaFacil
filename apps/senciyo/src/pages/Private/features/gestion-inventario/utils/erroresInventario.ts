// gestion-inventario/utils/erroresInventario.ts
//
// Errores de dominio de infraestructura del Kardex Valorizado (Etapa 1B). Clases distinguibles
// por `instanceof` — nunca por comparación de texto del mensaje — con información estructurada
// suficiente para diagnosticar sin reconsultar el almacenamiento. Ninguno expone datos de otra
// empresa: cada error solo lleva identificadores de LA MISMA empresa que originó la operación que
// falló (invariante de aislamiento, §32).

/** La misma clave de idempotencia ya está confirmada con un hash de entrada distinto — un reintento legítimo nunca llega aquí (mismo hash), solo un conflicto real. */
export class ConflictoIdempotencia extends Error {
  readonly empresaId: string;
  readonly clave: string;
  readonly hashExistente: string;
  readonly hashRecibido: string;

  constructor(params: { empresaId: string; clave: string; hashExistente: string; hashRecibido: string }) {
    super(
      `Conflicto de idempotencia: la clave "${params.clave}" de la empresa "${params.empresaId}" ya está confirmada con un hash distinto (existente="${params.hashExistente}", recibido="${params.hashRecibido}").`
    );
    this.name = 'ConflictoIdempotencia';
    this.empresaId = params.empresaId;
    this.clave = params.clave;
    this.hashExistente = params.hashExistente;
    this.hashRecibido = params.hashRecibido;
  }
}

/** Un plan fue construido sobre una versión de Inventario que ya no es la vigente — nunca se aplican escrituras calculadas sobre un estado que cambió (invariante 26, §32). */
export class ConflictoVersionInventario extends Error {
  readonly empresaId: string;
  readonly versionEsperada: number;
  readonly versionVigente: number;

  constructor(params: { empresaId: string; versionEsperada: number; versionVigente: number }) {
    super(
      `Conflicto de versión de Inventario: la empresa "${params.empresaId}" esperaba la versión ${params.versionEsperada}, pero la versión vigente es ${params.versionVigente}.`
    );
    this.name = 'ConflictoVersionInventario';
    this.empresaId = params.empresaId;
    this.versionEsperada = params.versionEsperada;
    this.versionVigente = params.versionVigente;
  }
}

/**
 * El diario transaccional (TransaccionInventario/OperacionIdempotenteInventario) quedó en una
 * combinación de estados que la recuperación no puede resolver de forma determinista sin
 * arriesgar aplicar o perder datos — nunca se repara automáticamente (§22.3/§22.4).
 */
export class InconsistenciaDiarioInventario extends Error {
  readonly empresaId: string;
  readonly transaccionId?: string;
  readonly operacionIdempotenteId?: string;
  readonly clavesInconsistentes: string[];

  constructor(params: {
    empresaId: string;
    mensaje: string;
    transaccionId?: string;
    operacionIdempotenteId?: string;
    clavesInconsistentes?: string[];
  }) {
    super(params.mensaje);
    this.name = 'InconsistenciaDiarioInventario';
    this.empresaId = params.empresaId;
    this.transaccionId = params.transaccionId;
    this.operacionIdempotenteId = params.operacionIdempotenteId;
    this.clavesInconsistentes = params.clavesInconsistentes ?? [];
  }
}

/** La rutina de recuperación no pudo determinar de forma determinista qué hacer con una combinación de estados — se detiene en vez de adivinar. */
export class RecuperacionInventarioNoDeterminista extends Error {
  readonly empresaId: string;
  readonly detalle: string;

  constructor(params: { empresaId: string; detalle: string }) {
    super(`Recuperación no determinista para la empresa "${params.empresaId}": ${params.detalle}`);
    this.name = 'RecuperacionInventarioNoDeterminista';
    this.empresaId = params.empresaId;
    this.detalle = params.detalle;
  }
}

/**
 * Se encontró más de un intento (`TransaccionInventario`) `preparada`/`confirmando` activo para la
 * misma `OperacionIdempotenteInventario` — el invariante "como máximo un intento activo a la vez"
 * (§32, Bloqueante 2 de la revisión de Etapa 1B) ya está roto en el almacenamiento. Distinto de un
 * rechazo preventivo al insertar (ese sigue siendo un `Error` simple, como las demás violaciones de
 * unicidad de este repositorio): esta clase representa una corrupción YA EXISTENTE, descubierta al
 * consultar, nunca resuelta eligiendo "la primera".
 */
export class IntentoActivoDuplicadoInventario extends Error {
  readonly empresaId: string;
  readonly operacionIdempotenteId: string;
  readonly transaccionesActivasIds: string[];

  constructor(params: { empresaId: string; operacionIdempotenteId: string; transaccionesActivasIds: string[] }) {
    super(
      `Existen ${params.transaccionesActivasIds.length} intentos activos para la operación idempotente "${params.operacionIdempotenteId}" en la empresa "${params.empresaId}" — solo puede haber uno, duplicidad real.`
    );
    this.name = 'IntentoActivoDuplicadoInventario';
    this.empresaId = params.empresaId;
    this.operacionIdempotenteId = params.operacionIdempotenteId;
    this.transaccionesActivasIds = params.transaccionesActivasIds;
  }
}
