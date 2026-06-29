import type { GuiaRemision, EstadoGRE, TipoGRE } from '../modelos/GuiaRemision';
import type { CodigoMotivoTraslado, CodigoModalidadTransporte } from '../modelos/GuiaRemision';

export interface FiltrosAvanzadosGRE {
  estados: EstadoGRE[];
  tipo: TipoGRE | null;
  motivoTraslado: CodigoMotivoTraslado | null;
  modalidad: CodigoModalidadTransporte | null;
  /** Substring en nombre del destinatario */
  destinatario: string;
  serie: string;
  pesoDesde: number | null;
  pesoHasta: number | null;
}

export const FILTROS_GRE_VACIO: FiltrosAvanzadosGRE = {
  estados: [],
  tipo: null,
  motivoTraslado: null,
  modalidad: null,
  destinatario: '',
  serie: '',
  pesoDesde: null,
  pesoHasta: null,
};

function hayFiltrosActivos(f: FiltrosAvanzadosGRE): boolean {
  return (
    f.estados.length > 0 ||
    f.tipo !== null ||
    f.motivoTraslado !== null ||
    f.modalidad !== null ||
    f.destinatario.trim() !== '' ||
    f.serie.trim() !== '' ||
    f.pesoDesde !== null ||
    f.pesoHasta !== null
  );
}

export function contarFiltrosActivosGRE(
  filtros: FiltrosAvanzadosGRE,
  fechaDesde: string,
  fechaHasta: string,
): number {
  let n = 0;
  if (filtros.estados.length > 0) n++;
  if (filtros.tipo !== null) n++;
  if (filtros.motivoTraslado !== null) n++;
  if (filtros.modalidad !== null) n++;
  if (filtros.destinatario.trim() !== '') n++;
  if (filtros.serie.trim() !== '') n++;
  if (filtros.pesoDesde !== null || filtros.pesoHasta !== null) n++;
  if (fechaDesde.trim() !== '' || fechaHasta.trim() !== '') n++;
  return n;
}

/**
 * Función pura de filtrado — no muta nada.
 * `busqueda` se aplica sobre número (serie+correlativo), nombre destinatario y RUC/doc.
 * `fechaDesde` / `fechaHasta` son strings 'YYYY-MM-DD' (vacío = sin límite).
 */
export function aplicarFiltrosGRE(
  guias: GuiaRemision[],
  busqueda: string,
  fechaDesde: string,
  fechaHasta: string,
  filtros: FiltrosAvanzadosGRE,
): GuiaRemision[] {
  const q = busqueda.trim().toLowerCase();
  const desde = fechaDesde.trim();
  const hasta = fechaHasta.trim();
  const hayAvanzados = hayFiltrosActivos(filtros);

  return guias.filter((g) => {
    // Búsqueda libre
    if (q) {
      const numero = g.correlativo
        ? `${g.serie}-${g.correlativo}`.toLowerCase()
        : (g.serie ?? '').toLowerCase();
      const dest = (g.destinatarioNombre ?? '').toLowerCase();
      const doc = (g.destinatarioNumeroDocumento ?? '').toLowerCase();
      if (!numero.includes(q) && !dest.includes(q) && !doc.includes(q)) return false;
    }

    // Rango de fechas (lexicografic sobre ISO YYYY-MM-DD — correcto)
    const fe = (g.fechaEmision ?? '').slice(0, 10);
    if (desde && fe < desde) return false;
    if (hasta && fe > hasta) return false;

    // Filtros avanzados
    if (hayAvanzados) {
      if (filtros.estados.length > 0 && !filtros.estados.includes(g.estado)) return false;
      if (filtros.tipo !== null && g.tipo !== filtros.tipo) return false;
      if (filtros.motivoTraslado !== null && g.motivoTraslado !== filtros.motivoTraslado) return false;
      if (filtros.modalidad !== null && g.modalidadTransporte !== filtros.modalidad) return false;

      const dest = filtros.destinatario.trim().toLowerCase();
      if (dest && !(g.destinatarioNombre ?? '').toLowerCase().includes(dest)) return false;

      const serie = filtros.serie.trim().toLowerCase();
      if (serie && !(g.serie ?? '').toLowerCase().startsWith(serie)) return false;

      const peso = g.pesoTotal ?? 0;
      if (filtros.pesoDesde !== null && peso < filtros.pesoDesde) return false;
      if (filtros.pesoHasta !== null && peso > filtros.pesoHasta) return false;
    }

    return true;
  });
}
