import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, UserCheck, UserX, Users } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { Conductor } from '../../modelos/Transporte';
import type { IConductoresDataSource } from '../../api/fuenteDatosTransporte';
import { ModalFormularioConductor } from './ModalFormularioConductor';
import type { CreateConductorInput } from '../../modelos/Transporte';

interface TablaConductoresProps {
  empresaId: string;
  datasource: IConductoresDataSource;
}

type ModoModal = 'crear' | 'editar';

export function TablaConductores({ empresaId, datasource }: TablaConductoresProps) {
  const { showSuccess, showError } = useNotifications();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>('crear');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | undefined>();

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource.list(empresaId).then((lista) => {
      if (!cancelado) setConductores(lista);
    }).catch(() => {
      if (!cancelado) showError('Error', 'No se pudieron cargar los conductores.');
    }).finally(() => {
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, [datasource, empresaId, showError]);

  const conductoresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return conductores;
    return conductores.filter((c) =>
      c.nombres.toLowerCase().includes(q) ||
      c.apellidoPaterno.toLowerCase().includes(q) ||
      c.apellidoMaterno.toLowerCase().includes(q) ||
      c.numeroDocumento.includes(q) ||
      c.numeroLicencia.toLowerCase().includes(q),
    );
  }, [conductores, busqueda]);

  const abrirCrear = () => {
    setConductorSeleccionado(undefined);
    setModoModal('crear');
    setModalAbierto(true);
  };

  const abrirEditar = (c: Conductor) => {
    setConductorSeleccionado(c);
    setModoModal('editar');
    setModalAbierto(true);
  };

  const manejarEnvio = async (datos: CreateConductorInput) => {
    setGuardando(true);
    try {
      if (modoModal === 'crear') {
        const nuevo = await datasource.create(empresaId, datos);
        setConductores((prev) => [...prev, nuevo]);
        showSuccess('Conductor registrado', `${nuevo.nombres} ${nuevo.apellidoPaterno} fue agregado correctamente.`);
      } else if (conductorSeleccionado) {
        const actualizado = await datasource.update(empresaId, conductorSeleccionado.id, datos);
        setConductores((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
        showSuccess('Conductor actualizado', 'Los datos se guardaron correctamente.');
      }
      setModalAbierto(false);
    } catch {
      showError('Error al guardar', 'No se pudieron guardar los datos del conductor.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (conductor: Conductor) => {
    const nuevoEstado = conductor.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const actualizado = await datasource.update(empresaId, conductor.id, { estado: nuevoEstado });
      setConductores((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      showSuccess(
        nuevoEstado === 'ACTIVO' ? 'Conductor activado' : 'Conductor inactivado',
        `${conductor.nombres} ${conductor.apellidoPaterno} fue ${nuevoEstado === 'ACTIVO' ? 'activado' : 'inactivado'}.`,
      );
    } catch {
      showError('Error', 'No se pudo cambiar el estado del conductor.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o licencia…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="primary" onClick={abrirCrear} icon={<Plus className="w-4 h-4" />}>
          Nuevo conductor
        </Button>
      </div>

      {cargando ? (
        <div className="py-10 text-center text-sm text-gray-400">Cargando conductores…</div>
      ) : conductores.length === 0 ? (
        /* Estado vacío */
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">No hay conductores registrados</p>
            <p className="text-xs text-gray-400 mt-1">
              Agrega los conductores que participarán en los traslados con guía de remisión.
            </p>
          </div>
          <Button variant="primary" onClick={abrirCrear} icon={<Plus className="w-4 h-4" />}>
            Nuevo conductor
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {conductoresFiltrados.length === conductores.length
              ? `${conductores.length} conductor${conductores.length !== 1 ? 'es' : ''}`
              : `${conductoresFiltrados.length} de ${conductores.length} conductores`}
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Conductor</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden sm:table-cell">Documento</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden md:table-cell">Licencia</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {conductoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-400">
                      No se encontraron conductores con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  conductoresFiltrados.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 text-xs">
                          {c.apellidoPaterno} {c.apellidoMaterno}, {c.nombres}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{c.tipoDocumento}</span>
                        <span className="text-xs font-mono text-gray-700 ml-1">{c.numeroDocumento}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-700">{c.numeroLicencia}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          c.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEditar(c)}
                            title="Editar conductor"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleEstado(c)}
                            title={c.estado === 'ACTIVO' ? 'Inactivar conductor' : 'Activar conductor'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              c.estado === 'ACTIVO'
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {c.estado === 'ACTIVO' ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ModalFormularioConductor
        isOpen={modalAbierto}
        modo={modoModal}
        conductor={conductorSeleccionado}
        conductoresExistentes={conductores}
        onClose={() => setModalAbierto(false)}
        onSubmit={manejarEnvio}
        cargando={guardando}
      />
    </div>
  );
}
