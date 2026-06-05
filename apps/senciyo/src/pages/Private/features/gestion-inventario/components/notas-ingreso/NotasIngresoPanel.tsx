// src/features/gestion-inventario/components/notas-ingreso/NotasIngresoPanel.tsx

import React, { useState, useMemo } from 'react';
import { Search, Plus, Eye, Package } from 'lucide-react';
import { useNotasIngreso } from '../../hooks/useNotasIngreso';
import { TIPO_INGRESO_LABEL, ESTADO_NI_BADGE } from '../../models/notaIngreso.constants';
import type { NotaIngreso, EstadoNotaIngreso } from '../../models/notaIngreso.types';
import FormularioNotaIngreso from './FormularioNotaIngreso';
import DetalleNotaIngreso from './DetalleNotaIngreso';

const PAGE_SIZE = 15;

const NotasIngresoPanel: React.FC = () => {
  const { notas } = useNotasIngreso();

  const [vista, setVista] = useState<'lista' | 'nuevo' | 'editar'>('lista');
  const [notaEditando, setNotaEditando] = useState<NotaIngreso | undefined>();
  const [notaDetalle, setNotaDetalle] = useState<NotaIngreso | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoNotaIngreso | 'todos'>('todos');
  const [paginaActual, setPaginaActual] = useState(1);

  const notasFiltradas = useMemo(() => {
    let lista = notas;
    if (filtroEstado !== 'todos') {
      lista = lista.filter(n => n.estado === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        n =>
          (n.numero ?? '').toLowerCase().includes(q) ||
          (n.proveedorNombre ?? '').toLowerCase().includes(q) ||
          (n.almacenDestinoNombre ?? '').toLowerCase().includes(q) ||
          TIPO_INGRESO_LABEL[n.tipoIngreso]?.toLowerCase().includes(q),
      );
    }
    return lista.sort(
      (a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime(),
    );
  }, [notas, filtroEstado, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(notasFiltradas.length / PAGE_SIZE));
  const notasPagina = notasFiltradas.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE,
  );

  const handleBusquedaChange = (v: string) => {
    setBusqueda(v);
    setPaginaActual(1);
  };

  const handleFiltroEstado = (v: EstadoNotaIngreso | 'todos') => {
    setFiltroEstado(v);
    setPaginaActual(1);
  };

  const handleNuevo = () => {
    setNotaEditando(undefined);
    setVista('nuevo');
  };

  const handleEditar = (nota: NotaIngreso) => {
    setNotaEditando(nota);
    setVista('editar');
  };

  const handleGuardado = () => {
    setVista('lista');
    setNotaEditando(undefined);
  };

  const handleCancelar = () => {
    setVista('lista');
    setNotaEditando(undefined);
  };

  const formatFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <FormularioNotaIngreso
        notaInicial={notaEditando}
        onCancelar={handleCancelar}
        onGuardado={handleGuardado}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-h-0">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={e => handleBusquedaChange(e.target.value)}
              placeholder="Buscar por número, proveedor..."
              className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
            />
          </div>

          {/* Filtro estado */}
          <select
            value={filtroEstado}
            onChange={e => handleFiltroEstado(e.target.value as EstadoNotaIngreso | 'todos')}
            className="h-9 px-3 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35"
          >
            <option value="todos">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Generada">Generada</option>
            <option value="Anulada">Anulada</option>
          </select>

          <div className="flex-1" />

          <button
            onClick={handleNuevo}
            className="inline-flex items-center gap-2 h-9 px-4 text-sm font-semibold text-white bg-[#6F36FF] rounded-lg hover:bg-[#6F36FF]/90 dark:bg-[#8B5CF6] dark:hover:bg-[#8B5CF6]/90 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva NI
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto p-6">
        {notasPagina.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {notas.length === 0 ? 'No hay notas de ingreso registradas' : 'Sin resultados para los filtros aplicados'}
            </p>
            {notas.length === 0 && (
              <button
                onClick={handleNuevo}
                className="mt-4 text-sm text-[#6F36FF] dark:text-[#8B5CF6] hover:underline"
              >
                Crear primera Nota de Ingreso
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Número</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Tipo ingreso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Proveedor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">RUC / DNI</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Almacén</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {notasPagina.map(nota => {
                  const badge = ESTADO_NI_BADGE[nota.estado] ?? ESTADO_NI_BADGE['Borrador'];
                  return (
                    <tr key={nota.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {nota.numero ?? <span className="text-gray-400 italic">borrador</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {formatFecha(nota.fechaDocumento)}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs max-w-[160px] truncate">
                        {nota.tipoIngreso} — {TIPO_INGRESO_LABEL[nota.tipoIngreso]}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs max-w-[140px] truncate">
                        {nota.proveedorNombre ?? <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                        {nota.numeroDocumentoProveedor ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                        {nota.almacenDestinoNombre}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white text-xs">
                        {nota.moneda} {nota.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setNotaDetalle(nota)}
                            title="Ver detalle"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#6F36FF] hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/10"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {nota.estado === 'Borrador' && (
                            <button
                              onClick={() => handleEditar(nota)}
                              title="Editar borrador"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#6F36FF] hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/10 text-xs font-medium"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Página {paginaActual} de {totalPaginas} — {notasFiltradas.length} resultado(s)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-3 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {notaDetalle && (
        <DetalleNotaIngreso
          nota={notaDetalle}
          onClose={() => setNotaDetalle(null)}
          onRefresh={() => {
            // La recarga ya la maneja el evento NOTAS_INGRESO_CHANGED_EVENT en el hook
            setNotaDetalle(null);
          }}
        />
      )}
    </div>
  );
};

export default NotasIngresoPanel;
