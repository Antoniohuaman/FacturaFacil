import type { DefinicionTour } from "@/shared/tour";
import { registrarTour } from "@/shared/tour";
import { crearAyudaPasoTemporal } from "@/shared/tour/contenidoAyudaTemporal";

export const tourPrimeraVenta: DefinicionTour = {
  id: "primera-venta",
  version: 1,
  pasos: [
    {
      idPaso: "primera-venta-caja",
      selector: "[data-tour=\"primera-venta-caja\"]",
      titulo: "Apertura de caja",
      descripcion: "Si la caja está cerrada, ábrela antes de emitir comprobantes.",
      posicion: "abajo",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como abrir la caja antes de vender",
        contenidoLectura: [
          "Confirma primero si la caja esta activa para evitar bloqueos al cobrar.",
          "Si aparece cerrada, abre la caja desde este bloque antes de continuar.",
        ],
      }),
    },
    {
      idPaso: "primera-venta-cliente",
      selector: "[data-tour=\"primera-venta-cliente\"]",
      titulo: "Selecciona un cliente",
      descripcion: "Busca por nombre o documento para asociar el cliente a la venta.",
      posicion: "abajo",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como elegir el cliente correcto",
        contenidoLectura: [
          "Busca por nombre o numero de documento para encontrar al cliente rapido.",
          "Verifica que el cliente elegido coincida con la venta antes de seguir.",
        ],
      }),
    },
    {
      idPaso: "primera-venta-productos-buscar",
      selector: "[data-tour=\"primera-venta-productos-buscar\"]",
      titulo: "Agrega productos",
      descripcion: "Usa el buscador para añadir productos al comprobante.",
      posicion: "abajo",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como agregar productos al comprobante",
        contenidoLectura: [
          "Usa el buscador para ubicar productos por nombre, codigo o coincidencia rapida.",
          "Agrega solo los items confirmados para mantener limpio el comprobante.",
        ],
      }),
    },
    {
      idPaso: "primera-venta-productos-lista",
      selector: "[data-tour=\"primera-venta-productos-lista\"]",
      titulo: "Revisa el detalle",
      descripcion: "Aquí se listan los productos agregados y sus cantidades.",
      posicion: "arriba",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como revisar el detalle antes de emitir",
        contenidoLectura: [
          "Valida cantidades, precios y lineas agregadas antes de cerrar la venta.",
          "Si detectas un error, corrige el item aqui antes de pasar al cobro.",
        ],
      }),
    },
    {
      idPaso: "primera-venta-totales",
      selector: "[data-tour=\"primera-venta-totales\"]",
      titulo: "Totales de la venta",
      descripcion: "Verifica subtotal, impuestos y total antes de continuar.",
      posicion: "izquierda",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como validar los totales del comprobante",
        contenidoLectura: [
          "Revisa subtotal, impuestos, descuentos y total final antes de emitir.",
          "Si algo no cuadra, vuelve al detalle y corrige los productos o importes.",
        ],
      }),
    },
    {
      idPaso: "primera-venta-emitir",
      selector: "[data-tour=\"primera-venta-emitir\"]",
      titulo: "Emite el comprobante",
      descripcion: "Cuando estés listo, genera el comprobante y registra el pago.",
      posicion: "arriba",
      ...crearAyudaPasoTemporal({
        tituloVideo: "Como emitir y cerrar la venta",
        contenidoLectura: [
          "Cuando todo este validado, emite el comprobante para registrar la operacion.",
          "Luego completa el cobro o el flujo necesario segun el tipo de venta.",
        ],
      }),
    },
  ],
};

registrarTour(tourPrimeraVenta);
