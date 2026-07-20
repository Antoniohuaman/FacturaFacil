// gestion-inventario/utils/serializacionCanonicaInventario.ts
//
// Serialización determinista de un valor de entrada de negocio, previa al cálculo del hash de
// idempotencia (§21). Dos objetos "equivalentes" (mismas claves y valores, distinto orden de
// propiedades) deben producir EXACTAMENTE la misma cadena — de lo contrario, el mismo documento
// podría generar dos hashes distintos según el orden accidental en que se construyó el objeto en
// memoria, rompiendo la detección de reintentos legítimos. No usa `JSON.stringify` directo (no
// ordena claves) y rechaza explícitamente cualquier valor que no tenga una representación
// determinista real — nunca "hace lo mejor posible" en silencio con un dato ambiguo.
//
// ALLOW-LIST estricta (Bloqueante 4 de la revisión de Etapa 1B): solo se acepta `null`, `boolean`,
// `string`, `number` finito, arreglos DENSOS y objetos PLANOS (prototipo exactamente
// `Object.prototype`). Cualquier otro tipo de objeto — `Date`, `Map`, `Set`, `RegExp`, `Promise`,
// `Error`, `ArrayBuffer`, vistas tipadas, instancias de clase, objetos con prototipo `null` o
// personalizado — tiene una representación ambigua o con pérdida de semántica si se tratara como
// `Record<string, unknown>` (p. ej. una `Date` se convertiría silenciosamente en `{}`), así que se
// rechaza explícitamente en vez de arriesgar una colisión estructural entre valores distintos.

function tipoNoSoportado(valor: unknown): string {
  if (typeof valor === 'bigint') return 'bigint';
  if (typeof valor === 'function') return 'función';
  if (typeof valor === 'symbol') return 'symbol';
  return typeof valor;
}

/** Nombre del constructor para un mensaje de error útil — nunca se usa para decidir comportamiento, solo para diagnóstico. */
function nombreConstructor(valor: object): string {
  const prototipo: unknown = Object.getPrototypeOf(valor);
  if (prototipo === null) return '(prototipo null)';
  const constructor: unknown = (prototipo as { constructor?: unknown }).constructor;
  if (typeof constructor === 'function' && typeof constructor.name === 'string' && constructor.name !== '') {
    return constructor.name;
  }
  return '(objeto con prototipo personalizado)';
}

function contieneClaveSimbolica(valor: object): boolean {
  return Reflect.ownKeys(valor).some((clave) => typeof clave === 'symbol');
}

/**
 * Un arreglo denso: cada índice entre 0 y length-1 es una propiedad propia real (sin huecos), y no
 * existe ninguna propiedad adicional además de los índices numéricos y `length`.
 */
function esArregloDenso(valor: unknown[]): boolean {
  for (let indice = 0; indice < valor.length; indice++) {
    if (!Object.prototype.hasOwnProperty.call(valor, indice)) {
      return false;
    }
  }
  for (const clave of Reflect.ownKeys(valor)) {
    if (clave === 'length') continue;
    if (typeof clave === 'symbol') return false;
    const comoIndice = Number(clave);
    if (!Number.isInteger(comoIndice) || comoIndice < 0 || comoIndice >= valor.length) {
      return false;
    }
  }
  return true;
}

/** Ninguna propiedad propia puede ser un accessor (getter/setter) — nunca se ejecuta un getter arbitrario durante la serialización. */
function tienePropiedadAccessor(valor: object): string | undefined {
  const descriptores = Object.getOwnPropertyDescriptors(valor);
  for (const [clave, descriptor] of Object.entries(descriptores)) {
    if (descriptor.get !== undefined || descriptor.set !== undefined) {
      return clave;
    }
  }
  return undefined;
}

/**
 * Serializa `valor` a una cadena canónica: claves de objeto ordenadas recursivamente, orden de
 * arreglos preservado (el orden de un arreglo SÍ es información de negocio, nunca se reordena).
 * No muta la entrada. Lanza `Error` explícito ante cualquier valor fuera de la allow-list — ver
 * la nota de alcance al inicio del archivo.
 */
export function serializarCanonicamente(valor: unknown): string {
  return serializarValor(valor, []);
}

function serializarValor(valor: unknown, ancestros: unknown[]): string {
  if (valor === null) return 'null';

  const tipo = typeof valor;

  if (tipo === 'string') return JSON.stringify(valor);
  if (tipo === 'boolean') return valor ? 'true' : 'false';

  if (tipo === 'number') {
    if (!Number.isFinite(valor)) {
      throw new Error(`serializarCanonicamente: no se puede serializar un número no finito (${String(valor)}) — no tiene una representación canónica estable.`);
    }
    return String(valor);
  }

  if (tipo === 'undefined') {
    throw new Error('serializarCanonicamente: no se puede serializar "undefined" — omite el campo explícitamente si su ausencia es el valor deseado, en vez de dejarlo indefinido.');
  }

  if (tipo === 'bigint' || tipo === 'function' || tipo === 'symbol') {
    throw new Error(`serializarCanonicamente: no se puede serializar un valor de tipo "${tipoNoSoportado(valor)}" — no tiene una representación canónica determinista.`);
  }

  // tipo === 'object' (Array u objeto plano — cualquier otro tipo de objeto se rechaza abajo)
  const objetoValor = valor as object;

  if (contieneClaveSimbolica(objetoValor)) {
    throw new Error('serializarCanonicamente: el valor tiene una propiedad con clave Symbol — no tiene una representación canónica determinista, nunca se ignora en silencio.');
  }

  if (ancestros.includes(valor)) {
    throw new Error('serializarCanonicamente: referencia circular detectada — no se puede serializar de forma determinista.');
  }
  const siguientesAncestros = [...ancestros, valor];

  if (Array.isArray(valor)) {
    if (!esArregloDenso(valor)) {
      throw new Error('serializarCanonicamente: el arreglo tiene huecos o propiedades adicionales no indexadas — no tiene una representación canónica determinista.');
    }
    const elementos = valor.map((elemento) => serializarValor(elemento, siguientesAncestros));
    return `[${elementos.join(',')}]`;
  }

  if (Object.getPrototypeOf(objetoValor) !== Object.prototype) {
    throw new Error(
      `serializarCanonicamente: no se puede serializar una instancia de "${nombreConstructor(objetoValor)}" — solo se aceptan objetos planos (prototipo Object.prototype); tipos como Date, Map, Set, RegExp, Promise, Error o instancias de clase tendrían una representación ambigua o con pérdida de semántica.`
    );
  }

  const claveAccessor = tienePropiedadAccessor(objetoValor);
  if (claveAccessor !== undefined) {
    throw new Error(`serializarCanonicamente: la propiedad "${claveAccessor}" es un accessor (getter/setter) — nunca se ejecuta un getter arbitrario durante la serialización.`);
  }

  const objeto = valor as Record<string, unknown>;
  const claves = Object.keys(objeto).sort();
  const partes = claves.map((clave) => {
    const valorClave = objeto[clave];
    if (valorClave === undefined) {
      throw new Error(`serializarCanonicamente: el campo "${clave}" es "undefined" — omite la clave del objeto en vez de dejarla indefinida.`);
    }
    return `${JSON.stringify(clave)}:${serializarValor(valorClave, siguientesAncestros)}`;
  });
  return `{${partes.join(',')}}`;
}
