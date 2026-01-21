// CajasConfiguration page - List and manage cash registers
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle, Banknote, ArrowLeft } from 'lucide-react';
import { CajaCard } from '../components/cajas/TarjetaCaja';
import { DeleteCajaModal } from '../components/cajas/ModalEliminarCaja';
import { useCajas } from '../hooks/useCajas';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useToast } from '../../comprobantes-electronicos/shared/ui/Toast/useToast';
import { ToastContainer } from '../../comprobantes-electronicos/shared/ui/Toast/ToastContainer';
import { Button, Select, Input, PageHeader } from '@/contasis';
import type { Caja } from '../modelos/Caja';

type FilterStatus = 'all' | 'enabled' | 'disabled';

export function CajasConfiguration() {
  const navigate = useNavigate();
  const { state } = useConfigurationContext();
  const { session } = useUserSession();
  const { toasts, success, error: showError, removeToast } = useToast();

  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablecimientoId || '';

  const {
    cajas,
    loading,
    error,
    toggleCajaEnabled,
    deleteCaja
  } = useCajas(empresaId, establecimientoId);

  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterEstablecimientoId, setFilterEstablecimientoId] = useState<string>(establecimientoId);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cajaToDelete, setCajaToDelete] = useState<Caja | null>(null);

  // Filter cajas
  const filteredCajas = useMemo(() => {
    let result = cajas;

    // Filter by Establecimiento if not "all"
    if (filterEstablecimientoId && filterEstablecimientoId !== 'all') {
      result = result.filter(caja => caja.establecimientoIdCaja === filterEstablecimientoId);
    }

    // Filter by search text
    if (searchText) {
      const search = searchText.toLowerCase();
      result = result.filter(caja =>
        caja.nombreCaja.toLowerCase().includes(search)
      );
    }

    // Filter by status
    if (filterStatus === 'enabled') {
      result = result.filter(caja => caja.habilitadaCaja);
    } else if (filterStatus === 'disabled') {
      result = result.filter(caja => !caja.habilitadaCaja);
    }

    return result;
  }, [cajas, filterEstablecimientoId, searchText, filterStatus]);

  const handleToggleEnabled = async (id: string) => {
    try {
      await toggleCajaEnabled(id);
      const caja = cajas.find(c => c.id === id);
      if (caja) {
        success(
          caja.habilitadaCaja ? 'Caja deshabilitada' : 'Caja habilitada',
          `La caja "${caja.nombreCaja}" ha sido ${caja.habilitadaCaja ? 'deshabilitada' : 'habilitada'} exitosamente.`
        );
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al cambiar estado de caja';
      showError('Error', errorMsg);
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/configuracion/cajas/${id}`);
  };

  const handleCreate = () => {
    navigate('/configuracion/cajas/new');
  };

  const handleDelete = (id: string) => {
    const caja = cajas.find(c => c.id === id);
    if (caja) {
      setCajaToDelete(caja);
      setDeleteModalOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!cajaToDelete) return;

    try {
      await deleteCaja(cajaToDelete.id);
      success(
        'Caja eliminada',
        `La caja "${cajaToDelete.nombreCaja}" ha sido eliminada exitosamente.`
      );
      setDeleteModalOpen(false);
      setCajaToDelete(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar caja';
      showError('Error al eliminar', errorMsg);
      // Keep modal open to show error in UI
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setCajaToDelete(null);
  };

  // Show banner if no Establecimiento selected
  if (!establecimientoId) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900">
        <PageHeader
          title="Cajas"
          actions={
            <Button
              variant="secondary"
              icon={<ArrowLeft />}
              onClick={() => navigate('/configuracion')}
            >
              Volver
            </Button>
          }
        />
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                Establecimiento no seleccionado
              </h3>
              <p className="text-yellow-800 dark:text-yellow-300">
                Para gestionar cajas, primero debe seleccionar un establecimiento en el selector de la barra superior.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Configuración de Cajas"
          actions={
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCreate}
                variant="primary"
                size="md"
                icon={<Plus className="w-5 h-5" />}
                iconPosition="left"
              >
                Nueva Caja
              </Button>
              <Button
                variant="secondary"
                icon={<ArrowLeft />}
                onClick={() => navigate('/configuracion')}
              >
                Volver
              </Button>
            </div>
          }
        />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-6">

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Establecimiento filter */}
              <div className="md:w-64">
                <Select
                  id="Establecimiento-filter"
                  label="Establecimiento"
                  value={filterEstablecimientoId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterEstablecimientoId(e.target.value)}
                  size="medium"
                  options={[
                    { value: 'all', label: 'Todos los establecimientos' },
                    ...state.Establecimientos.map((est) => ({
                      value: est.id,
                      label: est.name
                    }))
                  ]}
                />
              </div>

              {/* Search */}
              <div className="flex-1">
                <Input
                  id="search-input"
                  label="Buscar"
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Buscar por nombre..."
                  leftIcon={<Search />}
                />
              </div>

              {/* Status filter */}
              <div className="md:w-48">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <Select
                    id="status-filter"
                    label="Estado"
                    value={filterStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as FilterStatus)}
                    size="medium"
                    containerClassName="flex-1"
                    options={[
                      { value: 'all', label: 'Todas' },
                      { value: 'enabled', label: 'Habilitadas' },
                      { value: 'disabled', label: 'Inhabilitadas' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-gray-100">{filteredCajas.length}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Habilitadas:</span>
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                  {filteredCajas.filter(c => c.habilitadaCaja).length}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Inhabilitadas:</span>
                <span className="ml-2 font-semibold text-gray-600 dark:text-gray-400">
                  {filteredCajas.filter(c => !c.habilitadaCaja).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900 dark:text-red-200">Error al cargar cajas</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando cajas...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredCajas.length === 0 && !error && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Banknote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {searchText || filterStatus !== 'all' ? 'No se encontraron cajas' : 'No hay cajas configuradas'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchText || filterStatus !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda para encontrar lo que buscas.'
                : 'Comienza creando tu primera caja para gestionar operaciones de efectivo en este establecimiento.'}
            </p>
            {!searchText && filterStatus === 'all' && (
              <Button
                onClick={handleCreate}
                variant="primary"
                icon={<Plus />}
              >
                Crear Caja
              </Button>
            )}
          </div>
        )}

        {/* Cajas grid */}
        {!loading && filteredCajas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCajas.map((caja) => {
              const currency = state.currencies.find((currencyItem) => currencyItem.id === caja.monedaIdCaja);
              return (
                <CajaCard
                  key={caja.id}
                  caja={caja}
                  currency={currency}
                  onEdit={handleEdit}
                  onToggleEnabled={handleToggleEnabled}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <DeleteCajaModal
        isOpen={deleteModalOpen}
        caja={cajaToDelete}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
    </>
  );
}
