import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { BIENES_NORMALIZADOS } from '../../datos/catalogosGRE';
import type { RegulacionBienNormalizado, EstadoCatalogo } from '../../datos/catalogosGRE';

const ITEMS_POR_PAGINA = 15;

export function TablaBienesNormalizados() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRegulacion, setFiltroRegulacion] = useState<RegulacionBienNormalizado | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoCatalogo | ''>('');
  const [pagina, setPagina] = useState(1);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return BIENES_NORMALIZADOS.filter((item) => {
      const coincideBusqueda =
        !q ||
        item.subpartidaNacional.includes(q) ||
        item.descripcion.toLowerCase().includes(q) ||
        item.codigoProductoSunat.includes(q);
      const coincideRegulacion = !filtroRegulacion || item.regulacion === filtroRegulacion;
      const coincideEstado = !filtroEstado || item.estado === filtroEstado;
      return coincideBusqueda && coincideRegulacion && coincideEstado;
    });
  }, [busqueda, filtroRegulacion, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(itemsFiltrados.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const itemsPagina = itemsFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const handleBusqueda = (v: string) => {
    setBusqueda(v);
    setPagina(1);
  };

  const handleFiltroRegulacion = (v: RegulacionBienNormalizado | '') => {
    setFiltroRegulacion(v);
    setPagina(1);
  };

  const handleFiltroEstado = (v: EstadoCatalogo | '') => {
    setFiltroEstado(v);
    setPagina(1);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por subpartida, descripción o código de producto…"
            value={busqueda}
            onChange={(e) => handleBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filtroRegulacion}
          onChange={(e) => handleFiltroRegulacion(e.target.value as RegulacionBienNormalizado | '')}
          className="shrink-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todas las regulaciones</option>
          <option value="SPOT">SPOT</option>
          <option value="IVAP">IVAP</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => handleFiltroEstado(e.target.value as EstadoCatalogo | '')}
          className="shrink-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="Vigente">Vigente</option>
          <option value="No vigente">No vigente</option>
        </select>
      </div>

      {/* Contador */}
      <p className="text-xs text-gray-500">
        {itemsFiltrados.length} de {BIENES_NORMALIZADOS.length} registros
      </p>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs whitespace-nowrap">Subpartida nacional</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Descripción</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs whitespace-nowrap">Cód. producto SUNAT</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Regulación</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
            </tr>
          </thead>
          <tbody>
            {itemsPagina.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                  No se encontraron bienes con los filtros aplicados.
                </td>
              </tr>
            ) : (
              itemsPagina.map((item) => (
                <tr
                  key={item.subpartidaNacional}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
                    {item.subpartidaNacional}
                  </td>
                  <td className="px-3 py-2 text-gray-900">{item.descripcion}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-700 whitespace-nowrap">
                    <span title={item.descripcionCodigoProducto}>{item.codigoProductoSunat}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.regulacion === 'SPOT'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.regulacion}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.estado === 'Vigente'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.estado}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Página {paginaActual} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
