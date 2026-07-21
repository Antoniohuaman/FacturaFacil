// gestion-inventario/utils/transferenciaCuantitativaInventario.ts
//
// Motor de TRANSFERENCIAS entre almacenes (Etapa 1E, §2-§4 del encargo). Reutiliza exactamente la
// misma cadena aprobada de entrada/salida (validar → hash → reservar → preparar → confirmar, vía
// `ServicioKardexValorizado.transferirStockValorizado` → `ejecutarOperacionInventario`) — este
// archivo solo aporta lo específico de una transferencia: origen Y destino en la MISMA operación,
// nunca confirmando primero la salida y después la entrada.
//
// Modo cuantitativo (§3): disminuye el origen, aumenta el destino, genera un movimiento SALIDA y
// uno ENTRADA relacionados — sin capas, sin costo. Modo valorizado (§4): existe y está probado,
// pero SOLO se ejecuta cuando `dependencias.valorizacionHabilitada === true` (cierre final de
// Etapa 1E, §1) — una dependencia de TENANT explícita, nunca derivada de la mera presencia de
// `CapaCostoInventario`. Ningún consumidor productivo la fija hoy, así que el motor opera siempre
// en modo cuantitativo en producción — la capacidad valorizada queda lista y probada (solo los
// tests la activan explícitamente), pero dormida hasta que la Etapa 2 conecte la fuente de verdad
// real. Aunque ya existan capas creadas por otra vía, nunca activan por sí solas la valorización.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { Product } from '../../catalogo-articulos/models/types';
import type { MovimientoStock } from '../models/inventory.types';
import type { DatosTransferenciaInventario } from '../models/operacionTransferenciaInventario.types';
import type { OperacionIdempotenteInventario } from '../models/operacionIdempotenteInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import type { ConsumoCapaCostoInventario } from '../models/consumoCapaCostoInventario.types';
import type { Transferencia } from '../models/transferencia.types';
import { esProductoInventariable } from '@/shared/inventory/clasificacionInventario';
import { ejecutarUnidadTrabajoInventario } from './unidadTrabajoInventario';
import { serializarCanonicamente } from './serializacionCanonicaInventario';
import { calcularHashInventario } from './hashInventario';
import { redondearAPrecision, PRECISION_CANTIDAD_UNIDAD_MINIMA, PRECISION_COSTO_UNITARIO_INTERNO } from './precisionInventario';
import { parsearColeccion, esProductoAlmacenable } from './operacionCuantitativaInventarioComun';
import { InventoryService } from '../services/inventory.service';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, listarCapasCostoInventarioPorAgrupacionFifo } from '../repositories/capaCostoInventario.repository';
import { CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO } from '../repositories/consumoCapaCostoInventario.repository';
import { CLAVE_COLECCION_TRANSFERENCIAS } from '../repositories/transferencia.repository';
import { lsKey } from '../../../../../shared/tenant';

/** Validación PURA del contrato (§2) — no depende de ningún snapshot, segura de ejecutar ANTES de reservar. */
export function validarContratoTransferencia(datos: DatosTransferenciaInventario): void {
  if (datos.modoOperacion !== 'cuantitativo') {
    throw new Error(`transferenciaCuantitativaInventario: modoOperacion "${String(datos.modoOperacion)}" no está soportado.`);
  }
  if (!datos.empresaId.trim()) throw new Error('transferenciaCuantitativaInventario: empresaId no puede estar vacío.');
  if (!datos.transferenciaId.trim()) throw new Error('transferenciaCuantitativaInventario: transferenciaId no puede estar vacío.');
  if (!datos.claveIdempotencia.trim()) throw new Error('transferenciaCuantitativaInventario: claveIdempotencia no puede estar vacía.');
  if (!datos.usuario.trim()) throw new Error('transferenciaCuantitativaInventario: usuario no puede estar vacío.');
  if (!datos.fecha.trim()) throw new Error('transferenciaCuantitativaInventario: fecha no puede estar vacía.');
  if (!datos.productoId.trim()) throw new Error('transferenciaCuantitativaInventario: productoId no puede estar vacío.');
  if (!datos.establecimientoOrigenId.trim()) throw new Error('transferenciaCuantitativaInventario: establecimientoOrigenId no puede estar vacío.');
  if (!datos.almacenOrigenId.trim()) throw new Error('transferenciaCuantitativaInventario: almacenOrigenId no puede estar vacío.');
  if (!datos.establecimientoDestinoId.trim()) throw new Error('transferenciaCuantitativaInventario: establecimientoDestinoId no puede estar vacío.');
  if (!datos.almacenDestinoId.trim()) throw new Error('transferenciaCuantitativaInventario: almacenDestinoId no puede estar vacío.');
  if (datos.almacenOrigenId === datos.almacenDestinoId) {
    throw new Error('transferenciaCuantitativaInventario: el almacén origen y el almacén destino deben ser diferentes.');
  }
  if (!Number.isFinite(datos.cantidadUnidadMinima) || datos.cantidadUnidadMinima <= 0) {
    throw new Error(`transferenciaCuantitativaInventario: cantidadUnidadMinima inválida (${datos.cantidadUnidadMinima}) — debe ser finita y mayor a cero.`);
  }
  const redondeada = redondearAPrecision(datos.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  if (redondeada !== datos.cantidadUnidadMinima) {
    throw new Error(`transferenciaCuantitativaInventario: cantidadUnidadMinima (${datos.cantidadUnidadMinima}) tiene más precisión que la permitida (${PRECISION_CANTIDAD_UNIDAD_MINIMA} decimales).`);
  }
}

function construirDtoCanonicoTransferencia(datos: DatosTransferenciaInventario): Record<string, unknown> {
  return {
    modoOperacion: datos.modoOperacion,
    empresaId: datos.empresaId,
    transferenciaId: datos.transferenciaId,
    tipoDocumento: datos.tipoDocumento,
    tipoOperacion: datos.tipoOperacion,
    productoId: datos.productoId,
    establecimientoOrigenId: datos.establecimientoOrigenId,
    almacenOrigenId: datos.almacenOrigenId,
    establecimientoDestinoId: datos.establecimientoDestinoId,
    almacenDestinoId: datos.almacenDestinoId,
    cantidadUnidadMinima: datos.cantidadUnidadMinima,
    motivo: datos.motivo,
    observaciones: (datos.observaciones ?? '').trim(),
    documentoReferencia: (datos.documentoReferencia ?? '').trim(),
  };
}

/** Hash de idempotencia de una transferencia — nunca fabricado a mano por el consumidor. */
export function calcularHashTransferencia(datos: DatosTransferenciaInventario): Promise<string> {
  return calcularHashInventario(serializarCanonicamente(construirDtoCanonicoTransferencia(datos)));
}

function validarReservaCoincideTransferencia(
  datos: DatosTransferenciaInventario,
  operacionReservada: OperacionIdempotenteInventario,
  hashEntrada: string
): void {
  if (operacionReservada.empresaId !== datos.empresaId) {
    throw new Error('transferenciaCuantitativaInventario: la operación reservada pertenece a otra empresa.');
  }
  if (operacionReservada.clave !== datos.claveIdempotencia) {
    throw new Error('transferenciaCuantitativaInventario: la operación reservada no corresponde a la clave de idempotencia de esta transferencia.');
  }
  if (operacionReservada.hashEntrada !== hashEntrada) {
    throw new Error('transferenciaCuantitativaInventario: la operación reservada no corresponde al hash de esta transferencia.');
  }
  if (operacionReservada.tipoOperacion !== datos.tipoOperacion) {
    throw new Error('transferenciaCuantitativaInventario: la operación reservada no corresponde al tipo de operación de esta transferencia.');
  }
}

function esCapaAlmacenable(valor: unknown): valor is CapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

function esConsumoAlmacenable(valor: unknown): valor is ConsumoCapaCostoInventario {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

function esTransferenciaAlmacenable(valor: unknown): valor is Transferencia {
  return typeof valor === 'object' && valor !== null && typeof (valor as { id?: unknown }).id === 'string';
}

function ordenarCapasFifo(capas: readonly CapaCostoInventario[]): CapaCostoInventario[] {
  return [...capas].sort((a, b) => {
    const fa = new Date(a.fechaEntrada).getTime();
    const fb = new Date(b.fechaEntrada).getTime();
    if (fa !== fb) return fa - fb;
    const ca = new Date(a.fechaCreacion).getTime();
    const cb = new Date(b.fechaCreacion).getTime();
    if (ca !== cb) return ca - cb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export interface ParametrosPreparaTransferencia {
  datos: DatosTransferenciaInventario;
  operacionReservada: OperacionIdempotenteInventario;
  hashEntrada: string;
  versionEsperada: number;
  productosRaw: string | null;
  movimientosRaw: string | null;
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  /**
   * Punto ÚNICO de activación del modo valorizado (cierre final de Etapa 1E, §1) — dependencia de
   * TENANT explícita, nunca derivada de la mera presencia de `CapaCostoInventario`. Ausente/`false`
   * (todo consumidor productivo hoy) fuerza el camino cuantitativo puro, exactamente como si el
   * almacén origen no tuviera ninguna capa — aunque ya existan capas creadas por otra vía, nunca
   * activan por sí solas la valorización. Reservado para que la Etapa 2 conecte aquí la fuente de
   * verdad real; solo los tests de la variante valorizada la fijan a `true`.
   */
  valorizacionHabilitada?: boolean;
}

export interface ResultadoPreparacionTransferencia {
  plan: PlanUnidadTrabajoInventario;
  movimientosGenerados: MovimientoStock[];
  productosActualizados: Product[];
}

/**
 * Preparación pura y completa de una transferencia (§2-§4): valida producto/almacenes/stock
 * disponible, calcula la mutación de AMBOS almacenes en la misma pasada, decide si corresponde
 * modo valorizado (capas disponibles en origen) y construye el plan único — origen, destino,
 * movimientos, capas/consumos (si aplica) y el documento Transferencia, todo en el MISMO
 * `PlanUnidadTrabajoInventario`.
 */
export function prepararOperacionTransferencia(
  params: ParametrosPreparaTransferencia
): ResultadoPreparacionTransferencia {
  const { datos, operacionReservada, hashEntrada, versionEsperada, productosRaw, movimientosRaw, almacenes, generarId, valorizacionHabilitada } = params;

  validarReservaCoincideTransferencia(datos, operacionReservada, hashEntrada);

  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, datos.empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, datos.empresaId);
  const claveCapas = lsKey(CLAVE_COLECCION_CAPAS_COSTO_INVENTARIO, datos.empresaId);
  const claveConsumos = lsKey(CLAVE_COLECCION_CONSUMOS_CAPA_COSTO_INVENTARIO, datos.empresaId);
  const claveTransferencias = lsKey(CLAVE_COLECCION_TRANSFERENCIAS, datos.empresaId);

  const productosCrudos = parsearColeccion(productosRaw, `la colección de productos ("${claveProductos}")`);
  const productos: Product[] = [];
  productosCrudos.forEach((elemento, indice) => {
    if (!esProductoAlmacenable(elemento)) {
      throw new Error(`transferenciaCuantitativaInventario: el elemento en el índice ${indice} de "${claveProductos}" no tiene la forma esperada de un producto.`);
    }
    productos.push(elemento);
  });
  const producto = productos.find((p) => p.id === datos.productoId);
  if (!producto) {
    throw new Error(`transferenciaCuantitativaInventario: el producto "${datos.productoId}" no existe en el catálogo.`);
  }
  if (!esProductoInventariable(producto)) {
    throw new Error(`transferenciaCuantitativaInventario: el producto "${producto.nombre}" no está controlado por stock (tipoExistencia no inventariable) — no puede transferirse.`);
  }

  const almacenOrigen = almacenes.get(datos.almacenOrigenId);
  if (!almacenOrigen) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén origen "${datos.almacenOrigenId}" no existe.`);
  }
  if (!almacenOrigen.estaActivoAlmacen) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén origen "${almacenOrigen.nombreAlmacen}" está inactivo.`);
  }
  // El destino nunca se determina por fallback silencioso: el establecimiento declarado debe
  // coincidir exactamente con el del almacén real.
  if (almacenOrigen.establecimientoId !== datos.establecimientoOrigenId) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén origen "${almacenOrigen.nombreAlmacen}" no pertenece al establecimiento "${datos.establecimientoOrigenId}" declarado.`);
  }

  const almacenDestino = almacenes.get(datos.almacenDestinoId);
  if (!almacenDestino) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén destino "${datos.almacenDestinoId}" no existe.`);
  }
  if (!almacenDestino.estaActivoAlmacen) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén destino "${almacenDestino.nombreAlmacen}" está inactivo.`);
  }
  if (almacenDestino.establecimientoId !== datos.establecimientoDestinoId) {
    throw new Error(`transferenciaCuantitativaInventario: el almacén destino "${almacenDestino.nombreAlmacen}" no pertenece al establecimiento "${datos.establecimientoDestinoId}" declarado.`);
  }

  const stockOrigenActual = InventoryService.getStock(producto, datos.almacenOrigenId);
  const reservadoOrigen = InventoryService.getReservedStock(producto, datos.almacenOrigenId);
  const disponibleOrigen = redondearAPrecision(stockOrigenActual - reservadoOrigen, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  if (datos.cantidadUnidadMinima > disponibleOrigen) {
    throw new Error(
      `transferenciaCuantitativaInventario: no hay stock disponible suficiente de "${producto.nombre}" en "${almacenOrigen.nombreAlmacen}" ` +
      `(disponible: ${disponibleOrigen}, solicitado: ${datos.cantidadUnidadMinima}) — respeta las reservas vigentes.`
    );
  }

  const stockDestinoActual = InventoryService.getStock(producto, datos.almacenDestinoId);
  const nuevoStockOrigen = redondearAPrecision(stockOrigenActual - datos.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  const nuevoStockDestino = redondearAPrecision(stockDestinoActual + datos.cantidadUnidadMinima, PRECISION_CANTIDAD_UNIDAD_MINIMA);
  if (nuevoStockOrigen < 0) {
    throw new Error(`transferenciaCuantitativaInventario: la transferencia dejaría el stock de "${producto.nombre}" en "${almacenOrigen.nombreAlmacen}" en ${nuevoStockOrigen} (negativo) — operación rechazada.`);
  }

  const fechaOperacion = new Date(datos.fecha);
  const tipoTransferencia: Transferencia['tipoTransferencia'] =
    datos.establecimientoOrigenId === datos.establecimientoDestinoId ? 'INTRA_ESTABLECIMIENTO' : 'INTER_ESTABLECIMIENTO';

  const idSalida = generarId();
  const idEntrada = generarId();

  const movimientoSalida: MovimientoStock = {
    id: idSalida,
    productoId: producto.id,
    productoCodigo: producto.codigo,
    productoNombre: producto.nombre,
    tipo: 'SALIDA',
    motivo: datos.motivo,
    cantidad: datos.cantidadUnidadMinima,
    cantidadAnterior: stockOrigenActual,
    cantidadNueva: nuevoStockOrigen,
    usuario: datos.usuario,
    observaciones: datos.observaciones,
    documentoReferencia: datos.documentoReferencia,
    fecha: fechaOperacion,
    almacenId: almacenOrigen.id,
    almacenCodigo: almacenOrigen.codigoAlmacen,
    almacenNombre: almacenOrigen.nombreAlmacen,
    EstablecimientoId: almacenOrigen.establecimientoId,
    EstablecimientoCodigo: almacenOrigen.codigoEstablecimientoDesnormalizado || '',
    EstablecimientoNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
    esTransferencia: true,
    transferenciaId: datos.transferenciaId,
    tipoTransferencia,
    almacenOrigenId: almacenOrigen.id,
    almacenOrigenNombre: almacenOrigen.nombreAlmacen,
    almacenDestinoId: almacenDestino.id,
    almacenDestinoNombre: almacenDestino.nombreAlmacen,
    movimientoRelacionadoId: idEntrada,
    empresaId: datos.empresaId,
    documentoOrigenId: datos.transferenciaId,
    tipoDocumentoOrigen: 'transferencia',
    lineaOrigenId: datos.transferenciaId,
    estado: 'confirmado',
    claveIdempotencia: datos.claveIdempotencia,
  };

  const movimientoEntrada: MovimientoStock = {
    id: idEntrada,
    productoId: producto.id,
    productoCodigo: producto.codigo,
    productoNombre: producto.nombre,
    tipo: 'ENTRADA',
    motivo: datos.motivo,
    cantidad: datos.cantidadUnidadMinima,
    cantidadAnterior: stockDestinoActual,
    cantidadNueva: nuevoStockDestino,
    usuario: datos.usuario,
    observaciones: datos.observaciones,
    documentoReferencia: datos.documentoReferencia,
    fecha: fechaOperacion,
    almacenId: almacenDestino.id,
    almacenCodigo: almacenDestino.codigoAlmacen,
    almacenNombre: almacenDestino.nombreAlmacen,
    EstablecimientoId: almacenDestino.establecimientoId,
    EstablecimientoCodigo: almacenDestino.codigoEstablecimientoDesnormalizado || '',
    EstablecimientoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
    esTransferencia: true,
    transferenciaId: datos.transferenciaId,
    tipoTransferencia,
    almacenOrigenId: almacenOrigen.id,
    almacenOrigenNombre: almacenOrigen.nombreAlmacen,
    almacenDestinoId: almacenDestino.id,
    almacenDestinoNombre: almacenDestino.nombreAlmacen,
    movimientoRelacionadoId: idSalida,
    empresaId: datos.empresaId,
    documentoOrigenId: datos.transferenciaId,
    tipoDocumentoOrigen: 'transferencia',
    lineaOrigenId: datos.transferenciaId,
    estado: 'confirmado',
    claveIdempotencia: datos.claveIdempotencia,
  };

  const stockPorAlmacenActualizado = {
    ...(producto.stockPorAlmacen ?? {}),
    [datos.almacenOrigenId]: nuevoStockOrigen,
    [datos.almacenDestinoId]: nuevoStockDestino,
  };
  const productoConStockNuevo: Product = {
    ...producto,
    stockPorAlmacen: stockPorAlmacenActualizado,
    fechaActualizacion: fechaOperacion,
  };
  const almacenesArray = Array.from(almacenes.values());
  const productoActualizado = InventoryService.recalcularTotalesStock(productoConStockNuevo, almacenesArray);
  const productosFinales = productos.map((p) => (p.id === producto.id ? productoActualizado : p));

  const movimientosAnteriores = parsearColeccion(movimientosRaw, `la colección de movimientos ("${claveMovimientos}")`);
  const movimientosFinales = [...movimientosAnteriores, movimientoSalida, movimientoEntrada];

  // ── Modo valorizado (§4): SOLO si `valorizacionHabilitada` fue fijado explícitamente a `true`
  // por el llamador (cierre final de Etapa 1E, §1) — nunca por la mera presencia de capas. Ningún
  // consumidor productivo lo activa hoy, así que esta rama nunca se alcanza en producción; los
  // tests de la variante valorizada son los únicos que la activan.
  const capasOrigenDisponibles = valorizacionHabilitada
    ? listarCapasCostoInventarioPorAgrupacionFifo({
        empresaId: datos.empresaId,
        establecimientoId: datos.establecimientoOrigenId,
        productoId: datos.productoId,
        almacenId: datos.almacenOrigenId,
        estado: 'disponible',
      })
    : [];

  const escrituras: PlanUnidadTrabajoInventario['escrituras'] = [
    { clave: claveProductos, valorAnterior: productosRaw, valorPropuesto: JSON.stringify(productosFinales) },
    { clave: claveMovimientos, valorAnterior: movimientosRaw, valorPropuesto: JSON.stringify(movimientosFinales) },
  ];

  let capasOrigenIds: string[] | undefined;
  let capasDestinoIds: string[] | undefined;

  if (capasOrigenDisponibles.length > 0) {
    const capasOrdenadas = ordenarCapasFifo(capasOrigenDisponibles);
    let restante = datos.cantidadUnidadMinima;
    const capasOrigenActualizadasPorId = new Map<string, CapaCostoInventario>();
    const capasDestinoNuevas: CapaCostoInventario[] = [];
    const consumosNuevos: ConsumoCapaCostoInventario[] = [];
    const idsOrigenTocados: string[] = [];
    const idsDestinoCreados: string[] = [];

    for (const capa of capasOrdenadas) {
      if (restante <= 0) break;
      if (capa.cantidadDisponible <= 0) continue;
      const consumir = Math.min(capa.cantidadDisponible, restante);
      restante = redondearAPrecision(restante - consumir, PRECISION_CANTIDAD_UNIDAD_MINIMA);

      const nuevaDisponibleOrigen = redondearAPrecision(capa.cantidadDisponible - consumir, PRECISION_CANTIDAD_UNIDAD_MINIMA);
      capasOrigenActualizadasPorId.set(capa.id, {
        ...capa,
        cantidadDisponible: nuevaDisponibleOrigen,
        estado: nuevaDisponibleOrigen <= 0 ? 'agotada' : 'disponible',
      });
      idsOrigenTocados.push(capa.id);

      const valorConsumidoBase = redondearAPrecision(capa.costoUnitarioBaseMonedaBase * consumir, PRECISION_COSTO_UNITARIO_INTERNO);
      consumosNuevos.push({
        id: generarId(),
        empresaId: datos.empresaId,
        movimientoSalidaId: idSalida,
        lineaDocumentoSalidaId: datos.transferenciaId,
        capaId: capa.id,
        cantidadConsumida: consumir,
        costoUnitarioBaseMonedaBase: capa.costoUnitarioBaseMonedaBase,
        valorConsumidoMonedaBase: valorConsumidoBase,
        monedaBase: capa.monedaBase,
        fecha: datos.fecha,
        estado: 'confirmado',
        motivo: 'transferencia',
      });

      const idCapaDestino = generarId();
      capasDestinoNuevas.push({
        id: idCapaDestino,
        empresaId: datos.empresaId,
        establecimientoId: datos.establecimientoDestinoId,
        productoId: datos.productoId,
        almacenId: datos.almacenDestinoId,
        movimientoEntradaId: idEntrada,
        tipoDocumentoOrigen: 'transferencia',
        documentoOrigenId: datos.transferenciaId,
        lineaOrigenId: datos.transferenciaId,
        capaOrigenId: capa.id,
        // Snapshots por unidad (costo/tasa) conservados EXACTOS — nunca revalorizados. La
        // cantidad/valor comercial ORIGINAL de la compra pertenece a la capa origen, no se copia
        // a una capa que ahora representa solo una porción transferida.
        costoUnitarioComercialOriginal: capa.costoUnitarioComercialOriginal,
        factorConversionAplicado: capa.factorConversionAplicado,
        cantidadInicial: consumir,
        cantidadDisponible: consumir,
        costoUnitarioBaseOriginal: capa.costoUnitarioBaseOriginal,
        costoUnitarioBaseMonedaBase: capa.costoUnitarioBaseMonedaBase,
        valorValorizableOriginal: redondearAPrecision(capa.costoUnitarioBaseOriginal * consumir, PRECISION_COSTO_UNITARIO_INTERNO),
        valorValorizableMonedaBase: valorConsumidoBase,
        monedaBase: capa.monedaBase,
        monedaOriginal: capa.monedaOriginal,
        tipoCambioAplicado: capa.tipoCambioAplicado,
        fechaTipoCambio: capa.fechaTipoCambio,
        // Fecha de adquisición económica conservada — nunca se reemplaza por la fecha de la transferencia.
        fechaEntrada: capa.fechaEntrada,
        estado: 'disponible',
        procedencia: 'transferencia',
        usuario: datos.usuario,
        // fechaCreacion SÍ es la fecha real de la transferencia (nueva capa, nace ahora).
        fechaCreacion: datos.fecha,
      });
      idsDestinoCreados.push(idCapaDestino);
    }

    if (restante > 0) {
      throw new Error(
        `transferenciaCuantitativaInventario: las capas de costo disponibles en "${almacenOrigen.nombreAlmacen}" para "${producto.nombre}" ` +
        `no cubren exactamente la cantidad a transferir (falta ${restante}) — operación rechazada completa.`
      );
    }

    const capasRawTodas = parsearColeccion(
      localStorage.getItem(claveCapas),
      `la colección de capas de costo ("${claveCapas}")`
    ).map((elemento, indice) => {
      if (!esCapaAlmacenable(elemento)) {
        throw new Error(`transferenciaCuantitativaInventario: el elemento en el índice ${indice} de "${claveCapas}" no tiene la forma esperada de una capa de costo.`);
      }
      return elemento;
    });
    const capasFinales = capasRawTodas
      .map((c) => capasOrigenActualizadasPorId.get(c.id) ?? c)
      .concat(capasDestinoNuevas);

    const consumosRawTodos = parsearColeccion(
      localStorage.getItem(claveConsumos),
      `la colección de consumos de capas ("${claveConsumos}")`
    ).map((elemento, indice) => {
      if (!esConsumoAlmacenable(elemento)) {
        throw new Error(`transferenciaCuantitativaInventario: el elemento en el índice ${indice} de "${claveConsumos}" no tiene la forma esperada de un consumo de capa.`);
      }
      return elemento;
    });
    const consumosFinales = [...consumosRawTodos, ...consumosNuevos];

    escrituras.push(
      { clave: claveCapas, valorAnterior: localStorage.getItem(claveCapas), valorPropuesto: JSON.stringify(capasFinales) },
      { clave: claveConsumos, valorAnterior: localStorage.getItem(claveConsumos), valorPropuesto: JSON.stringify(consumosFinales) },
    );
    capasOrigenIds = idsOrigenTocados;
    capasDestinoIds = idsDestinoCreados;
  }

  const transferenciasRawAnterior = localStorage.getItem(claveTransferencias);
  const transferenciasCrudas = parsearColeccion(transferenciasRawAnterior, `la colección de transferencias ("${claveTransferencias}")`).map((elemento, indice) => {
    if (!esTransferenciaAlmacenable(elemento)) {
      throw new Error(`transferenciaCuantitativaInventario: el elemento en el índice ${indice} de "${claveTransferencias}" no tiene la forma esperada de una transferencia.`);
    }
    return elemento;
  });
  const transferenciaDoc: Transferencia = {
    id: datos.transferenciaId,
    empresaId: datos.empresaId,
    fecha: fechaOperacion,
    productoId: producto.id,
    productoCodigo: producto.codigo,
    productoNombre: producto.nombre,
    almacenOrigenId: almacenOrigen.id,
    almacenOrigenNombre: almacenOrigen.nombreAlmacen,
    establecimientoOrigenId: almacenOrigen.establecimientoId,
    establecimientoOrigenNombre: almacenOrigen.nombreEstablecimientoDesnormalizado || '',
    almacenDestinoId: almacenDestino.id,
    almacenDestinoNombre: almacenDestino.nombreAlmacen,
    establecimientoDestinoId: almacenDestino.establecimientoId,
    establecimientoDestinoNombre: almacenDestino.nombreEstablecimientoDesnormalizado || '',
    cantidad: datos.cantidadUnidadMinima,
    tipoTransferencia,
    estado: 'CONFIRMADA',
    documentoReferencia: datos.documentoReferencia,
    observaciones: datos.observaciones,
    usuario: datos.usuario,
    movimientoSalidaId: idSalida,
    movimientoEntradaId: idEntrada,
    ...(capasOrigenIds ? { capasOrigenIds } : {}),
    ...(capasDestinoIds ? { capasDestinoIds } : {}),
  };
  const transferenciasFinales = [...transferenciasCrudas, transferenciaDoc];
  escrituras.push({
    clave: claveTransferencias,
    valorAnterior: transferenciasRawAnterior,
    valorPropuesto: JSON.stringify(transferenciasFinales),
  });

  const plan: PlanUnidadTrabajoInventario = {
    id: generarId(),
    empresaId: datos.empresaId,
    operacionIdempotenteId: operacionReservada.id,
    claveIdempotencia: datos.claveIdempotencia,
    tipoOperacion: datos.tipoOperacion,
    hashEntrada,
    versionEsperada,
    escrituras,
    resultadoIds: [idSalida, idEntrada],
    usuario: datos.usuario,
  };

  return {
    plan,
    movimientosGenerados: [movimientoSalida, movimientoEntrada],
    productosActualizados: [productoActualizado],
  };
}

export interface ResultadoConfirmacionTransferencia {
  documentoId: string;
  resultadoIds: string[];
  transaccionId: string;
}

/** Capa delgada sobre `ejecutarUnidadTrabajoInventario` — no recalcula nada, solo ejecuta el plan ya calculado. */
export async function confirmarOperacionTransferencia(
  documentoId: string,
  plan: PlanUnidadTrabajoInventario,
  fechaActual: () => string
): Promise<ResultadoConfirmacionTransferencia> {
  const resultado = await ejecutarUnidadTrabajoInventario({ plan, fechaActual });
  return {
    documentoId,
    resultadoIds: resultado.resultadoIds,
    transaccionId: resultado.transaccionId,
  };
}
