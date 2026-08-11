import type { EstadoTransportista } from '../../modelos/Transporte';

export interface FormStateDatosTransportista {
  numeroRegistroMTC: string;
  estado: EstadoTransportista;
  codigoEntidadAutorizadora: string;
  numeroAutorizacion: string;
}

export interface FormErrorsDatosTransportista {
  codigoEntidadAutorizadora?: string;
  numeroAutorizacion?: string;
}

/**
 * Registro MTC: dato real del transportista, pero SIN una fuente hoy que determine cuándo es
 * normativamente obligatorio (esa condición depende de la capacidad útil del vehículo, campo que
 * el maestro de Vehículos no tiene) — por eso nunca se exige de forma global aquí.
 *
 * Autorización especial: pareja condicional — inicialmente ambos campos son opcionales, pero en
 * cuanto uno tiene valor el otro se vuelve obligatorio (nunca se permite un estado a medias al
 * guardar).
 */
export function validarDatosTransportista(form: FormStateDatosTransportista): FormErrorsDatosTransportista {
  const e: FormErrorsDatosTransportista = {};
  const tieneEntidad = Boolean(form.codigoEntidadAutorizadora);
  const tieneNumero = Boolean(form.numeroAutorizacion.trim());
  if (tieneEntidad && !tieneNumero) {
    e.numeroAutorizacion = 'Indica el número de autorización de la entidad seleccionada';
  }
  if (tieneNumero && !tieneEntidad) {
    e.codigoEntidadAutorizadora = 'Selecciona la entidad que emitió la autorización';
  }
  return e;
}
