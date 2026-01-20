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
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { StatusIndicator } from '../components/comunes/IndicadorEstado';
import type { Almacen } from '../modelos/Almacen';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

type FilterStatus = 'all' | 'active' | 'inactive';

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAlmacenId, setEditingAlmacenId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>({ ...FORM_STATE_INICIAL });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>({
    isOpen: false,
    almacenId: null,
    nombreAlmacen: '',
    tieneMovimientosInventario: false
  });

  const activeEstablecimientos = useMemo(
    () => Establecimientos.filter(est => est.isActive !== false && est.status !== 'INACTIVE'),
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
        filterStatus === 'all' ||
        (filterStatus === 'active' && almacen.estaActivoAlmacen) ||
        (filterStatus === 'inactive' && !almacen.estaActivoAlmacen);

      return matchesSearch && matchesEstablecimiento && matchesStatus;
    });
  }, [almacenes, filterEstablecimiento, filterStatus, searchTerm]);

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

    if (!formData.codigoAlmacen.trim()) {
      errors.codigoAlmacen = 'El código es obligatorio';
    } else if (formData.codigoAlmacen.length > 4) {
      errors.codigoAlmacen = 'El código no puede tener más de 4 caracteres';
    } else {
      const isDuplicate = almacenes.some(
        almacen =>
          almacen.codigoAlmacen === formData.codigoAlmacen &&
          almacen.establecimientoId === formData.establecimientoId &&
          almacen.id !== editingAlmacenId
      );
      if (isDuplicate) {
        errors.codigoAlmacen = 'Ya existe un almacén con este código en el establecimiento seleccionado';
      }
    }

    if (!formData.nombreAlmacen.trim()) {
      errors.nombreAlmacen = 'El nombre es obligatorio';
    }

    if (!formData.establecimientoId) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      const selectedEstablecimiento = Establecimientos.find(
        est => est.id === formData.establecimientoId
      );

      let updatedAlmacenes: Almacen[];

      if (editingAlmacenId) {
        updatedAlmacenes = almacenes.map(almacen =>
          almacen.id === editingAlmacenId
            ? {
                ...almacen,
                codigoAlmacen: formData.codigoAlmacen,
                nombreAlmacen: formData.nombreAlmacen,
                establecimientoId: formData.establecimientoId,
                nombreEstablecimientoDesnormalizado: selectedEstablecimiento?.name,
                codigoEstablecimientoDesnormalizado: selectedEstablecimiento?.code,
                descripcionAlmacen: formData.descripcionAlmacen || undefined,
                ubicacionAlmacen: formData.ubicacionAlmacen || undefined,
                esAlmacenPrincipal: formData.esAlmacenPrincipal,
                actualizadoElAlmacen: new Date()
              }
            : almacen
        );
        showToast('success', 'Almacén actualizado correctamente');
      } else {
        const nuevoAlmacen: Almacen = {
          id: generateUniqueId(),
          codigoAlmacen: formData.codigoAlmacen,
          nombreAlmacen: formData.nombreAlmacen,
          establecimientoId: formData.establecimientoId,
          nombreEstablecimientoDesnormalizado: selectedEstablecimiento?.name,
          codigoEstablecimientoDesnormalizado: selectedEstablecimiento?.code,
          descripcionAlmacen: formData.descripcionAlmacen || undefined,
          ubicacionAlmacen: formData.ubicacionAlmacen || undefined,
          estaActivoAlmacen: true,
          esAlmacenPrincipal: formData.esAlmacenPrincipal,
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
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(toast => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${
                toast.type === 'success'
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

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingAlmacenId ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {editingAlmacenId
                  ? 'Modifica los datos del almacén'
                  : 'Registra un nuevo almacén para gestionar tu inventario'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
            <IconoAlmacen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Código: {formData.codigoAlmacen}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="group">
                <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Establecimiento <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.establecimientoId}
                    onChange={e => handleEstablecimientoChange(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all appearance-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                      formErrors.establecimientoId
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-200'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                    required
                  >
                    <option value="">Seleccionar establecimiento...</option>
                    {activeEstablecimientos.map(est => (
                      <option key={est.id} value={est.id}>
                        [{est.code}] {est.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {formErrors.establecimientoId && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-slide-in">
                    <AlertCircle className="w-4 h-4" />
                    {formErrors.establecimientoId}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  El almacén pertenecerá a este establecimiento
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Código <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.codigoAlmacen}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, codigoAlmacen: e.target.value }));
                        if (formErrors.codigoAlmacen) setFormErrors(prev => ({ ...prev, codigoAlmacen: '' }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formErrors.codigoAlmacen
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-200'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      placeholder="Ej: 0001"
                      required
                      maxLength={4}
                    />
                  </div>
                  {formErrors.codigoAlmacen && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-slide-in">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.codigoAlmacen}
                    </p>
                  )}
                </div>

                <div className="group">
                  <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Nombre del Almacén <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.nombreAlmacen}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, nombreAlmacen: e.target.value }));
                        if (formErrors.nombreAlmacen) setFormErrors(prev => ({ ...prev, nombreAlmacen: '' }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formErrors.nombreAlmacen
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-200'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      placeholder="Ej: Almacén Principal, Almacén Norte..."
                      required
                    />
                  </div>
                  {formErrors.nombreAlmacen && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-slide-in">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.nombreAlmacen}
                    </p>
                  )}
                </div>
              </div>

              <div className="group">
                <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Ubicación Física
                  <span className="text-xs text-gray-500 dark:text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.ubicacionAlmacen}
                  onChange={e => setFormData(prev => ({ ...prev, ubicacionAlmacen: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Ej: Piso 1 - Zona A, Edificio Principal..."
                />
              </div>

              <div className="group">
                <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Descripción
                  <span className="text-xs text-gray-500 dark:text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  value={formData.descripcionAlmacen}
                  onChange={e => setFormData(prev => ({ ...prev, descripcionAlmacen: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Descripción adicional del almacén..."
                />
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="esAlmacenPrincipal"
                  checked={formData.esAlmacenPrincipal}
                  onChange={e => setFormData(prev => ({ ...prev, esAlmacenPrincipal: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
                />
                <label htmlFor="esAlmacenPrincipal" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-gray-900 dark:text.white">Marcar como almacén principal</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Este será el almacén por defecto para operaciones de inventario en este establecimiento
                  </p>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Los campos marcados con <span className="text-red-500 font-medium">*</span> son obligatorios
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-medium hover:border-gray-400 dark:hover:border-gray-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                {editingAlmacenId ? 'Actualizar' : 'Crear'} Almacén
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${
              toast.type === 'success'
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
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${
                deleteConfirmation.tieneMovimientosInventario ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  deleteConfirmation.tieneMovimientosInventario ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
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

      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Almacenes</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los almacenes donde se almacena y controla el inventario
          </p>
        </div>
      </div>

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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar almacenes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <select
            value={filterEstablecimiento}
            onChange={e => setFilterEstablecimiento(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          >
            <option value="all">Todos los establecimientos</option>
            {Establecimientos.map(est => (
              <option key={est.id} value={est.id}>
                [{est.code}] {est.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </div>

        <button
          onClick={handleNew}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Almacén
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredAlmacenes.length === 0 ? (
          <div className="text-center py-12">
            <IconoAlmacen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filterEstablecimiento !== 'all' || filterStatus !== 'all'
                ? 'No se encontraron almacenes'
                : 'No hay almacenes registrados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterEstablecimiento !== 'all' || filterStatus !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza registrando tu primer almacén'}
            </p>
            {!searchTerm && filterEstablecimiento === 'all' && filterStatus === 'all' && (
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
              <div key={almacen.id} className="p-6 hover:bg-gray-50 dark:hover.bg-gray-700/50 transition-colors">
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
                      <StatusIndicator
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
                    <button
                      onClick={() => handleEdit(almacen)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(almacen.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        almacen.estaActivoAlmacen
                          ? 'text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                          : 'text-green-400 dark:text-green-500 hover:text-green-600 dark:hover:text-green-400 hover.bg-green-50 dark:hover:bg-green-900/30'
                      }`}
                      title={almacen.estaActivoAlmacen ? 'Deshabilitar' : 'Habilitar'}
                    >
                      {almacen.estaActivoAlmacen ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => openDeleteConfirmation(almacen)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConfiguracionAlmacenes;
