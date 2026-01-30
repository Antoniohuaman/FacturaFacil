import type { DefinicionTour } from "@/shared/tour";
import { registrarTour } from "@/shared/tour";

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
    },
    {
      idPaso: "primera-venta-cliente",
      selector: "[data-tour=\"primera-venta-cliente\"]",
      titulo: "Selecciona un cliente",
      descripcion: "Busca por nombre o documento para asociar el cliente a la venta.",
      posicion: "abajo",
    },
    {
      idPaso: "primera-venta-productos-buscar",
      selector: "[data-tour=\"primera-venta-productos-buscar\"]",
      titulo: "Agrega productos",
      descripcion: "Usa el buscador para añadir productos al comprobante.",
      posicion: "abajo",
    },
    {
      idPaso: "primera-venta-productos-lista",
      selector: "[data-tour=\"primera-venta-productos-lista\"]",
      titulo: "Revisa el detalle",
      descripcion: "Aquí se listan los productos agregados y sus cantidades.",
      posicion: "arriba",
    },
    {
      idPaso: "primera-venta-totales",
      selector: "[data-tour=\"primera-venta-totales\"]",
      titulo: "Totales de la venta",
      descripcion: "Verifica subtotal, impuestos y total antes de continuar.",
      posicion: "izquierda",
    },
    {
      idPaso: "primera-venta-emitir",
      selector: "[data-tour=\"primera-venta-emitir\"]",
      titulo: "Emite el comprobante",
      descripcion: "Cuando estés listo, genera el comprobante y registra el pago.",
      posicion: "arriba",
    },
  ],
};

registrarTour(tourPrimeraVenta);
