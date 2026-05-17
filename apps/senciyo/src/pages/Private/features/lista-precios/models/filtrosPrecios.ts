export type TipoFiltroVigencia =
  | 'todos'
  | 'vigente'
  | 'vencido'
  | 'por-vencer'
  | 'programado'
  | 'sin-vigencia';

export type TipoFiltroEstado = 'todos' | 'con-precio' | 'sin-precio' | 'precio-cero';

export interface FiltrosPrecios {
  vigencia: TipoFiltroVigencia;
  columnaId: string;
  estado: TipoFiltroEstado;
}

export const FILTROS_POR_DEFECTO: FiltrosPrecios = {
  vigencia: 'todos',
  columnaId: 'todas',
  estado: 'todos',
};

export function hayFiltrosActivos(filtros: FiltrosPrecios): boolean {
  return (
    filtros.vigencia !== 'todos' ||
    filtros.columnaId !== 'todas' ||
    filtros.estado !== 'todos'
  );
}

export function contarFiltrosActivos(filtros: FiltrosPrecios): number {
  return [
    filtros.vigencia !== 'todos',
    filtros.columnaId !== 'todas',
    filtros.estado !== 'todos',
  ].filter(Boolean).length;
}
