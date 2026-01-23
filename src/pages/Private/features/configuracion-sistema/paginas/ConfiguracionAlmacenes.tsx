// src/features/configuracion-sistema/paginas/ConfiguracionAlmacenes.tsx

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Building,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Hash,
  FileText,
  MapPin,
  Package,
  Boxes as IconoAlmacen
} from 'lucide-react';
import { Button, Select, Input, Checkbox, PageHeader, Textarea, Breadcrumb, AlmacenCard } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { IndicadorEstado } from '../components/comunes/IndicadorEstado';
import type { Almacen } from '../modelos/Almacen';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

type filtroEstado = 'all' | 'active' | 'inactive';

interface DeleteConfirmationState {
  isOpen: boolean;
  almacenId: string | null;
  nombreAlmacen: string;
  tieneMovimientosInventario: boolean;
}

interface FormState {
  codigoAlmacen: string;
  nombreAlmacen: string;
  establecimientoId: string;
  descripcionAlmacen: string;
  ubicacionAlmacen: string;
  esAlmacenPrincipal: boolean;
}

const FORM_STATE_INICIAL: FormState = {
  codigoAlmacen: '',
  nombreAlmacen: '',
  establecimientoId: '',
  descripcionAlmacen: '',
  ubicacionAlmacen: '',
  esAlmacenPrincipal: false
};

export function ConfiguracionAlmacenes() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { Establecimientos, almacenes } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState<string>('all');
  const [filtroEstado, setFilterStatus] = useState<filtroEstado>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAlmacenId, setEditingAlmacenId] = useState<string | null>(null);
  const [datosFormulario, setFormData] = useState<FormState>({ ...FORM_STATE_INICIAL });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>({
    isOpen: false,
    almacenId: null,
    nombreAlmacen: '',
    tieneMovimientosInventario: false
  });

  const activeEstablecimientos = useMemo(
    () =>
      Establecimientos.filter(
        est => est.estaActivoEstablecimiento !== false && est.estadoEstablecimiento !== 'INACTIVE'
      ),
    [Establecimientos]
  );

  const filteredAlmacenes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return almacenes.filter(almacen => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        almacen.nombreAlmacen.toLowerCase().includes(normalizedSearch) ||
        almacen.codigoAlmacen.toLowerCase().includes(normalizedSearch) ||
        (almacen.nombreEstablecimientoDesnormalizado ?? '').toLowerCase().includes(normalizedSearch);

      const matchesEstablecimiento =
        filterEstablecimiento === 'all' || almacen.establecimientoId === filterEstablecimiento;

      const matchesStatus =
        filtroEstado === 'all' ||
        (filtroEstado === 'active' && almacen.estaActivoAlmacen) ||
        (filtroEstado === 'inactive' && !almacen.estaActivoAlmacen);

      return matchesSearch && matchesEstablecimiento && matchesStatus;
    });
  }, [almacenes, filterEstablecimiento, filtroEstado, searchTerm]);

  const stats = useMemo(() => ({
    total: almacenes.length,
    active: almacenes.filter(almacen => almacen.estaActivoAlmacen).length,
    inactive: almacenes.filter(almacen => !almacen.estaActivoAlmacen).length,
    withMovements: almacenes.filter(almacen => almacen.tieneMovimientosInventario).length
  }), [almacenes]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const generateUniqueId = () => `alm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const generarSiguienteCodigo = (establecimientoId: string) => {
    const almacenesDelEstablecimiento = almacenes.filter(
      almacen => almacen.establecimientoId === establecimientoId
    );

    if (almacenesDelEstablecimiento.length === 0) return '0001';

    const numericCodes = almacenesDelEstablecimiento
      .map(almacen => {
        const match = almacen.codigoAlmacen.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => n > 0);

    const lastCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!datosFormulario.codigoAlmacen.trim()) {
      errors.codigoAlmacen = 'El código es obligatorio';
    } else if (datosFormulario.codigoAlmacen.length > 4) {
      errors.codigoAlmacen = 'El código no puede tener más de 4 caracteres';
    } else {
      const isDuplicate = almacenes.some(
        almacen =>
          almacen.codigoAlmacen === datosFormulario.codigoAlmacen &&
          almacen.establecimientoId === datosFormulario.establecimientoId &&
          almacen.id !== editingAlmacenId
      );
      if (isDuplicate) {
        errors.codigoAlmacen = 'Ya existe un almacén con este código en el establecimiento seleccionado';
      }
    }

    if (!datosFormulario.nombreAlmacen.trim()) {
      errors.nombreAlmacen = 'El nombre es obligatorio';
    }

    if (!datosFormulario.establecimientoId) {
      errors.establecimientoId = 'Debe seleccionar un establecimiento';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNew = () => {
    const firstEstId = activeEstablecimientos[0]?.id || '';

    setFormData({
      codigoAlmacen: firstEstId ? generarSiguienteCodigo(firstEstId) : '0001',
      nombreAlmacen: '',
      establecimientoId: firstEstId,
      descripcionAlmacen: '',
      ubicacionAlmacen: '',
      esAlmacenPrincipal: false
    });
    setEditingAlmacenId(null);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (almacen: Almacen) => {
    setFormData({
      codigoAlmacen: almacen.codigoAlmacen,
      nombreAlmacen: almacen.nombreAlmacen,
      establecimientoId: almacen.establecimientoId,
      descripcionAlmacen: almacen.descripcionAlmacen || '',
      ubicacionAlmacen: almacen.ubicacionAlmacen || '',
      esAlmacenPrincipal: almacen.esAlmacenPrincipal
    });
    setEditingAlmacenId(almacen.id);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEstablecimientoChange = (EstablecimientoId: string) => {
    setFormData(prev => ({
      ...prev,
      establecimientoId: EstablecimientoId,
      codigoAlmacen: generarSiguienteCodigo(EstablecimientoId)
    }));
    if (formErrors.establecimientoId) {
      setFormErrors(prev => ({ ...prev, establecimientoId: '' }));
    }
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      const selectedEstablecimiento = Establecimientos.find(
        est => est.id === datosFormulario.establecimientoId
      );

      let updatedAlmacenes: Almacen[];

      if (editingAlmacenId) {
        updatedAlmacenes = almacenes.map(almacen =>
          almacen.id === editingAlmacenId
            ? {
              ...almacen,
              codigoAlmacen: datosFormulario.codigoAlmacen,
              nombreAlmacen: datosFormulario.nombreAlmacen,
              establecimientoId: datosFormulario.establecimientoId,
              nombreEstablecimientoDesnormalizado: selectedEstablecimiento?.nombreEstablecimiento,
              codigoEstablecimientoDesnormalizado: selectedEstablecimiento?.codigoEstablecimiento,
              descripcionAlmacen: datosFormulario.descripcionAlmacen || undefined,
              ubicacionAlmacen: datosFormulario.ubicacionAlmacen || undefined,
              esAlmacenPrincipal: datosFormulario.esAlmacenPrincipal,
              actualizadoElAlmacen: new Date()
            }
            : almacen
        );
        showToast('success', 'Almacén actualizado correctamente');
      } else {
        const nuevoAlmacen: Almacen = {
          id: generateUniqueId(),
          codigoAlmacen: datosFormulario.codigoAlmacen,
          nombreAlmacen: datosFormulario.nombreAlmacen,
          establecimientoId: datosFormulario.establecimientoId,
          nombreEstablecimientoDesnormalizado: selectedEstablecimiento?.nombreEstablecimiento,
          codigoEstablecimientoDesnormalizado: selectedEstablecimiento?.codigoEstablecimiento,
          descripcionAlmacen: datosFormulario.descripcionAlmacen || undefined,
          ubicacionAlmacen: datosFormulario.ubicacionAlmacen || undefined,
          estaActivoAlmacen: true,
          esAlmacenPrincipal: datosFormulario.esAlmacenPrincipal,
          configuracionInventarioAlmacen: {
            permiteStockNegativoAlmacen: false,
            controlEstrictoStock: false,
            requiereAprobacionMovimientos: false
          },
          creadoElAlmacen: new Date(),
          actualizadoElAlmacen: new Date(),
          tieneMovimientosInventario: false
        };

        updatedAlmacenes = [...almacenes, nuevoAlmacen];
        showToast('success', 'Almacén creado correctamente');
      }

      dispatch({ type: 'SET_ALMACENES', payload: updatedAlmacenes });
      handleCancel();
    } catch (error) {
      console.error('Error al guardar el almacén:', error);
      showToast('error', 'Error al guardar el almacén. Por favor, intenta nuevamente.');
    }
  };

  const handleCancel = () => {
    setFormData({ ...FORM_STATE_INICIAL });
    setEditingAlmacenId(null);
    setFormErrors({});
    setShowForm(false);
  };

  const openDeleteConfirmation = (almacen: Almacen) => {
    setDeleteConfirmation({
      isOpen: true,
      almacenId: almacen.id,
      nombreAlmacen: almacen.nombreAlmacen,
      tieneMovimientosInventario: almacen.tieneMovimientosInventario || false
    });
  };

  const handleDelete = () => {
    if (!deleteConfirmation.almacenId) return;

    if (deleteConfirmation.tieneMovimientosInventario) {
      showToast(
        'error',
        'No se puede eliminar este almacén porque tiene movimientos de inventario asociados. Puedes deshabilitarlo en su lugar.'
      );
      setDeleteConfirmation({ isOpen: false, almacenId: null, nombreAlmacen: '', tieneMovimientosInventario: false });
      return;
    }

    try {
      const updatedAlmacenes = almacenes.filter(
        almacen => almacen.id !== deleteConfirmation.almacenId
      );
      dispatch({ type: 'SET_ALMACENES', payload: updatedAlmacenes });
      showToast('success', 'Almacén eliminado correctamente');
      setDeleteConfirmation({ isOpen: false, almacenId: null, nombreAlmacen: '', tieneMovimientosInventario: false });
    } catch (error) {
      console.error('Error al eliminar el almacén:', error);
      showToast('error', 'Error al eliminar el almacén');
    }
  };

  const handleToggleStatus = (id: string) => {
    const almacen = almacenes.find(item => item.id === id);

    try {
      const updatedAlmacenes = almacenes.map(item =>
        item.id === id
          ? {
            ...item,
            estaActivoAlmacen: !item.estaActivoAlmacen,
            actualizadoElAlmacen: new Date(),
          }
          : item
      );
      dispatch({ type: 'SET_ALMACENES', payload: updatedAlmacenes });
      showToast(
        'success',
        almacen?.estaActivoAlmacen ? 'Almacén deshabilitado' : 'Almacén habilitado'
      );
    } catch (error) {
      console.error('Error al cambiar el estado del almacén:', error);
      showToast('error', 'Error al cambiar el estado del almacén');
    }
  };

  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={editingAlmacenId ? 'Editar Almacén' : 'Nuevo Almacén'}
          breadcrumb={
            <Breadcrumb
              items={[
                { label: 'Configuración', href: '#', onClick: () => navigate('/configuracion') },
                { label: 'Almacenes', href: '#', onClick: () => setShowForm(false) },
                { label: editingAlmacenId ? 'Editar Almacén' : 'Nuevo Almacén' }
              ]}
            />
          }
          actions={
            <Button
              variant="secondary"
              icon={<ArrowLeft />}
              onClick={handleCancel}
            >
              Volver
            </Button>
          }
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : toast.type === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
                }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
            </div>
          ))}
        </div>

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <IconoAlmacen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Datos principales del almacén</p>
                </div>
                {/* Etiqueta azul reubicada */}
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 ml-auto">
                  <IconoAlmacen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Código: {datosFormulario.codigoAlmacen}</span>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Establecimiento */}
              <div>
                <Select
                  label="Establecimiento"
                  value={datosFormulario.establecimientoId}
                  onChange={e => handleEstablecimientoChange(e.target.value)}
                  required
                  error={formErrors.establecimientoId}
                  helperText="El almacén pertenecerá a este establecimiento"
                  options={[
                    { value: '', label: 'Seleccionar establecimiento...' },
                    ...activeEstablecimientos.map(est => ({
                      value: est.id,
                      label: `[${est.codigoEstablecimiento}] ${est.nombreEstablecimiento}`
                    }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Código */}
                <Input
                  label="Código"
                  type="text"
                  value={datosFormulario.codigoAlmacen}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, codigoAlmacen: e.target.value }));
                    if (formErrors.codigoAlmacen) setFormErrors(prev => ({ ...prev, codigoAlmacen: '' }));
                  }}
                  error={formErrors.codigoAlmacen}
                  placeholder="Ej: 0001"
                  leftIcon={<Hash />}
                  required
                  maxLength={4}
                />

                {/* Nombre */}
                <Input
                  label="Nombre del Almacén"
                  type="text"
                  value={datosFormulario.nombreAlmacen}
                  onChange={e => {
                    setFormData(prev => ({ ...prev, nombreAlmacen: e.target.value }));
                    if (formErrors.nombreAlmacen) setFormErrors(prev => ({ ...prev, nombreAlmacen: '' }));
                  }}
                  error={formErrors.nombreAlmacen}
                  placeholder="Ej: Almacén Principal, Almacén Norte..."
                  leftIcon={<FileText />}
                  required
                />
              </div>

              {/* Ubicación */}
              <Input
                label="Ubicación Física"
                type="text"
                value={datosFormulario.ubicacionAlmacen}
                onChange={e => setFormData(prev => ({ ...prev, ubicacionAlmacen: e.target.value }))}
                placeholder="Ej: Piso 1 - Zona A, Edificio Principal..."
                helperText="Opcional"
              />

              {/* Descripción */}
              <Textarea
                label="Descripción"
                value={datosFormulario.descripcionAlmacen}
                onChange={e => setFormData(prev => ({ ...prev, descripcionAlmacen: e.target.value }))}
                rows={3}
                placeholder="Descripción adicional del almacén..."
                helperText="Opcional"
              />

              {/* Almacén Principal */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <Checkbox
                  checked={datosFormulario.esAlmacenPrincipal}
                  onChange={e => setFormData(prev => ({ ...prev, esAlmacenPrincipal: e.target.checked }))}
                  label="Marcar como almacén principal"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-7">
                  Este será el almacén por defecto para operaciones de inventario en este establecimiento
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Los campos marcados con <span className="text-red-500 font-medium">*</span> son obligatorios
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={<CheckCircle />}
              >
                {editingAlmacenId ? 'Actualizar' : 'Crear'} Almacén
              </Button>
            </div>
          </div>
        </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Configuración de Almacenes"
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

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6 pb-12">
          {/* Toast Notifications */}
          <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${toast.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
              }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
            <div className="p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${deleteConfirmation.tieneMovimientosInventario ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                <AlertCircle className={`w-6 h-6 ${deleteConfirmation.tieneMovimientosInventario ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                  }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                {deleteConfirmation.tieneMovimientosInventario ? '¡Almacén con movimientos!' : '¿Eliminar almacén?'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                {deleteConfirmation.tieneMovimientosInventario ? (
                  <>
                    El almacén <span className="font-semibold">"{deleteConfirmation.nombreAlmacen}"</span> tiene
                    movimientos de inventario asociados y no puede ser eliminado. Puedes deshabilitarlo en su lugar.
                  </>
                ) : (
                  <>
                    ¿Estás seguro de eliminar el almacén{' '}
                    <span className="font-semibold">"{deleteConfirmation.nombreAlmacen}"</span>? Esta acción no se
                    puede deshacer.
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setDeleteConfirmation({
                      isOpen: false,
                      almacenId: null,
                      nombreAlmacen: '',
                      tieneMovimientosInventario: false
                    })
                  }
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  {deleteConfirmation.tieneMovimientosInventario ? 'Entendido' : 'Cancelar'}
                </button>
                {!deleteConfirmation.tieneMovimientosInventario && (
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <IconoAlmacen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Con movimientos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withMovements}</p>
            </div>
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 gap-4">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 flex-1">
          <Input
            type="text"
            placeholder="Buscar almacenes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search />}
          />

          <Select
            value={filterEstablecimiento}
            onChange={e => setFilterEstablecimiento(e.target.value)}
            options={[
              { value: 'all', label: 'Todos los establecimientos' },
              ...Establecimientos.map(est => ({
                value: est.id,
                label: `[${est.codigoEstablecimiento}] ${est.nombreEstablecimiento}`
              }))
            ]}
          />

          <Select
            value={filtroEstado}
            onChange={e => setFilterStatus(e.target.value as filtroEstado)}
            options={[
              { value: 'all', label: 'Todos los estados' },
              { value: 'active', label: 'Solo activos' },
              { value: 'inactive', label: 'Solo inactivos' }
            ]}
          />
        </div>

          <Button
            onClick={handleNew}
            variant="primary"
            size="md"
            icon={<Plus className="w-5 h-5" />}
            iconPosition="left"
          >
            Nuevo Almacén
          </Button>
        </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredAlmacenes.length === 0 ? (
          <div className="text-center py-12">
            <IconoAlmacen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filterEstablecimiento !== 'all' || filtroEstado !== 'all'
                ? 'No se encontraron almacenes'
                : 'No hay almacenes registrados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterEstablecimiento !== 'all' || filtroEstado !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza registrando tu primer almacén'}
            </p>
            {!searchTerm && filterEstablecimiento === 'all' && filtroEstado === 'all' && (
              <button
                onClick={handleNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Almacén
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlmacenes.map(almacen => (
              <div key={almacen.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{almacen.nombreAlmacen}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                        {almacen.codigoAlmacen}
                      </span>
                      {almacen.esAlmacenPrincipal && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full">
                          Principal
                        </span>
                      )}
                      {almacen.tieneMovimientosInventario && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Con movimientos
                        </span>
                      )}
                      <IndicadorEstado
                        status={almacen.estaActivoAlmacen ? 'success' : 'error'}
                        label={almacen.estaActivoAlmacen ? 'Activo' : 'Inactivo'}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Establecimiento:{' '}
                        <span className="font-medium">
                          [{almacen.codigoEstablecimientoDesnormalizado || 'N/D'}]{' '}
                          {almacen.nombreEstablecimientoDesnormalizado || 'Sin nombre'}
                        </span>
                      </p>
                      {almacen.ubicacionAlmacen && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {almacen.ubicacionAlmacen}
                        </p>
                      )}
                      {almacen.descripcionAlmacen && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{almacen.descripcionAlmacen}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => handleEdit(almacen)}
                      variant="tertiary"
                      iconOnly
                      icon={<Edit />}
                      size="sm"
                      title="Editar"
                    />

                    <Button
                      onClick={() => handleToggleStatus(almacen.id)}
                      variant="tertiary"
                      iconOnly
                      icon={almacen.estaActivoAlmacen ? <XCircle /> : <CheckCircle />}
                      size="sm"
                      title={almacen.estaActivoAlmacen ? 'Deshabilitar' : 'Habilitar'}
                    />

                    <Button
                      onClick={() => openDeleteConfirmation(almacen)}
                      variant="tertiary"
                      iconOnly
                      icon={<Trash2 />}
                      size="sm"
                      title="Eliminar"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección de Comparación - Nuevo Diseño de Cards */}
      {filteredAlmacenes.length > 0 && (
        <div className="mt-8">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              🚀 Nuevo Diseño - AlmacenCard (Comparación)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Visualización en cards con mejor UX: Switch para estado, dropdown con acciones, y diseño consistente con otros módulos.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAlmacenes.slice(0, 4).map(almacen => (
              <AlmacenCard
                key={`card-${almacen.id}`}
                almacen={almacen}
                onToggleActivo={handleToggleStatus}
                onEditar={handleEdit}
                onEliminar={(id) => openDeleteConfirmation(almacenes.find(a => a.id === id)!)}
              />
            ))}
          </div>
          {filteredAlmacenes.length > 4 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando solo los primeros 4 almacenes para comparación. 
                Total: {filteredAlmacenes.length} almacenes.
              </p>
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionAlmacenes;
