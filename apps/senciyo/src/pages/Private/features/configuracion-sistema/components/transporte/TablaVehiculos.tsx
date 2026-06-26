import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Truck } from 'lucide-react';
import { Button } from '@/contasis';
import { useNotifications } from '../compartido/SistemaNotificaciones.contexto';
import type { Vehiculo } from '../../modelos/Transporte';
import type { IVehiculosDataSource } from '../../api/fuenteDatosTransporte';
import { ModalFormularioVehiculo } from './ModalFormularioVehiculo';
import type { CreateVehiculoInput } from '../../modelos/Transporte';

interface TablaVehiculosProps {
  empresaId: string;
  datasource: IVehiculosDataSource;
}

type ModoModal = 'crear' | 'editar';

function formatearPlaca(placa: string): string {
  if (placa.length === 6) return `${placa.slice(0, 3)}-${placa.slice(3)}`;
  return placa;
}

export function TablaVehiculos({ empresaId, datasource }: TablaVehiculosProps) {
  const { showSuccess, showError } = useNotifications();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<ModoModal>('crear');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | undefined>();

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    datasource.list(empresaId).then((lista) => {
      if (!cancelado) setVehiculos(lista);
    }).catch(() => {
      if (!cancelado) showError('Error', 'No se pudieron cargar los vehículos.');
    }).finally(() => {
      if (!cancelado) setCargando(false);
    });
    return () => { cancelado = true; };
  }, [datasource, empresaId, showError]);

  const vehiculosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return vehiculos;
    return vehiculos.filter((v) =>
      v.placa.toLowerCase().includes(q) ||
      v.marca.toLowerCase().includes(q) ||
      v.configuracionVehicular.toLowerCase().includes(q) ||
      v.numeroCertificado.toLowerCase().includes(q),
    );
  }, [vehiculos, busqueda]);

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
        showSuccess('Vehículo registrado', `El vehículo con placa ${formatearPlaca(nuevo.placa)} fue registrado correctamente.`);
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

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, marca o configuración…"
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
        /* Estado vacío */
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
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden sm:table-cell">Marca</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden md:table-cell">Conf. vehicular</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs hidden lg:table-cell">Certificado</th>
                  <th className="text-left px-3 py-2.5 font-medium text-gray-600 text-xs">Estado</th>
                  <th className="text-right px-3 py-2.5 font-medium text-gray-600 text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehiculosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">
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
                        <span className="text-xs text-gray-700">{v.marca}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-600">{v.configuracionVehicular}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-600 truncate max-w-[120px] block" title={v.numeroCertificado}>
                          {v.numeroCertificado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          v.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {v.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
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
        onClose={() => setModalAbierto(false)}
        onSubmit={manejarEnvio}
        cargando={guardando}
      />
    </div>
  );
}
