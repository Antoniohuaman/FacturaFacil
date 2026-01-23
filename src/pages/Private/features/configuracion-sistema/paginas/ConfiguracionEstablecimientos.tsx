// src/features/configuration/pages/EstablecimientosConfiguration.tsx
import { useState, useMemo, useEffect } from 'react';
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
import { useEstablecimientos } from '../hooks/useEstablecimientos'
import { PageHeader, Button, Select, Input, Breadcrumb, EstablecimientoCard } from '@/contasis';
import { IndicadorEstado } from '../components/comunes/IndicadorEstado';
import { ToastNotifications, type Toast } from '@/components/Toast';
import type { Establecimiento } from '../modelos/Establecimiento';
import { ubigeoData } from '../datos/ubigeo';
import formValidation, { commonRules, type Validators } from '@/utils/FormValidation';

// --- Interfaces ---

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

interface DeleteConfirmation {
  isOpen: boolean;
  EstablecimientoId: string | null;
  EstablecimientoName: string;
}

// --- Component ---

export function EstablecimientosConfiguration() {
  // 1. Hooks & Configuration
  const navigate = useNavigate();
  const {
    establecimientos: Establecimientos,
    isFetching,
    isSaving,
    isDeleting,
    error: apiError,
    cargarEstablecimientos,
    crearEstablecimiento,
    actualizarEstablecimiento,
    eliminarEstablecimiento,
    toggleStatus: toggleEstablecimientoStatus,
  } = useEstablecimientos();

  // 2. State Management
  
  // UI & Feedback State
  const [showForm, setShowForm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    EstablecimientoId: null,
    EstablecimientoName: ''
  });

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroEstado, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Form State
  const [editingEstablecimientoId, setEditingEstablecimientoId] = useState<string | null>(null);
  const [validators, setValidators] = useState<Validators | null>(null);
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

  // 3. Computed Logic (useMemo)

  // Ubigeo Cascading
  const selectedDepartment = useMemo(() => {
    return ubigeoData.find(dept => dept.name === datosFormulario.departamentoEstablecimiento);
  }, [datosFormulario.departamentoEstablecimiento]);

  const availableProvinces = useMemo(() => selectedDepartment?.provinces || [], [selectedDepartment]);
  const selectedProvince = useMemo(() => availableProvinces.find(p => p.name === datosFormulario.provinciaEstablecimiento), [availableProvinces, datosFormulario.provinciaEstablecimiento]);
  const availableDistricts = useMemo(() => selectedProvince?.districts || [], [selectedProvince]);

  // Validation Rules
  const formRules = useMemo(() => ({
    codigoEstablecimiento: [
      commonRules.required('El código es obligatorio'),
      commonRules.maxLength(4, 'El código no puede tener más de 4 caracteres'),
      commonRules.custom((value) => {
        if (editingEstablecimientoId) {
          const original = Establecimientos.find(e => e.id === editingEstablecimientoId);
          if (original?.codigoEstablecimiento === value) return true;
        }
        return !Establecimientos.some(est => est.codigoEstablecimiento === value);
      }, 'Ya existe un establecimiento con este código')
    ],
    nombreEstablecimiento: [commonRules.required('El nombre es obligatorio')],
    direccionEstablecimiento: [commonRules.required('La dirección es obligatoria')],
    distritoEstablecimiento: [commonRules.required('El distrito es obligatorio')],
    provinciaEstablecimiento: [commonRules.required('La provincia es obligatoria')],
    departamentoEstablecimiento: [commonRules.required('El departamento es obligatorio')],
    email: [commonRules.email('El email no es válido')]
  }), [Establecimientos, editingEstablecimientoId]);

  // Derived List
  const listaVisual = Establecimientos;

  // 4. Effects (useEffect)

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load Data
  useEffect(() => {
    const estado = filtroEstado === 'all' ? undefined : filtroEstado === 'active';
    cargarEstablecimientos(debouncedSearch, estado);
  }, [debouncedSearch, filtroEstado, cargarEstablecimientos]);

  // Initialize Validators
  useEffect(() => {
    if (showForm) {
      const initialValidators: Validators = {};
      Object.keys(formRules).forEach(key => {
        initialValidators[key] = formValidation.createFieldValidator(formRules[key as keyof typeof formRules]);
        if (editingEstablecimientoId && datosFormulario[key as keyof EstablecimientoFormData]) {
          initialValidators[key].state = datosFormulario[key as keyof EstablecimientoFormData] || '';
          initialValidators[key].valid = true; 
        }
      });
      setValidators(initialValidators);
    }
  }, [showForm, formRules, editingEstablecimientoId]);

  // 5. Helper Functions

  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const generateNextCode = () => {
    if (Establecimientos.length === 0) return '0001';
    const numericCodes = Establecimientos.map(e => {
      const m = e.codigoEstablecimiento.match(/\d+/);
      return m ? Number(m[0]) : 0;
    }).filter(n => n > 0);
    const last = numericCodes.length ? Math.max(...numericCodes) : 0;
    return String(last + 1).padStart(4, '0');
  };

  const updateField = (field: keyof EstablecimientoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validators) {
      setValidators(prev => formValidation.updateValidators(field, value, prev || {}));
    }
  };

  // 6. Event Handlers

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
    setShowForm(true);
  };

  const handleEdit = (establecimiento: Establecimiento) => {
    setFormData({
      codigoEstablecimiento: establecimiento.codigoEstablecimiento,
      nombreEstablecimiento: establecimiento.nombreEstablecimiento,
      direccionEstablecimiento: establecimiento.direccionEstablecimiento,
      distritoEstablecimiento: establecimiento.distritoEstablecimiento,
      provinciaEstablecimiento: establecimiento.provinciaEstablecimiento,
      departamentoEstablecimiento: establecimiento.departamentoEstablecimiento,
      codigoPostalEstablecimiento: establecimiento.codigoPostalEstablecimiento || '',
      phone: establecimiento.phone || '',
      email: establecimiento.email || ''
    });
    setEditingEstablecimientoId(establecimiento.id);
    setShowForm(true);
  };

  const handleSubmitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create simple state object for validation
    const formState: Record<string, string> = {};
    Object.keys(datosFormulario).forEach(key => {
      formState[key] = datosFormulario[key as keyof EstablecimientoFormData] || '';
    });

    const validation = formValidation.isFormValid(validators || {}, formState);
    
    if (!validation.status) {
      setValidators({ ...validation.validators! });
      showToast('error', 'Por favor, corrige los errores en el formulario');
      return;
    }

    // Get Ubigeo Code
    const selectedDist = availableDistricts.find(d => d.name === datosFormulario.distritoEstablecimiento);
    const ubigeoCode = selectedDist?.code || datosFormulario.codigoPostalEstablecimiento;

    try {
      const dataToSave: Partial<Establecimiento> = {
        ...datosFormulario,
        codigoPostalEstablecimiento: ubigeoCode,
        coordinates: undefined,
        businessHours: {},
        sunatConfiguration: { isRegistered: false },
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
      };

      if (editingEstablecimientoId) {
        await actualizarEstablecimiento(editingEstablecimientoId, dataToSave);
        showToast('success', 'Establecimiento actualizado correctamente');
      } else {
        await crearEstablecimiento(dataToSave);
        showToast('success', 'Establecimiento creado correctamente');
      }

      handleCancel();
    } catch (error) {
      console.error('Error saving Establecimiento:', error);
      const message = error instanceof Error ? error.message : 'Error al guardar el establecimiento';
      showToast('error', message);
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
    setShowForm(false);
  };

  const openDeleteConfirmation = (establecimiento: Establecimiento) => {
    setDeleteConfirmation({
      isOpen: true,
      EstablecimientoId: establecimiento.id,
      EstablecimientoName: establecimiento.nombreEstablecimiento
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.EstablecimientoId) return;
    try {
      await eliminarEstablecimiento(deleteConfirmation.EstablecimientoId);
      showToast('success', 'Establecimiento eliminado correctamente');
      setDeleteConfirmation({ isOpen: false, EstablecimientoId: null, EstablecimientoName: '' });
    } catch (error) {
      console.error('Error deleting Establecimiento:', error);
      const message = error instanceof Error ? error.message : 'Error al eliminar el establecimiento';
      showToast('error', message);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleEstablecimientoStatus(id);
      const est = Establecimientos.find(e => e.id === id);
      showToast('success', est?.estaActivoEstablecimiento ? 'Establecimiento desactivado' : 'Establecimiento activado');
    } catch (error) {
      console.error('Error toggling status:', error);
      const message = error instanceof Error ? error.message : 'Error al cambiar el estado';
      showToast('error', message);
    }
  };

  // 7. Render

  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={editingEstablecimientoId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
          breadcrumb={<Breadcrumb items={[{ label: 'Configuración', href: '#', onClick: () => navigate('/configuracion') }, { label: 'Establecimientos', href: '#', onClick: () => setShowForm(false) }, { label: editingEstablecimientoId ? 'Editar Establecimiento' : 'Nuevo Establecimiento' }]} />}
          actions={<Button variant="secondary" icon={<ArrowLeft />} onClick={handleCancel}>Volver</Button>}
        />

        <ToastNotifications toasts={toasts} />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"><ArrowLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" /></button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{editingEstablecimientoId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}</h1>
                  <p className="text-sm text-gray-600 mt-1">{editingEstablecimientoId ? 'Modifica los datos del establecimiento' : 'Registra un nuevo establecimiento para tu empresa'}</p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {isSaving ? 'Guardando...' : `Código: ${datosFormulario.codigoEstablecimiento}`}
                </span>
                {isSaving && <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>}
              </div>
            </div>

            <form onSubmit={handleSubmitSave} className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg"><Building className="w-5 h-5 text-white" /></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Identificación</h3>
                      <p className="text-sm text-gray-600">Información básica del establecimiento</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label="Código" type="text" value={datosFormulario.codigoEstablecimiento} onChange={(e) => updateField('codigoEstablecimiento', e.target.value)} error={formValidation.getFieldErrors('codigoEstablecimiento', validators)[0]} placeholder="Ej: 0001" leftIcon={<Hash />} required maxLength={4} />
                    <Input label="Nombre del Establecimiento" type="text" value={datosFormulario.nombreEstablecimiento} onChange={(e) => updateField('nombreEstablecimiento', e.target.value)} error={formValidation.getFieldErrors('nombreEstablecimiento', validators)[0]} placeholder="Ej: Sede Central, Sucursal Norte..." leftIcon={<FileText />} required />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3"><div className="p-2 bg-green-600 rounded-lg"><MapPin className="w-5 h-5 text-white" /></div><div><h3 className="text-lg font-semibold text-gray-900">Ubicación</h3><p className="text-sm text-gray-600">Dirección y datos geográficos</p></div></div>
                </div>

                <div className="p-6 space-y-6">
                  <Input label="Dirección" type="text" value={datosFormulario.direccionEstablecimiento} onChange={(e) => updateField('direccionEstablecimiento', e.target.value)} error={formValidation.getFieldErrors('direccionEstablecimiento', validators)[0]} placeholder="Ej: Av. Los Pinos 123, Urbanización..." leftIcon={<Navigation />} required />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select label="Departamento" value={datosFormulario.departamentoEstablecimiento} onChange={(e) => { const value = e.target.value; setFormData(prev => ({ ...prev, departamentoEstablecimiento: value, provinciaEstablecimiento: '', distritoEstablecimiento: '' })); if (validators) setValidators(prev => { const v = { ...(prev || {}) }; formValidation.updateValidators('departamentoEstablecimiento', value, v); if (v.provinciaEstablecimiento) v.provinciaEstablecimiento.state = ''; if (v.distritoEstablecimiento) v.distritoEstablecimiento.state = ''; return { ...v }; }); }} options={[{ value: '', label: 'Seleccionar...' }, ...ubigeoData.map(d => ({ value: d.name, label: d.name }))]} placeholder="Seleccionar..." error={formValidation.getFieldErrors('departamentoEstablecimiento', validators)[0]} required />

                    <Select label="Provincia" value={datosFormulario.provinciaEstablecimiento} onChange={(e) => { const value = e.target.value; setFormData(prev => ({ ...prev, provinciaEstablecimiento: value, distritoEstablecimiento: '' })); if (validators) setValidators(prev => { const v = { ...(prev || {}) }; formValidation.updateValidators('provinciaEstablecimiento', value, v); if (v.distritoEstablecimiento) v.distritoEstablecimiento.state = ''; return { ...v }; }); }} options={[{ value: '', label: datosFormulario.departamentoEstablecimiento ? 'Seleccionar...' : 'Selecciona departamento primero' }, ...availableProvinces.map(p => ({ value: p.name, label: p.name }))]} placeholder={datosFormulario.departamentoEstablecimiento ? 'Seleccionar...' : 'Selecciona departamento primero'} disabled={!datosFormulario.departamentoEstablecimiento} error={formValidation.getFieldErrors('provinciaEstablecimiento', validators)[0]} required />

                    <Select label="Distrito" value={datosFormulario.distritoEstablecimiento} onChange={(e) => updateField('distritoEstablecimiento', e.target.value)} options={[{ value: '', label: datosFormulario.provinciaEstablecimiento ? 'Seleccionar...' : 'Selecciona provincia primero' }, ...availableDistricts.map(d => ({ value: d.name, label: d.name }))]} placeholder={datosFormulario.provinciaEstablecimiento ? 'Seleccionar...' : 'Selecciona provincia primero'} disabled={!datosFormulario.provinciaEstablecimiento} error={formValidation.getFieldErrors('distritoEstablecimiento', validators)[0]} required />
                  </div>

                  <Input label="Código Postal" type="text" value={datosFormulario.codigoPostalEstablecimiento} onChange={(e) => setFormData(prev => ({ ...prev, codigoPostalEstablecimiento: e.target.value }))} placeholder="Ej: 15001" leftIcon={<Hash />} helperText="Opcional" />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200"><div className="flex items-center gap-3"><div className="p-2 bg-purple-600 rounded-lg"><Phone className="w-5 h-5 text-white" /></div><div><h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3><p className="text-sm text-gray-600">Datos opcionales para comunicación</p></div></div></div>
                <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Input label="Teléfono" type="tel" value={datosFormulario.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Ej: +51 999 999 999" leftIcon={<Phone />} helperText="Opcional" /><Input label="Correo Electrónico" type="email" value={datosFormulario.email} onChange={(e) => updateField('email', e.target.value)} error={formValidation.getFieldErrors('email', validators)[0]} placeholder="Ej: establecimiento@empresa.com" leftIcon={<Mail />} helperText="Opcional" /></div></div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Los campos marcados con <span className="text-red-500 font-medium">*</span> son obligatorios</p>
                <div className="flex gap-3">
                  <Button type="button" onClick={handleCancel} variant="secondary" disabled={isSaving}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    variant="primary" 
                    icon={<CheckCircle />}
                    loading={isSaving}
                    loadingText={editingEstablecimientoId ? 'Actualizando...' : 'Creando...'}
                    disabled={isSaving}
                  >
                    {editingEstablecimientoId ? 'Actualizar' : 'Crear'} Establecimiento
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
      <PageHeader
        title="Configuración de Establecimientos"
        breadcrumb={
          <Breadcrumb
            items={[
              { label: 'Configuración', href: '#', onClick: () => navigate('/configuracion') },
              { label: 'Establecimientos' }
            ]}
          />
        }
        actions={<Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>Volver</Button>}
      />
      
      <ToastNotifications toasts={toasts} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6">

          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
                <div className="p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4"><AlertCircle className="w-6 h-6 text-red-600" /></div>
                  <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">¿Eliminar establecimiento?</h3>
                  <p className="text-gray-600 text-center mb-6">¿Estás seguro de eliminar el establecimiento <span className="font-semibold">"{deleteConfirmation.EstablecimientoName}"</span>? Esta acción no se puede deshacer.</p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setDeleteConfirmation({ isOpen: false, EstablecimientoId: null, EstablecimientoName: '' })} 
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                      disabled={isDeleting}
                    >
                      Cancelar
                    </button>
                    <Button 
                      onClick={handleDelete} 
                      variant="primary"
                      className="flex-1 !bg-red-600 hover:!bg-red-700 border-transparent text-white"
                      loading={isDeleting}
                      loadingText="Eliminando..."
                      disabled={isDeleting}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Total</p><p className="text-2xl font-bold text-gray-900">{Establecimientos.length}</p></div><div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center"><Building className="w-6 h-6 text-blue-600" /></div></div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Activos</p><p className="text-2xl font-bold text-gray-900">{Establecimientos.filter(e => e.estaActivoEstablecimiento).length}</p></div><div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center"><MapPin className="w-6 h-6 text-green-600" /></div></div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Inactivos</p><p className="text-2xl font-bold text-gray-900">{Establecimientos.filter(e => !e.estaActivoEstablecimiento).length}</p></div><div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center"><MapPin className="w-6 h-6 text-red-600" /></div></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Input type="text" placeholder="Buscar establecimientos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search />} />
              <Select value={filtroEstado} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as any)} size="medium" options={[{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Solo activos' }, { value: 'inactive', label: 'Solo inactivos' }]} />
            </div>
            <Button onClick={handleNew} variant="primary" size="md" icon={<Plus className="w-5 h-5" />} iconPosition="left" disabled={isFetching || isSaving || isDeleting}>Nuevo Establecimiento</Button>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative min-h-[400px]">
            {isFetching && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center backdrop-blur-[2px]">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-sm font-medium text-gray-600">Cargando establecimientos...</p>
                </div>
              </div>
            )}

            {apiError && !isFetching && (
              <div className="p-12 text-center">
                <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar datos</h3>
                <p className="text-gray-500 mb-6">{apiError}</p>
                <Button onClick={() => cargarEstablecimientos()} variant="secondary">Reintentar</Button>
              </div>
            )}

            {!apiError && !isFetching && listaVisual.length === 0 ? (
              <div className="text-center py-12"><Building className="h-12 w-12 text-gray-300 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm || filtroEstado !== 'all' ? 'No se encontraron establecimientos' : 'No hay establecimientos registrados'}</h3><p className="text-gray-500 mb-6">{searchTerm || filtroEstado !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Comienza registrando tu primer establecimiento'}</p>{(!searchTerm && filtroEstado === 'all') && (<button onClick={handleNew} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4 mr-2" />Crear Primer Establecimiento</button>)}</div>
            ) : !apiError && !isFetching && (
              <div className="divide-y divide-gray-200">
                {listaVisual.map(est => (
                  <div key={est.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3"><h3 className="text-lg font-semibold text-gray-900">{est.nombreEstablecimiento}</h3><span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{est.codigoEstablecimiento}</span><IndicadorEstado status={est.estaActivoEstablecimiento ? 'success' : 'error'} label={est.estaActivoEstablecimiento ? 'Activo' : 'Inactivo'} /></div>
                        <p className="text-gray-600 mb-2">{est.direccionEstablecimiento}</p>
                        <div className="flex items-center space-x-6 text-sm text-gray-500"><span>{est.distritoEstablecimiento}, {est.provinciaEstablecimiento}</span><span>{est.departamentoEstablecimiento}</span></div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEdit(est)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                        <button 
                          onClick={() => handleToggleStatus(est.id)} 
                          className={`p-2 rounded-lg transition-colors ${est.estaActivoEstablecimiento ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-green-400 hover:text-green-600 hover:bg-green-50'} disabled:opacity-30`} 
                          title={est.estaActivoEstablecimiento ? 'Desactivar' : 'Activar'}
                          disabled={isSaving}
                        >
                          {isSaving && est.id === editingEstablecimientoId ? (
                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                             <MapPin className="w-4 h-4" />
                          )}
                        </button>
                        <button onClick={() => openDeleteConfirmation(est)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NUEVA SECCIÓN: EstablecimientoCard comparativa */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Vista previa con EstablecimientoCard (Nuevo diseño)</h2>
            {listaVisual.length === 0 ? (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay establecimientos para mostrar</h3>
                <p className="text-gray-500">{searchTerm || filtroEstado !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Comienza registrando tu primer establecimiento'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listaVisual.map(est => (
                  <EstablecimientoCard
                    key={est.id}
                    establecimiento={{
                      id: parseInt(est.id),
                      codigo: est.codigoEstablecimiento,
                      nombre: est.nombreEstablecimiento,
                      activo: est.estaActivoEstablecimiento,
                      direccion: est.direccionEstablecimiento,
                      distrito: est.distritoEstablecimiento,
                      provincia: est.provinciaEstablecimiento,
                      departamento: est.departamentoEstablecimiento
                    }}
                    onToggleActivo={(id) => handleToggleStatus(String(id))}
                    onEditar={(id) => {
                      const establecimiento = Establecimientos.find(e => e.id === String(id));
                      if (establecimiento) handleEdit(establecimiento);
                    }}
                    onEliminar={(id) => {
                      const establecimiento = Establecimientos.find(e => e.id === String(id));
                      if (establecimiento) openDeleteConfirmation(establecimiento);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
