import type { Conductor } from '../../modelos/Transporte';

/** "APELLIDO PATERNO APELLIDO MATERNO, NOMBRES COMPLETOS" */
export function nombreCompletoConductor(c: Conductor): string {
  const apellidos = [c.apellidoPaterno, c.apellidoMaterno]
    .map((a) => a.trim())
    .filter(Boolean)
    .join(' ');
  return `${apellidos}, ${c.nombres.trim()}`;
}

export function formatearPlaca(placa: string): string {
  if (placa.length === 6) return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  return placa;
}

/**
 * Contexto desde el que se abre `ModalFormularioVehiculo` — el vehículo, su modelo, su datasource
 * y sus validaciones son siempre los mismos; solo cambia qué campos se muestran primero:
 *  - 'maestro' (Configuración → Transporte → Vehículos): toda la información visible, Estado
 *    administrable, igual que hoy.
 *  - 'remitente' / 'transportista' (alta rápida "+ Nuevo" desde una GRE): campos mínimos alineados
 *    con SUNAT primero; el resto queda en "Más campos opcionales", nunca eliminado.
 */
export type ContextoFormularioVehiculo = 'maestro' | 'remitente' | 'transportista';

export interface CamposPrioritariosVehiculo {
  /** Selector de Estado — solo tiene sentido administrarlo desde el maestro; una GRE siempre da de alta un vehículo nuevo, que nace Activo. */
  estado: boolean;
  /** Conductores asignados (del vehículo, no los de la GRE) — dato del maestro, no parte del alta mínima que pide SUNAT. */
  conductores: boolean;
  /** Autorización especial (entidad + número) — dato prioritario para ambos tipos de GRE. */
  autorizacionEspecial: boolean;
  /** N.° TUCE — dato prioritario exclusivo de GRE Transportista (el que SUNAT solicita como "TUCE o Certificado de Habilitación Vehicular" para ese flujo). */
  tuce: boolean;
}

/**
 * Única fuente para decidir qué campos del formulario de vehículo van primero según el contexto —
 * nunca condiciones dispersas por el JSX. Ningún campo se elimina: los que no son prioritarios en
 * un contexto siguen existiendo dentro de "Más campos opcionales".
 */
export function resolverCamposPrioritariosVehiculo(contexto: ContextoFormularioVehiculo): CamposPrioritariosVehiculo {
  if (contexto === 'maestro') {
    return { estado: true, conductores: true, autorizacionEspecial: false, tuce: false };
  }
  return {
    estado: false,
    conductores: false,
    autorizacionEspecial: true,
    tuce: contexto === 'transportista',
  };
}
