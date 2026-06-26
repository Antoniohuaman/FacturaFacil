import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { PageHeader, Button } from '@/contasis';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { useUserSession } from '../../../../../contexts/UserSessionContext';
import { NotificationProvider } from '../components/compartido/SistemaNotificaciones';
import { TarjetaConfiguracion } from '../components/comunes/TarjetaConfiguracion';
import { FormularioAccesoSOL } from '../components/conexion-sunat/FormularioAccesoSOL';
import { FormularioCredencialesGRE } from '../components/conexion-sunat/FormularioCredencialesGRE';
import { conexionSunatDataSource } from '../api/fuenteDatosConexionSunat';

type TabConexion = 'sol' | 'gre';

const TABS: Array<{ id: TabConexion; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'sol', label: 'Acceso SOL', icon: KeyRound },
  { id: 'gre', label: 'Credenciales GRE', icon: ShieldCheck },
];

function ConfiguracionConexionSunatContent() {
  const navigate = useNavigate();
  const { state } = useConfigurationContext();
  const { session } = useUserSession();
  const [tabActivo, setTabActivo] = useState<TabConexion>('sol');

  const empresaId = session?.currentCompanyId ?? '';

  if (!state.company) {
    return (
      <div className="flex-1 bg-gray-50">
        <PageHeader
          title="Conexión SUNAT"
          actions={
            <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>
              Volver
            </Button>
          }
        />
        <div className="max-w-3xl mx-auto p-6">
          <p className="text-sm text-gray-500">Configura los datos de empresa antes de gestionar la conexión SUNAT.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <PageHeader
        title="Conexión SUNAT"
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate('/configuracion')}>
            Volver
          </Button>
        }
      />

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <TarjetaConfiguracion
          title="Conexión SUNAT"
          description="Credenciales de acceso para los servicios electrónicos de SUNAT. Almacenadas localmente en este dispositivo."
          icon={ShieldCheck}
        >
          {/* Tabs */}
          <div className="border-b border-gray-200 -mx-4 px-4 mb-4">
            <nav className="flex gap-x-1">
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

          {tabActivo === 'sol' && (
            <FormularioAccesoSOL empresaId={empresaId} datasource={conexionSunatDataSource} />
          )}
          {tabActivo === 'gre' && (
            <FormularioCredencialesGRE empresaId={empresaId} datasource={conexionSunatDataSource} />
          )}
        </TarjetaConfiguracion>
      </div>
    </div>
  );
}

export function ConfiguracionConexionSunat() {
  return (
    <NotificationProvider>
      <ConfiguracionConexionSunatContent />
    </NotificationProvider>
  );
}
