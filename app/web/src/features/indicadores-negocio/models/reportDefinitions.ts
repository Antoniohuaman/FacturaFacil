import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Layers,
  Package,
  Receipt,
  Tag,
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
  | "Caja";

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  modulePath: string;
  icon: LucideIcon;
}

export const reportCategories: ReportCategory[] = [
  "Comprobantes",
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
    id: "comprobantes-resumen-diario",
    name: "Resumen diario",
    description: "Totales consolidado diario para SUNAT y contabilidad",
    category: "Comprobantes",
    modulePath: "/comprobantes",
    icon: Receipt
  },
  {
    id: "comprobantes-pos",
    name: "Ventas por punto",
    description: "Comparativo de ventas por punto de venta y canal",
    category: "Comprobantes",
    modulePath: "/punto-venta/dashboard",
    icon: Layers
  },
  {
    id: "documentos-cotizaciones",
    name: "Cotizaciones",
    description: "Listado de propuestas comerciales y vigencias",
    category: "Documentos",
    modulePath: "/documentos-negociacion",
    icon: ClipboardList
  },
  {
    id: "documentos-notas-venta",
    name: "Notas de venta",
    description: "Registro de notas de venta emitidas y pendientes",
    category: "Documentos",
    modulePath: "/documentos-negociacion",
    icon: FileSpreadsheet
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
    id: "clientes-historial",
    name: "Historial de compras",
    description: "Órdenes y comprobantes asociados a cada cliente",
    category: "Clientes",
    modulePath: "/clientes",
    icon: FileText
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
    name: "Stock valorizado",
    description: "Existencias por almacén con valoración",
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
    id: "cobranzas-alertas",
    name: "Alertas de mora",
    description: "Clientes con riesgo por días de atraso",
    category: "Cobranzas",
    modulePath: "/cobranzas",
    icon: ClipboardList
  },
  {
    id: "caja-sesiones",
    name: "Sesiones de caja",
    description: "Aperturas, cierres y conciliaciones por turno",
    category: "Caja",
    modulePath: "/caja/sesiones",
    icon: Building2
  },
  {
    id: "caja-movimientos",
    name: "Movimientos de caja",
    description: "Ingresos y egresos controlados por responsable",
    category: "Caja",
    modulePath: "/control-caja",
    icon: Wallet
  }
];
