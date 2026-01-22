/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/configuration/pages/EstablecimientosConfiguration.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
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
  Navigation,
  Mail,
  Phone
} from 'lucide-react';
import { PageHeader, Button, Select, Input } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
// import { ConfigurationCard } from '../components/comunes/TarjetaConfiguracion';
import { IndicadorEstado } from '../components/comunes/IndicadorEstado';
import type { Establecimiento } from '../modelos/Establecimiento';
import { ubigeoData } from '../datos/ubigeo';

interface EstablecimientoFormData {
  codigoEstablecimiento: string;
  nombreEstablecimiento: string;
  direccionEstablecimiento: string;
  distritoEstablecimiento: string;
  provinciaEstablecimiento: string;
  departamentoEstablecimiento: string;
  codigoPostalEstablecimiento: string;
  phone: string;
  email: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning';
  message: string;
}

interface DeleteConfirmation {
  isOpen: boolean;
  EstablecimientoId: string | null;
  EstablecimientoName: string;
}

export function EstablecimientosConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { Establecimientos } = state;

  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEstablecimientoId, setEditingEstablecimientoId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    EstablecimientoId: null,
    EstablecimientoName: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [datosFormulario, setFormData] = useState<EstablecimientoFormData>({
    codigoEstablecimiento: '',
    nombreEstablecimiento: '',
    direccionEstablecimiento: '',
    distritoEstablecimiento: '',
    provinciaEstablecimiento: '',
    departamentoEstablecimiento: '',
    codigoPostalEstablecimiento: '',
    phone: '',
    email: ''
  });

  // Ubigeo cascading logic
  const selectedDepartment = useMemo(() => {
    return ubigeoData.find(dept => dept.name === datosFormulario.departamentoEstablecimiento);
  }, [datosFormulario.departamentoEstablecimiento]);

  const availableProvinces = useMemo(() => {
    return selectedDepartment?.provinces || [];
  }, [selectedDepartment]);

  const selectedProvince = useMemo(() => {
    return availableProvinces.find(prov => prov.name === datosFormulario.provinciaEstablecimiento);
  }, [availableProvinces, datosFormulario.provinciaEstablecimiento]);

  const availableDistricts = useMemo(() => {
    return selectedProvince?.districts || [];
  }, [selectedProvince]);

  // Filter Establecimientos
  const filteredEstablecimientos = Establecimientos.filter(est => {
    const matchesSearch = (est.nombreEstablecimiento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (est.codigoEstablecimiento || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (est.direccionEstablecimiento || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filtroEstado === 'all' ||
      (filtroEstado === 'active' && est.estaActivoEstablecimiento) ||
      (filtroEstado === 'inactive' && !est.estaActivoEstablecimiento);

    return matchesSearch && matchesStatus;
  });

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
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Generate next Establecimiento code
  const generateNextCode = () => {
    if (Establecimientos.length === 0) return '0001';

    // Extract numeric codes only
    const numericCodes = Establecimientos
      .map(e => {
        const match = e.codigoEstablecimiento.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      })
      .filter(n => n > 0);

    const lastCode = numericCodes.length > 0 ? Math.max(...numericCodes) : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!datosFormulario.codigoEstablecimiento.trim()) {
      errors.codigoEstablecimiento = 'El código es obligatorio';
    } else if (datosFormulario.codigoEstablecimiento.length > 4) {
      errors.codigoEstablecimiento = 'El código no puede tener más de 4 caracteres';
    } else {
      // Check for duplicate code
      const isDuplicate = Establecimientos.some(
        est => est.codigoEstablecimiento === datosFormulario.codigoEstablecimiento && est.id !== editingEstablecimientoId
      );
      if (isDuplicate) {
        errors.codigoEstablecimiento = 'Ya existe un establecimiento con este código';
      }
    }

    if (!datosFormulario.nombreEstablecimiento.trim()) {
      errors.nombreEstablecimiento = 'El nombre es obligatorio';
    }

    if (!datosFormulario.direccionEstablecimiento.trim()) {
      errors.direccionEstablecimiento = 'La dirección es obligatoria';
    }

    if (!datosFormulario.distritoEstablecimiento.trim()) {
      errors.distritoEstablecimiento = 'El distrito es obligatorio';
    }

    if (!datosFormulario.provinciaEstablecimiento.trim()) {
      errors.provinciaEstablecimiento = 'La provincia es obligatoria';
    }

    if (!datosFormulario.departamentoEstablecimiento.trim()) {
      errors.departamentoEstablecimiento = 'El departamento es obligatorio';
    }

    if (datosFormulario.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datosFormulario.email)) {
      errors.email = 'El email no es válido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNew = () => {
    setFormData({
      codigoEstablecimiento: generateNextCode(),
      nombreEstablecimiento: '',
      direccionEstablecimiento: '',
      distritoEstablecimiento: '',
      provinciaEstablecimiento: '',
      departamentoEstablecimiento: '',
      codigoPostalEstablecimiento: '',
      phone: '',
      email: ''
    });
    setEditingEstablecimientoId(null);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (Establecimiento: Establecimiento) => {
    setFormData({
      codigoEstablecimiento: Establecimiento.codigoEstablecimiento,
      nombreEstablecimiento: Establecimiento.nombreEstablecimiento,
      direccionEstablecimiento: Establecimiento.direccionEstablecimiento,
      distritoEstablecimiento: Establecimiento.distritoEstablecimiento,
      provinciaEstablecimiento: Establecimiento.provinciaEstablecimiento,
      departamentoEstablecimiento: Establecimiento.departamentoEstablecimiento,
      codigoPostalEstablecimiento: Establecimiento.codigoPostalEstablecimiento || '',
      phone: Establecimiento.phone || '',
      email: Establecimiento.email || ''
    });
    setEditingEstablecimientoId(Establecimiento.id);
    setFormErrors({});
    setShowForm(true);
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    try {
      let updatedEstablecimientos: Establecimiento[];

      if (editingEstablecimientoId) {
        // Update existing
        updatedEstablecimientos = Establecimientos.map(est =>
          est.id === editingEstablecimientoId
            ? {
              ...est,
              ...datosFormulario,
              actualizadoElEstablecimiento: new Date()
            }
            : est
        );
        showToast('success', 'Establecimiento actualizado correctamente');
      } else {
        // Create new - with unique ID
        const newEstablecimiento: Establecimiento = {
          id: generateUniqueId(),
          ...datosFormulario,
          coordinates: undefined,
          businessHours: {},
          sunatConfiguration: {
            isRegistered: false
          },
          posConfiguration: undefined,
          inventoryConfiguration: {
            managesInventory: false,
            isalmacen: false,
            allowNegativeStock: false,
            autoTransferStock: false
          },
          financialConfiguration: {
            handlesCash: true,
            defaultCurrencyId: '',
            acceptedCurrencies: [],
            defaultTaxId: '',
            bankAccounts: []
          },
          estadoEstablecimiento: 'ACTIVE',
          estaActivoEstablecimiento: true,
          isMainEstablecimiento: false,
          creadoElEstablecimiento: new Date(),
          actualizadoElEstablecimiento: new Date()
        };

        updatedEstablecimientos = [...Establecimientos, newEstablecimiento];
        showToast('success', 'Establecimiento creado correctamente');
      }

      dispatch({ type: 'SET_EstablecimientoS', payload: updatedEstablecimientos });
      handleCancel();
    } catch (error) {
      console.error('Error saving Establecimiento:', error);
      showToast('error', 'Error al guardar el establecimiento. Por favor, intenta nuevamente.');
    }
  };

  const handleCancel = () => {
    setFormData({
      codigoEstablecimiento: '',
      nombreEstablecimiento: '',
      direccionEstablecimiento: '',
      distritoEstablecimiento: '',
      provinciaEstablecimiento: '',
      departamentoEstablecimiento: '',
      codigoPostalEstablecimiento: '',
      phone: '',
      email: ''
    });
    setEditingEstablecimientoId(null);
    setFormErrors({});
    setShowForm(false);
  };

  const openDeleteConfirmation = (Establecimiento: Establecimiento) => {
    setDeleteConfirmation({
      isOpen: true,
      EstablecimientoId: Establecimiento.id,
      EstablecimientoName: Establecimiento.nombreEstablecimiento
    });
  };

  const handleDelete = () => {
    if (!deleteConfirmation.EstablecimientoId) return;

    try {
      const updatedEstablecimientos = Establecimientos.filter(
        est => est.id !== deleteConfirmation.EstablecimientoId
      );
      dispatch({ type: 'SET_EstablecimientoS', payload: updatedEstablecimientos });
      showToast('success', 'Establecimiento eliminado correctamente');
      setDeleteConfirmation({ isOpen: false, EstablecimientoId: null, EstablecimientoName: '' });
    } catch (error) {
      console.error('Error deleting Establecimiento:', error);
      showToast('error', 'Error al eliminar el establecimiento');
    }
  };

  const handleToggleStatus = (id: string) => {
    const Establecimiento = Establecimientos.find(est => est.id === id);

    try {
      const updatedEstablecimientos = Establecimientos.map(est =>
        est.id === id
          ? {
            ...est,
            estaActivoEstablecimiento: !est.estaActivoEstablecimiento,
            actualizadoElEstablecimiento: new Date()
          }
          : est
      );
      dispatch({ type: 'SET_EstablecimientoS', payload: updatedEstablecimientos });
      showToast('success', Establecimiento?.estaActivoEstablecimiento ? 'Establecimiento desactivado' : 'Establecimiento activado');
    } catch (error) {
      console.error('Error toggling status:', error);
      showToast('error', 'Error al cambiar el estado del establecimiento');
    }
  };

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Toast Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : toast.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
              {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              <p className="flex-1 text-sm font-medium">{toast.message}</p>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {editingEstablecimientoId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {editingEstablecimientoId ? 'Modifica los datos del establecimiento' : 'Registra un nuevo establecimiento para tu empresa'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
            <Building className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Código: {datosFormulario.codigoEstablecimiento}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={manejarEnvio} className="space-y-6">
          {/* Sección 1: Identificación */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Building className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Identificación</h3>
                  <p className="text-sm text-gray-600">Información básica del establecimiento</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Código"
                  type="text"
                  value={datosFormulario.codigoEstablecimiento}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, codigoEstablecimiento: e.target.value }));
                    if (formErrors.codigoEstablecimiento) setFormErrors(prev => ({ ...prev, codigoEstablecimiento: '' }));
                  }}
                  error={formErrors.codigoEstablecimiento}
                  placeholder="Ej: 0001"
                  leftIcon={<Hash />}
                  required
                  maxLength={4}
                />

                <Input
                  label="Nombre del Establecimiento"
                  type="text"
                  value={datosFormulario.nombreEstablecimiento}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, nombreEstablecimiento: e.target.value }));
                    if (formErrors.nombreEstablecimiento) setFormErrors(prev => ({ ...prev, nombreEstablecimiento: '' }));
                  }}
                  error={formErrors.nombreEstablecimiento}
                  placeholder="Ej: Sede Central, Sucursal Norte..."
                  leftIcon={<FileText />}
                  required
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Ubicación */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ubicación</h3>
                  <p className="text-sm text-gray-600">Dirección y datos geográficos</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <Input
                label="Dirección"
                type="text"
                value={datosFormulario.direccionEstablecimiento}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, direccionEstablecimiento: e.target.value }));
                  if (formErrors.direccionEstablecimiento) setFormErrors(prev => ({ ...prev, direccionEstablecimiento: '' }));
                }}
                error={formErrors.direccionEstablecimiento}
                placeholder="Ej: Av. Los Pinos 123, Urbanización..."
                leftIcon={<Navigation />}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group">
                  <Select
                    label="Departamento"
                    value={datosFormulario.departamentoEstablecimiento}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        departamentoEstablecimiento: value,
                        provinciaEstablecimiento: '',
                        distritoEstablecimiento: ''
                      }));
                      if (formErrors.departamentoEstablecimiento) setFormErrors(prev => ({ ...prev, departamentoEstablecimiento: '' }));
                    }}
                    options={[
                      { value: '', label: 'Seleccionar...' },
                      ...ubigeoData.map(dept => ({
                        value: dept.name,
                        label: dept.name
                      }))
                    ]}
                    placeholder="Seleccionar..."
                    error={formErrors.departamentoEstablecimiento}
                    required
                  />
                </div>

                <div className="group">
                  <Select
                    label="Provincia"
                    value={datosFormulario.provinciaEstablecimiento}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        provinciaEstablecimiento: value,
                        distritoEstablecimiento: ''
                      }));
                      if (formErrors.provinciaEstablecimiento) setFormErrors(prev => ({ ...prev, provinciaEstablecimiento: '' }));
                    }}
                    options={[
                      { value: '', label: datosFormulario.departamentoEstablecimiento ? 'Seleccionar...' : 'Selecciona departamento primero' },
                      ...availableProvinces.map(prov => ({
                        value: prov.name,
                        label: prov.name
                      }))
                    ]}
                    placeholder={datosFormulario.departamentoEstablecimiento ? 'Seleccionar...' : 'Selecciona departamento primero'}
                    disabled={!datosFormulario.departamentoEstablecimiento}
                    error={formErrors.provinciaEstablecimiento}
                    required
                  />
                </div>

                <div className="group">
                  <Select
                    label="Distrito"
                    value={datosFormulario.distritoEstablecimiento}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const value = e.target.value;
                      setFormData(prev => ({ ...prev, distritoEstablecimiento: value }));
                      if (formErrors.distritoEstablecimiento) setFormErrors(prev => ({ ...prev, distritoEstablecimiento: '' }));
                    }}
                    options={[
                      { value: '', label: datosFormulario.provinciaEstablecimiento ? 'Seleccionar...' : 'Selecciona provincia primero' },
                      ...availableDistricts.map(dist => ({
                        value: dist.name,
                        label: dist.name
                      }))
                    ]}
                    placeholder={datosFormulario.provinciaEstablecimiento ? 'Seleccionar...' : 'Selecciona provincia primero'}
                    disabled={!datosFormulario.provinciaEstablecimiento}
                    error={formErrors.distritoEstablecimiento}
                    required
                  />
                </div>
              </div>

              <Input
                label="Código Postal"
                type="text"
                value={datosFormulario.codigoPostalEstablecimiento}
                onChange={(e) => setFormData(prev => ({ ...prev, codigoPostalEstablecimiento: e.target.value }))}
                placeholder="Ej: 15001"
                leftIcon={<Hash />}
                helperText="Opcional"
              />
            </div>
          </div>

          {/* Sección 3: Información de Contacto */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3>
                  <p className="text-sm text-gray-600">Datos opcionales para comunicación</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Teléfono"
                  type="tel"
                  value={datosFormulario.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Ej: +51 999 999 999"
                  leftIcon={<Phone />}
                  helperText="Opcional"
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={datosFormulario.email}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, email: e.target.value }));
                    if (formErrors.email) setFormErrors(prev => ({ ...prev, email: '' }));
                  }}
                  error={formErrors.email}
                  placeholder="Ej: establecimiento@empresa.com"
                  leftIcon={<Mail />}
                  helperText="Opcional"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
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
                {editingEstablecimientoId ? 'Actualizar' : 'Crear'} Establecimiento
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Configuración de Establecimientos"
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
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          {/* Toast Notifications */}
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-slide-in ${toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : toast.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  }`}
              >
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                <p className="flex-1 text-sm font-medium">{toast.message}</p>
              </div>
            ))}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                    ¿Eliminar establecimiento?
                  </h3>
                  <p className="text-gray-600 text-center mb-6">
                    ¿Estás seguro de eliminar el establecimiento <span className="font-semibold">"{deleteConfirmation.EstablecimientoName}"</span>?
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirmation({ isOpen: false, EstablecimientoId: null, EstablecimientoName: '' })}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{Establecimientos.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {Establecimientos.filter(e => e.estaActivoEstablecimiento).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {Establecimientos.filter(e => !e.estaActivoEstablecimiento).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <Input
            type="text"
            placeholder="Buscar establecimientos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search />}
          />

          <Select
            value={filtroEstado}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)}
            size="medium"
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
          Nuevo Establecimiento
        </Button>
      </div>

      {/* Establecimientos List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredEstablecimientos.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filtroEstado !== 'all'
                ? 'No se encontraron establecimientos'
                : 'No hay establecimientos registrados'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filtroEstado !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza registrando tu primer establecimiento'
              }
            </p>
            {(!searchTerm && filtroEstado === 'all') && (
              <button
                onClick={handleNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Establecimiento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEstablecimientos.map((Establecimiento) => (
              <div
                key={Establecimiento.id}
                data-focus={`configuracion:establecimientos:${Establecimiento.id}`}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {Establecimiento.nombreEstablecimiento}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {Establecimiento.codigoEstablecimiento}
                      </span>
                      <IndicadorEstado
                        status={Establecimiento.estaActivoEstablecimiento ? 'success' : 'error'}
                        label={Establecimiento.estaActivoEstablecimiento ? 'Activo' : 'Inactivo'}
                      />
                    </div>

                    <p className="text-gray-600 mb-2">
                      {Establecimiento.direccionEstablecimiento}
                    </p>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>{Establecimiento.distritoEstablecimiento}, {Establecimiento.provinciaEstablecimiento}</span>
                      <span>{Establecimiento.departamentoEstablecimiento}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(Establecimiento)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleToggleStatus(Establecimiento.id)}
                      className={`p-2 rounded-lg transition-colors ${Establecimiento.estaActivoEstablecimiento
                        ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                        : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      title={Establecimiento.estaActivoEstablecimiento ? 'Desactivar' : 'Activar'}
                    >
                      <MapPin className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openDeleteConfirmation(Establecimiento)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>
    </div>
  );
}



