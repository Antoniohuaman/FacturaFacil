import type { GuiaRemision } from '../modelos/GuiaRemision';

export interface ErroresValidacionGRE {
  serie?: string;
  destinatario?: string;
  bienes?: string;
  pesoTotal?: string;
  puntoPartida?: string;
  puntoLlegada?: string;
  transporte?: string;
}

export function validarGREParaEmitir(guia: GuiaRemision): ErroresValidacionGRE {
  const errores: ErroresValidacionGRE = {};

  if (!guia.serie.trim()) {
    errores.serie = 'La serie es obligatoria.';
  }

  if (!guia.destinatarioNombre.trim()) {
    errores.destinatario = 'El destinatario es obligatorio.';
  }

  if (guia.bienes.length === 0) {
    errores.bienes = 'Debe incluir al menos un bien.';
  }

  if (guia.pesoTotal === undefined || guia.pesoTotal <= 0) {
    errores.pesoTotal = 'El peso bruto total debe ser mayor a 0.';
  }

  if (!guia.puntoPartida.direccion.trim()) {
    errores.puntoPartida = 'El punto de partida es obligatorio.';
  }

  if (!guia.puntoLlegada.direccion.trim()) {
    errores.puntoLlegada = 'El punto de llegada es obligatorio.';
  }

  errores.transporte = validarTransporte(guia);
  if (!errores.transporte) delete errores.transporte;

  return errores;
}

function validarTransporte(guia: GuiaRemision): string | undefined {
  const privado = guia.modalidadTransporte === '02';

  if (privado) {
    const tp = guia.transportePrivado;
    if (!tp) return 'Faltan datos de transporte privado.';
    if (!tp.fechaInicioTraslado) return 'La fecha de inicio de traslado es obligatoria.';
    if (tp.esM1oL) {
      if (!tp.placaVehiculoM1L?.trim()) return 'La placa del vehículo M1/L es obligatoria.';
    } else {
      if (tp.vehiculosIds.length === 0) return 'Debe asignar al menos un vehículo.';
      if (tp.conductoresIds.length === 0) return 'Debe asignar al menos un conductor.';
    }
  } else {
    const tp = guia.transportePublico;
    if (!tp) return 'Faltan datos de transporte público.';
    if (!tp.fechaEntregaBienes) return 'La fecha de entrega de bienes es obligatoria.';
    if (tp.esM1oL) {
      if (!tp.placaVehiculoM1L?.trim()) return 'La placa del vehículo M1/L es obligatoria.';
    } else {
      if (!tp.transportistaNumeroDocumento.trim()) return 'El RUC del transportista es obligatorio.';
      if (!tp.transportistaNombre.trim()) return 'La razón social del transportista es obligatoria.';
      if (tp.registrarVehiculosConductores) {
        if (tp.vehiculosIds.length === 0) return 'Debe asignar al menos un vehículo.';
        if (tp.conductoresIds.length === 0) return 'Debe asignar al menos un conductor.';
      }
    }
  }

  return undefined;
}

export function hayErrores(errores: ErroresValidacionGRE): boolean {
  return Object.keys(errores).length > 0;
}
