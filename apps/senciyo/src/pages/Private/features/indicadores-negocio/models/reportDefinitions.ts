import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Layers,
  Package,
  Tag,
  TrendingUp,
  Users,
  Wallet
} from "lucide-react";

export type ReportCategory =
  | "Comprobantes"
  | "Documentos"
  | "Clientes"
  | "Precios"
  | "Inventario"
  | "Cobranzas"
  | "Caja"
  | "Rentabilidad";

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  modulePath: string;
  icon: LucideIcon;
}

// Orden de aparición en el Reports Hub — "Rentabilidad" se ubica junto a "Comprobantes" por ser
// la categoría analítica más consultada tras el detalle de ventas (mejora de visibilidad, no
// afecta el cálculo ni los datos del reporte).
export const reportCategories: ReportCategory[] = [
  "Comprobantes",
  "Rentabilidad",
  "Documentos",
  "Clientes",
  "Precios",
  "Inventario",
  "Cobranzas",
  "Caja"
];

export const reportDefinitions: ReportDefinition[] = [
  {
    id: "comprobantes-general",
    name: "Comprobantes emitidos",
    description: "Detalle completo de ventas emitidas y estados por fecha",
    category: "Comprobantes",
    modulePath: "/comprobantes",
    icon: FileText
  },
  {
    id: "clientes-maestro",
    name: "Maestro de clientes",
    description: "Ficha completa de clientes y datos de contacto",
    category: "Clientes",
    modulePath: "/clientes",
    icon: Users
  },
  {
    id: "precios-listas",
    name: "Listas de precios",
    description: "Versiones y reglas comerciales vigentes",
    category: "Precios",
    modulePath: "/lista-precios",
    icon: Tag
  },
  {
    id: "precios-catalogo",
    name: "Catálogo de artículos",
    description: "Catálogo general con SKU, stock y atributos",
    category: "Precios",
    modulePath: "/catalogo",
    icon: Package
  },
  {
    id: "inventario-stock",
    name: "Reporte de stock",
    description: "Stock actual y estados por almacén listo para Excel",
    category: "Inventario",
    modulePath: "/inventario",
    icon: Layers
  },
  {
    id: "inventario-movimientos",
    name: "Movimientos de inventario",
    description: "Entradas, salidas y ajustes por período",
    category: "Inventario",
    modulePath: "/inventario",
    icon: Package
  },
  {
    id: "cobranzas-estado",
    name: "Estado de cobranzas",
    description: "Documentos pendientes, vencidos y recuperados",
    category: "Cobranzas",
    modulePath: "/cobranzas",
    icon: Wallet
  },
  {
    id: "caja-movimientos",
    name: "Movimientos de caja",
    description: "Ingresos y egresos controlados por responsable",
    category: "Caja",
    modulePath: "/control-caja?tab=reportes",
    icon: Wallet
  },
  {
    id: "rentabilidad-ventas",
    name: "Rentabilidad de ventas",
    description: "Venta neta, costo, utilidad y margen por producto vendido",
    category: "Rentabilidad",
    modulePath: "/indicadores?view=rentabilidad",
    icon: TrendingUp
  }
];
