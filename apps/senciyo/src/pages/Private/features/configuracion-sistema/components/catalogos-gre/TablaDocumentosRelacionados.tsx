import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { DOCUMENTOS_RELACIONADOS_GRE } from '../../datos/catalogosGRE';
import type { AplicacionDocumentoRelacionado, GrupoDocumentoRelacionado, EstadoCatalogo } from '../../datos/catalogosGRE';

const ITEMS_POR_PAGINA = 15;

export function TablaDocumentosRelacionados() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroAplicacion, setFiltroAplicacion] = useState<AplicacionDocumentoRelacionado | ''>('');
  const [filtroGrupo, setFiltroGrupo] = useState<GrupoDocumentoRelacionado | ''>('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoCatalogo | ''>('');
  const [pagina, setPagina] = useState(1);

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return DOCUMENTOS_RELACIONADOS_GRE.filter((item) => {
      const coincideBusqueda =
        !q ||
        item.codigo.includes(q) ||
        item.documento.toLowerCase().includes(q);
      const coincideAplicacion = !filtroAplicacion || item.aplicacion === filtroAplicacion;
      const coincideGrupo = !filtroGrupo || item.grupo === filtroGrupo;
      const coincideEstado = !filtroEstado || item.estado === filtroEstado;
      return coincideBusqueda && coincideAplicacion && coincideGrupo && coincideEstado;
    });
  }, [busqueda, filtroAplicacion, filtroGrupo, filtroEstado]);

  const totalPaginas = Math.max(1, Math.ceil(itemsFiltrados.length / ITEMS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const itemsPagina = itemsFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const resetPagina = () => setPagina(1);

  const coloresAplicacion: Record<string, string> = {
    Remitente: 'bg-teal-100 text-teal-700',
    Transportista: 'bg-violet-100 text-violet-700',
    Ambas: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código o nombre del documento…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); resetPagina(); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filtroAplicacion}
          onChange={(e) => { setFiltroAplicacion(e.target.value as AplicacionDocumentoRelacionado | ''); resetPagina(); }}
          className="shrink-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todas las aplicaciones</option>
          <option value="Remitente">Remitente</option>
          <option value="Transportista">Transportista</option>
          <option value="Ambas">Ambas</option>
        </select>
        <select
          value={filtroGrupo}
          onChange={(e) => { setFiltroGrupo(e.target.value as GrupoDocumentoRelacionado | ''); resetPagina(); }}
          className="shrink-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos los grupos</option>
          <option value="Principal">Principal</option>
          <option value="Otros">Otros</option>
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value as EstadoCatalogo | ''); resetPagina(); }}
          className="shrink-0 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="Vigente">Vigente</option>
          <option value="No vigente">No vigente</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {itemsFiltrados.length} de {DOCUMENTOS_RELACIONADOS_GRE.length} registros
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Código</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Documento</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Aplicación</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Grupo</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
            </tr>
          </thead>
          <tbody>
            {itemsPagina.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                  No se encontraron documentos con los filtros aplicados.
                </td>
              </tr>
            ) : (
              itemsPagina.map((item) => (
                <tr key={item.codigo} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs font-medium text-gray-700">{item.codigo}</td>
                  <td className="px-3 py-2 text-gray-900">{item.documento}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${coloresAplicacion[item.aplicacion] ?? 'bg-gray-100 text-gray-700'}`}>
                      {item.aplicacion}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.grupo === 'Principal' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.grupo}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.estado === 'Vigente' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Página {paginaActual} de {totalPaginas}</span>
          <div className="flex gap-2">
            <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={paginaActual === 1}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              Anterior
            </button>
            <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas}
              className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
