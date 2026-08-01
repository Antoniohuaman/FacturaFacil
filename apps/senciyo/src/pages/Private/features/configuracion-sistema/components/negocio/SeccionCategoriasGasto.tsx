// configuracion-sistema/components/negocio/SeccionCategoriasGasto.tsx
//
// Categorías de gasto — sección propia dentro de Configuración de Negocio
// (nunca un nuevo card de Configuración de nivel superior). Nunca elimina
// físicamente una categoría con gastos asociados (§8): solo
// desactivar/reactivar. Sin jerarquías ni colores decorativos sin uso real
// — mismo criterio simplificado respecto a `SeccionCategorias.tsx`
// (categorías de producto), que sí usa color/jerarquía por tener un caso de
// uso distinto.

import { useState } from 'react';
import { Receipt, Pencil, Ban, RotateCcw, Plus } from 'lucide-react';
import { Button, Input } from '@/contasis';
import { useCategoriasGasto, type DatosCategoriaGasto } from '../../../gastos/hooks/useCategoriasGasto';
import type { CategoriaGasto } from '../../../gastos/modelos/CategoriaGasto';
import { ModalConfirmacion } from '../comunes/ModalConfirmacion';

interface CategoriaGastoModalProps {
  categoria?: CategoriaGasto;
  onClose: () => void;
  onGuardar: (datos: DatosCategoriaGasto) => void;
}

function ModalCategoriaGasto({ categoria, onClose, onGuardar }: CategoriaGastoModalProps) {
  const [nombre, setNombre] = useState(categoria?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? '');

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onGuardar({ nombre, descripcion });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        <div className="relative inline-block w-full max-w-md my-8 overflow-hidden rounded-lg bg-white text-left align-middle shadow-xl transition-all transform">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {categoria ? 'Editar categoría de gasto' : 'Nueva categoría de gasto'}
            </h3>
          </div>
          <form onSubmit={manejarEnvio} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-blue-600 font-bold">*</span>
              </label>
              <Input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre de la categoría"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Descripción opcional"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button type="submit" variant="primary">{categoria ? 'Actualizar' : 'Crear'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface SeccionCategoriasGastoProps {
  puedeGestionar: boolean;
}

export function SeccionCategoriasGasto({ puedeGestionar }: SeccionCategoriasGastoProps) {
  const { categorias, contarUso, crearCategoria, editarCategoria, desactivarCategoria, reactivarCategoria } = useCategoriasGasto();
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<CategoriaGasto | null>(null);
  const [desactivando, setDesactivando] = useState<CategoriaGasto | null>(null);

  const abrirCrear = () => {
    if (!puedeGestionar) return;
    setEditando(null);
    setShowModal(true);
  };

  const abrirEditar = (categoria: CategoriaGasto) => {
    if (!puedeGestionar) return;
    setEditando(categoria);
    setShowModal(true);
  };

  const guardar = (datos: DatosCategoriaGasto) => {
    if (!puedeGestionar) return;
    if (editando) {
      editarCategoria(editando.id, datos);
    } else {
      crearCategoria(datos);
    }
  };

  const confirmarDesactivar = () => {
    if (puedeGestionar && desactivando) desactivarCategoria(desactivando.id);
    setDesactivando(null);
  };

  const activas = categorias.filter((c) => c.estado === 'activa').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Receipt className="h-4 w-4 text-blue-600" />
          <span>Categorías de gasto</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{activas} activas de {categorias.length}</div>
          <Button variant="primary" size="md" icon={<Plus />} iconPosition="left" onClick={abrirCrear} disabled={!puedeGestionar}>
            Nueva categoría
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
          <colgroup>
            <col />
            <col className="w-[280px]" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-[132px]" />
          </colgroup>
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Nombre</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Descripción</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">En uso</th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">Estado</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white text-[13px]">
            {categorias.map((categoria) => {
              const uso = contarUso(categoria.id);
              return (
                <tr key={categoria.id} className="hover:bg-gray-50">
                  <td className="truncate px-3 py-2 text-gray-900" title={categoria.nombre}>{categoria.nombre}</td>
                  <td className="truncate px-3 py-2 text-gray-700" title={categoria.descripcion}>{categoria.descripcion || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 tabular-nums">{uso} gasto{uso === 1 ? '' : 's'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${categoria.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {categoria.estado === 'activa' ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => abrirEditar(categoria)}
                        disabled={!puedeGestionar}
                        className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:opacity-40 disabled:pointer-events-none"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {categoria.estado === 'activa' ? (
                        <button
                          onClick={() => setDesactivando(categoria)}
                          disabled={!puedeGestionar}
                          className="rounded-md p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:pointer-events-none"
                          title="Desactivar"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => puedeGestionar && reactivarCategoria(categoria.id)}
                          disabled={!puedeGestionar}
                          className="rounded-md p-2 text-gray-500 transition hover:bg-green-50 hover:text-green-600 disabled:opacity-40 disabled:pointer-events-none"
                          title="Reactivar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <ModalCategoriaGasto
          categoria={editando ?? undefined}
          onClose={() => { setShowModal(false); setEditando(null); }}
          onGuardar={guardar}
        />
      )}

      <ModalConfirmacion
        isOpen={Boolean(desactivando)}
        onClose={() => setDesactivando(null)}
        onConfirm={confirmarDesactivar}
        title="Desactivar categoría"
        message={`¿Desactivar "${desactivando?.nombre ?? ''}"? Ya no estará disponible para nuevos gastos, pero los gastos existentes conservan su categoría.`}
        type="warning"
        confirmText="Desactivar"
        cancelText="Cancelar"
      />
    </div>
  );
}
