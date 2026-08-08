// configuracion-sistema/components/negocio/opcionesTratamientoImpuestoCompra.ts
//
// Fuente única de la correspondencia visual↔valor persistido de `TratamientoImpuestoCompra`
// (Etapa 2, cierre de bloqueante 3 de la revisión). Extraída de `SeccionValorizacionInventario.tsx`
// para que la correspondencia se pueda probar sin renderizar el componente — este repositorio no
// tiene infraestructura de pruebas de componente (React Testing Library/jsdom no están instalados;
// todas las pruebas existentes son de lógica pura), así que la prueba real de "cada opción visual
// coincide con el valor persistido y con `esRecuperable` esperado" vive contra este arreglo puro y
// contra `resolverTratamientoTributarioProducto` (shared/catalogos-sunat/resolucionTributaria.ts) —
// nunca renderizando el árbol de React.
//
// Corrección de la revisión: `impuesto_recuperable`/`impuesto_no_recuperable` tenían su
// etiqueta/ayuda INVERTIDA respecto al valor real que persisten. La correspondencia correcta:
// - `impuesto_recuperable` → "Excluir impuestos recuperables" (el impuesto recuperable no forma
//   parte del costo — se recupera vía crédito fiscal, `esRecuperable=true`).
// - `impuesto_no_recuperable` → "Incluir impuestos en el costo" (el impuesto no recuperable SÍ
//   forma parte del costo, `esRecuperable=false`).
// - `segun_afectacion` → "Definir por cada línea de compra" (sin determinación única, `esRecuperable=null`).

import type { TratamientoImpuestoCompra } from '../../contexto/ContextoConfiguracion';

export interface OpcionTratamientoImpuestoCompra {
  valor: TratamientoImpuestoCompra;
  label: string;
  ayuda: string;
}

export const OPCIONES_TRATAMIENTO_IMPUESTO: readonly OpcionTratamientoImpuestoCompra[] = [
  {
    valor: 'impuesto_recuperable',
    label: 'Excluir impuestos recuperables',
    ayuda: 'Si recuperas el impuesto como crédito fiscal, no forma parte del costo.',
  },
  {
    valor: 'impuesto_no_recuperable',
    label: 'Incluir impuestos en el costo',
    ayuda: 'Si no puedes recuperarlo, forma parte del costo del producto.',
  },
  {
    valor: 'segun_afectacion',
    label: 'Decidir en cada línea de compra',
    ayuda: 'Podrás elegirlo para cada producto al registrar una compra.',
  },
];
