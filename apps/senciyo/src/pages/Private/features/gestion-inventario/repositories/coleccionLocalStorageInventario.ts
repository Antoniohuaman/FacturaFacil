// gestion-inventario/repositories/coleccionLocalStorageInventario.ts
//
// Lectura y escritura defensiva, tenantizada por empresaId, compartida por los cuatro
// repositorios nuevos del Kardex Valorizado (Etapa 1A): capaCostoInventario, consumoCapaCostoInventario,
// operacionIdempotenteInventario, transaccionInventario. Única implementación de: construir la
// clave con `lsKey`, parsear/validar el JSON almacenado, filtrar por `empresaId` (solo después de
// validar la forma) y serializar/escribir. No es un framework general de almacenamiento para toda
// la aplicación — no reemplaza a `lsKey`, no toca `StockRepository` ni ningún otro repositorio
// existente, y solo tiene sentido para estas colecciones tenantizadas.
//
// Principio central: SOLO la ausencia real de la clave (`localStorage.getItem` devuelve `null`)
// representa una colección vacía. Un JSON corrupto, una raíz que no es arreglo, o un elemento sin
// la forma mínima esperada NUNCA se convierten en `[]` — se lanza un `Error` explícito, para que
// el llamador (guardar/actualizar/eliminar) nunca continúe y sobrescriba datos reales con una
// colección "vacía" que en verdad es una lectura fallida.

import { lsKey } from '../../../../../shared/tenant';

/**
 * Cada repositorio aporta únicamente esta validación de sus campos propios — la forma base
 * (id/empresaId no vacíos) ya la valida este archivo. Recibe `unknown` (no `Record<string,
 * unknown>`) para que el tipo afirmado por el type guard sea siempre comparable con el parámetro
 * sin necesitar un cast: cada implementación debe re-confirmar `esObjetoPlano` antes de leer
 * propiedades (ver `esObjetoPlano`, exportado más abajo).
 */
export type ValidadorCamposEspecificos<T> = (valor: unknown) => valor is T;

/** Reutilizable por los repositorios que necesiten validar un campo tipo "objeto plano, no nulo, no arreglo" (ej. `datosAnteriores`/`datosPropuestos` de TransaccionInventario). */
export function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esStringNoVacio(valor: unknown): valor is string {
  return typeof valor === 'string' && valor.trim() !== '';
}

/** Resultado interno compartido por las dos lecturas públicas — evita duplicar el parseo/validación. */
interface ColeccionValidada<T> {
  clave: string;
  /** TODOS los elementos que pasaron la validación estructural, de CUALQUIER empresa presente físicamente bajo esta clave — todavía sin filtrar. */
  validados: T[];
}

/**
 * Parsea y valida estructuralmente TODA la colección física almacenada bajo `claveBase` +
 * `empresaId` (vía `lsKey`), sin filtrar por empresa todavía. Solo la ausencia real de la clave
 * produce una colección vacía. Cualquier otra anomalía (JSON inválido, raíz no-arreglo, un
 * elemento sin la forma mínima esperada) lanza un `Error` explícito — nunca se captura para
 * degradar a una colección vacía. Función interna: las dos lecturas públicas
 * (`leerColeccionTenantizada` y `leerColeccionParaMutacion`) se diferencian únicamente en qué
 * hacen con el resultado ya validado.
 */
function leerYValidarColeccionCompleta<T extends { id: string; empresaId: string }>(
  claveBase: string,
  empresaId: string,
  nombreRecurso: string,
  esEntidadValida: ValidadorCamposEspecificos<T>
): ColeccionValidada<T> {
  const clave = lsKey(claveBase, empresaId);
  const data = localStorage.getItem(clave);
  if (data === null) return { clave, validados: [] };

  // Si JSON.parse lanza (JSON inválido), se deja propagar tal cual — nunca se captura aquí para
  // devolver [] ni se registra solo con console.error.
  const parsed: unknown = JSON.parse(data);

  if (!Array.isArray(parsed)) {
    throw new Error(`${nombreRecurso}: el contenido almacenado en "${clave}" no es un arreglo — no se puede interpretar como colección.`);
  }
  // Reasignado explícitamente a `unknown[]` para no depender de cómo el lib de TypeScript tipe
  // internamente `Array.isArray` — cada elemento se valida desde `unknown`, nunca se asume su forma.
  const elementos: unknown[] = parsed;

  const validados: T[] = [];
  elementos.forEach((elemento, indice) => {
    if (!esObjetoPlano(elemento)) {
      throw new Error(`${nombreRecurso}: el elemento en el índice ${indice} de "${clave}" no es un objeto válido.`);
    }
    if (!esStringNoVacio(elemento.id)) {
      throw new Error(`${nombreRecurso}: el elemento en el índice ${indice} de "${clave}" no tiene un "id" válido.`);
    }
    if (!esStringNoVacio(elemento.empresaId)) {
      throw new Error(`${nombreRecurso}: el elemento en el índice ${indice} de "${clave}" no tiene un "empresaId" válido.`);
    }
    if (!esEntidadValida(elemento)) {
      throw new Error(`${nombreRecurso}: el elemento en el índice ${indice} de "${clave}" (id="${elemento.id}") no tiene la forma esperada del modelo.`);
    }
    validados.push(elemento);
  });

  return { clave, validados };
}

/**
 * Lee una colección tenantizada PARA CONSULTA (solo lectura, nunca escribe). Válida para listar,
 * buscar por id, filtrar, etc. Filtra por `empresaId` solo después de validar la forma de TODOS
 * los elementos (doble verificación de aislamiento, invariante 21, §32) — una entidad
 * estructuralmente válida de otra empresa se ignora aquí en silencio porque esta función nunca
 * va a reescribir la colección: no hay riesgo de pérdida de datos al simplemente no devolverla.
 */
export function leerColeccionTenantizada<T extends { id: string; empresaId: string }>(
  claveBase: string,
  empresaId: string,
  nombreRecurso: string,
  esEntidadValida: ValidadorCamposEspecificos<T>
): T[] {
  const { validados } = leerYValidarColeccionCompleta(claveBase, empresaId, nombreRecurso, esEntidadValida);
  return validados.filter((entidad) => entidad.empresaId === empresaId);
}

/**
 * Lee una colección tenantizada PARA MUTAR (paso previo obligatorio a guardar/actualizar/eliminar).
 * A diferencia de `leerColeccionTenantizada`, esta función NUNCA descarta en silencio un registro
 * válido de otra empresa: si la colección física contiene al menos uno, lanza un `Error` explícito
 * y bloquea la operación completa ANTES de que el llamador pueda calcular una colección filtrada
 * y sobrescribir la clave con `guardarColeccionTenantizada` — eso perdería silenciosamente el
 * registro ajeno. Nunca repara, nunca mueve, nunca continúa: el llamador debe abortar sin escribir.
 */
export function leerColeccionParaMutacion<T extends { id: string; empresaId: string }>(
  claveBase: string,
  empresaId: string,
  nombreRecurso: string,
  esEntidadValida: ValidadorCamposEspecificos<T>
): T[] {
  const { clave, validados } = leerYValidarColeccionCompleta(claveBase, empresaId, nombreRecurso, esEntidadValida);
  const ajenos = validados.filter((entidad) => entidad.empresaId !== empresaId);
  if (ajenos.length > 0) {
    throw new Error(
      `${nombreRecurso}: la colección almacenada en "${clave}" contiene ${ajenos.length} registro(s) válido(s) que pertenecen a otra empresa (ej. empresaId="${ajenos[0].empresaId}") — no se puede mutar de forma segura sin arriesgar perder esos registros. Corrige manualmente los datos mezclados antes de continuar.`
    );
  }
  return validados;
}

/** Escribe una colección tenantizada completa. No genera ids ni fechas, no corrige `empresaId`, no captura errores de escritura para continuar en silencio, no muta la colección recibida (solo la serializa). */
export function guardarColeccionTenantizada<T>(claveBase: string, empresaId: string, coleccion: readonly T[]): void {
  const clave = lsKey(claveBase, empresaId);
  localStorage.setItem(clave, JSON.stringify(coleccion));
}
