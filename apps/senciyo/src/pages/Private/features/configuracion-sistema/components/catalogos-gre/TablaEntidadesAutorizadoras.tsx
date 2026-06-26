import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../datos/catalogosGRE';
import type { EstadoCatalogo } from '../../datos/catalogosGRE';

export function TablaEntidadesAutorizadoras() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoCatalogo | ''>('');

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ENTIDADES_AUTORIZADORAS_D37.filter((item) => {
      const coincideBusqueda =
        !q ||
        item.codigo.includes(q) ||
        item.abreviatura.toLowerCase().includes(q) ||
        item.entidad.toLowerCase().includes(q);
      const coincideEstado = !filtroEstado || item.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    });
  }, [busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, abreviatura o entidad…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoCatalogo | '')}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="Vigente">Vigente</option>
          <option value="No vigente">No vigente</option>
        </select>
      </div>

      <p className="text-xs text-gray-500">
        {itemsFiltrados.length} de {ENTIDADES_AUTORIZADORAS_D37.length} registros — Catálogo D-37
      </p>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Código</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Abreviatura</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Entidad</th>
              <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-400">
                  No se encontraron entidades con los filtros aplicados.
                </td>
              </tr>
            ) : (
              itemsFiltrados.map((item) => (
                <tr key={item.codigo} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs font-medium text-gray-700">{item.codigo}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">{item.abreviatura}</td>
                  <td className="px-3 py-2 text-gray-700">{item.entidad}</td>
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
    </div>
  );
}
