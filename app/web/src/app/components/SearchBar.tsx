import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Package, Users, Receipt, UserPlus, CreditCard, BarChart3, Settings, DollarSign } from 'lucide-react';
import CommandsManagementModal from './CommandsManagementModal';

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const navigate = useNavigate();

  // Datos de ejemplo - reemplaza con tus datos reales
  const searchData = {
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

  // Comandos para el Command Palette
  const [commands, setCommands] = useState([
    // ACCIONES PRINCIPALES
    { id: 'nueva-factura', nombre: 'Nueva Factura', icono: FileText, categoria: 'acciones', atajo: 'Ctrl+N' },
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
  ]);

  // Cargar comandos personalizados del localStorage
  useEffect(() => {
    const loadCommands = () => {
      const baseCommands = [
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
      ];

      const savedCommands = localStorage.getItem('customCommands');
      if (savedCommands) {
        const customCommands = JSON.parse(savedCommands);
        setCommands([...baseCommands, ...customCommands]);
      } else {
        setCommands(baseCommands);
      }
    };

    loadCommands();
    
    // Escuchar cambios en localStorage para actualizar comandos en tiempo real
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'customCommands') {
        loadCommands();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filtrar resultados
  const filterResults = (query: string) => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return {
      comprobantes: searchData.comprobantes.filter(c => 
        c.numero.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q)
      ),
      productos: searchData.productos.filter(p => 
        p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
      ),
      clientes: searchData.clientes.filter(c => 
        c.nombre.toLowerCase().includes(q) || c.documento.includes(q)
      )
    };
  };

  const searchResults = filterResults(searchQuery);
  const hasResults = searchResults && (
    searchResults.comprobantes.length > 0 || 
    searchResults.productos.length > 0 || 
    searchResults.clientes.length > 0
  );

  const filteredCommands = commands.filter(cmd => 
    cmd.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Atajo de teclado Ctrl+K y otros atajos del sistema
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K para abrir command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        // Solo abrir si no hay modales abiertos
        if (!showCommandsModal) {
          setShowCommandPalette(prev => !prev);
        }
        return;
      }
      
      // Escapar para cerrar
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (showCommandPalette) {
          setShowCommandPalette(false);
        }
        if (showSearchResults) {
          setShowSearchResults(false);
        }
        if (showCommandsModal) {
          setShowCommandsModal(false);
        }
        return;
      }

      // Solo procesar otros atajos si no estamos en un input/textarea
      const activeElement = document.activeElement;
      const isInInput = activeElement?.tagName === 'INPUT' || 
                       activeElement?.tagName === 'TEXTAREA' || 
                       activeElement?.getAttribute('contenteditable') === 'true';
      
      if (isInInput) return;

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
          case 'f':
            e.preventDefault();
            e.stopPropagation();
            navigate('/comprobantes/emision');
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
          case 'p':
            e.preventDefault();
            e.stopPropagation();
            navigate('/catalogo');
            break;
        }
      }
    };
    
    // Usar capture: true para interceptar eventos antes que otros handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [navigate, showCommandsModal, showCommandPalette, showSearchResults]);

  // Controlar overflow del body cuando el command palette está abierto
  useEffect(() => {
    if (showCommandPalette || showCommandsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCommandPalette, showCommandsModal]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  // Funciones de acción - personaliza según tu app
  const handleSelectResult = (type: string, item: any) => {
    setShowSearchResults(false);
    setSearchQuery('');
    console.log('Selected:', type, item);
    // Aquí navegarías o abrirías un modal
    // navigate(`/${type}/${item.id}`)
  };

  const handleExecuteCommand = (commandId: string) => {
    setShowCommandPalette(false);
    setSearchQuery('');
    
    switch(commandId) {
      // ACCIONES
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
        // Aquí podrías abrir un modal de nuevo cliente
        break;
      case 'nuevo-producto':
        navigate('/catalogo');
        // Aquí podrías abrir un modal de nuevo producto
        break;
      
      // NAVEGACIÓN
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
  };

  return (
    <>
      {/* BUSCADOR */}
      <div className="relative" style={{ zIndex: showCommandPalette ? 1 : 'auto' }}>
        <div className="relative">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
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
            className="w-[450px] pl-9 pr-16 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                     focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none
                     bg-white dark:bg-gray-800 text-sm transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={() => setShowCommandPalette(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 
                     px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <kbd className="text-[10px] font-medium text-gray-400 dark:text-gray-500">Ctrl+K</kbd>
          </button>
        </div>

        {/* DROPDOWN DE RESULTADOS */}
        {showSearchResults && hasResults && (
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
                        <div className="text-xs text-gray-500 dark:text-gray-400">Stock: {prod.stock}</div>
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

        {/* Sin resultados */}
        {showSearchResults && !hasResults && searchQuery.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600
                        rounded-lg shadow-lg z-50 p-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No se encontraron resultados</p>
          </div>
        )}
      </div>

      {/* COMMAND PALETTE */}
      {showCommandPalette && !showCommandsModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh]"
          style={{ 
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={() => setShowCommandPalette(false)}
        >
          <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600"
               onClick={(e) => e.stopPropagation()}>
            
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar o ejecutar comando..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              
              {/* Acciones */}
              {filteredCommands.filter(c => c.categoria === 'acciones').length > 0 && (
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                    Acciones
                  </div>
                  {filteredCommands.filter(c => c.categoria === 'acciones').map((cmd) => {
                    const IconComponent = cmd.icono;
                    return (
                      <button
                        key={cmd.id}
                        className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors text-left"
                        onClick={() => handleExecuteCommand(cmd.id)}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent size={14} className="text-gray-400 dark:text-gray-500" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                        </div>
                        {cmd.atajo && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{cmd.atajo}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Navegación */}
              {filteredCommands.filter(c => c.categoria === 'navegacion').length > 0 && (
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase px-2 py-1.5">
                    Ir a
                  </div>
                  {filteredCommands.filter(c => c.categoria === 'navegacion').map((cmd) => {
                    const IconComponent = cmd.icono;
                    return (
                      <button
                        key={cmd.id}
                        className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors text-left"
                        onClick={() => handleExecuteCommand(cmd.id)}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent size={14} className="text-gray-400 dark:text-gray-500" />
                          <span className="text-sm text-gray-900 dark:text-gray-100">{cmd.nombre}</span>
                        </div>
                        {cmd.atajo && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">{cmd.atajo}</span>
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
                    <div className="p-2 border-t border-gray-100">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                        Comprobantes
                      </div>
                      {searchResults.comprobantes.slice(0, 3).map((comp) => (
                        <button
                          key={comp.id}
                          className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50"
                          onClick={() => {
                            handleSelectResult('comprobantes', comp);
                            setShowCommandPalette(false);
                          }}
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{comp.numero}</div>
                            <div className="text-xs text-gray-500">{comp.cliente}</div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900">S/ {comp.monto.toFixed(2)}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-3">
                <span>↑↓ Navegar</span>
                <span>↵ Seleccionar</span>
                <span>Esc Cerrar</span>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCommandPalette(false);
                  setShowCommandsModal(true);
                }}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-blue-400 dark:hover:text-blue-400 transition-colors px-2 py-1 rounded"
              >
                Administrar comandos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ADMINISTRAR COMANDOS */}
      {showCommandsModal && (
        <CommandsManagementModal
          isOpen={showCommandsModal}
          onClose={() => setShowCommandsModal(false)}
        />
      )}
    </>
  );
};

export default SearchBar;