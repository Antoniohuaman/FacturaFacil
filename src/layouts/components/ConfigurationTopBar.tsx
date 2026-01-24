import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/contasis';
import type { TopBarProps } from '@/contasis';
import { useUserSession } from '../../contexts/UserSessionContext';
import { useCaja } from '../../pages/Private/features/control-caja/context/CajaContext';
import { useContasisDatasets } from '../../pages/Private/components/AppSearchBar/useContasisDatasets';

interface ConfigurationTopBarProps {
  onToggleSidebar: () => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
}

export default function ConfigurationTopBar({
  onToggleSidebar,
  onToggleTheme,
  theme = 'light'
}: ConfigurationTopBarProps) {
  const navigate = useNavigate();
  const { session } = useUserSession();
  const { status, aperturaActual, getResumen } = useCaja();
  const { datasets, handleSearchSelect } = useContasisDatasets();

  // Adaptar datos del proyecto al formato esperado por TopBar
  const empresas = [{
    id: session?.currentCompanyId || '1',
    nombre: session?.currentCompany?.razonSocial || session?.currentCompany?.nombreComercial || 'Mi Empresa',
    ruc: session?.currentCompany?.ruc || '',
    logo: undefined,
    activa: true
  }];

  const sedes = [{
    id: session?.currentEstablecimientoId || '1',
    nombre: session?.currentEstablecimiento?.nombre || 'Sede Principal',
    direccion: session?.currentEstablecimiento?.direccion || '',
    empresaId: session?.currentCompanyId || '1'
  }];

  // Datos de caja si está abierta o cerrada  
  const cajaData = status === 'abierta' ? {
    numero: '001', // TODO: obtener número real de caja
    abierta: true,
    apertura: {
      fecha: aperturaActual?.fechaHoraApertura ? new Date(aperturaActual.fechaHoraApertura) : new Date(),
      hora: aperturaActual?.fechaHoraApertura ? 
        new Date(aperturaActual.fechaHoraApertura).toLocaleTimeString('es-PE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : 'N/A',
      usuario: aperturaActual?.usuarioNombre || session?.userName || 'Usuario',
    },
    montos: {
      efectivo: getResumen().totalEfectivo || 0,
      tarjetas: getResumen().totalTarjeta || 0,
      digital: getResumen().totalYape + getResumen().totalOtros || 0,
    }
  } : status === 'cerrada' ? {
    numero: '001', // TODO: obtener número real de caja
    abierta: false,
    apertura: {
      fecha: new Date(),
      hora: 'Cerrada',
      usuario: session?.userName || 'Usuario',
    },
    montos: {
      efectivo: 0,
      tarjetas: 0,
      digital: 0,
    }
  } : undefined;

  // Datos de usuario
  const userData = {
    name: session?.userName || 'Usuario',
    email: session?.userEmail || '',
    role: session?.role || 'Usuario',
    avatar: '/perfil.jpg'
  };

  const topBarProps: TopBarProps = {
    onToggleSidebar,
    onToggleTheme,
    theme,
    showCaja: status === 'abierta' || status === 'cerrada',
    empresas,
    sedes,
    initialEmpresaId: session?.currentCompanyId || '1',
    initialSedeId: session?.currentEstablecimientoId || '1',
    cajaData,
    user: userData,
    onChangeEmpresa: (empresaId) => {
      // TODO: Implementar cambio de empresa
      console.log('Cambiar empresa:', empresaId);
    },
    onChangeSede: (sedeId) => {
      // TODO: Implementar cambio de sede
      console.log('Cambiar sede:', sedeId);
    },
    onCrearDocumento: (tipo) => {
      switch (tipo) {
        case 'factura':
          navigate('/comprobantes/emision?tipo=factura');
          break;
        case 'boleta':
          navigate('/comprobantes/emision?tipo=boleta');
          break;
        case 'nota-credito':
          navigate('/comprobantes/emision?tipo=nota-credito');
          break;
        case 'nota-debito':
          navigate('/comprobantes/emision?tipo=nota-debito');
          break;
        default:
          navigate('/comprobantes/emision');
      }
    },
    onCrearCliente: () => {
      navigate('/clientes?action=new');
    },
    onCrearProducto: () => {
      navigate('/catalogo?action=new');
    },
    onVerMovimientosCaja: () => {
      navigate('/control-caja?tab=movimientos');
    },
    onCerrarCaja: () => {
      navigate('/control-caja?tab=cierre');
    },
    searchDatasets: datasets,
    onSearchSelect: handleSearchSelect,
  };

  return <TopBar {...topBarProps} />;
}