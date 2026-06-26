import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Truck, Layers, BookOpen } from 'lucide-react';
import { PageHeader, Button } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { NotificationProvider } from '../components/compartido/SistemaNotificaciones';
import { TarjetaConfiguracion } from '../components/comunes/TarjetaConfiguracion';
import { SeccionDatosTransportista } from '../components/transporte/SeccionDatosTransportista';
import { TablaConductores } from '../components/transporte/TablaConductores';
import { TablaVehiculos } from '../components/transporte/TablaVehiculos';
import { SeccionCatalogosGRE } from '../components/catalogos-gre/SeccionCatalogosGRE';
import {
  conductoresDataSource,
  vehiculosDataSource,
  datosTransportistaDataSource,
} from '../api/fuenteDatosTransporte';

type TabTransporte = 'transportista' | 'conductores' | 'vehiculos' | 'catalogos';

const TABS: Array<{ id: TabTransporte; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'transportista', label: 'Datos del transportista', icon: Layers },
  { id: 'conductores', label: 'Conductores', icon: User },
  { id: 'vehiculos', label: 'Vehículos', icon: Truck },
  { id: 'catalogos', label: 'Catálogos SUNAT', icon: BookOpen },
];

function ConfiguracionTransporteContent() {
  const navigate = useNavigate();
  const { state } = useConfigurationContext();
  const { session } = useUserSession();
  const [tabActivo, setTabActivo] = useState<TabTransporte>('transportista');

  const empresaId = session?.currentCompanyId ?? '';

  if (!state.company) {
    return (
      <div className="flex-1 bg-gray-50">
        <PageHeader
          title="Configuración de Transporte"
          actions={
            <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>
              Volver
            </Button>
          }
        />
        <div className="w-full px-4 sm:px-6 py-6">
          <p className="text-sm text-gray-500">Configura los datos de empresa antes de gestionar el transporte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <PageHeader
        title="Configuración de Transporte"
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>
            Volver
          </Button>
        }
      />

      <div className="w-full px-4 sm:px-6 py-4 sm:py-6 space-y-6">
        <TarjetaConfiguracion
          title="Transporte"
          description="Configura los datos del transportista, conductores y vehículos que participan en los traslados de mercancía."
          icon={Truck}
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 -mx-4 px-4 mb-5">
            <nav className="flex gap-x-1 overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => {
                const activo = tabActivo === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTabActivo(id)}
                    className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 text-xs font-medium whitespace-nowrap transition-colors ${
                      activo
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${activo ? 'text-blue-600' : 'text-gray-400'}`} />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          {tabActivo === 'transportista' && (
            <SeccionDatosTransportista
              empresa={state.company}
              datasource={datosTransportistaDataSource}
            />
          )}
          {tabActivo === 'conductores' && (
            <TablaConductores
              empresaId={empresaId}
              datasource={conductoresDataSource}
              vehiculosDataSource={vehiculosDataSource}
            />
          )}
          {tabActivo === 'vehiculos' && (
            <TablaVehiculos
              empresaId={empresaId}
              datasource={vehiculosDataSource}
              conductoresDataSource={conductoresDataSource}
            />
          )}
          {tabActivo === 'catalogos' && <SeccionCatalogosGRE />}
        </TarjetaConfiguracion>
      </div>
    </div>
  );
}

export function ConfiguracionTransporte() {
  return (
    <NotificationProvider>
      <ConfiguracionTransporteContent />
    </NotificationProvider>
  );
}
