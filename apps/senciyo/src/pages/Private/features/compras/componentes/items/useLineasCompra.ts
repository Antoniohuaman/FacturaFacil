import { useState } from 'react';
import { getProductUnitOptions } from '@/shared/units/productUnitOptions';
import {
  crearLineaCompraDesdeProducto,
  type ProductDataLineaCompra,
  type ContextoTributarioLineaCompra,
} from '../../servicios/servicioOrdenCompra';
import { calcularLineaCompra, resolverSnapshotInventarioLinea, round2 } from '../../logica/reglasCompras';
import type { LineaCompra } from '../../modelos/LineaCompra';
import type { Product } from '../../../comprobantes-electronicos/lista-comprobantes/pages/ProductSelector';

function generarIdLinea(): string {
  return `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Estado y handlers de las líneas de un documento de Compras (OC o CC).
 * Toda línea proviene de un producto real del catálogo: unidad, impuesto y
 * clasificación se toman del producto (ver crearLineaCompraDesdeProducto).
 * No existen líneas libres/manuales en Compras. `contextoTributario` (Configuración → Impuestos +
 * PreferenciasInventario) es el mismo para todas las líneas nuevas de este documento — se resuelve
 * una sola vez en el llamador (FormularioComprobanteCompra/FormularioOrdenCompra), nunca aquí.
 */
export function useLineasCompra(lineasIniciales: LineaCompra[], contextoTributario: ContextoTributarioLineaCompra) {
  function recalcularLinea(linea: LineaCompra): LineaCompra {
    const { baseImponible, igv, total } = calcularLineaCompra(linea);

    // Snapshot de conversión resuelto con la unidad y la cantidad YA vigentes en la línea —
    // se ejecuta en cada recálculo (creación, cambio de unidad, cambio de cantidad) con la
    // misma regla única, nunca se deja un snapshot obsoleto a la espera de otra ruta.
    const snapshot = resolverSnapshotInventarioLinea({
      esInventariable: linea.esInventariable ?? false,
      unidadMedidaCodigo: linea.unidadMedidaCodigo,
      unidadesDisponibles: linea.unidadesDisponibles,
      cantidadComercialFinal: linea.cantidadSolicitada,
    });

    return {
      ...linea,
      subtotal: baseImponible,
      igv,
      total,
      cantidadPendienteRecepcion: linea.cantidadSolicitada,
      // Mismo criterio que recalcularSeguimientoFacturacionOC (reglasCompras.ts):
      // nunca 0 a ciegas — una línea de OC duplicada o en edición ya trae su
      // propio cantidadFacturada real (0 en un duplicado, el real en una
      // edición; en el caso de OC este campo se vuelve a recalcular de todas
      // formas al guardar, ver actualizarOrdenCompra), y el pendiente debe
      // reflejarlo mientras tanto en el formulario.
      cantidadPendienteFacturacion: Math.max(0, round2(linea.cantidadSolicitada - linea.cantidadFacturada)),
      cantidadPendienteInventario: 0,
      factorConversionAplicado: snapshot.factorConversionAplicado,
      cantidadDocumentadaInventariable: snapshot.cantidadDocumentadaInventariable,
    };
  }

  // Recalcula al montar (p.ej. líneas heredadas de una OC con una tasa de
  // IGV vigente distinta a la de cuando se registraron originalmente).
  const [lineas, setLineas] = useState<LineaCompra[]>(() => lineasIniciales.map(recalcularLinea));

  function actualizarLinea(id: string, campo: keyof LineaCompra, valor: unknown) {
    setLineas((prev) =>
      prev.map((l) => (l.id !== id ? l : recalcularLinea({ ...l, [campo]: valor } as LineaCompra))),
    );
  }

  function actualizarUnidadLinea(id: string, codigoUnidad: string) {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const opcion = l.unidadesDisponibles.find((u) => u.code === codigoUnidad);
        if (!opcion) return l;
        // recalcularLinea resuelve el snapshot de nuevo con la unidad ya cambiada — nunca se
        // limita a borrar el snapshot anterior y esperar que otra ruta lo repare.
        return recalcularLinea({ ...l, unidadMedida: opcion.label, unidadMedidaCodigo: opcion.code });
      }),
    );
  }

  function eliminarLinea(id: string) {
    setLineas((prev) => prev.filter((l) => l.id !== id));
  }

  function agregarProductosDesdeCatalogo(productos: Array<{ product: Product; quantity: number }>) {
    const nuevasLineas: LineaCompra[] = productos.map(({ product, quantity }) => {
      const unidadesDisponibles = getProductUnitOptions(product);
      const unidadBase = unidadesDisponibles.find((u) => u.isBase) ?? unidadesDisponibles[0];
      const productData: ProductDataLineaCompra = {
        productoId: product.id,
        codigoProducto: product.code,
        nombre: product.name,
        precioCompra: product.precioCompra ?? product.price,
        unidadMedida: unidadBase?.label,
        unidadMedidaCodigo: unidadBase?.code,
        unidadesDisponibles,
        imagen: product.imagen,
        stockReferencia: product.stock,
        alias: product.alias,
        descripcion: product.descripcion,
        categoria: product.category,
        marca: product.marca,
        modelo: product.modelo,
        tipoExistencia: product.tipoExistencia,
        codigoBarras: product.codigoBarras,
        codigoFabrica: product.codigoFabrica,
        codigoSunat: product.codigoSunat,
        peso: product.peso,
        impuestoProducto: product.impuesto,
        impuestoId: product.impuestoId,
        esServicio: product.tipoProducto === 'SERVICIO',
      };
      const linea = crearLineaCompraDesdeProducto(generarIdLinea(), productData, quantity, contextoTributario);
      return recalcularLinea(linea);
    });
    setLineas((prev) => [...prev, ...nuevasLineas]);
  }

  return {
    lineas,
    actualizarLinea,
    actualizarUnidadLinea,
    eliminarLinea,
    agregarProductosDesdeCatalogo,
  };
}

export type UseLineasCompraResultado = ReturnType<typeof useLineasCompra>;
