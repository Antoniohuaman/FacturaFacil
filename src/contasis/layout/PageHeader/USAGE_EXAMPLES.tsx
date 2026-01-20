/**
 * GUÍA DE USO: PageHeader y Toolbar
 * 
 * Arquitectura recomendada:
 * 
 * 📍 En el archivo de la página o del módulo:
 * - Define QUÉ botones hay
 * - Define QUÉ filtros hay  
 * - Define QUÉ acciones existen
 * 
 * ✅ La página usa PageHeader/Toolbar base y les pasa el contenido
 * ✅ PageHeader/Toolbar NO importan el contenido
 * ✅ El contenido se les pasa como props (composition pattern)
 */

import React, { useState } from 'react';
import { 
  PageHeader, 
  Toolbar, 
  Button, 
  ToggleButton,
  Search,
  SegmentedControl 
} from '@contasis/ui';
import { 
  Filter, 
  RefreshCw, 
  Columns, 
  Maximize2, 
  Settings,
  Download,
  LayoutGrid,
  List,
  Star
} from 'lucide-react';

// ============================================================================
// EJEMPLO 1: Módulo de Comprobantes Electrónicos
// ============================================================================
export const ComprobantesPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* PageHeader: Solo título y acciones de layout */}
      <PageHeader
        title="Comprobantes Electrónicos"
        actions={
          <>
            <Button 
              iconOnly 
              icon={<Maximize2 />} 
              variant="secondary"
              onClick={() => setIsFullscreen(!isFullscreen)}
            />
            <Button 
              iconOnly 
              icon={<Settings />} 
              variant="secondary"
            />
          </>
        }
      />

      {/* Toolbar: Filtros a la izquierda, acciones a la derecha */}
      <Toolbar
        leftContent={
          <>
            <ToggleButton
              value="filter"
              activeValue={showFilters ? 'filter' : ''}
              icon={<Filter />}
              label="Filtrar"
              iconOnly
              onChange={() => setShowFilters(!showFilters)}
            />
            <Button 
              icon={<RefreshCw />} 
              variant="secondary" 
              iconOnly
            />
            <ToggleButton
              value="columns"
              activeValue={showColumns ? 'columns' : ''}
              icon={<Columns />}
              label="Columnas"
              iconOnly
              onChange={() => setShowColumns(!showColumns)}
            />
          </>
        }
        rightContent={
          <>
            <Button variant="secondary">
              Nueva factura
            </Button>
            <Button variant="primary">
              Nueva boleta
            </Button>
          </>
        }
      />

      {/* Contenido de la página */}
      <div className="flex-1 p-6">
        {/* Tu tabla, grid, etc. */}
      </div>
    </div>
  );
};

// ============================================================================
// EJEMPLO 2: Módulo de Clientes
// ============================================================================
export const ClientesPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Clientes"
        actions={
          <>
            <Button iconOnly icon={<Maximize2 />} variant="secondary" />
            <Button iconOnly icon={<Settings />} variant="secondary" />
          </>
        }
      />

      <Toolbar
        leftContent={
          <>
            <ToggleButton
              value="filter"
              activeValue={showFilters ? 'filter' : ''}
              icon={<Filter />}
              label="Filtrar"
              iconOnly
              onChange={() => setShowFilters(!showFilters)}
            />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border rounded-lg w-64"
            />
          </>
        }
        rightContent={
          <>
            <Button variant="secondary" icon={<Download />}>
              Exportar
            </Button>
            <Button variant="primary">
              Nuevo cliente
            </Button>
          </>
        }
      />

      <div className="flex-1 p-6">
        {/* Contenido */}
      </div>
    </div>
  );
};

// ============================================================================
// EJEMPLO 3: Módulo de Punto de Venta
// ============================================================================
export const PuntoVentaPage = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const favoritesCount = 5;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Punto de Venta"
        actions={
          <>
            <Button iconOnly icon={<Maximize2 />} variant="secondary" />
            <Button iconOnly icon={<Settings />} variant="secondary" />
          </>
        }
      />

      <Toolbar
        leftContent={
          <>
            <ToggleButton
              value="filter"
              activeValue={showFilters ? 'filter' : ''}
              icon={<Filter />}
              label="Filtrar"
              iconOnly
              onChange={() => setShowFilters(!showFilters)}
            />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border rounded-lg w-80"
            />
          </>
        }
        rightContent={
          <>
            <ToggleButton
              value="favorites"
              activeValue={showFavorites ? 'favorites' : ''}
              icon={<Star />}
              label="Favoritos"
              onChange={() => setShowFavorites(!showFavorites)}
              badge={favoritesCount > 0 ? favoritesCount : undefined}
            />
            <SegmentedControl
              options={[
                { value: 'grid', label: 'Vista en cuadrícula', icon: LayoutGrid, iconOnly: true },
                { value: 'list', label: 'Vista de lista', icon: List, iconOnly: true },
              ]}
              value={viewMode}
              onChange={(value) => setViewMode(value as 'grid' | 'list')}
              size="md"
            />
          </>
        }
      />

      <div className="flex-1 p-6">
        {/* Grid de productos */}
      </div>
    </div>
  );
};

// ============================================================================
// EJEMPLO 4: Con Breadcrumb (Nueva Emisión)
// ============================================================================
export const NuevaEmisionPage = () => {
  const tipoDocumento = 'boleta'; // o 'factura'

  const handleVolver = () => {
    // Navegar de regreso
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        breadcrumb={
          <div className="flex items-center gap-2">
            <button 
              onClick={handleVolver}
              className="text-secondary hover:text-primary transition-colors text-sm"
            >
              Comprobantes Electrónicos
            </button>
            <span className="text-tertiary">/</span>
          </div>
        }
        title={`Nueva Emisión - ${tipoDocumento === 'boleta' ? 'Boleta' : 'Factura'}`}
        actions={
          <>
            <Button iconOnly icon={<Maximize2 />} variant="secondary" />
            <Button iconOnly icon={<Settings />} variant="secondary" />
          </>
        }
      />

      {/* En este caso NO hay toolbar */}
      
      <div className="flex-1 p-6">
        {/* Formulario de emisión */}
      </div>
    </div>
  );
};

// ============================================================================
// EJEMPLO 5: Toolbar sin acciones primarias (solo consulta)
// ============================================================================
export const ReportesPage = () => {
  const [dateRange, setDateRange] = useState('');

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Reportes"
        actions={
          <>
            <Button iconOnly icon={<Maximize2 />} variant="secondary" />
          </>
        }
      />

      <Toolbar
        leftContent={
          <>
            {/* Aquí irían tus filtros de fecha, tipo de reporte, etc. */}
            <select className="px-3 py-2 border rounded-lg">
              <option>Últimos 7 días</option>
              <option>Último mes</option>
              <option>Personalizado</option>
            </select>
          </>
        }
        rightContent={
          <Button variant="secondary" icon={<Download />}>
            Exportar
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {/* Gráficos, tablas, etc. */}
      </div>
    </div>
  );
};
