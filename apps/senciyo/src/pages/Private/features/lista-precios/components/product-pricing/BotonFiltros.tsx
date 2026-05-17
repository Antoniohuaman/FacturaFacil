import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Filter } from 'lucide-react';
import type { Column } from '../../models/PriceTypes';
import type { FiltrosPrecios, TipoFiltroVigencia, TipoFiltroEstado } from '../../models/filtrosPrecios';
import { contarFiltrosActivos, FILTROS_POR_DEFECTO } from '../../models/filtrosPrecios';
import { DIAS_PROXIMO_VENCIMIENTO, getColumnDisplayName } from '../../utils/priceHelpers';

interface PropsBotonFiltros {
  filtros: FiltrosPrecios;
  alCambiar: (filtros: FiltrosPrecios) => void;
  columnas: Column[];
}

const OPCIONES_VIGENCIA: { valor: TipoFiltroVigencia; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'vigente', etiqueta: 'Vigentes' },
  { valor: 'vencido', etiqueta: 'Vencidos' },
  { valor: 'por-vencer', etiqueta: `Por vencer (${DIAS_PROXIMO_VENCIMIENTO} días)` },
  { valor: 'programado', etiqueta: 'Programados' },
  { valor: 'sin-vigencia', etiqueta: 'Sin vigencia' },
];

const OPCIONES_ESTADO: { valor: TipoFiltroEstado; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'con-precio', etiqueta: 'Con precio' },
  { valor: 'sin-precio', etiqueta: 'Sin precio' },
  { valor: 'precio-cero', etiqueta: 'Precio en cero' },
];

const OpcionFiltro: React.FC<{
  etiqueta: string;
  seleccionado: boolean;
  alSeleccionar: () => void;
}> = ({ etiqueta, seleccionado, alSeleccionar }) => (
  <button
    type="button"
    role="radio"
    aria-checked={seleccionado}
    onClick={alSeleccionar}
    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left ${
      seleccionado
        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
    }`}
  >
    <span
      className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${
        seleccionado ? 'border-blue-600 bg-blue-600' : 'border-gray-300 dark:border-gray-500'
      }`}
    />
    {etiqueta}
  </button>
);

function GrupoFiltro<T extends string>({
  titulo,
  opciones,
  seleccionado,
  alSeleccionar,
}: {
  titulo: string;
  opciones: { valor: T; etiqueta: string }[];
  seleccionado: T;
  alSeleccionar: (valor: T) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
        {titulo}
      </p>
      <div className="space-y-0.5">
        {opciones.map(op => (
          <OpcionFiltro
            key={op.valor}
            etiqueta={op.etiqueta}
            seleccionado={seleccionado === op.valor}
            alSeleccionar={() => alSeleccionar(op.valor)}
          />
        ))}
      </div>
    </div>
  );
}

export const BotonFiltros: React.FC<PropsBotonFiltros> = ({ filtros, alCambiar, columnas }) => {
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const cantidadActivos = contarFiltrosActivos(filtros);

  useEffect(() => {
    if (!abierto) return;

    const alPresionarTecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    const alClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };

    document.addEventListener('keydown', alPresionarTecla);
    document.addEventListener('mousedown', alClickFuera);
    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.removeEventListener('mousedown', alClickFuera);
    };
  }, [abierto]);

  const limpiarFiltros = useCallback(() => alCambiar(FILTROS_POR_DEFECTO), [alCambiar]);

  const cambiarVigencia = useCallback(
    (v: TipoFiltroVigencia) => alCambiar({ ...filtros, vigencia: v }),
    [filtros, alCambiar],
  );
  const cambiarColumna = useCallback(
    (v: string) => alCambiar({ ...filtros, columnaId: v }),
    [filtros, alCambiar],
  );
  const cambiarEstado = useCallback(
    (v: TipoFiltroEstado) => alCambiar({ ...filtros, estado: v }),
    [filtros, alCambiar],
  );

  const columnasOrdenadas = [...columnas].sort((a, b) => a.order - b.order);

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto(prev => !prev)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className={`px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          cantidadActivos > 0
            ? 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30'
            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <Filter size={16} aria-hidden />
        <span>Filtros</span>
        {cantidadActivos > 0 && (
          <span
            className="flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full"
            aria-label={`${cantidadActivos} filtro${cantidadActivos === 1 ? '' : 's'} activo${cantidadActivos === 1 ? '' : 's'}`}
          >
            {cantidadActivos}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Panel de filtros"
          className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-30 max-h-[480px] overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            <GrupoFiltro
              titulo="Vigencia"
              opciones={OPCIONES_VIGENCIA}
              seleccionado={filtros.vigencia}
              alSeleccionar={cambiarVigencia}
            />

            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Columna
              </p>
              <div className="space-y-0.5">
                <OpcionFiltro
                  etiqueta="Todas"
                  seleccionado={filtros.columnaId === 'todas'}
                  alSeleccionar={() => cambiarColumna('todas')}
                />
                {columnasOrdenadas.map(col => (
                  <OpcionFiltro
                    key={col.id}
                    etiqueta={getColumnDisplayName(col)}
                    seleccionado={filtros.columnaId === col.id}
                    alSeleccionar={() => cambiarColumna(col.id)}
                  />
                ))}
              </div>
            </div>

            <GrupoFiltro
              titulo="Estado de precio"
              opciones={OPCIONES_ESTADO}
              seleccionado={filtros.estado}
              alSeleccionar={cambiarEstado}
            />

            {cantidadActivos > 0 && (
              <div className="pt-1 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium py-1"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
