import type { TipoExistenciaProducto } from '../../pages/Private/features/catalogo-articulos/models/types';

/**
 * Fuente única para decidir si un producto está controlado por stock (¿este ítem genera
 * Kardex?). Reemplaza las comparaciones dispersas `tipoExistencia !== 'SERVICIOS'` repetidas en
 * Ventas, Notas de Ingreso/Salida, Transferencias y Guías de Remisión.
 *
 * Corrección obligatoria: esta función NUNCA implementa, ni directa ni indirectamente, la regla
 * "todo lo que no sea SERVICIOS es inventariable". Se basa exclusivamente en una enumeración
 * explícita de los valores del catálogo interno que representan control de stock real — un
 * valor ausente, desconocido, o `'OTROS'` (sin evidencia estructural adicional de que sea un
 * bien físico) NUNCA es inventariable por defecto. Esta función no puede crear una obligación de
 * stock sin evidencia estructural.
 *
 * Nota de alcance: esto es distinto — y deliberadamente no relacionado — de si un ítem es
 * comercial/tributariamente un BIEN o un SERVICIO (ver `tipoProducto` en los módulos de Ventas,
 * que usa su propia fuente comercial). Esta función responde únicamente "¿está controlado por
 * stock?", nunca "¿es legalmente un bien o un servicio?".
 */
const TIPOS_EXISTENCIA_CONTROLADOS_POR_STOCK: ReadonlySet<TipoExistenciaProducto> = new Set([
  'MERCADERIAS',
  'PRODUCTOS_TERMINADOS',
  'MATERIAS_PRIMAS',
  'ENVASES',
  'MATERIALES_AUXILIARES',
  'SUMINISTROS',
  'REPUESTOS',
  'EMBALAJES',
]);

/**
 * Acepta cualquier entidad con un campo `tipoExistencia` estructuralmente compatible — sirve
 * tanto para `Product` (catalogo-articulos) como para snapshots que ya guardaron su propio
 * `tipoExistencia` (por ejemplo `LineaCompra`, cuyo campo hoy es `string` sin el tipo literal).
 */
export interface EntidadConTipoExistencia {
  tipoExistencia?: string;
}

function esValorDelCatalogoInterno(valor: string): valor is TipoExistenciaProducto {
  return (TIPOS_EXISTENCIA_CONTROLADOS_POR_STOCK as ReadonlySet<string>).has(valor);
}

/**
 * `tipoExistencia` ausente, desconocido, `'SERVICIOS'`, o `'OTROS'` (sin señal estructural
 * adicional de que sea un bien físico) resuelven `false` — nunca se asume control de stock sin
 * evidencia. La pertenencia al catálogo se valida explícitamente (`esValorDelCatalogoInterno`),
 * nunca mediante un cast (`as TipoExistenciaProducto`) que trataría cualquier string como válido.
 *
 * Si algún flujo legado necesitara distinguir "dato ausente" de "SERVICIOS confirmado" para su
 * propia compatibilidad histórica, debe resolverlo con un adaptador explícito propio — esta
 * fuente central no se deforma para ese caso.
 */
export function esProductoInventariable(entidad: EntidadConTipoExistencia): boolean {
  const valor = entidad.tipoExistencia;
  if (!valor) return false;
  return esValorDelCatalogoInterno(valor);
}
