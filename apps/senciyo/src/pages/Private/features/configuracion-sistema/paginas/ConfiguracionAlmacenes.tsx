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
  Boxes as IconoAlmacen,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Button, Select, Input, PageHeader, Textarea, Breadcrumb } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { IndicadorEstado } from '../components/comunes/IndicadorEstado';
import type { Almacen } from '../modelos/Almacen';
import { obtenerUsuarioDesdeSesion, tienePermiso } from '../utilidades/permisos';

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
  prioridadSalida: number;
}

const FORM_STATE_INICIAL: FormState = {
  codigoAlmacen: '',
  nombreAlmacen: '',
  establecimientoId: '',
  descripcionAlmacen: '',
  ubicacionAlmacen: '',
  prioridadSalida: 1,
};

const ORDINAL_PRIORIDAD: Record<number, string> = {
  1: 'Primero',
  2: 'Segundo',
  3: 'Tercero',
  4: 'Cuarto',
  5: 'Quinto',
};
const labelPrioridad = (n: number | undefined): string =>
  n !== undefined ? (ORDINAL_PRIORIDAD[n] ?? `#${n}`) : '—';

export function ConfiguracionAlmacenes() {
  const navigate = useNavigate();
  const { state, dispatch, rolesConfigurados } = useConfigurationContext();
  const { session } = useUserSession();
  const { Establecimientos, almacenes } = state;
  const establecimientoId = session?.currentEstablecimientoId;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstablecimiento, setFilterEstablecimiento] = useState<string>('all');
  const [filtroEstado, setFilterStatus] = useState<filtroEstado>('all');
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingAlmacenId, setEditingAlmacenId] = useState<string | null>(null);
  const [datosFormulario, setFormData] = useState<FormState>({ ...FORM_STATE_INICIAL });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [editingInline, setEditingInline] = useState<{
    id: string;
    campo: 'nombre' | 'prioridad';
    valor: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>({
    isOpen: false,
    almacenId: null,
    nombreAlmacen: '',
    tieneMovimientosInventario: false,
  });

  const usuarioActual = useMemo(
    () => obtenerUsuarioDesdeSesion(state.users, session),
    [state.users, session]
  );

  const validarPermisoGestionAlmacenes = () => {
    if (!tienePermiso({
      usuario: usuarioActual,
      permisoId: 'config.almacenes.gestionar',
      rolesDisponibles: rolesConfigurados,
      establecimientoId,
    })) {
      showToast('error', 'No tienes permisos para gestionar almacenes.');
      return false;
    }
    return true;
  };

  const activeEstablecimientos = useMemo(
    () => Establecimientos.filter(
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
    active: almacenes.filter(a => a.estaActivoAlmacen).length,
    inactive: almacenes.filter(a => !a.estaActivoAlmacen).length,
    withMovements: almacenes.filter(a => a.tieneMovimientosInventario).length,
  }), [almacenes]);

  const maxPrioridadFormulario = useMemo(() => {
    if (!editingAlmacenId || !datosFormulario.establecimientoId) return 1;
    return Math.max(
      1,
      almacenes.filter(
        a => a.establecimientoId === datosFormulario.establecimientoId && a.estaActivoAlmacen
      ).length
    );
  }, [almacenes, editingAlmacenId, datosFormulario.establecimientoId]);

  const almacenEditadoEsActivo = useMemo(
    () => !!editingAlmacenId && (almacenes.find(a => a.id === editingAlmacenId)?.estaActivoAlmacen ?? false),
    [almacenes, editingAlmacenId]
  );

  const showToast = (type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const generateUniqueId = () => `alm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const calcularSiguienteNumero = (estId: string): number => {
    const existentes = almacenes.filter(a => a.establecimientoId === estId);
    if (existentes.length === 0) return 1;
    const nums = existentes
      .map(a => { const m = a.codigoAlmacen.match(/\d+/); return m ? parseInt(m[0], 10) : 0; })
      .filter(n => n > 0);
    return nums.length > 0 ? Math.max(...nums) + 1 : 1;
  };

  const generarSiguienteCodigo = (estId: string): string =>
    String(calcularSiguienteNumero(estId)).padStart(4, '0');

  const generarSiguienteNombre = (estId: string): string =>
    `Almacén ${calcularSiguienteNumero(estId)}`;

  const rebalanciarPrioridades = (
    todos: Almacen[],
    targetId: string,
    nuevaPrioridad: number
  ): Almacen[] => {
    const target = todos.find(a => a.id === targetId);
    if (!target) return todos;
    const estId = target.establecimientoId;
    const activos = todos.filter(a => a.establecimientoId === estId && a.estaActivoAlmacen);
    const p = Math.max(1, Math.min(nuevaPrioridad, activos.length));
    const others = activos
      .filter(a => a.id !== targetId)
      .sort((a, b) => (a.prioridadSalida ?? 999) - (b.prioridadSalida ?? 999));
    const reordenados = [...others.slice(0, p - 1), target, ...others.slice(p - 1)];
    const mapa = new Map<string, number>();
    reordenados.forEach((a, i) => mapa.set(a.id, i + 1));
    return todos.map(a => {
      if (!mapa.has(a.id)) return a;
      const pr = mapa.get(a.id)!;
      return { ...a, prioridadSalida: pr, esAlmacenPrincipal: pr === 1, actualizadoElAlmacen: new Date() };
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!datosFormulario.codigoAlmacen.trim()) {
      errors.codigoAlmacen = 'El código es obligatorio';
    } else if (datosFormulario.codigoAlmacen.length > 4) {
      errors.codigoAlmacen = 'El código no puede tener más de 4 caracteres';
    } else {
      const isDuplicate = almacenes.some(
        a =>
          a.codigoAlmacen === datosFormulario.codigoAlmacen &&
          a.establecimientoId === datosFormulario.establecimientoId &&
          a.id !== editingAlmacenId
      );
      if (isDuplicate) errors.codigoAlmacen = 'Ya existe un almacén con este código en el establecimiento';
    }

    if (!datosFormulario.nombreAlmacen.trim()) errors.nombreAlmacen = 'El nombre es obligatorio';
    if (!datosFormulario.establecimientoId) errors.establecimientoId = 'Debe seleccionar un establecimiento';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAgregarAlmacen = () => {
    if (!validarPermisoGestionAlmacenes()) return;
    if (activeEstablecimientos.length === 0) {
      showToast('warning', 'No hay establecimientos activos. Configura uno primero.');
      return;
    }

    let estId: string;
    if (activeEstablecimientos.length === 1) {
      estId = activeEstablecimientos[0].id;
    } else if (filterEstablecimiento !== 'all') {
      estId = filterEstablecimiento;
    } else {
      showToast('warning', 'Selecciona un establecimiento en el filtro para agregar un almacén.');
      return;
    }

    const selectedEst = Establecimientos.find(e => e.id === estId);
    const codigo = generarSiguienteCodigo(estId);
    const nombre = generarSiguienteNombre(estId);
    const prioridad = almacenes.filter(a => a.establecimientoId === estId && a.estaActivoAlmacen).length + 1;

    const nuevoAlmacen: Almacen = {
      id: generateUniqueId(),
      codigoAlmacen: codigo,
      nombreAlmacen: nombre,
      establecimientoId: estId,
      nombreEstablecimientoDesnormalizado: selectedEst?.nombreEstablecimiento,
      codigoEstablecimientoDesnormalizado: selectedEst?.codigoEstablecimiento,
      estaActivoAlmacen: true,
      esAlmacenPrincipal: prioridad === 1,
      prioridadSalida: prioridad,
      configuracionInventarioAlmacen: {
        permiteStockNegativoAlmacen: false,
        controlEstrictoStock: false,
        requiereAprobacionMovimientos: false,
      },
      creadoElAlmacen: new Date(),
      actualizadoElAlmacen: new Date(),
      tieneMovimientosInventario: false,
    };

    dispatch({ type: 'SET_ALMACENES', payload: [...almacenes, nuevoAlmacen] });
    if (viewMode !== 'list') setViewMode('list');
    setEditingInline({ id: nuevoAlmacen.id, campo: 'nombre', valor: nombre });
    showToast('success', `Almacén ${codigo} creado`);
  };

  const handleEdit = (almacen: Almacen) => {
    if (!validarPermisoGestionAlmacenes()) return;
    setFormData({
      codigoAlmacen: almacen.codigoAlmacen,
      nombreAlmacen: almacen.nombreAlmacen,
      establecimientoId: almacen.establecimientoId,
      descripcionAlmacen: almacen.descripcionAlmacen || '',
      ubicacionAlmacen: almacen.ubicacionAlmacen || '',
      prioridadSalida: almacen.prioridadSalida ?? 1,
    });
    setEditingAlmacenId(almacen.id);
    setFormErrors({});
    setShowForm(true);
  };

  const handleEstablecimientoChange = (estId: string) => {
    setFormData(prev => ({ ...prev, establecimientoId: estId }));
    if (formErrors.establecimientoId) setFormErrors(prev => ({ ...prev, establecimientoId: '' }));
  };

  const manejarEnvio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarPermisoGestionAlmacenes() || !validateForm() || !editingAlmacenId) return;

    const selectedEst = Establecimientos.find(est => est.id === datosFormulario.establecimientoId);
    const conCambiosBase = almacenes.map(a =>
      a.id === editingAlmacenId
        ? {
            ...a,
            codigoAlmacen: datosFormulario.codigoAlmacen,
            nombreAlmacen: datosFormulario.nombreAlmacen,
            establecimientoId: datosFormulario.establecimientoId,
            nombreEstablecimientoDesnormalizado: selectedEst?.nombreEstablecimiento,
            codigoEstablecimientoDesnormalizado: selectedEst?.codigoEstablecimiento,
            descripcionAlmacen: datosFormulario.descripcionAlmacen || undefined,
            ubicacionAlmacen: datosFormulario.ubicacionAlmacen || undefined,
            actualizadoElAlmacen: new Date(),
          }
        : a
    );
    const payload = almacenEditadoEsActivo
      ? rebalanciarPrioridades(conCambiosBase, editingAlmacenId, datosFormulario.prioridadSalida)
      : conCambiosBase;

    dispatch({ type: 'SET_ALMACENES', payload });
    showToast('success', 'Almacén actualizado correctamente');
    handleCancel();
  };

  const handleCancel = () => {
    setFormData({ ...FORM_STATE_INICIAL });
    setEditingAlmacenId(null);
    setFormErrors({});
    setShowForm(false);
  };

  const handleInlineNombreSave = (id: string) => {
    if (!editingInline || editingInline.id !== id || editingInline.campo !== 'nombre') return;
    const valor = editingInline.valor.trim();
    if (!valor) { setEditingInline(null); return; }
    const updated = almacenes.map(a =>
      a.id === id ? { ...a, nombreAlmacen: valor, actualizadoElAlmacen: new Date() } : a
    );
    dispatch({ type: 'SET_ALMACENES', payload: updated });
    setEditingInline(null);
  };

  const handleInlinePrioridadSave = (id: string) => {
    if (!editingInline || editingInline.id !== id || editingInline.campo !== 'prioridad') return;
    const num = parseInt(editingInline.valor, 10);
    setEditingInline(null);
    if (isNaN(num) || num < 1) return;
    const almacen = almacenes.find(a => a.id === id);
    if (!almacen?.estaActivoAlmacen) return;
    dispatch({ type: 'SET_ALMACENES', payload: rebalanciarPrioridades(almacenes, id, num) });
  };

  const openDeleteConfirmation = (almacen: Almacen) => {
    setDeleteConfirmation({
      isOpen: true,
      almacenId: almacen.id,
      nombreAlmacen: almacen.nombreAlmacen,
      tieneMovimientosInventario: almacen.tieneMovimientosInventario || false,
    });
  };

  const handleDelete = () => {
    if (!deleteConfirmation.almacenId || !validarPermisoGestionAlmacenes()) return;

    if (deleteConfirmation.tieneMovimientosInventario) {
      showToast('error', 'No se puede eliminar: el almacén tiene movimientos. Deshabilitalo en su lugar.');
      setDeleteConfirmation({ isOpen: false, almacenId: null, nombreAlmacen: '', tieneMovimientosInventario: false });
      return;
    }

    const updatedAlmacenes = almacenes.filter(a => a.id !== deleteConfirmation.almacenId);
    dispatch({ type: 'SET_ALMACENES', payload: updatedAlmacenes });
    showToast('success', 'Almacén eliminado');
    setDeleteConfirmation({ isOpen: false, almacenId: null, nombreAlmacen: '', tieneMovimientosInventario: false });
  };

  const handleToggleStatus = (id: string) => {
    const almacen = almacenes.find(a => a.id === id);
    if (!almacen || !validarPermisoGestionAlmacenes()) return;

    if (almacen.estaActivoAlmacen) {
      const otrosActivos = almacenes.filter(
        a => a.establecimientoId === almacen.establecimientoId && a.estaActivoAlmacen && a.id !== id
      );
      if (otrosActivos.length === 0) {
        showToast('warning', 'No se puede deshabilitar el único almacén activo del establecimiento.');
        return;
      }
      const sortedOthers = [...otrosActivos].sort(
        (a, b) => (a.prioridadSalida ?? 999) - (b.prioridadSalida ?? 999)
      );
      const mapaP = new Map<string, number>();
      sortedOthers.forEach((a, i) => mapaP.set(a.id, i + 1));
      const updated = almacenes.map(a => {
        if (a.id === id) return { ...a, estaActivoAlmacen: false, actualizadoElAlmacen: new Date() };
        if (mapaP.has(a.id)) {
          const pr = mapaP.get(a.id)!;
          return { ...a, prioridadSalida: pr, esAlmacenPrincipal: pr === 1, actualizadoElAlmacen: new Date() };
        }
        return a;
      });
      dispatch({ type: 'SET_ALMACENES', payload: updated });
      showToast('success', 'Almacén deshabilitado');
    } else {
      const activosEst = almacenes.filter(
        a => a.establecimientoId === almacen.establecimientoId && a.estaActivoAlmacen
      );
      const nuevaPrioridad = activosEst.length + 1;
      const updated = almacenes.map(a =>
        a.id === id
          ? { ...a, estaActivoAlmacen: true, prioridadSalida: nuevaPrioridad, esAlmacenPrincipal: nuevaPrioridad === 1, actualizadoElAlmacen: new Date() }
          : a
      );
      dispatch({ type: 'SET_ALMACENES', payload: updated });
      showToast('success', 'Almacén habilitado');
    }
  };

  const renderToasts = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 min-w-[300px] px-4 py-3 rounded-lg shadow-lg ${
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
  );

  if (showForm) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title="Editar Almacén"
          breadcrumb={
            <Breadcrumb
              items={[
                { label: 'Configuración', href: '#', onClick: () => navigate('/configuracion') },
                { label: 'Almacenes', href: '#', onClick: () => setShowForm(false) },
                { label: 'Editar Almacén' },
              ]}
            />
          }
          actions={
            <Button variant="secondary" icon={<ArrowLeft />} onClick={handleCancel}>
              Volver
            </Button>
          }
        />
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {renderToasts()}
            <form onSubmit={manejarEnvio} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <IconoAlmacen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Información del Almacén</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Datos principales del almacén</p>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800 ml-auto">
                      <IconoAlmacen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                        Código: {datosFormulario.codigoAlmacen}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  <Select
                    label="Establecimiento"
                    value={datosFormulario.establecimientoId}
                    onChange={e => handleEstablecimientoChange(e.target.value)}
                    required
                    error={formErrors.establecimientoId}
                    helperText="El almacén pertenece a este establecimiento"
                    options={[
                      { value: '', label: 'Seleccionar establecimiento...' },
                      ...activeEstablecimientos.map(est => ({
                        value: est.id,
                        label: `[${est.codigoEstablecimiento}] ${est.nombreEstablecimiento}`,
                      })),
                    ]}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <Input
                      label="Nombre"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Prioridad de salida"
                      value={String(datosFormulario.prioridadSalida)}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        prioridadSalida: parseInt(e.target.value, 10) || 1,
                      }))}
                      disabled={!almacenEditadoEsActivo}
                      helperText={
                        almacenEditadoEsActivo
                          ? 'Primero = mayor prioridad de descuento en ventas.'
                          : 'Solo aplica a almacenes activos.'
                      }
                      options={Array.from({ length: maxPrioridadFormulario }, (_, i) => i + 1).map(n => ({
                        value: String(n),
                        label: ORDINAL_PRIORIDAD[n] ?? `Prioridad ${n}`,
                      }))}
                    />
                    <Input
                      label="Ubicación Física"
                      type="text"
                      value={datosFormulario.ubicacionAlmacen}
                      onChange={e => setFormData(prev => ({ ...prev, ubicacionAlmacen: e.target.value }))}
                      placeholder="Ej: Piso 1 - Zona A"
                      helperText="Opcional"
                    />
                  </div>

                  <Textarea
                    label="Descripción"
                    value={datosFormulario.descripcionAlmacen}
                    onChange={e => setFormData(prev => ({ ...prev, descripcionAlmacen: e.target.value }))}
                    rows={3}
                    placeholder="Descripción adicional del almacén..."
                    helperText="Opcional"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  Los campos con <span className="text-red-500 font-medium">*</span> son obligatorios
                </p>
                <div className="flex gap-3">
                  <Button type="button" onClick={handleCancel} variant="secondary">Cancelar</Button>
                  <Button type="submit" variant="primary" icon={<CheckCircle />}>
                    Actualizar Almacén
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
        title="Configuración de Almacenes"
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>
            Volver
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 space-y-6 pb-12">
          {renderToasts()}

          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4 ${
                    deleteConfirmation.tieneMovimientosInventario
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    <AlertCircle className={`w-6 h-6 ${
                      deleteConfirmation.tieneMovimientosInventario
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                    {deleteConfirmation.tieneMovimientosInventario ? '¡Almacén con movimientos!' : '¿Eliminar almacén?'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    {deleteConfirmation.tieneMovimientosInventario ? (
                      <>
                        El almacén{' '}
                        <span className="font-semibold">"{deleteConfirmation.nombreAlmacen}"</span>{' '}
                        tiene movimientos y no puede eliminarse. Deshabilitalo en su lugar.
                      </>
                    ) : (
                      <>
                        ¿Eliminar{' '}
                        <span className="font-semibold">"{deleteConfirmation.nombreAlmacen}"</span>?
                        Esta acción no se puede deshacer.
                      </>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmation({
                        isOpen: false, almacenId: null, nombreAlmacen: '', tieneMovimientosInventario: false,
                      })}
                      className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                    >
                      {deleteConfirmation.tieneMovimientosInventario ? 'Entendido' : 'Cancelar'}
                    </button>
                    {!deleteConfirmation.tieneMovimientosInventario && (
                      <button
                        type="button"
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

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <IconoAlmacen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Activos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Inactivos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
                </div>
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Con movimientos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.withMovements}</p>
                </div>
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1">
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
                    label: `[${est.codigoEstablecimiento}] ${est.nombreEstablecimiento}`,
                  })),
                ]}
              />
              <Select
                value={filtroEstado}
                onChange={e => setFilterStatus(e.target.value as filtroEstado)}
                options={[
                  { value: 'all', label: 'Todos los estados' },
                  { value: 'active', label: 'Solo activos' },
                  { value: 'inactive', label: 'Solo inactivos' },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Vista lista"
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  title="Vista cards"
                  className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 transition-colors ${
                    viewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Cards
                </button>
              </div>

              <Button
                onClick={handleAgregarAlmacen}
                variant="primary"
                size="md"
                icon={<Plus className="w-5 h-5" />}
                iconPosition="left"
              >
                Agregar almacén
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {filteredAlmacenes.length === 0 ? (
              <div className="text-center py-12">
                <IconoAlmacen className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || filterEstablecimiento !== 'all' || filtroEstado !== 'all'
                    ? 'No se encontraron almacenes'
                    : 'No hay almacenes registrados'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || filterEstablecimiento !== 'all' || filtroEstado !== 'all'
                    ? 'Intenta cambiar los filtros de búsqueda'
                    : 'Agrega tu primer almacén con el botón de arriba'}
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-24">Código</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Nombre de almacén (editable)</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        Establecimiento
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-36">
                        Prioridad de salida
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-24">Estado</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAlmacenes.map(almacen => {
                      const isEditingNombre =
                        editingInline?.id === almacen.id && editingInline.campo === 'nombre';
                      const isEditingPrioridad =
                        editingInline?.id === almacen.id && editingInline.campo === 'prioridad';

                      return (
                        <tr
                          key={almacen.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                              {almacen.codigoAlmacen}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            {isEditingNombre ? (
                              <input
                                autoFocus
                                className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={editingInline.valor}
                                onChange={e =>
                                  setEditingInline(prev => prev ? { ...prev, valor: e.target.value } : null)
                                }
                                onBlur={() => handleInlineNombreSave(almacen.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlineNombreSave(almacen.id);
                                  if (e.key === 'Escape') setEditingInline(null);
                                }}
                              />
                            ) : (
                              <button
                                type="button"
                                className="text-left font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 w-full truncate"
                                onClick={() =>
                                  setEditingInline({
                                    id: almacen.id,
                                    campo: 'nombre',
                                    valor: almacen.nombreAlmacen,
                                  })
                                }
                                title="Clic para editar nombre"
                              >
                                {almacen.nombreAlmacen}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-mono">
                                [{almacen.codigoEstablecimientoDesnormalizado || '—'}]
                              </span>{' '}
                              {almacen.nombreEstablecimientoDesnormalizado || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isEditingPrioridad ? (
                              <select
                                autoFocus
                                className="px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={editingInline.valor}
                                onChange={e =>
                                  setEditingInline(prev => prev ? { ...prev, valor: e.target.value } : null)
                                }
                                onBlur={() => handleInlinePrioridadSave(almacen.id)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleInlinePrioridadSave(almacen.id);
                                  if (e.key === 'Escape') setEditingInline(null);
                                }}
                              >
                                {Array.from(
                                  { length: almacenes.filter(a => a.establecimientoId === almacen.establecimientoId && a.estaActivoAlmacen).length },
                                  (_, i) => i + 1,
                                ).map(n => (
                                  <option key={n} value={String(n)}>{ORDINAL_PRIORIDAD[n] ?? `#${n}`}</option>
                                ))}
                              </select>
                            ) : almacen.estaActivoAlmacen ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                onClick={() =>
                                  setEditingInline({
                                    id: almacen.id,
                                    campo: 'prioridad',
                                    valor: String(almacen.prioridadSalida ?? '1'),
                                  })
                                }
                                title="Clic para cambiar prioridad de salida"
                              >
                                {labelPrioridad(almacen.prioridadSalida)}
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {labelPrioridad(almacen.prioridadSalida)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <IndicadorEstado
                              status={almacen.estaActivoAlmacen ? 'success' : 'error'}
                              label={almacen.estaActivoAlmacen ? 'Activo' : 'Inactivo'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => handleEdit(almacen)}
                                variant="tertiary"
                                iconOnly
                                icon={<Edit />}
                                size="sm"
                                title="Editar detalles"
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
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAlmacenes.map(almacen => (
                  <div
                    key={almacen.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {almacen.nombreAlmacen}
                          </h3>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full font-mono">
                            {almacen.codigoAlmacen}
                          </span>
                          {almacen.prioridadSalida !== undefined && (
                            <span className="px-2 py-1 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 rounded-full">
                              {labelPrioridad(almacen.prioridadSalida)}
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
                            <Building className="w-4 h-4 shrink-0" />
                            <span className="font-medium">
                              [{almacen.codigoEstablecimientoDesnormalizado || 'N/D'}]{' '}
                              {almacen.nombreEstablecimientoDesnormalizado || 'Sin nombre'}
                            </span>
                          </p>
                          {almacen.ubicacionAlmacen && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <MapPin className="w-4 h-4 shrink-0" />
                              {almacen.ubicacionAlmacen}
                            </p>
                          )}
                          {almacen.descripcionAlmacen && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {almacen.descripcionAlmacen}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
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
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionAlmacenes;
