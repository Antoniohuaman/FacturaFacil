// gestion-inventario/utils/invalidacionValorizacionInicial.ts
//
// Invalidación de detalles del lote de valorización inicial cuando una mutación cuantitativa
// CONFIRMADA afecta un producto+almacén ya propuesto (Etapa 2, §8 del encargo; §24.1ter). Se integra
// en el motor central UNA sola vez (gestion-inventario/services/servicioKardexValorizado.ts, dentro
// de `ejecutarOperacionInventario`) — nunca se llama manualmente desde cada pantalla.

import type { EstadoActivacionValorizacion } from '../models/estadoActivacionValorizacion.types';
import type { ValorizacionInicialInventario, DetalleValorizacionInicial } from '../models/valorizacionInicialInventario.types';
import { claveDetalleValorizacion } from '../models/valorizacionInicialInventario.types';
import { resolverModoOperacion } from './estadoActivacionValorizacionInventario';
import { obtenerLoteActivoPorEmpresa, actualizarValorizacionInicialInventario } from '../repositories/valorizacionInicialInventario.repository';
import {
  listarInvalidacionesPendientes,
  quitarInvalidacionPendiente,
} from '../repositories/invalidacionPendienteValorizacionInicial.repository';

export interface ProductoAlmacenAfectado {
  productoId: string;
  almacenId: string;
}

/**
 * Cálculo puro: dado un lote y la lista de producto+almacén afectados por una mutación confirmada,
 * devuelve el lote con los detalles coincidentes marcados `requiereRecalculo=true` y `confirmado=false`
 * (el costo ingresado se conserva como referencia visual — nunca se limpia `costoConfirmado`, pero deja
 * de contar como confirmado). Devuelve el MISMO objeto lote (referencia) si ningún detalle coincide,
 * para que el llamador pueda evitar una escritura innecesaria.
 */
export function invalidarDetalleSiAfectado(
  lote: ValorizacionInicialInventario,
  afectados: readonly ProductoAlmacenAfectado[],
  fechaActual: string
): ValorizacionInicialInventario {
  const clavesAfectadas = new Set(afectados.map((a) => claveDetalleValorizacion(a.productoId, a.almacenId)));
  if (clavesAfectadas.size === 0) return lote;

  let huboCambio = false;
  const detalles: DetalleValorizacionInicial[] = lote.detalles.map((detalle) => {
    const clave = claveDetalleValorizacion(detalle.productoId, detalle.almacenId);
    if (!clavesAfectadas.has(clave)) return detalle;
    if (detalle.requiereRecalculo) return detalle; // ya invalidado — no reescribir fechaUltimaRevision de nuevo.
    huboCambio = true;
    return {
      ...detalle,
      requiereRecalculo: true,
      confirmado: false,
      fechaUltimaRevision: fechaActual,
    };
  });

  if (!huboCambio) return lote;
  return { ...lote, detalles };
}

/**
 * Punto de integración centralizado, invocado desde `ejecutarOperacionInventario` tras CONFIRMAR
 * (nunca en una reserva "repetida"/idempotente ni tras una preparación fallida) una operación
 * cuantitativa. No-op silencioso si: la empresa no tiene un lote activo, el lote no está en
 * `en_preparacion`/`pendiente_costos` (§8 del encargo — `validada`/`cancelada` nunca se invalidan
 * retroactivamente), o ningún producto+almacén afectado coincide con un detalle del lote.
 */
export function invalidarLoteValorizacionInicialSiAfectado(
  empresaId: string,
  estadoValorizacion: EstadoActivacionValorizacion,
  afectados: readonly ProductoAlmacenAfectado[],
  fechaActual: string
): void {
  const modo = resolverModoOperacion(estadoValorizacion);
  if (modo !== 'cuantitativo_invalida_snapshot') return;
  if (afectados.length === 0) return;

  const lote = obtenerLoteActivoPorEmpresa(empresaId);
  if (!lote) return;
  if (lote.estado !== 'en_preparacion' && lote.estado !== 'pendiente_costos') return;

  const loteInvalidado = invalidarDetalleSiAfectado(lote, afectados, fechaActual);
  if (loteInvalidado === lote) return; // sin cambios reales — evita una escritura vacía.

  actualizarValorizacionInicialInventario(loteInvalidado, empresaId);
}

/**
 * Reintenta cada invalidación que quedó pendiente de un intento previo fallido (Etapa 2, cierre de
 * bloqueante 1 de la revisión: "la invalidación nunca puede ser best-effort silencioso"). Invocada
 * al INICIO de cada operación del motor para esta empresa (`ejecutarOperacionInventario`) — nunca
 * depende de que alguien recuerde llamarla manualmente. Reintentar una invalidación ya aplicada es
 * un no-op seguro (`invalidarDetalleSiAfectado` es idempotente: un detalle ya marcado
 * `requiereRecalculo` no se reescribe), así que drenar en cada operación nunca duplica efectos. Una
 * entrada que sigue sin poder resolverse (ej. el lote ya no existe en el estado esperado) permanece
 * en la cola — nunca se descarta en silencio.
 */
export function drenarInvalidacionesPendientes(empresaId: string, fechaActual: () => string): void {
  const pendientes = listarInvalidacionesPendientes(empresaId);
  for (const pendiente of pendientes) {
    try {
      const lote = obtenerLoteActivoPorEmpresa(empresaId);
      if (lote && (lote.estado === 'en_preparacion' || lote.estado === 'pendiente_costos')) {
        const loteInvalidado = invalidarDetalleSiAfectado(lote, pendiente.afectados, fechaActual());
        if (loteInvalidado !== lote) {
          actualizarValorizacionInicialInventario(loteInvalidado, empresaId);
        }
      }
      quitarInvalidacionPendiente(empresaId, pendiente.id);
    } catch (causaDrenado) {
      console.error(
        `invalidacionValorizacionInicial: no se pudo drenar la invalidación pendiente "${pendiente.id}" de la empresa "${empresaId}" — permanece en cola para el próximo intento.`,
        causaDrenado
      );
    }
  }
}
