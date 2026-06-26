import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, UserCheck, UserX, Users, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import { ModalConfirmacion } from '../compartido/ModalConfirmacion';
import type { Conductor, Vehiculo } from '../../modelos/Transporte';
import type { IConductoresDataSource, IVehiculosDataSource } from '../../api/fuenteDatosTransporte';
import { ModalFormularioConductor } from './ModalFormularioConductor';
import { ModalDetalleConductor } from './ModalDetalleConductor';
import { nombreCompletoConductor, formatearPlaca } from './helpersTransporte';
import type { CreateConductorInput } from '../../modelos/Transporte';

interface TablaConductoresProps {
  empresaId: string;
  datasource: IConductoresDataSource;
  vehiculosDataSource: IVehiculosDataSource;
}

type ModoModal = 'crear' | 'editar';

export function TablaConductores({ empresaId, datasource, vehiculosDataSource }: TablaConductoresProps) {
  const { showSuccess, showError } = useNotifications();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>('crear');
  const [conductorSeleccionado, setConductorSeleccionado] = useState<Conductor | undefined>();
  const [conductorDetalle, setConductorDetalle] = useState<Conductor | undefined>();
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  // Estado para eliminación
  const [conductorParaEliminar, setConductorParaEliminar] = useState<Conductor | undefined>();
  const [vehiculosQueBloquean, setVehiculosQueBloquean] = useState<Vehiculo[]>([]);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

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

  const abrirDetalle = (c: Conductor) => {
    setConductorDetalle(c);
    setDetalleAbierto(true);
  };

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
        showSuccess('Conductor registrado', `${nombreCompletoConductor(nuevo)} fue agregado correctamente.`);
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
        `${nombreCompletoConductor(conductor)} fue ${nuevoEstado === 'ACTIVO' ? 'activado' : 'inactivado'}.`,
      );
    } catch {
      showError('Error', 'No se pudo cambiar el estado del conductor.');
    }
  };

  const iniciarEliminacion = async (c: Conductor) => {
    const vehiculos = await vehiculosDataSource.list(empresaId);
    const asignados = vehiculos.filter((v) => (v.conductoresIds ?? []).includes(c.id));
    setConductorParaEliminar(c);
    setVehiculosQueBloquean(asignados);
    setModalEliminarAbierto(true);
  };

  const cerrarModalEliminar = () => {
    setModalEliminarAbierto(false);
    setConductorParaEliminar(undefined);
    setVehiculosQueBloquean([]);
  };

  const confirmarEliminacion = async () => {
    if (!conductorParaEliminar) return;
    // Re-verificar en el momento de confirmar
    const vehiculos = await vehiculosDataSource.list(empresaId);
    const asignados = vehiculos.filter((v) => (v.conductoresIds ?? []).includes(conductorParaEliminar.id));
    if (asignados.length > 0) {
      setVehiculosQueBloquean(asignados);
      return;
    }
    setEliminando(true);
    try {
      await datasource.delete(empresaId, conductorParaEliminar.id);
      setConductores((prev) => prev.filter((c) => c.id !== conductorParaEliminar.id));
      showSuccess('Conductor eliminado', `${nombreCompletoConductor(conductorParaEliminar)} fue eliminado correctamente.`);
      cerrarModalEliminar();
    } catch {
      showError('Error al eliminar', 'No se pudo eliminar el conductor.');
    } finally {
      setEliminando(false);
    }
  };

  const descripcionModalEliminar = conductorParaEliminar && vehiculosQueBloquean.length > 0 ? (
    <div className="text-left">
      <p className="mb-2">
        <strong>{nombreCompletoConductor(conductorParaEliminar)}</strong> está asignado a{' '}
        {vehiculosQueBloquean.length === 1 ? 'el siguiente vehículo' : 'los siguientes vehículos'}:
      </p>
      <ul className="mb-2 space-y-1">
        {vehiculosQueBloquean.map((v) => (
          <li key={v.id} className="font-mono font-medium text-gray-800">
            {formatearPlaca(v.placa)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        Desvincula el conductor desde la edición del vehículo antes de eliminarlo.
      </p>
    </div>
  ) : conductorParaEliminar ? (
    <div>
      <p>
        ¿Deseas eliminar a{' '}
        <strong>{nombreCompletoConductor(conductorParaEliminar)}</strong>?
      </p>
      <p className="mt-1 text-xs text-gray-500">Esta acción no se puede deshacer.</p>
    </div>
  ) : null;

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
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden sm:table-cell">Tipo y N.° de documento</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden md:table-cell">N.° de licencia</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden lg:table-cell">Categoría</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden xl:table-cell">Fecha de vencimiento</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {conductoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                      No se encontraron conductores con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  conductoresFiltrados.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 text-xs">
                          {nombreCompletoConductor(c)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs text-gray-500">{c.tipoDocumento}</span>
                        <span className="text-xs font-mono text-gray-700 ml-1">{c.numeroDocumento}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-700">{c.numeroLicencia}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-700">{c.categoriaLicencia ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <span className="text-xs text-gray-700">
                          {c.fechaVencimiento
                            ? c.fechaVencimiento.split('-').reverse().join('/')
                            : '—'}
                        </span>
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
                            onClick={() => abrirDetalle(c)}
                            title="Ver detalle del conductor"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
                          <button
                            onClick={() => iniciarEliminacion(c)}
                            title="Eliminar conductor"
                            className="p-1.5 text-gray-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      <ModalDetalleConductor
        isOpen={detalleAbierto}
        conductor={conductorDetalle}
        onClose={() => setDetalleAbierto(false)}
      />

      <ModalConfirmacion
        isOpen={modalEliminarAbierto}
        titulo={vehiculosQueBloquean.length > 0 ? 'No se puede eliminar' : 'Eliminar conductor'}
        descripcion={descripcionModalEliminar}
        textoCancelar={vehiculosQueBloquean.length > 0 ? 'Entendido' : 'Cancelar'}
        textoConfirmar="Eliminar"
        variante={vehiculosQueBloquean.length > 0 ? 'info' : 'danger'}
        cargando={eliminando}
        onConfirmar={vehiculosQueBloquean.length > 0 ? undefined : confirmarEliminacion}
        onCancelar={cerrarModalEliminar}
      />
    </div>
  );
}
