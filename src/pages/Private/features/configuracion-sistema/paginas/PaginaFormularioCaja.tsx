// CajaFormPage - Create or Edit a caja
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader, Button } from '@/contasis';
import { FormularioCaja } from '../components/cajas/FormularioCaja';
import { useCajas } from '../hooks/useCajas';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { useToast } from '../../comprobantes-electronicos/shared/ui/Toast/useToast';
import { ToastContainer } from '../../comprobantes-electronicos/shared/ui/Toast/ToastContainer';
import type { CreateCajaInput, UpdateCajaInput } from '../modelos/Caja';

export function CajaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const { toasts, success, error: showError, removeToast } = useToast();

  const { state } = useConfigurationContext();
  const { session } = useUserSession();
  
  const empresaId = session?.currentCompanyId || '';
  const establecimientoId = session?.currentEstablecimientoId || '';
  
  const {
    getCaja,
    createCaja,
    updateCaja,
    loading
  } = useCajas(empresaId, establecimientoId);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const currentCaja = isEditing && id ? getCaja(id) : undefined;

  // Redirect if editing and caja not found
  useEffect(() => {
    if (isEditing && !loading && !currentCaja) {
      navigate('/configuracion/cajas');
    }
  }, [isEditing, loading, currentCaja, navigate]);

  const manejarEnvio = async (data: CreateCajaInput | UpdateCajaInput) => {
    setSubmitError(null);

    try {
      if (isEditing && id) {
        await updateCaja(id, data as UpdateCajaInput);
        success('Caja actualizada', 'La caja ha sido actualizada exitosamente.');
      } else {
        await createCaja(data as CreateCajaInput);
        success('Caja creada', 'La caja ha sido creada exitosamente.');
      }
      // Small delay to show toast before navigating
      setTimeout(() => navigate('/configuracion/cajas'), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar la caja';
      setSubmitError(message);
      showError('Error', message);
    }
  };

  const handleCancel = () => {
    navigate('/configuracion/cajas');
  };

  if (loading && isEditing) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Cargando..."
          breadcrumb={
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Cajas
            </button>
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
          <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando caja...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title={isEditing ? 'Editar Caja' : 'Nueva Caja'}
        breadcrumb={
          <button
            onClick={() => navigate('/configuracion/cajas')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Cajas
          </button>
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
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Error Banner */}
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{submitError}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {isEditing ? 'Editar Caja' : 'Crear Nueva Caja'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isEditing 
                ? 'Modifica los datos de la caja existente' 
                : 'Completa los datos para crear una nueva caja'}
            </p>
          </div>

          <FormularioCaja
            initialData={currentCaja ? {
              id: currentCaja.id,
              establecimientoIdCaja: currentCaja.establecimientoIdCaja,
              nombreCaja: currentCaja.nombreCaja,
              monedaIdCaja: currentCaja.monedaIdCaja,
              mediosPagoPermitidos: currentCaja.mediosPagoPermitidos,
              limiteMaximoCaja: currentCaja.limiteMaximoCaja,
              margenDescuadreCaja: currentCaja.margenDescuadreCaja,
              habilitadaCaja: currentCaja.habilitadaCaja,
              usuariosAutorizadosCaja: currentCaja.usuariosAutorizadosCaja,
              dispositivosCaja: currentCaja.dispositivosCaja,
              observacionesCaja: currentCaja.observacionesCaja
            } : undefined}
            currencies={state.currencies}
            Establecimientos={state.Establecimientos}
            defaultEstablecimientoId={establecimientoId}
            onSubmit={manejarEnvio}
            onCancel={handleCancel}
            isEditing={isEditing}
          />
        </div>
      </div>
      </div>
      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

