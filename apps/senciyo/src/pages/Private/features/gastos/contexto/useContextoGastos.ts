// gastos/contexto/useContextoGastos.ts
//
// Tipos del contexto, el objeto `createContext` y el hook de consumo —
// separados de `ContextoGastos.tsx` (que solo exporta el componente
// `GastosProvider`) porque un archivo `.tsx` con un componente exportado
// solo puede exportar componentes (`react-refresh/only-export-components`,
// mismo criterio ya aplicado a `consultaRentabilidadVentas.service.ts` y a
// `models/indicadores.ts` en Rentabilidad de Ventas/Indicadores). Este
// archivo es `.ts` (sin JSX), por lo que la regla ni siquiera lo evalúa.

import { createContext, useContext } from 'react';
import type { CuentaPorPagar } from '../../compras/modelos/CuentaPorPagar';
import type { PagoCompra, MedioPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';
import type { DatosNuevoGasto } from '../servicios/servicioGasto';

export interface EstadoGastos {
  gastos: Gasto[];
  cargado: boolean;
}

export interface RegistrarPagoGastoInput {
  gastoId: string;
  mediosPago: MedioPagoCompra[];
  montoAplicado: number;
  concepto?: string;
  /** Generada UNA vez por intento de envío del formulario (nunca por click) — protege contra doble clic/reintento en Caja. */
  claveIdempotencia: string;
}

export interface ContextoGastosValue {
  state: EstadoGastos;
  registrarGasto(datos: DatosNuevoGasto, usuarioId?: string): Promise<Gasto>;
  anularGasto(id: string, motivo: string, anuladoPor?: string): Promise<void>;
  registrarPagoGasto(input: RegistrarPagoGastoInput, usuarioId?: string): Promise<PagoCompra>;
  anularPagoGasto(pagoId: string, motivo: string, anuladoPor?: string): Promise<void>;
  obtenerCuentaPorPagarDeGasto(gasto: Gasto): CuentaPorPagar | undefined;
  obtenerPagosDeGasto(gasto: Gasto): PagoCompra[];
}

export const ContextoGastos = createContext<ContextoGastosValue | undefined>(undefined);

export function useContextoGastos(): ContextoGastosValue {
  const contexto = useContext(ContextoGastos);
  if (!contexto) throw new Error('useContextoGastos debe usarse dentro de GastosProvider');
  return contexto;
}
