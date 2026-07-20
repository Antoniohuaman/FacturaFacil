// gestion-inventario/utils/reconciliacionStockInventario.ts
//
// Reconciliación cuantitativa stock↔capas (§14 del encargo de Etapa 1B). Función PURA: no lee ni
// escribe `localStorage`, no importa ningún repositorio — recibe la proyección actual y las capas
// de costo YA CARGADAS por el llamador (p. ej. vía `listarCapasCostoInventarioPorEmpresa`).
//
// Dirección permitida: capas → proyección propuesta (cada `DiferenciaReconciliacionStock` ya trae
// `cantidadSegunCapas`, la proyección derivada). Dirección PROHIBIDA: proyección/stock agregado →
// capas. Esta función nunca crea, modifica ni "corrige" una capa, nunca cambia costos, y nunca
// escribe `Product.stockPorAlmacen` — solo compara y reporta.

import type { CapaCostoInventario } from '../models/capaCostoInventario.types';
import { PRECISION_CANTIDAD_UNIDAD_MINIMA, redondearAPrecision } from './precisionInventario';

export interface ProyeccionStockInventario {
  empresaId: string;
  establecimientoId: string;
  productoId: string;
  almacenId: string;
  cantidad: number;
}

export interface DiferenciaReconciliacionStock {
  empresaId: string;
  establecimientoId: string;
  productoId: string;
  almacenId: string;
  cantidadProyectada: number;
  cantidadSegunCapas: number;
  diferencia: number;
  consistente: boolean;
}

export interface ResultadoReconciliacionStock {
  empresaId: string;
  diferencias: DiferenciaReconciliacionStock[];
  consistente: boolean;
}

interface GrupoInventario {
  establecimientoId: string;
  productoId: string;
  almacenId: string;
}

/**
 * Clave interna de agrupación — determinista y sin colisiones aunque los IDs contengan espacios,
 * dos puntos, guiones u otro separador visual. NO es un hash canónico de negocio (eso es
 * `serializacionCanonicaInventario.ts`/`hashInventario.ts`): es solo la clave de un `Map` interno,
 * por eso basta con `JSON.stringify` de la tupla ordenada — cada componente ya es un `string`
 * validado, y `JSON.stringify` escapa cualquier comilla o barra invertida que pudiera contener.
 */
function claveAgrupacion(grupo: GrupoInventario): string {
  return JSON.stringify([grupo.establecimientoId, grupo.productoId, grupo.almacenId]);
}

function validarCantidad(valor: number, contexto: string): number {
  if (!Number.isFinite(valor)) {
    throw new Error(`reconciliacionStockInventario: cantidad no finita en ${contexto} (recibido: ${valor}).`);
  }
  if (valor < 0) {
    throw new Error(`reconciliacionStockInventario: cantidad negativa en ${contexto} (recibido: ${valor}).`);
  }
  return valor;
}

/**
 * Compara la proyección cuantitativa actual contra la suma de `cantidadDisponible` de las capas de
 * costo NO revertidas, agrupando exactamente por establecimiento+producto+almacén (siempre dentro
 * de la misma `empresaId` — nunca se mezclan empresas, ni siquiera silenciosamente).
 */
export function reconciliarStockInventario(
  empresaId: string,
  proyeccionActual: ProyeccionStockInventario[],
  capas: CapaCostoInventario[]
): ResultadoReconciliacionStock {
  const segunCapasPorGrupo = new Map<string, { grupo: GrupoInventario; cantidad: number }>();

  for (const capa of capas) {
    if (capa.empresaId !== empresaId) {
      throw new Error(
        `reconciliacionStockInventario: la capa "${capa.id}" pertenece a la empresa "${capa.empresaId}", distinta de "${empresaId}" — no se pueden mezclar empresas.`
      );
    }
    if (capa.estado === 'revertida') {
      continue;
    }
    const cantidad = validarCantidad(capa.cantidadDisponible, `capa "${capa.id}"`);
    if (capa.estado === 'agotada' && cantidad !== 0) {
      throw new Error(`reconciliacionStockInventario: la capa "${capa.id}" está 'agotada' pero su cantidadDisponible no es 0 (recibido: ${cantidad}).`);
    }

    const grupo: GrupoInventario = { establecimientoId: capa.establecimientoId, productoId: capa.productoId, almacenId: capa.almacenId };
    const clave = claveAgrupacion(grupo);
    const existente = segunCapasPorGrupo.get(clave);
    const cantidadAcumulada = redondearAPrecision((existente?.cantidad ?? 0) + cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    segunCapasPorGrupo.set(clave, { grupo, cantidad: cantidadAcumulada });
  }

  const proyeccionPorGrupo = new Map<string, { grupo: GrupoInventario; cantidad: number }>();
  for (const proyeccion of proyeccionActual) {
    if (proyeccion.empresaId !== empresaId) {
      throw new Error(
        `reconciliacionStockInventario: la proyección incluye un registro de la empresa "${proyeccion.empresaId}", distinta de "${empresaId}" — no se pueden mezclar empresas.`
      );
    }
    const grupo: GrupoInventario = { establecimientoId: proyeccion.establecimientoId, productoId: proyeccion.productoId, almacenId: proyeccion.almacenId };
    const clave = claveAgrupacion(grupo);
    if (proyeccionPorGrupo.has(clave)) {
      throw new Error(
        `reconciliacionStockInventario: la proyección trae más de un registro para el mismo grupo (establecimiento="${grupo.establecimientoId}", producto="${grupo.productoId}", almacén="${grupo.almacenId}").`
      );
    }
    const cantidad = validarCantidad(proyeccion.cantidad, `proyección (establecimiento="${grupo.establecimientoId}", producto="${grupo.productoId}", almacén="${grupo.almacenId}")`);
    proyeccionPorGrupo.set(clave, { grupo, cantidad: redondearAPrecision(cantidad, PRECISION_CANTIDAD_UNIDAD_MINIMA) });
  }

  const clavesTotales = new Set<string>([...proyeccionPorGrupo.keys(), ...segunCapasPorGrupo.keys()]);
  const diferencias: DiferenciaReconciliacionStock[] = [];

  for (const clave of clavesTotales) {
    const entradaCapas = segunCapasPorGrupo.get(clave);
    const entradaProyeccion = proyeccionPorGrupo.get(clave);
    const grupo = entradaCapas?.grupo ?? entradaProyeccion?.grupo;
    if (!grupo) {
      // Inalcanzable: `clave` proviene de una de las dos colecciones, así que al menos una existe.
      throw new Error('reconciliacionStockInventario: estado interno inconsistente al agrupar.');
    }
    const cantidadSegunCapas = entradaCapas?.cantidad ?? 0;
    const cantidadProyectada = entradaProyeccion?.cantidad ?? 0;
    const diferencia = redondearAPrecision(cantidadProyectada - cantidadSegunCapas, PRECISION_CANTIDAD_UNIDAD_MINIMA);
    diferencias.push({
      empresaId,
      establecimientoId: grupo.establecimientoId,
      productoId: grupo.productoId,
      almacenId: grupo.almacenId,
      cantidadProyectada,
      cantidadSegunCapas,
      diferencia,
      consistente: diferencia === 0,
    });
  }

  diferencias.sort((a, b) =>
    a.establecimientoId.localeCompare(b.establecimientoId) ||
    a.productoId.localeCompare(b.productoId) ||
    a.almacenId.localeCompare(b.almacenId)
  );

  return { empresaId, diferencias, consistente: diferencias.every((d) => d.consistente) };
}
