// gastos/modelos/CategoriaGasto.ts
//
// Catálogo de categorías de gasto — administrado en Configuración del
// Sistema → Configuración de Negocio → Categorías de gastos, persistido en
// `repositorioCategoriasGasto.ts` (propio, no en `ContextoConfiguracion`: ver
// justificación en ese archivo). Array completo + reemplazo, sin jerarquías
// ni colores decorativos sin uso real.

export type EstadoCategoriaGasto = 'activa' | 'inactiva';

export interface CategoriaGasto {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion?: string;
  estado: EstadoCategoriaGasto;
  orden: number;
  fechaCreacion: string;
}

/** Semilla inicial editable por empresa — nunca una lista cerrada; la empresa puede crear, editar o desactivar cualquiera de estas. */
export const CATEGORIAS_GASTO_SEMILLA: ReadonlyArray<Pick<CategoriaGasto, 'nombre'>> = [
  { nombre: 'Alquileres' },
  { nombre: 'Servicios básicos' },
  { nombre: 'Publicidad' },
  { nombre: 'Movilidad' },
  { nombre: 'Comisiones' },
  { nombre: 'Mantenimiento' },
  { nombre: 'Honorarios' },
  { nombre: 'Limpieza' },
  { nombre: 'Suscripciones' },
  { nombre: 'Otros' },
];
