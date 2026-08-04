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
import type { PagoCompra, MedioPagoCompra, AplicacionPagoCompra } from '../../compras/modelos/PagoCompra';
import type { Gasto } from '../modelos/Gasto';
import type { DatosNuevoGasto } from '../servicios/servicioGasto';

export interface EstadoGastos {
  gastos: Gasto[];
  cargado: boolean;
}

export interface RegistrarGastoConPagoInmediatoInput {
  datos: DatosNuevoGasto;
  mediosPago: MedioPagoCompra[];
  /** Generada UNA vez por intento de envío del formulario — protege contra doble clic/reintento (gasto + CxP + pago + Caja como un solo comando). */
  claveIdempotencia: string;
  /** Presente = convierte un borrador ya persistido (§16 de la corrección); ausente = crea un gasto nuevo. */
  gastoExistenteId?: string;
}

/** Contrato de datos del pago para el formulario central generalizado — idéntico al que espera `ContextoCompras.tsx#registrarPagoCompra`, para que `useFormularioPagoCompra` (compartido) invoque una u otra función según el origen inyectado (§11 de la corrección). */
export type DatosPagoCentral = Omit<
  PagoCompra,
  | 'id'
  | 'numeroPago'
  | 'estadoDocumento'
  | 'historial'
  | 'fechaCreacion'
  | 'montoTotalPagado'
  | 'cuentasPorPagarAplicadas'
  | 'comprobantesCompraAplicados'
> & { aplicaciones: AplicacionPagoCompra[] };

export interface ContextoGastosValue {
  state: EstadoGastos;
  /**
   * Guardar borrador (§4 de la corrección): sin serie/correlativo oficial,
   * sin CxP, sin Pago, sin efecto en Caja ni Rentabilidad. `gastoExistenteId`
   * actualiza un borrador ya guardado; sin él, crea uno nuevo.
   */
  guardarBorradorGasto(datos: DatosNuevoGasto, usuarioId?: string, gastoExistenteId?: string): Promise<Gasto>;
  /** Un borrador se descarta (nunca se anula) — reutiliza el estado terminal 'anulado', preserva auditoría, nunca elimina físicamente. */
  descartarBorradorGasto(id: string, usuarioId?: string): Promise<void>;
  /**
   * Registrar gasto sin pagar: exige serie de Gasto activa, genera CxP
   * pendiente, nunca crea Pago ni afecta Caja (§5 de la corrección).
   * `gastoExistenteId` convierte un borrador ya persistido en registrado.
   */
  registrarGasto(datos: DatosNuevoGasto, usuarioId?: string, gastoExistenteId?: string): Promise<Gasto>;
  /** Solo permitido según `nivelEdicionGasto` (completa/limitada/bloqueada) — conserva id/referenciaInterna/estadoDocumento/historial previo, resincroniza la CxP si el total cambió (edición completa). */
  editarGasto(id: string, datos: DatosNuevoGasto, usuarioId?: string): Promise<Gasto>;
  anularGasto(id: string, motivo: string, anuladoPor?: string): Promise<void>;
  /**
   * Registrar pago desde el FORMULARIO CENTRAL generalizado (§11 de la
   * corrección) — misma firma que `registrarPagoCompra`, para reutilizar
   * `useFormularioPagoCompra` sin un segundo formulario/motor de pago. Un
   * gasto siempre tiene una única CxP (`datos.aplicaciones` trae un solo
   * elemento), admitiendo selección explícita de cuotas y varios medios
   * validados por el mismo motor que usa Compras.
   */
  registrarPagoGastoCentral(datos: DatosPagoCentral, usuarioId?: string, seriePago?: string): Promise<PagoCompra>;
  /** Registrar y pagar: registra el gasto, su CxP y su pago como una sola operación atómica, para cualquier forma de pago — valida TODO antes de persistir nada, nunca deja un gasto o una CxP a medio guardar (§6 de la corrección). */
  registrarGastoConPagoInmediato(input: RegistrarGastoConPagoInmediatoInput, usuarioId?: string): Promise<Gasto>;
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
