// Reexporta el componente genérico compartido (nunca dependió de
// ComprobanteCompra) — se conserva este nombre/ruta por compatibilidad con
// el código existente de Compras (`PaginaCompras.tsx`); Gastos importa
// `ModalAnularDocumento` directamente desde `@/shared/ui`.
export { default } from '@/shared/ui/modal-anular-documento/ModalAnularDocumento';
