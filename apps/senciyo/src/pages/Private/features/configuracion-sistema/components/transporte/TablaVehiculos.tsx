import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Truck, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import { ModalConfirmacion } from '../compartido/ModalConfirmacion';
import type { Vehiculo, Conductor } from '../../modelos/Transporte';
import type { IVehiculosDataSource, IConductoresDataSource } from '../../api/fuenteDatosTransporte';
import { ModalFormularioVehiculo } from './ModalFormularioVehiculo';
import { ModalDetalleVehiculo } from './ModalDetalleVehiculo';
import { ENTIDADES_AUTORIZADORAS_D37 } from '../../datos/catalogosGRE';
import { nombreCompletoConductor, formatearPlaca } from './helpersTransporte';
import type { CreateVehiculoInput } from '../../modelos/Transporte';

interface TablaVehiculosProps {
  empresaId: string;
  datasource: IVehiculosDataSource;
  conductoresDataSource: IConductoresDataSource;
}

type ModoModal = 'crear' | 'editar';

function CeldaConductores({ vehiculo, conductores }: { vehiculo: Vehiculo; conductores: Conductor[] }) {
  const asignados = (vehiculo.conductoresIds ?? [])
    .map((id) => conductores.find((c) => c.id === id))
    .filter((c): c is Conductor => c !== undefined);

  if (asignados.length === 0) {
    return <span className="text-xs text-gray-400">Sin asignar</span>;
  }

  return (
    <div className="flex flex-col gap-0.5">
      {asignados.map((c) => (
        <span key={c.id} className="text-xs text-gray-700">
          {nombreCompletoConductor(c)}
        </span>
      ))}
    </div>
  );
}

export function TablaVehiculos({ empresaId, datasource, conductoresDataSource }: TablaVehiculosProps) {
  const { showSuccess, showError } = useNotifications();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>('crear');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | undefined>();
  const [vehiculoDetalle, setVehiculoDetalle] = useState<Vehiculo | undefined>();
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  // Estado para eliminación
  const [vehiculoParaEliminar, setVehiculoParaEliminar] = useState<Vehiculo | undefined>();
  const [conductoresQueBloquean, setConductoresQueBloquean] = useState<Conductor[]>([]);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);

    Promise.all([
      datasource.list(empresaId),
      conductoresDataSource.list(empresaId),
    ])
      .then(([listaV, listaC]) => {
        if (cancelado) return;
        setVehiculos(listaV);
        setConductores(listaC);
      })
      .catch(() => {
        if (!cancelado) showError('Error', 'No se pudieron cargar los vehículos.');
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [datasource, conductoresDataSource, empresaId, showError]);

  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(q) ||
        (v.marca?.toLowerCase().includes(q) ?? false) ||
        (v.modelo?.toLowerCase().includes(q) ?? false) ||
        (v.configuracionVehicular?.toLowerCase().includes(q) ?? false),
    );
  }, [vehiculos, busqueda]);

  const abrirDetalle = (v: Vehiculo) => {
    setVehiculoDetalle(v);
    setDetalleAbierto(true);
  };

  const abrirCrear = () => {
    setVehiculoSeleccionado(undefined);
    setModoModal('crear');
    setModalAbierto(true);
  };

  const abrirEditar = (v: Vehiculo) => {
    setVehiculoSeleccionado(v);
    setModoModal('editar');
    setModalAbierto(true);
  };

  const manejarEnvio = async (datos: CreateVehiculoInput) => {
    setGuardando(true);
    try {
      if (modoModal === 'crear') {
        const nuevo = await datasource.create(empresaId, datos);
        setVehiculos((prev) => [...prev, nuevo]);
        showSuccess(
          'Vehículo registrado',
          `El vehículo con placa ${formatearPlaca(nuevo.placa)} fue registrado correctamente.`,
        );
      } else if (vehiculoSeleccionado) {
        const actualizado = await datasource.update(empresaId, vehiculoSeleccionado.id, datos);
        setVehiculos((prev) => prev.map((v) => (v.id === actualizado.id ? actualizado : v)));
        showSuccess('Vehículo actualizado', 'Los datos se guardaron correctamente.');
      }
      setModalAbierto(false);
    } catch {
      showError('Error al guardar', 'No se pudieron guardar los datos del vehículo.');
    } finally {
      setGuardando(false);
    }
  };

  const toggleEstado = async (vehiculo: Vehiculo) => {
    const nuevoEstado = vehiculo.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const actualizado = await datasource.update(empresaId, vehiculo.id, { estado: nuevoEstado });
      setVehiculos((prev) => prev.map((v) => (v.id === actualizado.id ? actualizado : v)));
      showSuccess(
        nuevoEstado === 'ACTIVO' ? 'Vehículo activado' : 'Vehículo inactivado',
        `El vehículo ${formatearPlaca(vehiculo.placa)} fue ${nuevoEstado === 'ACTIVO' ? 'activado' : 'inactivado'}.`,
      );
    } catch {
      showError('Error', 'No se pudo cambiar el estado del vehículo.');
    }
  };

  const iniciarEliminacion = (v: Vehiculo) => {
    const asignados = (v.conductoresIds ?? [])
      .map((id) => conductores.find((c) => c.id === id))
      .filter((c): c is Conductor => c !== undefined);
    setVehiculoParaEliminar(v);
    setConductoresQueBloquean(asignados);
    setModalEliminarAbierto(true);
  };

  const cerrarModalEliminar = () => {
    setModalEliminarAbierto(false);
    setVehiculoParaEliminar(undefined);
    setConductoresQueBloquean([]);
  };

  const confirmarEliminacion = async () => {
    if (!vehiculoParaEliminar) return;
    // Re-verificar en el momento de confirmar
    const vFresh = await datasource.getById(empresaId, vehiculoParaEliminar.id);
    const idsActuales = vFresh?.conductoresIds ?? [];
    const asignados = idsActuales
      .map((id) => conductores.find((c) => c.id === id))
      .filter((c): c is Conductor => c !== undefined);
    if (asignados.length > 0) {
      setConductoresQueBloquean(asignados);
      return;
    }
    setEliminando(true);
    try {
      await datasource.delete(empresaId, vehiculoParaEliminar.id);
      setVehiculos((prev) => prev.filter((v) => v.id !== vehiculoParaEliminar.id));
      showSuccess(
        'Vehículo eliminado',
        `El vehículo ${formatearPlaca(vehiculoParaEliminar.placa)} fue eliminado correctamente.`,
      );
      cerrarModalEliminar();
    } catch {
      showError('Error al eliminar', 'No se pudo eliminar el vehículo.');
    } finally {
      setEliminando(false);
    }
  };

  const descripcionModalEliminar = vehiculoParaEliminar && conductoresQueBloquean.length > 0 ? (
    <div className="text-left">
      <p className="mb-2">
        El vehículo <strong>{formatearPlaca(vehiculoParaEliminar.placa)}</strong> tiene{' '}
        {conductoresQueBloquean.length === 1 ? 'un conductor asignado' : 'conductores asignados'}:
      </p>
      <ul className="mb-2 space-y-1">
        {conductoresQueBloquean.map((c) => (
          <li key={c.id} className="text-gray-800">
            {nombreCompletoConductor(c)}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-500">
        Desvincula todos los conductores desde la edición del vehículo antes de eliminarlo.
      </p>
    </div>
  ) : vehiculoParaEliminar ? (
    <div>
      <p>
        ¿Deseas eliminar el vehículo{' '}
        <strong>{formatearPlaca(vehiculoParaEliminar.placa)}</strong>?
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
            placeholder="Buscar por placa, marca o modelo…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Button variant="primary" onClick={abrirCrear} icon={<Plus className="w-4 h-4" />}>
          Nuevo vehículo
        </Button>
      </div>

      {cargando ? (
        <div className="py-10 text-center text-sm text-gray-400">Cargando vehículos…</div>
      ) : vehiculos.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Truck className="w-6 h-6 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">No hay vehículos registrados</p>
            <p className="text-xs text-gray-400 mt-1">
              Agrega los vehículos que se utilizarán para los traslados con guía de remisión.
            </p>
          </div>
          <Button variant="primary" onClick={abrirCrear} icon={<Plus className="w-4 h-4" />}>
            Nuevo vehículo
          </Button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500">
            {vehiculosFiltrados.length === vehiculos.length
              ? `${vehiculos.length} vehículo${vehiculos.length !== 1 ? 's' : ''}`
              : `${vehiculosFiltrados.length} de ${vehiculos.length} vehículos`}
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Placa</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden sm:table-cell">
                    Marca / Modelo
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden md:table-cell">
                    Conductores asignados
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden lg:table-cell">
                    Conf. vehicular
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden xl:table-cell">
                    Entidad autorizadora
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehiculosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">
                      No se encontraron vehículos con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  vehiculosFiltrados.map((v) => (
                    <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs font-semibold text-gray-800">
                          {formatearPlaca(v.placa)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {v.marca || v.modelo ? (
                          <span className="text-xs text-gray-700">
                            {[v.marca, v.modelo].filter(Boolean).join(' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <CeldaConductores vehiculo={v} conductores={conductores} />
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-700">
                          {v.configuracionVehicular ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <span className="text-xs text-gray-700">
                          {v.codigoEntidadAutorizadora
                            ? (ENTIDADES_AUTORIZADORAS_D37.find(
                                (e) => e.codigo === v.codigoEntidadAutorizadora,
                              )?.abreviatura ?? v.codigoEntidadAutorizadora)
                            : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            v.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirDetalle(v)}
                            title="Ver detalle del vehículo"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => abrirEditar(v)}
                            title="Editar vehículo"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleEstado(v)}
                            title={v.estado === 'ACTIVO' ? 'Inactivar vehículo' : 'Activar vehículo'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              v.estado === 'ACTIVO'
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {v.estado === 'ACTIVO' ? (
                              <ToggleLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ToggleRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => iniciarEliminacion(v)}
                            title="Eliminar vehículo"
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

      <ModalFormularioVehiculo
        isOpen={modalAbierto}
        modo={modoModal}
        vehiculo={vehiculoSeleccionado}
        vehiculosExistentes={vehiculos}
        conductores={conductores}
        onClose={() => setModalAbierto(false)}
        onSubmit={manejarEnvio}
        cargando={guardando}
      />

      <ModalDetalleVehiculo
        isOpen={detalleAbierto}
        vehiculo={vehiculoDetalle}
        conductores={conductores}
        onClose={() => setDetalleAbierto(false)}
      />

      <ModalConfirmacion
        isOpen={modalEliminarAbierto}
        titulo={conductoresQueBloquean.length > 0 ? 'No se puede eliminar' : 'Eliminar vehículo'}
        descripcion={descripcionModalEliminar}
        textoCancelar={conductoresQueBloquean.length > 0 ? 'Entendido' : 'Cancelar'}
        textoConfirmar="Eliminar"
        variante={conductoresQueBloquean.length > 0 ? 'info' : 'danger'}
        cargando={eliminando}
        onConfirmar={conductoresQueBloquean.length > 0 ? undefined : confirmarEliminacion}
        onCancelar={cerrarModalEliminar}
      />
    </div>
  );
}
