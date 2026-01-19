// src/features/configuracion-sistema/pages/WarehousesConfiguration.tsx

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Warehouse,
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
  Package
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { StatusIndicator } from '../components/common/StatusIndicator';
import type { Warehouse as WarehouseType } from '../models/Warehouse';
import { Button, Select, Input } from '@/contasis';

interface WarehouseFormData {
  code: string;
  name: string;
  establishmentId: string;
  description: string;
  location: string;
  isMainWarehouse: boolean;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface DeleteConfirmation {
  isOpen: boolean;
  warehouseId: string | null;
  warehouseName: string;
  hasMovements: boolean;
}

export function WarehousesConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { warehouses, establishments } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstablishment, setFilterEstablishment] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    warehouseId: null,
    warehouseName: '',
    hasMovements: false
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<WarehouseFormData>({
    code: '',
    name: '',
    establishmentId: '',
    description: '',
    location: '',
    isMainWarehouse: false
  });

  // Get active establishments for form dropdown
  const activeEstablishments = useMemo(() => {
    return establishments.filter(est => est.isActive);
  }, [establishments]);

  // Filter warehouses
  const filteredWarehouses = warehouses.filter(wh => {
    const matchesSearch =
      wh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wh.establishmentName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesEstablishment =
      filterEstablishment === 'all' || wh.establishmentId === filterEstablishment;

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && wh.isActive) ||
      (filterStatus === 'inactive' && !wh.isActive);

    return matchesSearch && matchesEstablishment && matchesStatus;
  });

  // Stats
  const stats = useMemo(() => {
    return {
      total: warehouses.length,
      active: warehouses.filter(wh => wh.isActive).length,
      inactive: warehouses.filter(wh => !wh.isActive).length,
      withMovements: warehouses.filter(wh => wh.hasMovements).length
    };
  }, [warehouses]);

  // Toast notifications
  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Generate unique ID
  const generateUniqueId = () => {
    return `wh-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generate next warehouse code for establishment
  const generateNextCode = (establishmentId: string) => {
    const establishmentWarehouses = warehouses.filter(
      wh => wh.establishmentId === establishmentId
    );

    if (establishmentWarehouses.length === 0) return '0001';

    const numericCodes = establishmentWarehouses
      .map(wh => {
        const match = wh.code.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);

    const lastCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.code.trim()) {
      errors.code = 'El código es obligatorio';
    } else if (formData.code.length > 4) {
      errors.code = 'El código no puede tener más de 4 caracteres';
    } else {
      // Check for duplicate code within same establishment
      const isDuplicate = warehouses.some(
        wh =>
          wh.code === formData.code &&
          wh.establishmentId === formData.establishmentId &&
          wh.id !== editingWarehouseId
      );
      if (isDuplicate) {
        errors.code = 'Ya existe un almacén con este código en el establecimiento seleccionado';
      }
    }

    if (!formData.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    }

    if (!formData.establishmentId) {
      errors.establishmentId = 'Debe seleccionar un establecimiento';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNew = () => {
    // Pre-select first establishment if available
    const firstEstId = activeEstablishments[0]?.id || '';

    setFormData({
      code: firstEstId ? generateNextCode(firstEstId) : '0001',
      name: '',
      establishmentId: firstEstId,
      description: '',
      location: '',
      isMainWarehouse: false
    });
    setEditingWarehouseId(null);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      establishmentId: warehouse.establishmentId,
      description: warehouse.description || '',
      location: warehouse.location || '',
      isMainWarehouse: warehouse.isMainWarehouse
    });
    setEditingWarehouseId(warehouse.id);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEstablishmentChange = (establishmentId: string) => {
    setFormData(prev => ({
      ...prev,
      establishmentId,
      code: generateNextCode(establishmentId)
    }));
    if (formErrors.establishmentId) {
      setFormErrors(prev => ({ ...prev, establishmentId: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      const selectedEstablishment = establishments.find(
        est => est.id === formData.establishmentId
      );

      let updatedWarehouses: WarehouseType[];

      if (editingWarehouseId) {
        // Update existing
        updatedWarehouses = warehouses.map(wh =>
          wh.id === editingWarehouseId
            ? {
                ...wh,
                code: formData.code,
                name: formData.name,
                establishmentId: formData.establishmentId,
                establishmentName: selectedEstablishment?.name,
                establishmentCode: selectedEstablishment?.code,
                description: formData.description || undefined,
                location: formData.location || undefined,
                isMainWarehouse: formData.isMainWarehouse,
                updatedAt: new Date()
              }
            : wh
        );
        showToast('success', 'Almacén actualizado correctamente');
      } else {
        // Create new
        const newWarehouse: WarehouseType = {
          id: generateUniqueId(),
          code: formData.code,
          name: formData.name,
          establishmentId: formData.establishmentId,
          establishmentName: selectedEstablishment?.name,
          establishmentCode: selectedEstablishment?.code,
          description: formData.description || undefined,
          location: formData.location || undefined,
          isActive: true,
          isMainWarehouse: formData.isMainWarehouse,
          inventorySettings: {
            allowNegativeStock: false,
            strictStockControl: false,
            requireApproval: false
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          hasMovements: false
        };

        updatedWarehouses = [...warehouses, newWarehouse];
        showToast('success', 'Almacén creado correctamente');
      }

      dispatch({ type: 'SET_WAREHOUSES', payload: updatedWarehouses });
      handleCancel();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      showToast('error', 'Error al guardar el almacén. Por favor, intenta nuevamente.');
    }
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      name: '',
      establishmentId: '',
      description: '',
      location: '',
      isMainWarehouse: false
    });
    setEditingWarehouseId(null);
    setFormErrors({});
    setShowForm(false);
  };

  const openDeleteConfirmation = (warehouse: WarehouseType) => {
    setDeleteConfirmation({
      isOpen: true,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      hasMovements: warehouse.hasMovements || false
    });
  };

  const handleDelete = () => {
    if (!deleteConfirmation.warehouseId) return;

    // Check if warehouse has movements
    if (deleteConfirmation.hasMovements) {
      showToast(
        'error',
        'No se puede eliminar este almacén porque tiene movimientos de inventario asociados. Puedes deshabilitarlo en su lugar.'
      );
      setDeleteConfirmation({ isOpen: false, warehouseId: null, warehouseName: '', hasMovements: false });
      return;
    }

    try {
      const updatedWarehouses = warehouses.filter(
        wh => wh.id !== deleteConfirmation.warehouseId
      );
      dispatch({ type: 'SET_WAREHOUSES', payload: updatedWarehouses });
      showToast('success', 'Almacén eliminado correctamente');
      setDeleteConfirmation({ isOpen: false, warehouseId: null, warehouseName: '', hasMovements: false });
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      showToast('error', 'Error al eliminar el almacén');
    }
  };

  const handleToggleStatus = (id: string) => {
    const warehouse = warehouses.find(wh => wh.id === id);

    try {
      const updatedWarehouses = warehouses.map(wh =>
        wh.id === id
          ? { ...wh, isActive: !wh.isActive, updatedAt: new Date() }
          : wh
      );
      dispatch({ type: 'SET_WAREHOUSES', payload: updatedWarehouses });
      showToast(
        'success',
        warehouse?.isActive ? 'Almacén deshabilitado' : 'Almacén habilitado'
      );
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast('error', 'Error al cambiar el estado del almacén');
    }
  };

  // Form view
  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toast Notifications */}
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

        {/* Header */}
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
                {editingWarehouseId ? 'Editar Almacén' : 'Nuevo Almacén'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {editingWarehouseId
                  ? 'Modifica los datos del almacén'
                  : 'Registra un nuevo almacén para gestionar tu inventario'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
            <Warehouse className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Código: {formData.code}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección 1: Información Básica */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Warehouse className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información Básica</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Datos principales del almacén</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Establecimiento (requerido primero) */}
              <div>
                <Select
                  label="Establecimiento"
                  value={formData.establishmentId}
                  onChange={e => handleEstablishmentChange(e.target.value)}
                  required
                  error={formErrors.establishmentId}
                  helperText="El almacén pertenecerá a este establecimiento"
                  options={[
                    { value: '', label: 'Seleccionar establecimiento...' },
                    ...activeEstablishments.map(est => ({
                      value: est.id,
                      label: `[${est.code}] ${est.name}`
                    }))
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Código */}
                <div className="group">
                  <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                    <Hash className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Código <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, code: e.target.value }));
                        if (formErrors.code) setFormErrors(prev => ({ ...prev, code: '' }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formErrors.code
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-200'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      placeholder="Ej: 0001"
                      required
                      maxLength={4}
                    />
                  </div>
                  {formErrors.code && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-slide-in">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.code}
                    </p>
                  )}
                </div>

                {/* Nombre */}
                <div className="group">
                  <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    Nombre del Almacén <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        formErrors.name
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 focus:ring-red-200'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                      placeholder="Ej: Almacén Principal, Almacén Norte..."
                      required
                    />
                  </div>
                  {formErrors.name && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-slide-in">
                      <AlertCircle className="w-4 h-4" />
                      {formErrors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Ubicación */}
              <Input
                label="Ubicación Física"
                type="text"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Ej: Piso 1 - Zona A, Edificio Principal..."
                helperText="Opcional"
              />

              {/* Descripción */}
              <div className="group">
                <label className="flex text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Descripción
                  <span className="text-xs text-gray-500 dark:text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Descripción adicional del almacén..."
                />
              </div>

              {/* Almacén Principal */}
              <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="isMainWarehouse"
                  checked={formData.isMainWarehouse}
                  onChange={e => setFormData(prev => ({ ...prev, isMainWarehouse: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-2"
                />
                <label htmlFor="isMainWarehouse" className="flex-1 cursor-pointer">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Marcar como almacén principal</span>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Este será el almacén por defecto para operaciones de inventario en este establecimiento
                  </p>
                </label>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
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
                {editingWarehouseId ? 'Actualizar' : 'Crear'} Almacén
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast Notifications */}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
            <div className="p-6">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${
                deleteConfirmation.hasMovements ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <AlertCircle className={`w-6 h-6 ${
                  deleteConfirmation.hasMovements ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                {deleteConfirmation.hasMovements ? '¡Almacén con movimientos!' : '¿Eliminar almacén?'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                {deleteConfirmation.hasMovements ? (
                  <>
                    El almacén <span className="font-semibold">"{deleteConfirmation.warehouseName}"</span> tiene
                    movimientos de inventario asociados y no puede ser eliminado. Puedes deshabilitarlo en su lugar.
                  </>
                ) : (
                  <>
                    ¿Estás seguro de eliminar el almacén{' '}
                    <span className="font-semibold">"{deleteConfirmation.warehouseName}"</span>? Esta acción no se
                    puede deshacer.
                  </>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    setDeleteConfirmation({ isOpen: false, warehouseId: null, warehouseName: '', hasMovements: false })
                  }
                  className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  {deleteConfirmation.hasMovements ? 'Entendido' : 'Cancelar'}
                </button>
                {!deleteConfirmation.hasMovements && (
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

      {/* Header */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Warehouse className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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

      {/* Filters and Controls */}
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

          <Select
            value={filterEstablishment}
            onChange={e => setFilterEstablishment(e.target.value)}
            options={[
              { value: 'all', label: 'Todos los establecimientos' },
              ...establishments.map(est => ({
                value: est.id,
                label: `[${est.code}] ${est.name}`
              }))
            ]}
          />

          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
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

      {/* Warehouses List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredWarehouses.length === 0 ? (
          <div className="text-center py-12">
            <Warehouse className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm || filterEstablishment !== 'all' || filterStatus !== 'all'
                ? 'No se encontraron almacenes'
                : 'No hay almacenes registrados'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || filterEstablishment !== 'all' || filterStatus !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza registrando tu primer almacén'}
            </p>
            {!searchTerm && filterEstablishment === 'all' && filterStatus === 'all' && (
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
            {filteredWarehouses.map(warehouse => (
              <div key={warehouse.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{warehouse.name}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                        {warehouse.code}
                      </span>
                      {warehouse.isMainWarehouse && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-full">
                          Principal
                        </span>
                      )}
                      {warehouse.hasMovements && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Con movimientos
                        </span>
                      )}
                      <StatusIndicator
                        status={warehouse.isActive ? 'success' : 'error'}
                        label={warehouse.isActive ? 'Activo' : 'Inactivo'}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Building className="w-4 h-4" />
                        Establecimiento: <span className="font-medium">[{warehouse.establishmentCode}] {warehouse.establishmentName}</span>
                      </p>
                      {warehouse.location && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {warehouse.location}
                        </p>
                      )}
                      {warehouse.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{warehouse.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(warehouse)}
                      className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(warehouse.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        warehouse.isActive
                          ? 'text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30'
                          : 'text-green-400 dark:text-green-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                      }`}
                      title={warehouse.isActive ? 'Deshabilitar' : 'Habilitar'}
                    >
                      {warehouse.isActive ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>

                    <button
                      onClick={() => openDeleteConfirmation(warehouse)}
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
