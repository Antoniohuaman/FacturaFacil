import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit3,
  Ban,
} from 'lucide-react';
import { useGuiasRemision } from '../../contexto/ContextoGuiasRemision';
import type { GuiaRemision, TipoGRE, EstadoGRE } from '../../modelos/GuiaRemision';
import { TIPO_GRE_LABELS, ESTADOS_GRE } from '../../modelos/GuiaRemision';
import { MOTIVOS_TRASLADO } from '../../../configuracion-sistema/datos/catalogosGRE';

interface TablaGuiasProps {
  filtroTipo?: TipoGRE;
  soloBorradores?: boolean;
}

const COLORES_ESTADO: Record<EstadoGRE, string> = {
  Borrador:
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Pendiente:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Emitida:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Aceptada:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Observada:
    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Rechazada:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Anulada:
    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

const REGISTROS_POR_PAGINA = 15;

export default function TablaGuias({
  filtroTipo,
  soloBorradores = false,
}: TablaGuiasProps) {
  const navigate = useNavigate();
  const { state, actualizarGuia } = useGuiasRemision();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoGRE | ''>('');
  const [pagina, setPagina] = useState(1);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

  const guiasFiltradas = useMemo(() => {
    let lista = state.guias;
    if (filtroTipo) lista = lista.filter((g) => g.tipo === filtroTipo);
    if (soloBorradores) {
      lista = lista.filter((g) => g.esBorrador);
    } else {
      lista = lista.filter((g) => !g.esBorrador);
    }
    if (filtroEstado) lista = lista.filter((g) => g.estado === filtroEstado);
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (g) =>
          g.destinatarioNombre.toLowerCase().includes(q) ||
          g.destinatarioNumeroDocumento.includes(q) ||
          (g.serie + '-' + (g.correlativo ?? '')).toLowerCase().includes(q),
      );
    }
    return lista;
  }, [state.guias, filtroTipo, soloBorradores, filtroEstado, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(guiasFiltradas.length / REGISTROS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const guiasPagina = guiasFiltradas.slice(
    (paginaActual - 1) * REGISTROS_POR_PAGINA,
    paginaActual * REGISTROS_POR_PAGINA,
  );

  const descripcionMotivo = (codigo: string) =>
    MOTIVOS_TRASLADO.find((m) => m.codigo === codigo)?.descripcion ?? codigo;

  const anular = async (guia: GuiaRemision) => {
    if (!confirm('¿Anular esta guía de remisión?')) return;
    await actualizarGuia({ ...guia, estado: 'Anulada' });
    setMenuAbierto(null);
  };

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por destinatario, N° doc o serie…"
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => {
            setFiltroEstado(e.target.value as EstadoGRE | '');
            setPagina(1);
          }}
          className="h-9 px-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_GRE.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                N° Guía
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Tipo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Destinatario
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Motivo
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                F. Emisión
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Estado
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {guiasPagina.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {busqueda || filtroEstado
                    ? 'Sin resultados para los filtros aplicados'
                    : 'Sin guías de remisión registradas'}
                </td>
              </tr>
            ) : (
              guiasPagina.map((guia) => (
                <tr
                  key={guia.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-800 dark:text-gray-200">
                    {guia.serie && guia.correlativo
                      ? `${guia.serie}-${guia.correlativo}`
                      : guia.serie
                        ? `${guia.serie}-[pendiente]`
                        : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {TIPO_GRE_LABELS[guia.tipo]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-48">
                      {guia.destinatarioNombre || '—'}
                    </p>
                    {guia.destinatarioNumeroDocumento && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {guia.destinatarioTipoDocumento} {guia.destinatarioNumeroDocumento}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 max-w-40 truncate">
                    {descripcionMotivo(guia.motivoTraslado)}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                    {guia.fechaEmision}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${COLORES_ESTADO[guia.estado]}`}
                    >
                      {guia.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-block">
                      <button
                        type="button"
                        onClick={() =>
                          setMenuAbierto(menuAbierto === guia.id ? null : guia.id)
                        }
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuAbierto === guia.id && (
                        <div
                          className="absolute right-0 top-full mt-1 z-50 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1"
                          onBlur={() => setMenuAbierto(null)}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuAbierto(null);
                              navigate(`/guias-remision/${guia.id}`);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalle
                          </button>
                          {guia.esBorrador && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuAbierto(null);
                                navigate(`/guias-remision/editar/${guia.id}`);
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Edit3 className="h-4 w-4" />
                              Editar
                            </button>
                          )}
                          {guia.estado !== 'Anulada' && (
                            <button
                              type="button"
                              onClick={() => void anular(guia)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                            >
                              <Ban className="h-4 w-4" />
                              Anular
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {guiasFiltradas.length} registros · Página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={paginaActual === 1}
              onClick={() => setPagina((p) => p - 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={paginaActual === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
