/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Package, Users, Receipt, UserPlus, CreditCard, BarChart3, Settings, DollarSign, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Interfaces de tipos
interface BaseCommand {
  id: string;
  nombre: string;
  categoria: 'acciones' | 'navegacion';
  atajo: string;
}

interface SystemCommand extends BaseCommand {
  icono: LucideIcon;
}

interface CustomCommand extends BaseCommand {
  icono?: LucideIcon;
}

type Command = SystemCommand | CustomCommand;

type PaletteItem = {
  key: string;
  onExecute: () => void;
};

const MOCK_SEARCH_DATA = {
  comprobantes: [
    { id: 1, numero: 'FAC-001', cliente: 'Juan Pérez', monto: 1250.00, fecha: '30/09/2025', tipo: 'Factura' },
    { id: 2, numero: 'BOL-045', cliente: 'María García', monto: 85.50, fecha: '30/09/2025', tipo: 'Boleta' },
    { id: 3, numero: 'FAC-002', cliente: 'Carlos Ruiz', monto: 2340.00, fecha: '29/09/2025', tipo: 'Factura' }
  ],
  productos: [
    { id: 1, codigo: 'PROD-001', nombre: 'Coca Cola 500ml', precio: 3.50, stock: 150 },
    { id: 2, codigo: 'PROD-002', nombre: 'Pan Integral', precio: 5.00, stock: 80 },
    { id: 3, codigo: 'PROD-003', nombre: 'Leche Gloria', precio: 4.20, stock: 45 }
  ],
  clientes: [
    { id: 1, nombre: 'Juan Pérez', documento: '12345678', deuda: 0 },
    { id: 2, nombre: 'María García', documento: '87654321', deuda: 150.00 },
    { id: 3, nombre: 'Carlos Ruiz', documento: '20123456789', deuda: 0 }
  ]
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
    return true;
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable]'));
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteView, setCommandPaletteView] = useState<'main' | 'manage' | 'edit'>('main');
  const [newCommand, setNewCommand] = useState<{
    nombre: string;
    atajo: string;
    categoria: 'acciones' | 'navegacion';
    accion: string;
  }>({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
  const [showConflictWarning, setShowConflictWarning] = useState('');
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(-1);
  const paletteItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastQueryRef = useRef('');
  const lastListSignatureRef = useRef('');

  // Datos de ejemplo - reemplaza con tus datos reales
  const searchData = MOCK_SEARCH_DATA;

  // Comandos para el Command Palette
  const baseCommands: SystemCommand[] = useMemo(() => ([
    // ACCIONES PRINCIPALES
    { id: 'nueva-factura', nombre: 'Nueva Factura', icono: FileText, categoria: 'acciones', atajo: 'Ctrl+F' },
    { id: 'nueva-boleta', nombre: 'Nueva Boleta', icono: Receipt, categoria: 'acciones', atajo: 'Ctrl+B' },
    { id: 'buscar-global', nombre: 'Búsqueda Global', icono: Search, categoria: 'acciones', atajo: 'Ctrl+K' },
    { id: 'nuevo-cliente', nombre: 'Nuevo Cliente', icono: UserPlus, categoria: 'acciones', atajo: 'Ctrl+U' },
    { id: 'nuevo-producto', nombre: 'Nuevo Producto', icono: Package, categoria: 'acciones', atajo: 'Ctrl+P' },
    
    // NAVEGACIÓN
    { id: 'ir-comprobantes', nombre: 'Comprobantes Electrónicos', icono: FileText, categoria: 'navegacion', atajo: 'Ctrl+1' },
    { id: 'ir-productos', nombre: 'Gestión de Productos y Servicios', icono: Package, categoria: 'navegacion', atajo: 'Ctrl+2' },
    { id: 'ir-clientes', nombre: 'Gestión de Clientes', icono: Users, categoria: 'navegacion', atajo: 'Ctrl+3' },
    { id: 'ir-caja', nombre: 'Control de Caja', icono: CreditCard, categoria: 'navegacion', atajo: 'Ctrl+4' },
    { id: 'ir-indicadores', nombre: 'Indicadores de Negocio', icono: BarChart3, categoria: 'navegacion', atajo: 'Ctrl+5' },
    { id: 'ir-configuracion', nombre: 'Configuración del Sistema', icono: Settings, categoria: 'navegacion', atajo: 'Ctrl+6' },
    { id: 'ir-precios', nombre: 'Lista de Precios', icono: DollarSign, categoria: 'navegacion', atajo: 'Ctrl+7' },
  ]), []);

  // Atajos predefinidos del sistema y navegador
  const predefinedShortcuts = [
    'Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+S', 'Ctrl+O', 'Ctrl+N', 'Ctrl+P', 'Ctrl+R', 'Ctrl+F', 'Ctrl+H',
    'Ctrl+T', 'Ctrl+W', 'Ctrl+Shift+T', 'Ctrl+Tab', 'Ctrl+Shift+Tab', 'F5', 'F11', 'F12', 'Alt+F4', 'Alt+Tab',
    'Ctrl+K', 'Ctrl+B', 'Ctrl+U', 'Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5', 'Ctrl+6', 'Ctrl+7'
  ];

  // Actividades disponibles del sistema
  const availableActions = [
    { id: 'exportar-excel', nombre: 'Exportar a Excel', categoria: 'acciones' },
    { id: 'importar-datos', nombre: 'Importar Datos', categoria: 'acciones' },
    { id: 'backup-base', nombre: 'Respaldar Base de Datos', categoria: 'acciones' },
    { id: 'generar-reporte', nombre: 'Generar Reporte', categoria: 'acciones' },
    { id: 'sincronizar-sunat', nombre: 'Sincronizar con SUNAT', categoria: 'acciones' },
    { id: 'cerrar-caja', nombre: 'Cerrar Caja', categoria: 'acciones' },
    { id: 'abrir-caja', nombre: 'Abrir Caja', categoria: 'acciones' },
    { id: 'cambiar-tema', nombre: 'Cambiar Tema', categoria: 'acciones' },
    { id: 'ir-dashboard', nombre: 'Dashboard Principal', categoria: 'navegacion' },
    { id: 'ir-ventas', nombre: 'Módulo de Ventas', categoria: 'navegacion' },
    { id: 'ir-compras', nombre: 'Módulo de Compras', categoria: 'navegacion' },
    { id: 'ir-inventario', nombre: 'Gestión de Inventario', categoria: 'navegacion' },
    { id: 'ir-reportes', nombre: 'Centro de Reportes', categoria: 'navegacion' },
    { id: 'ir-configuracion-avanzada', nombre: 'Configuración Avanzada', categoria: 'navegacion' }
  ];

  // Función para validar si un atajo está en uso
  // Función para obtener el conflicto específico
  const getShortcutConflict = (shortcut: string) => {
    const normalizedShortcut = shortcut.toLowerCase();
    
    // Verificar si es un atajo predefinido del sistema
    if (predefinedShortcuts.some(s => s.toLowerCase() === normalizedShortcut)) {
      if (['ctrl+p'].includes(normalizedShortcut)) return 'Comando del navegador (Imprimir)';
      if (['ctrl+s'].includes(normalizedShortcut)) return 'Comando del navegador (Guardar)';
      if (['ctrl+f'].includes(normalizedShortcut)) return 'Comando del navegador (Buscar)';
      if (['ctrl+r', 'f5'].includes(normalizedShortcut)) return 'Comando del navegador (Actualizar)';
      if (['ctrl+n'].includes(normalizedShortcut)) return 'Comando del navegador (Nueva ventana)';
      if (['ctrl+t'].includes(normalizedShortcut)) return 'Comando del navegador (Nueva pestaña)';
      return 'Comando predefinido del sistema';
    }
    
    // Verificar si está en uso por otro comando
    const existingCommand = allCommands.find(cmd => cmd.atajo.toLowerCase() === normalizedShortcut);
    if (existingCommand) {
      return `Ya usado por: ${existingCommand.nombre}`;
    }
    
    return '';
  };

  // Comandos personalizados desde localStorage
  const [customCommands, setCustomCommands] = useState<CustomCommand[]>([]);
  const [allCommands, setAllCommands] = useState<Command[]>(baseCommands);

  // Cargar comandos personalizados
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCommands = localStorage.getItem('customCommands');
      if (savedCommands) {
        const customCmds: CustomCommand[] = JSON.parse(savedCommands);
        setCustomCommands(customCmds);
        setAllCommands([...baseCommands, ...customCmds]);
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [baseCommands]);

  // Filtrar comandos según búsqueda
  const filteredCommands = allCommands.filter(cmd => 
    cmd.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.atajo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const actionCommands = useMemo(
    () => filteredCommands.filter(cmd => cmd.categoria === 'acciones'),
    [filteredCommands]
  );

  const navigationCommands = useMemo(
    () => filteredCommands.filter(cmd => cmd.categoria === 'navegacion'),
    [filteredCommands]
  );

  // Búsqueda en datos
  const searchResults = useMemo(() => ({
    comprobantes: searchData.comprobantes.filter(comp => 
      comp.numero.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.cliente.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    productos: searchData.productos.filter(prod => 
      prod.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.codigo.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    clientes: searchData.clientes.filter(cliente => 
      cliente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cliente.documento.includes(searchQuery)
    )
  }), [searchQuery, searchData]);

  const hasResults = searchResults.comprobantes.length > 0 || 
                    searchResults.productos.length > 0 || 
                    searchResults.clientes.length > 0;

  const paletteSearchResults = useMemo(
    () => searchResults.comprobantes.slice(0, 3),
    [searchResults]
  );


  // Atajo de teclado Ctrl+K y otros atajos del sistema
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditable = isEditableTarget(e.target) || isEditableTarget(document.activeElement);
      const wantsPaletteToggle = (e.ctrlKey || e.metaKey) && e.key === 'k';

      // Escapar para cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCommandPalette) {
          if (commandPaletteView === 'manage') {
            setCommandPaletteView('main');
          } else {
            setShowCommandPalette(false);
            setCommandPaletteView('main');
          }
        }
        if (showSearchResults) {
          setShowSearchResults(false);
        }
        return;
      }

      // Ctrl+K para abrir/ cerrar command palette (permitir cierre cuando ya está abierto)
      const allowPaletteToggle = !isEditable || showCommandPalette;
      if (wantsPaletteToggle && allowPaletteToggle) {
        e.preventDefault();
        e.stopPropagation();
        setShowCommandPalette(prev => !prev);
        setShowSearchResults(false);
        setCommandPaletteView('main');
        return;
      }

      if (isEditable) {
        return;
      }

      if (showCommandPalette) {
        return;
      }

      // Atajos de navegación - IMPORTANTE: preventDefault para evitar conflictos con Chrome
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            e.stopPropagation();
            navigate('/comprobantes');
            break;
          case '2':
            e.preventDefault();
            e.stopPropagation();
            navigate('/catalogo');
            break;
          case '3':
            e.preventDefault();
            e.stopPropagation();
            navigate('/clientes');
            break;
          case '4':
            e.preventDefault();
            e.stopPropagation();
            navigate('/control-caja');
            break;
          case '5':
            e.preventDefault();
            e.stopPropagation();
            navigate('/indicadores');
            break;
          case '6':
            e.preventDefault();
            e.stopPropagation();
            navigate('/configuracion');
            break;
          case '7':
            e.preventDefault();
            e.stopPropagation();
            navigate('/lista-precios');
            break;
          case 'b':
            e.preventDefault();
            e.stopPropagation();
            navigate('/comprobantes/emision');
            break;
          case 'u':
            e.preventDefault();
            e.stopPropagation();
            navigate('/clientes');
            break;
        }
      }
    };
    
    // Usar capture: true para interceptar eventos antes que otros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [navigate, showCommandPalette, showSearchResults, commandPaletteView]);

  // Controlar overflow del body cuando el command palette está abierto
  useEffect(() => {
    if (showCommandPalette) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCommandPalette]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleSelectResult = useCallback((type: string, item: any) => {
    console.log(`Seleccionado ${type}:`, item);
    setShowSearchResults(false);
    setSearchQuery('');
  }, []);

  const handleExecuteCommand = useCallback((commandId: string) => {
    setShowCommandPalette(false);
    
    switch (commandId) {
      case 'nueva-factura':
        navigate('/comprobantes/emision');
        break;
      case 'nueva-boleta':
        navigate('/comprobantes/emision');
        break;
      case 'buscar-global':
        setShowCommandPalette(true);
        break;
      case 'nuevo-cliente':
        navigate('/clientes');
        break;
      case 'nuevo-producto':
        navigate('/catalogo');
        break;
      case 'ir-comprobantes':
        navigate('/comprobantes');
        break;
      case 'ir-productos':
        navigate('/catalogo');
        break;
      case 'ir-clientes':
        navigate('/clientes');
        break;
      case 'ir-caja':
        navigate('/control-caja');
        break;
      case 'ir-indicadores':
        navigate('/indicadores');
        break;
      case 'ir-configuracion':
        navigate('/configuracion');
        break;
      case 'ir-precios':
        navigate('/lista-precios');
        break;
      
      default:
        console.log('Comando no reconocido:', commandId);
    }
  }, [navigate]);

  const closePaletteAndReset = useCallback(() => {
    setShowCommandPalette(false);
    setCommandPaletteView('main');
  }, []);

  const handlePaletteResultSelect = useCallback((type: string, item: any) => {
    handleSelectResult(type, item);
    closePaletteAndReset();
  }, [closePaletteAndReset, handleSelectResult]);

  const paletteItems = useMemo(() => {
    const items: PaletteItem[] = [];

    actionCommands.forEach((cmd) => {
      items.push({
        key: `command-${cmd.id}`,
        onExecute: () => handleExecuteCommand(cmd.id)
      });
    });

    navigationCommands.forEach((cmd) => {
      items.push({
        key: `command-${cmd.id}`,
        onExecute: () => handleExecuteCommand(cmd.id)
      });
    });

    if (searchQuery.length > 0 && hasResults) {
      paletteSearchResults.forEach((comp) => {
        items.push({
          key: `search-comprobantes-${comp.id}`,
          onExecute: () => handlePaletteResultSelect('comprobantes', comp)
        });
      });
    }

    return items;
  }, [actionCommands, navigationCommands, searchQuery, hasResults, paletteSearchResults, handleExecuteCommand, handlePaletteResultSelect]);

  const paletteIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    paletteItems.forEach((item, index) => {
      map.set(item.key, index);
    });
    return map;
  }, [paletteItems]);

  useEffect(() => {
    if (!showCommandPalette) {
      setActiveIndex(-1);
      lastQueryRef.current = '';
      lastListSignatureRef.current = '';
      return;
    }

    const signature = paletteItems.map(item => item.key).join('|');
    const queryChanged = lastQueryRef.current !== searchQuery;
    const listChanged = lastListSignatureRef.current !== signature;

    lastQueryRef.current = searchQuery;
    lastListSignatureRef.current = signature;

    if (paletteItems.length === 0) {
      setActiveIndex(-1);
      return;
    }

    if (queryChanged || listChanged) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex(prev => {
      if (prev < 0) return 0;
      if (prev >= paletteItems.length) return paletteItems.length - 1;
      return prev;
    });
  }, [paletteItems, searchQuery, showCommandPalette]);

  useEffect(() => {
    if (!showCommandPalette || activeIndex < 0) {
      return;
    }
    const activeItem = paletteItems[activeIndex];
    if (!activeItem) {
      return;
    }
    const node = paletteItemRefs.current[activeItem.key];
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, paletteItems, showCommandPalette]);

  const handleCommandPaletteKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCommandPalette || paletteItems.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => {
        if (paletteItems.length === 0) {
          return -1;
        }
        if (prev === -1 || prev === paletteItems.length - 1) {
          return 0;
        }
        return prev + 1;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => {
        if (paletteItems.length === 0) {
          return -1;
        }
        if (prev <= 0) {
          return paletteItems.length - 1;
        }
        return prev - 1;
      });
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < paletteItems.length) {
      e.preventDefault();
      paletteItems[activeIndex].onExecute();
    }
  }, [activeIndex, paletteItems, showCommandPalette]);

  return (
    <>
      {/* BUSCADOR */}
      <div className="relative" style={{ zIndex: showCommandPalette ? 1 : 'auto' }}>
        <div className="relative w-full max-w-[450px]">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(e.target.value.length > 0);
            }}
            onFocus={() => searchQuery && setShowSearchResults(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Buscar clientes, productos o comprobantes…"
            className="w-full pl-9 pr-16 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                     focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none
                     bg-white dark:bg-gray-800 text-sm transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={() => {
              setShowCommandPalette(true);
              setShowSearchResults(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 
                     px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <kbd className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Ctrl+K</kbd>
          </button>
        </div>

        {/* DROPDOWN DE RESULTADOS - Solo mostrar si NO está abierto el command palette */}
        {showSearchResults && hasResults && !showCommandPalette && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                        rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
            
            {/* Comprobantes */}
            {searchResults.comprobantes.length > 0 && (
              <div className="p-2">
                <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                  Comprobantes
                </div>
                {searchResults.comprobantes.map((comp) => (
                  <button
                    key={comp.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSelectResult('comprobantes', comp)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{comp.numero}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{comp.cliente}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        S/ {comp.monto.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Productos */}
            {searchResults.productos.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                  Productos
                </div>
                {searchResults.productos.map((prod) => (
                  <button
                    key={prod.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSelectResult('productos', prod)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{prod.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{prod.codigo}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        S/ {prod.precio.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Clientes */}
            {searchResults.clientes.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                  Clientes
                </div>
                {searchResults.clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleSelectResult('clientes', cliente)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cliente.nombre}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{cliente.documento}</div>
                      </div>
                      {cliente.deuda > 0 && (
                        <div className="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                          S/ {cliente.deuda.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sin resultados - Solo mostrar si NO está abierto el command palette */}
        {showSearchResults && !hasResults && searchQuery.length > 0 && !showCommandPalette && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                        rounded-lg shadow-lg z-50 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron resultados</p>
          </div>
        )}
      </div>

      {/* COMMAND PALETTE - Modal centrado usando Portal */}
      {showCommandPalette && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
          style={{ zIndex: 9999 }}
          onClick={() => {
            setShowCommandPalette(false);
            setCommandPaletteView('main');
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* VISTA PRINCIPAL - COMMAND PALETTE */}
            {commandPaletteView === 'main' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Comando Rápido
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCommandPaletteView('manage');
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings size={12} />
                      Administrar comandos
                    </button>
                  </div>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleCommandPaletteKeyDown}
                      placeholder="Buscar o ejecutar comando..."
                      autoFocus
                      className="w-full pl-9 pr-4 py-3 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {/* Comandos disponibles */}
                  {actionCommands.length > 0 && (
                    <div className="p-3">
                      <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                        Acciones
                      </div>
                      {actionCommands.map((cmd) => {
                        const IconComponent = cmd.icono || Search; // Fallback icon
                        const itemKey = `command-${cmd.id}`;
                        const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                        const isActive = itemIndex === activeIndex;
                        const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`;
                        return (
                          <button
                            key={cmd.id}
                            ref={(el) => {
                              paletteItemRefs.current[itemKey] = el;
                            }}
                            data-key={itemKey}
                            className={itemClasses}
                            onClick={() => handleExecuteCommand(cmd.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                            </div>
                            {cmd.atajo && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cmd.atajo}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Navegación */}
                  {navigationCommands.length > 0 && (
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                        Ir a
                      </div>
                      {navigationCommands.map((cmd) => {
                        const IconComponent = cmd.icono || Search; // Fallback icon
                        const itemKey = `command-${cmd.id}`;
                        const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                        const isActive = itemIndex === activeIndex;
                        const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`;
                        return (
                          <button
                            key={cmd.id}
                            ref={(el) => {
                              paletteItemRefs.current[itemKey] = el;
                            }}
                            data-key={itemKey}
                            className={itemClasses}
                            onClick={() => handleExecuteCommand(cmd.id)}
                          >
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                            </div>
                            {cmd.atajo && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{cmd.atajo}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Resultados de búsqueda en Command Palette */}
                  {searchQuery.length > 0 && hasResults && (
                    <>
                      {searchResults.comprobantes.length > 0 && (
                        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                          <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                            Comprobantes
                          </div>
                          {paletteSearchResults.map((comp) => {
                            const itemKey = `search-comprobantes-${comp.id}`;
                            const itemIndex = paletteIndexMap.get(itemKey) ?? -1;
                            const isActive = itemIndex === activeIndex;
                            const itemClasses = `w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                              isActive ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-blue-500/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`;
                            return (
                              <button
                                key={comp.id}
                                ref={(el) => {
                                  paletteItemRefs.current[itemKey] = el;
                                }}
                                data-key={itemKey}
                                className={itemClasses}
                                onClick={() => handlePaletteResultSelect('comprobantes', comp)}
                              >
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{comp.numero}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{comp.cliente}</div>
                                </div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">S/ {comp.monto.toFixed(2)}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>↑↓ Navegar</span>
                    <span>↵ Seleccionar</span>
                    <span>Esc Cerrar</span>
                  </div>
                </div>
              </>
            )}

            {/* VISTA DE ADMINISTRACIÓN DE COMANDOS */}
            {commandPaletteView === 'manage' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCommandPaletteView('main');
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Administrar Comandos</h2>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-4">
                  {/* Comandos personalizados */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Comandos Personalizados</h3>
                      <button
                        onClick={() => {
                          setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                          setShowConflictWarning('');
                          setCommandPaletteView('edit');
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <Plus size={12} />
                        Nuevo comando
                      </button>
                    </div>
                    
                    {customCommands.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <p className="text-sm">No hay comandos personalizados</p>
                        <p className="text-xs mt-1">Crea uno para empezar</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customCommands.map((cmd) => (
                          <div key={cmd.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{cmd.nombre}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.atajo}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const updatedCommands = customCommands.filter(c => c.id !== cmd.id);
                                  setCustomCommands(updatedCommands);
                                  localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
                                  setAllCommands([...baseCommands, ...updatedCommands]);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comandos del sistema (solo lectura) */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Comandos del Sistema</h3>
                    <div className="space-y-2">
                      {baseCommands.map((cmd) => {
                        const IconComponent = cmd.icono;
                        return (
                          <div key={cmd.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg opacity-75">
                            <div className="flex items-center gap-3">
                              <IconComponent size={16} className="text-gray-400 dark:text-gray-500" />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{cmd.nombre}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.atajo}</div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500">Sistema</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-3">
                    <span>Los comandos personalizados se guardan localmente</span>
                  </div>
                  <button
                    onClick={() => {
                      setCommandPaletteView('main');
                    }}
                    className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-blue-400 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded"
                  >
                    Volver
                  </button>
                </div>
              </>
            )}

            {/* VISTA DE EDICIÓN/CREACIÓN DE COMANDOS */}
            {commandPaletteView === 'edit' && (
              <>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setCommandPaletteView('manage');
                        setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                        setShowConflictWarning('');
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft size={16} className="text-gray-600 dark:text-gray-400" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nuevo Comando</h2>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Advertencia sobre comandos predeterminados */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">ℹ️ Comandos Predeterminados</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                      Ten en cuenta que algunos atajos ya están en uso por el sistema o navegador:
                    </p>
                    <div className="text-xs text-blue-600 dark:text-blue-400 grid grid-cols-3 gap-1">
                      <span>Ctrl+P (Imprimir)</span>
                      <span>Ctrl+S (Guardar)</span>
                      <span>Ctrl+F (Buscar)</span>
                      <span>Ctrl+R (Actualizar)</span>
                      <span>Ctrl+N (Nueva ventana)</span>
                      <span>Ctrl+T (Nueva pestaña)</span>
                    </div>
                  </div>

                  {/* Formulario */}
                  <div className="space-y-4">
                    {/* Nombre del comando */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre del comando
                      </label>
                      <input
                        type="text"
                        value={newCommand.nombre}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, nombre: e.target.value }))}
                        placeholder="Ej: Exportar productos"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Atajo de teclado */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Atajo de teclado
                      </label>
                      <input
                        type="text"
                        value={newCommand.atajo}
                        onChange={(e) => {
                          const atajo = e.target.value;
                          setNewCommand(prev => ({ ...prev, atajo }));
                          
                          // Verificar conflictos en tiempo real
                          if (atajo) {
                            const conflict = getShortcutConflict(atajo);
                            setShowConflictWarning(conflict);
                          } else {
                            setShowConflictWarning('');
                          }
                        }}
                        placeholder="Ej: Ctrl+E, Alt+X, F9"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showConflictWarning && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          ⚠️ {showConflictWarning}
                        </p>
                      )}
                    </div>

                    {/* Acción */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Acción del sistema
                      </label>
                      <select
                        value={newCommand.accion}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, accion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecciona una acción...</option>
                        <optgroup label="Acciones del Sistema">
                          {availableActions.filter(action => action.categoria === 'acciones').map(action => (
                            <option key={action.id} value={action.id}>{action.nombre}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Navegación">
                          {availableActions.filter(action => action.categoria === 'navegacion').map(action => (
                            <option key={action.id} value={action.id}>{action.nombre}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Categoría
                      </label>
                      <select
                        value={newCommand.categoria}
                        onChange={(e) => setNewCommand(prev => ({ ...prev, categoria: e.target.value as 'acciones' | 'navegacion' }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="acciones">Acciones</option>
                        <option value="navegacion">Navegación</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
                  <button
                    onClick={() => {
                      setCommandPaletteView('manage');
                      setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                      setShowConflictWarning('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      // Validaciones
                      if (!newCommand.nombre.trim()) {
                        alert('Por favor ingresa un nombre para el comando');
                        return;
                      }
                      if (!newCommand.atajo.trim()) {
                        alert('Por favor ingresa un atajo de teclado');
                        return;
                      }
                      if (!newCommand.accion) {
                        alert('Por favor selecciona una acción del sistema');
                        return;
                      }
                      if (showConflictWarning) {
                        alert('El atajo seleccionado está en conflicto. Por favor elige otro.');
                        return;
                      }

                      // Crear nuevo comando
                      const comando: CustomCommand = {
                        id: Date.now().toString(),
                        nombre: newCommand.nombre.trim(),
                        atajo: newCommand.atajo.trim(),
                        categoria: newCommand.categoria
                      };

                      const updatedCommands = [...customCommands, comando];
                      setCustomCommands(updatedCommands);
                      localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
                      setAllCommands([...baseCommands, ...updatedCommands]);
                      
                      // Limpiar y volver
                      setNewCommand({ nombre: '', atajo: '', categoria: 'acciones', accion: '' });
                      setShowConflictWarning('');
                      setCommandPaletteView('manage');
                    }}
                    disabled={!newCommand.nombre.trim() || !newCommand.atajo.trim() || !newCommand.accion || !!showConflictWarning}
                    className="w-full sm:w-auto px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    Crear Comando
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default SearchBar;