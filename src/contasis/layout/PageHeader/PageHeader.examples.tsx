import { PageHeader } from './PageHeader';
import { Breadcrumb } from '../Breadcrumb/Breadcrumb';
import { 
  Plus, 
  Filter, 
  Settings, 
  Maximize2, 
  RefreshCw,
  Download,
  Printer,
  Calendar
} from 'lucide-react';

/**
 * EJEMPLOS DE USO DEL PAGEHEADER
 * 
 * Estas son las variaciones más comunes que puedes usar en tus páginas.
 * Copia el código del ejemplo que necesites y pégalo en tu página.
 */

// ============================================================================
// VARIACIÓN 1: Solo Título (Caso más simple)
// ============================================================================
export const Example1_SoloTitulo = () => {
  return (
    <PageHeader 
      title="Comprobantes Electrónicos"
    />
  );
};

// ============================================================================
// VARIACIÓN 2: Título + Acciones
// ============================================================================
export const Example2_TituloConAcciones = () => {
  return (
    <PageHeader 
      title="Clientes"
      actions={
        <>
          <button className="btn btn-secondary btn-icon">
            <Filter className="w-5 h-5" />
          </button>
          <button className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Cliente
          </button>
        </>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 3: Breadcrumb + Título
// ============================================================================
export const Example3_ConBreadcrumb = () => {
  return (
    <PageHeader 
      breadcrumb={
        <Breadcrumb 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Facturación', href: '/facturacion' },
            { label: 'Comprobantes' }
          ]} 
        />
      }
      title="Comprobantes Electrónicos"
    />
  );
};

// ============================================================================
// VARIACIÓN 4: Completa (Breadcrumb + Título + Acciones)
// ============================================================================
export const Example4_Completa = () => {
  return (
    <PageHeader 
      breadcrumb={
        <Breadcrumb 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Facturación', href: '/facturacion' },
            { label: 'Nueva Emisión' }
          ]} 
        />
      }
      title="Nueva Emisión"
      actions={
        <>
          <button className="btn btn-secondary btn-icon" title="Maximizar">
            <Maximize2 className="w-5 h-5" />
          </button>
          <button className="btn btn-secondary btn-icon" title="Configuración">
            <Settings className="w-5 h-5" />
          </button>
        </>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 5: Título Personalizado con Badge
// ============================================================================
export const Example5_TituloPersonalizado = () => {
  return (
    <PageHeader 
      breadcrumb={
        <Breadcrumb 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Proyectos', href: '/proyectos' },
            { label: 'Desarrollo Web' }
          ]} 
        />
      }
      title={
        <div className="flex items-center gap-3">
          <h1 className="text-h3 font-poppins text-primary truncate">
            Proyecto: Sistema de Facturación
          </h1>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Activo
          </span>
          <span className="text-sm text-secondary">
            ID: #12345
          </span>
        </div>
      }
      actions={
        <>
          <button className="btn btn-secondary">
            Compartir
          </button>
          <button className="btn btn-primary">
            Editar Proyecto
          </button>
        </>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 6: Múltiples Acciones Agrupadas
// ============================================================================
export const Example6_MultipleAcciones = () => {
  return (
    <PageHeader 
      title="Reportes de Ventas"
      actions={
        <>
          {/* Grupo de iconos */}
          <button className="btn btn-secondary btn-icon" title="Actualizar">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="btn btn-secondary btn-icon" title="Descargar">
            <Download className="w-5 h-5" />
          </button>
          <button className="btn btn-secondary btn-icon" title="Imprimir">
            <Printer className="w-5 h-5" />
          </button>
          {/* Separador visual */}
          <div className="w-px h-6 bg-border-default mx-1" />
          {/* Botones principales */}
          <button className="btn btn-secondary">
            Exportar
          </button>
          <button className="btn btn-primary">
            Generar Reporte
          </button>
        </>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 7: Título Largo (Prueba de truncate)
// ============================================================================
export const Example7_TituloLargo = () => {
  return (
    <PageHeader 
      breadcrumb={
        <Breadcrumb 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Administración', href: '/admin' },
            { label: 'Configuración' }
          ]} 
        />
      }
      title="Configuración Avanzada del Sistema de Gestión Empresarial Integrado con Módulos de Facturación Electrónica"
      actions={
        <>
          <button className="btn btn-secondary">
            Cancelar
          </button>
          <button className="btn btn-primary">
            Guardar Cambios
          </button>
        </>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 8: Título con Subtítulo/Descripción
// ============================================================================
export const Example8_ConSubtitulo = () => {
  return (
    <PageHeader 
      title={
        <div className="flex flex-col gap-1">
          <h1 className="text-h3 font-poppins text-primary truncate">
            Dashboard Analytics
          </h1>
          <p className="text-sm text-secondary">
            Resumen de métricas y KPIs del último mes
          </p>
        </div>
      }
      actions={
        <button className="btn btn-secondary">
          <Calendar className="w-5 h-5 mr-2" />
          Cambiar Período
        </button>
      }
    />
  );
};

// ============================================================================
// VARIACIÓN 9: Minimal (Solo título, sin breadcrumb ni acciones)
// ============================================================================
export const Example9_Minimal = () => {
  return (
    <PageHeader 
      title="Ayuda y Soporte"
    />
  );
};

// ============================================================================
// EJEMPLO DE USO REAL EN UNA PÁGINA
// ============================================================================

/**
 * Ejemplo de cómo usar PageHeader en una página real de tu aplicación
 */
export const ClientesPage = () => {
  const handleNuevoCliente = () => {
    console.log('Crear nuevo cliente');
  };

  const handleFiltrar = () => {
    console.log('Abrir filtros');
  };

  return (
    <div className="h-screen flex flex-col">
      {/* PageHeader */}
      <PageHeader 
        breadcrumb={
          <Breadcrumb 
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'CRM', href: '/crm' },
              { label: 'Clientes' }
            ]} 
          />
        }
        title="Gestión de Clientes"
        actions={
          <>
            <button 
              className="btn btn-secondary btn-icon"
              onClick={handleFiltrar}
              title="Filtros"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleNuevoCliente}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Cliente
            </button>
          </>
        }
      />

      {/* Contenido de la página */}
      <div className="flex-1 overflow-auto p-6">
        {/* Aquí va el contenido de tu página */}
        <p>Lista de clientes, tablas, etc...</p>
      </div>
    </div>
  );
};

// ============================================================================
// OTRO EJEMPLO: Página de Facturación
// ============================================================================

export const FacturacionPage = () => {
  return (
    <div className="h-screen flex flex-col">
      <PageHeader 
        breadcrumb={
          <Breadcrumb 
            items={[
              { label: 'Inicio', href: '/' },
              { label: 'Facturación', href: '/facturacion' },
              { label: 'Nueva Factura' }
            ]} 
          />
        }
        title={
          <div className="flex items-center gap-3">
            <h1 className="text-h3 font-poppins text-primary">
              Nueva Factura Electrónica
            </h1>
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
              Borrador
            </span>
          </div>
        }
        actions={
          <>
            <button className="btn btn-secondary btn-icon">
              <Maximize2 className="w-5 h-5" />
            </button>
            <button className="btn btn-secondary btn-icon">
              <Settings className="w-5 h-5" />
            </button>
            <button className="btn btn-secondary">
              Guardar Borrador
            </button>
            <button className="btn btn-primary">
              Emitir Factura
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Formulario de facturación */}
      </div>
    </div>
  );
};
