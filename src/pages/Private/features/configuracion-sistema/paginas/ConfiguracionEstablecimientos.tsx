import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Plus,
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
import { ToastNotifications, type Toast } from '@/components/Toast';
import type { Establecimiento } from '../modelos/Establecimiento';
import { useUbigeoCascade } from '@/services/api/ubigeo/hooks/useUbigeoCascade';
import formValidation, { commonRules, type Validators } from '@/utils/FormValidation';

interface EstablecimientoFormData {
  codigo: string;
  nombre: string;
  direccion: string;
  codigoDepartamento: string;
  departamento: string;
  codigoProvincia: string;
  provincia: string;
  codigoDistrito: string;
  distrito: string;
  codigoPostal: string;
  phone: string;
  email: string;
}

interface DeleteConfirmation {
  isOpen: boolean;
  EstablecimientoId: string | null;
  EstablecimientoName: string;
}

export function EstablecimientosConfiguration() {
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

  const [showForm, setShowForm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    EstablecimientoId: null,
    EstablecimientoName: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtroEstado, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [editingEstablecimientoId, setEditingEstablecimientoId] = useState<string | null>(null);
  const [validators, setValidators] = useState<Validators | null>(null);
  const [datosFormulario, setFormData] = useState<EstablecimientoFormData>({
    codigo: '',
    nombre: '',
    direccion: '',
    codigoDepartamento: '',
    departamento: '',
    codigoProvincia: '',
    provincia: '',
    codigoDistrito: '',
    distrito: '',
    codigoPostal: '',
    phone: '',
    email: ''
  });

  const {
    selection: ubigeoSelection,
    departamentos,
    provincias,
    distritos,
    setDepartamento,
    setProvincia,
    setDistrito,
    isLoading: isLoadingUbigeo
  } = useUbigeoCascade();

  const formRules = useMemo(() => ({
    codigo: [
      commonRules.required('El código es obligatorio'),
      commonRules.maxLength(4, 'El código no puede tener más de 4 caracteres'),
      commonRules.custom((value) => {
        if (editingEstablecimientoId) {
          const original = Establecimientos.find(e => e.id === editingEstablecimientoId);
          if (original?.codigo === value) return true;
        }
        return !Establecimientos.some(est => est.codigo === value);
      }, 'Ya existe un establecimiento con este código')
    ],
    nombre: [commonRules.required('El nombre es obligatorio')],
    direccion: [commonRules.required('La dirección es obligatoria')],
    distrito: [commonRules.required('El distrito es obligatorio')],
    provincia: [commonRules.required('La provincia es obligatoria')],
    departamento: [commonRules.required('El departamento es obligatorio')],
    phone: [commonRules.custom((value) => !value || /^\+?[(]?[0-9]{1,4}[)]?[\s-]?[(]?[0-9]{1,4}[)]?[\s-]?[0-9]{1,4}[\s-]?[0-9]{1,9}$/.test(value), 'Debe ser un número de teléfono válido')],
    email: [commonRules.custom((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Debe ser un valor de correo válido')]
  }), [Establecimientos, editingEstablecimientoId]);

  const listaVisual = Establecimientos;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const estado = filtroEstado === 'all' ? undefined : filtroEstado === 'active';
    cargarEstablecimientos(debouncedSearch, estado);
  }, [debouncedSearch, filtroEstado, cargarEstablecimientos]);

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

  useEffect(() => {
    if (ubigeoSelection.departamento) {
      setFormData(prev => ({
        ...prev,
        codigoDepartamento: ubigeoSelection.departamento!.codigo,
        departamento: ubigeoSelection.departamento!.nombre
      }));
      
      if (validators?.departamento) {
        setValidators(prev => ({
          ...prev!,
          departamento: {
            ...prev!.departamento,
            state: ubigeoSelection.departamento!.nombre,
            valid: true,
            errors: []
          }
        }));
      }
    }

    if (ubigeoSelection.provincia) {
      setFormData(prev => ({
        ...prev,
        codigoProvincia: ubigeoSelection.provincia!.codigo,
        provincia: ubigeoSelection.provincia!.nombre
      }));
      
      if (validators?.provincia) {
        setValidators(prev => ({
          ...prev!,
          provincia: {
            ...prev!.provincia,
            state: ubigeoSelection.provincia!.nombre,
            valid: true,
            errors: []
          }
        }));
      }
    }

    if (ubigeoSelection.distrito) {
      setFormData(prev => ({
        ...prev,
        codigoDistrito: ubigeoSelection.distrito!.codigo,
        distrito: ubigeoSelection.distrito!.nombre
      }));
      
      if (validators?.distrito) {
        setValidators(prev => ({
          ...prev!,
          distrito: {
            ...prev!.distrito,
            state: ubigeoSelection.distrito!.nombre,
            valid: true,
            errors: []
          }
        }));
      }
    }

    if (ubigeoSelection.departamento && ubigeoSelection.provincia && ubigeoSelection.distrito) {
      const codigoPostalGenerado = `${ubigeoSelection.departamento.codigo}${ubigeoSelection.provincia.codigo}${ubigeoSelection.distrito.codigo}`;
      setFormData(prev => ({ ...prev, codigoPostal: codigoPostalGenerado }));
    }
  }, [ubigeoSelection.departamento, ubigeoSelection.provincia, ubigeoSelection.distrito, validators]);

  // 5. Helper Functions

  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const generateNextCode = () => {
    if (Establecimientos.length === 0) return '0001';
    const numericCodes = Establecimientos.map(e => {
      const m = e.codigo.match(/\d+/);
      return m ? Number(m[0]) : 0;
    }).filter(n => n > 0);
    const last = numericCodes.length ? Math.max(...numericCodes) : 0;
    return String(last + 1).padStart(4, '0');
  };

  const updateField = (field: keyof EstablecimientoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validators && validators[field]) {
      setValidators(prev => formValidation.updateValidators(field, value, prev || {}));
    }
  };

  // 6. Event Handlers

  const handleNew = () => {
    setFormData({
      codigo: generateNextCode(),
      nombre: '',
      direccion: '',
      codigoDepartamento: '',
      departamento: '',
      codigoProvincia: '',
      provincia: '',
      codigoDistrito: '',
      distrito: '',
      codigoPostal: '',
      phone: '',
      email: ''
    });
    setDepartamento(null);
    setProvincia(null);
    setDistrito(null);
    setEditingEstablecimientoId(null);
    setShowForm(true);
  };

  const handleEdit = (establecimiento: Establecimiento) => {
    setFormData({
      codigo: establecimiento.codigo,
      nombre: establecimiento.nombre,
      direccion: establecimiento.direccion,
      codigoDepartamento: establecimiento.codigoDepartamento || '',
      departamento: establecimiento.departamento || '',
      codigoProvincia: establecimiento.codigoProvincia || '',
      provincia: establecimiento.provincia || '',
      codigoDistrito: establecimiento.codigoDistrito || '',
      distrito: establecimiento.distrito || '',
      codigoPostal: establecimiento.codigoPostal || '',
      phone: establecimiento.phone || '',
      email: establecimiento.email || ''
    });
    
    setEditingEstablecimientoId(establecimiento.id);
    setShowForm(true);
    
    setTimeout(() => {
      if (establecimiento.codigoDepartamento && establecimiento.departamento) {
        setDepartamento({
          codigo: establecimiento.codigoDepartamento,
          nombre: establecimiento.departamento
        });
      }
      
      setTimeout(() => {
        if (establecimiento.codigoProvincia && establecimiento.provincia) {
          setProvincia({
            codigoDepartamento: establecimiento.codigoDepartamento || '',
            codigo: establecimiento.codigoProvincia,
            nombre: establecimiento.provincia
          });
        }
        
        setTimeout(() => {
          if (establecimiento.codigoDistrito && establecimiento.distrito) {
            setDistrito({
              codigoDepartamento: establecimiento.codigoDepartamento || '',
              codigoProvincia: establecimiento.codigoProvincia || '',
              codigo: establecimiento.codigoDistrito,
              nombre: establecimiento.distrito
            });
          }
        }, 100);
      }, 100);
    }, 100);
  };

  const handleSubmitSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    try {
      const dataToSave: Partial<Establecimiento> = {
        codigo: datosFormulario.codigo,
        nombre: datosFormulario.nombre,
        direccion: datosFormulario.direccion,
        phone: datosFormulario.phone || undefined,
        email: datosFormulario.email || undefined,
        codigoDepartamento: datosFormulario.codigoDepartamento,
        departamento: datosFormulario.departamento,
        codigoProvincia: datosFormulario.codigoProvincia,
        provincia: datosFormulario.provincia,
        codigoDistrito: datosFormulario.codigoDistrito,
        distrito: datosFormulario.distrito,
        codigoPostal: datosFormulario.codigoPostal || undefined,
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
        estado: 'ACTIVE',
        esActivo: editingEstablecimientoId
          ? Establecimientos.find(e => e.id === editingEstablecimientoId)?.esActivo ?? true
          : true,
        principal: false,
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
      const errorMessage = error instanceof Error ? error.message : 'Error al guardar el establecimiento';
      showToast('error', errorMessage);
    }
  };

  const handleCancel = () => {
    setFormData({
      codigo: '',
      nombre: '',
      direccion: '',
      codigoDepartamento: '',
      departamento: '',
      codigoProvincia: '',
      provincia: '',
      codigoDistrito: '',
      distrito: '',
      codigoPostal: '',
      phone: '',
      email: ''
    });
    setDepartamento(null);
    setProvincia(null);
    setDistrito(null);
    setEditingEstablecimientoId(null);
    setShowForm(false);
  };

  const openDeleteConfirmation = (establecimiento: Establecimiento) => {
    setDeleteConfirmation({
      isOpen: true,
      EstablecimientoId: establecimiento.id,
      EstablecimientoName: establecimiento.nombre
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmation.EstablecimientoId) return;
    try {
      await eliminarEstablecimiento(deleteConfirmation.EstablecimientoId);
      showToast('success', 'Establecimiento eliminado correctamente');
      setDeleteConfirmation({ isOpen: false, EstablecimientoId: null, EstablecimientoName: '' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el establecimiento';
      showToast('error', errorMessage);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleEstablecimientoStatus(id);
      const est = Establecimientos.find(e => e.id === id);
      showToast('success', est?.esActivo ? 'Establecimiento desactivado' : 'Establecimiento activado');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar el estado';
      showToast('error', errorMessage);
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
                  {isSaving ? 'Guardando...' : `Código: ${datosFormulario.codigo}`}
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
                    <Input label="Código" type="text" value={datosFormulario.codigo} onChange={(e) => updateField('codigo', e.target.value)} error={formValidation.getFieldErrors('codigo', validators)[0]} placeholder="Ej: 0001" leftIcon={<Hash />} required maxLength={4} />
                    <Input label="Nombre del Establecimiento" type="text" value={datosFormulario.nombre} onChange={(e) => updateField('nombre', e.target.value)} error={formValidation.getFieldErrors('nombre', validators)[0]} placeholder="Ej: Sede Central, Sucursal Norte..." leftIcon={<FileText />} required />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center gap-3"><div className="p-2 bg-green-600 rounded-lg"><MapPin className="w-5 h-5 text-white" /></div><div><h3 className="text-lg font-semibold text-gray-900">Ubicación</h3><p className="text-sm text-gray-600">Dirección y datos geográficos</p></div></div>
                </div>

                <div className="p-6 space-y-6">
                  <Input label="Dirección" type="text" value={datosFormulario.direccion} onChange={(e) => updateField('direccion', e.target.value)} error={formValidation.getFieldErrors('direccion', validators)[0]} placeholder="Ej: Av. Los Pinos 123, Urbanización..." leftIcon={<Navigation />} required />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Select
                      label="Departamento"
                      value={datosFormulario.codigoDepartamento}
                      onChange={(e) => {
                        const selected = departamentos.find(d => d.codigo === e.target.value);
                        setDepartamento(selected || null);
                      }}
                      options={[
                        { value: '', label: 'Seleccione un departamento' },
                        ...departamentos.map(dep => ({
                          value: dep.codigo,
                          label: dep.nombre
                        })),

                        ...(datosFormulario.codigoDepartamento && 
                            !departamentos.find(d => d.codigo === datosFormulario.codigoDepartamento) && 
                            datosFormulario.departamento
                          ? [{ value: datosFormulario.codigoDepartamento, label: datosFormulario.departamento }]
                          : [])
                      ]}
                      required
                      disabled={isLoadingUbigeo}
                      error={formValidation.getFieldErrors('departamento', validators)[0]}
                    />

                    <Select
                      label="Provincia"
                      value={datosFormulario.codigoProvincia}
                      onChange={(e) => {
                        const selected = provincias.find(p => p.codigo === e.target.value);
                        setProvincia(selected || null);
                      }}
                      options={[
                        { value: '', label: 'Seleccione una provincia' },
                        ...provincias.map(prov => ({
                          value: prov.codigo,
                          label: prov.nombre
                        })),

                        ...(datosFormulario.codigoProvincia && 
                            !provincias.find(p => p.codigo === datosFormulario.codigoProvincia) && 
                            datosFormulario.provincia
                          ? [{ value: datosFormulario.codigoProvincia, label: datosFormulario.provincia }]
                          : [])
                      ]}
                      required
                      disabled={!datosFormulario.codigoDepartamento || isLoadingUbigeo}
                      error={formValidation.getFieldErrors('provincia', validators)[0]}
                    />

                    <Select
                      label="Distrito"
                      value={datosFormulario.codigoDistrito}
                      onChange={(e) => {
                        const selected = distritos.find(d => d.codigo === e.target.value);
                        setDistrito(selected || null);
                      }}
                      options={[
                        { value: '', label: 'Seleccione un distrito' },
                        ...distritos.map(dist => ({
                          value: dist.codigo,
                          label: dist.nombre
                        })),

                        ...(datosFormulario.codigoDistrito && 
                            !distritos.find(d => d.codigo === datosFormulario.codigoDistrito) && 
                            datosFormulario.distrito
                          ? [{ value: datosFormulario.codigoDistrito, label: datosFormulario.distrito }]
                          : [])
                      ]}
                      required
                      disabled={!datosFormulario.codigoProvincia || isLoadingUbigeo}
                      error={formValidation.getFieldErrors('distrito', validators)[0]}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    <Input
                      label="Código Postal"
                      type="text"
                      value={datosFormulario.codigoPostal}
                      onChange={(e) => updateField('codigoPostal', e.target.value)}
                      placeholder="Ej: 15001"
                      leftIcon={<Hash />}
                      helperText="Opcional"
                      maxLength={10}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200"><div className="flex items-center gap-3"><div className="p-2 bg-purple-600 rounded-lg"><Phone className="w-5 h-5 text-white" /></div><div><h3 className="text-lg font-semibold text-gray-900">Información de Contacto</h3><p className="text-sm text-gray-600">Datos opcionales para comunicación</p></div></div></div>
                <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Input label="Teléfono" type="tel" value={datosFormulario.phone} onChange={(e) => updateField('phone', e.target.value)} error={formValidation.getFieldErrors('phone', validators)[0]} placeholder="Ej: +51 999 999 999" leftIcon={<Phone />} helperText="Opcional" /><Input label="Correo Electrónico" type="email" value={datosFormulario.email} onChange={(e) => updateField('email', e.target.value)} error={formValidation.getFieldErrors('email', validators)[0]} placeholder="Ej: establecimiento@empresa.com" leftIcon={<Mail />} helperText="Opcional" /></div></div>
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
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Activos</p><p className="text-2xl font-bold text-gray-900">{Establecimientos.filter(e => e.esActivo).length}</p></div><div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center"><MapPin className="w-6 h-6 text-green-600" /></div></div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500">Inactivos</p><p className="text-2xl font-bold text-gray-900">{Establecimientos.filter(e => !e.esActivo).length}</p></div><div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center"><MapPin className="w-6 h-6 text-red-600" /></div></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <Input type="text" placeholder="Buscar establecimientos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search />} />
              <Select value={filtroEstado} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')} size="medium" options={[{ value: 'all', label: 'Todos los estados' }, { value: 'active', label: 'Solo activos' }, { value: 'inactive', label: 'Solo inactivos' }]} />
            </div>
            <Button onClick={handleNew} variant="primary" size="md" icon={<Plus className="w-5 h-5" />} iconPosition="left" disabled={isFetching || isSaving || isDeleting}>Nuevo Establecimiento</Button>
          </div>

          

          {/* NUEVA SECCIÓN: EstablecimientoCard comparativa */}
          <div className="relative min-h-[400px]">
            {isFetching && (
              <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px]">
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
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || filtroEstado !== 'all' ? 'No se encontraron establecimientos' : 'No hay establecimientos registrados'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || filtroEstado !== 'all' ? 'Intenta cambiar los filtros de búsqueda' : 'Comienza registrando tu primer establecimiento'}
                </p>
                {(!searchTerm && filtroEstado === 'all') && (
                  <Button 
                    onClick={handleNew} 
                    variant="primary" 
                    size="md" 
                    icon={<Plus className="w-4 h-4" />} 
                    iconPosition="left"
                  >
                    Crear Primer Establecimiento
                  </Button>
                )}
              </div>
            ) : !apiError && !isFetching && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {listaVisual.map(est => (
                  <EstablecimientoCard
                    key={est.id}
                    dataFocus={`configuracion:establecimientos:${est.id}`}
                    establecimiento={{
                      id: est.id,
                      codigo: est.codigo,
                      nombre: est.nombre,
                      esActivo: est.esActivo,
                      direccion: est.direccion,
                      distrito: est.distrito,
                      provincia: est.provincia,
                      departamento: est.departamento
                    }}
                    onToggleActivo={(id) => handleToggleStatus(id)}
                    onEditar={(id) => {
                      console.log(est);
                      
                      const establecimiento = Establecimientos.find(e => e.id === id);
                      if (establecimiento) handleEdit(establecimiento);
                    }}
                    onEliminar={(id) => {
                      const establecimiento = Establecimientos.find(e => e.id === id);
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
