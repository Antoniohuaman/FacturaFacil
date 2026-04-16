import {
  DIAS_MINIMOS_ENTRE_ENCUESTAS_NPS,
  PUNTUACION_NPS_MAXIMA,
  PUNTUACION_NPS_MINIMA,
} from './constantes';
import type { EvaluacionFrecuenciaNps } from './tipos';

export function normalizarTextoBreve(texto: string | undefined | null): string {
  return (texto ?? '').trim();
}

export function esPuntuacionNpsValida(puntuacion: number): boolean {
  return Number.isInteger(puntuacion)
    && puntuacion >= PUNTUACION_NPS_MINIMA
    && puntuacion <= PUNTUACION_NPS_MAXIMA;
}

export function calcularDiasTranscurridos(desdeIso: string | null, ahora: Date): number | null {
  if (!desdeIso) {
    return null;
  }

  const fecha = new Date(desdeIso);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const diferenciaMs = ahora.getTime() - fecha.getTime();
  if (diferenciaMs <= 0) {
    return 0;
  }

  return Math.floor(diferenciaMs / (24 * 60 * 60 * 1000));
}

export function puedeMostrarEncuestaNps({
  habilitado,
  ahora,
  ultimaRespuestaNpsEn,
  diasMinimosEntreEncuestas,
}: EvaluacionFrecuenciaNps): boolean {
  if (!habilitado) {
    return false;
  }

  if (!ultimaRespuestaNpsEn) {
    return true;
  }

  const diasTranscurridos = calcularDiasTranscurridos(ultimaRespuestaNpsEn, ahora);
  if (diasTranscurridos === null) {
    return true;
  }

  return diasTranscurridos >= diasMinimosEntreEncuestas;
}

export function resolverFechaSugeridaProximaEncuestaNps(
  ultimaRespuestaNpsEn: string | null,
  diasMinimosEntreEncuestas = DIAS_MINIMOS_ENTRE_ENCUESTAS_NPS,
): Date | null {
  if (!ultimaRespuestaNpsEn) {
    return null;
  }

  const fecha = new Date(ultimaRespuestaNpsEn);
  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  const proxima = new Date(fecha);
  proxima.setDate(proxima.getDate() + diasMinimosEntreEncuestas);
  return proxima;
}