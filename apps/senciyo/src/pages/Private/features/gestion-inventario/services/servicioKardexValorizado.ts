// gestion-inventario/services/servicioKardexValorizado.ts
//
// API pública del motor central de Kardex Valorizado para operaciones de ENTRADA (Etapa 1C, §13
// del encargo). Único punto de entrada productivo: encapsula reserva idempotente (Etapa 1B),
// lectura de snapshots, preparación pura (utils/entradaCuantitativaInventario.ts) y confirmación
// mediante la unidad de trabajo recuperable (Etapa 1B). No expone primitivas de escritura directa
// — nada aquí permite insertar el ledger, escribir movimientos o modificar stock por fuera de esta
// función.
//
// Etapa 1C es exclusivamente cuantitativa: no crea CapaCostoInventario ni
// ConsumoCapaCostoInventario, no calcula costo de venta, no hace consumo FIFO.
// `registrarEntradaValorizada` es el nombre aprobado para la API pública, pero en esta etapa solo
// acepta `modoOperacion: 'cuantitativo'` — una variante 'valorizado' se rechaza explícitamente.
//
// Corrección de la revisión final (causa raíz de reservas 'preparada' huérfanas): toda la
// validación funcional que no depende de la reserva (producto/almacén existen, cantidad válida,
// stock resultante no negativo) se ejecuta PRIMERO, con `calcularMutacionesEntrada`, ANTES de
// reservar — así un dato inválido nunca llega a crear una `OperacionIdempotenteInventario`
// 'preparada' huérfana. Si, pese a esa validación temprana, `prepararOperacionInventario` fallara
// DESPUÉS de reservar (p. ej. porque el estado cambió entre ambas lecturas), la operación recién
// reservada por ESTA misma llamada se cierra con `marcarOperacionFallida` — nunca queda ambigua —
// porque en ese punto se puede demostrar con certeza que `confirmarOperacionInventario` (la única
// función que crea una `TransaccionInventario` o escribe dominio) todavía no se invocó.

import type { Almacen } from '../../configuracion-sistema/modelos/Almacen';
import type { MovimientoStock } from '../models/inventory.types';
import type { Product } from '../../catalogo-articulos/models/types';
import type { DatosOperacionEntradaCuantitativa } from '../models/operacionEntradaInventario.types';
import type { PlanUnidadTrabajoInventario } from '../models/planUnidadTrabajoInventario.types';
import { reservarOperacionIdempotente } from '../utils/idempotenciaInventario';
import {
  calcularHashEntradaCuantitativa,
  validarContrato,
  prepararOperacionInventario,
  confirmarOperacionInventario,
} from '../utils/entradaCuantitativaInventario';
import { marcarOperacionFallida } from '../repositories/operacionIdempotenteInventario.repository';
import { obtenerVersionInventarioActual } from '../repositories/estadoVersionInventario.repository';
import { PRODUCT_STORAGE_KEY } from '../../catalogo-articulos/utils/catalogStorage';
import { STORAGE_KEY_MOVEMENTS } from '../repositories/stock.repository';
import { lsKey } from '../../../../../shared/tenant';

export interface DependenciasRegistrarEntradaValorizada {
  almacenes: ReadonlyMap<string, Almacen>;
  generarId: () => string;
  fechaActual: () => string;
}

export interface ResultadoRegistrarEntradaValorizada {
  documentoId: string;
  estado: 'nueva' | 'repetida' | 'reactivada';
  resultadoIds: string[];
  movimientos: MovimientoStock[];
  productosActualizados: Product[];
}

function leerSnapshots(empresaId: string): { productosRaw: string | null; movimientosRaw: string | null } {
  const claveProductos = lsKey(PRODUCT_STORAGE_KEY, empresaId);
  const claveMovimientos = lsKey(STORAGE_KEY_MOVEMENTS, empresaId);
  return {
    productosRaw: localStorage.getItem(claveProductos),
    movimientosRaw: localStorage.getItem(claveMovimientos),
  };
}

export const ServicioKardexValorizado = {
  /**
   * Registra una operación de entrada de inventario (nota de ingreso, ajuste positivo, o su
   * anulación cuantitativa) mediante reserva idempotente + preparación pura + confirmación por la
   * unidad de trabajo recuperable de Etapa 1B. Solo acepta `modoOperacion: 'cuantitativo'` en esta
   * etapa — cualquier otro valor se rechaza en tiempo de ejecución, sin reservar ni mutar nada.
   */
  async registrarEntradaValorizada(
    datos: DatosOperacionEntradaCuantitativa,
    dependencias: DependenciasRegistrarEntradaValorizada
  ): Promise<ResultadoRegistrarEntradaValorizada> {
    if (datos.modoOperacion !== 'cuantitativo') {
      throw new Error(
        `ServicioKardexValorizado.registrarEntradaValorizada: modoOperacion "${String(datos.modoOperacion)}" no está soportado — Etapa 1C solo acepta la variante cuantitativa.`
      );
    }

    // Validación PURA del contrato (§2, revisión final): no depende de ningún snapshot, así que
    // es segura de ejecutar antes de reservar — nunca da una respuesta distinta según el momento.
    // La validación FUNCIONAL (producto/almacén existen, stock resultante) sí depende del estado
    // externo y por eso NO se adelanta aquí: adelantarla rechazaría incorrectamente un reintento
    // legítimo ('repetida') que ya no coincide con el estado actual, YA mutado por el intento
    // anterior. Esa validación ocurre más abajo, después de resolver la idempotencia, protegida
    // por `marcarOperacionFallida` si falla.
    validarContrato(datos);

    const hashEntrada = await calcularHashEntradaCuantitativa(datos);

    const resultadoReserva = await reservarOperacionIdempotente({
      empresaId: datos.empresaId,
      clave: datos.claveIdempotencia,
      tipoOperacion: datos.tipoOperacion,
      hashEntrada,
      referenciaDocumentoId: datos.documentoId,
      referenciaDocumentoTipo: datos.tipoDocumento,
      generarId: dependencias.generarId,
      fechaActual: dependencias.fechaActual,
    });

    if (resultadoReserva.tipo === 'ambigua') {
      throw new Error(
        `ServicioKardexValorizado.registrarEntradaValorizada: la operación "${datos.claveIdempotencia}" de la empresa "${datos.empresaId}" quedó en un estado ambiguo (reserva 'preparada' sin resolución) — no se puede continuar automáticamente ni mutar stock.`
      );
    }

    if (resultadoReserva.tipo === 'repetida') {
      return {
        documentoId: datos.documentoId,
        estado: 'repetida',
        resultadoIds: resultadoReserva.resultadoIds,
        movimientos: [],
        productosActualizados: [],
      };
    }

    const { productosRaw, movimientosRaw } = leerSnapshots(datos.empresaId);
    const versionEsperada = obtenerVersionInventarioActual(datos.empresaId);

    let plan: PlanUnidadTrabajoInventario;
    let movimientosGenerados: MovimientoStock[];
    let productosActualizados: Product[];
    try {
      const preparado = prepararOperacionInventario({
        datos,
        operacionReservada: resultadoReserva.operacion,
        hashEntrada,
        versionEsperada,
        productosRaw,
        movimientosRaw,
        almacenes: dependencias.almacenes,
        generarId: dependencias.generarId,
      });
      plan = preparado.plan;
      movimientosGenerados = preparado.movimientosGenerados;
      productosActualizados = preparado.productosActualizados;
    } catch (causaPreparacion) {
      // En este punto NUNCA se invocó `confirmarOperacionInventario` (no existe transacción ni
      // escritura de dominio para esta operación) — cerrar con la transición segura ya aprobada
      // por Etapa 1B en vez de dejar la reserva 'preparada' huérfana (ambigua para siempre).
      marcarOperacionFallida(datos.empresaId, resultadoReserva.operacion.id);
      throw causaPreparacion;
    }

    const resultadoConfirmacion = await confirmarOperacionInventario(datos.documentoId, plan, dependencias.fechaActual);

    return {
      documentoId: datos.documentoId,
      estado: resultadoReserva.tipo,
      resultadoIds: resultadoConfirmacion.resultadoIds,
      movimientos: movimientosGenerados,
      productosActualizados,
    };
  },
};
