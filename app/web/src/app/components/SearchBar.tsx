import { useState, useEffect } from 'react';
import { Search, FileText, Package, Users } from 'lucide-react';

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

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
  const commands = [
    { id: 'nueva-factura', nombre: 'Nueva Factura', icono: FileText, atajo: 'Ctrl+Shift+F', categoria: 'acciones' },
    { id: 'nueva-boleta', nombre: 'Nueva Boleta', icono: FileText, atajo: 'Ctrl+Shift+B', categoria: 'acciones' },
    { id: 'registrar-cliente', nombre: 'Registrar Cliente', icono: Users, categoria: 'acciones' },
    { id: 'registrar-producto', nombre: 'Registrar Producto', icono: Package, categoria: 'acciones' }
  ];

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

  // Atajo de teclado Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowSearchResults(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    console.log('Executing command:', commandId);
    // Aquí ejecutarías la acción
    // switch(commandId) {
    //   case 'nueva-factura': openFacturaModal(); break;
    //   case 'ir-productos': navigate('/productos'); break;
    // }
  };

  return (
    <>
      {/* BUSCADOR */}
      <div className="relative">
        <div className="relative">
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
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
            placeholder="Buscar..."
            className="w-[450px] pl-9 pr-16 py-2 rounded-lg border border-gray-200
                     focus:border-gray-300 focus:outline-none
                     bg-white text-sm transition-colors"
          />
          <button
            onClick={() => setShowCommandPalette(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 
                     px-1.5 py-0.5 hover:bg-gray-100 rounded transition-colors"
          >
            <kbd className="text-[10px] font-medium text-gray-400">Ctrl+K</kbd>
          </button>
        </div>

        {/* DROPDOWN DE RESULTADOS */}
        {showSearchResults && hasResults && (
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white border border-gray-200 
                        rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
            
            {/* Comprobantes */}
            {searchResults.comprobantes.length > 0 && (
              <div className="p-2">
                <div className="text-[11px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                  Comprobantes
                </div>
                {searchResults.comprobantes.map((comp) => (
                  <button
                    key={comp.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectResult('comprobantes', comp)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{comp.numero}</div>
                        <div className="text-xs text-gray-500 truncate">{comp.cliente}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        S/ {comp.monto.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Productos */}
            {searchResults.productos.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                  Productos
                </div>
                {searchResults.productos.map((prod) => (
                  <button
                    key={prod.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectResult('productos', prod)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{prod.nombre}</div>
                        <div className="text-xs text-gray-500">Stock: {prod.stock}</div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        S/ {prod.precio.toFixed(2)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Clientes */}
            {searchResults.clientes.length > 0 && (
              <div className="p-2 border-t border-gray-100">
                <div className="text-[11px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                  Clientes
                </div>
                {searchResults.clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    className="w-full text-left px-2 py-2 rounded hover:bg-gray-50 transition-colors"
                    onClick={() => handleSelectResult('clientes', cliente)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{cliente.nombre}</div>
                        <div className="text-xs text-gray-500">{cliente.documento}</div>
                      </div>
                      {cliente.deuda > 0 && (
                        <div className="text-sm font-semibold text-red-600 whitespace-nowrap">
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
          <div className="absolute top-full left-0 mt-2 w-[520px] bg-white border border-gray-200 
                        rounded-lg shadow-lg z-50 p-6 text-center">
            <p className="text-sm text-gray-500">No se encontraron resultados</p>
          </div>
        )}
      </div>

      {/* COMMAND PALETTE */}
      {showCommandPalette && (
        <div className="fixed inset-0 bg-black/20 z-[100] flex items-start justify-center pt-[20vh]"
             onClick={() => setShowCommandPalette(false)}>
          <div className="w-full max-w-xl bg-white rounded-lg shadow-xl border border-gray-200"
               onClick={(e) => e.stopPropagation()}>
            
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar o ejecutar comando..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              
              {/* Acciones */}
              {filteredCommands.length > 0 && (
                <div className="p-2">
                  <div className="text-[11px] font-semibold text-gray-400 uppercase px-2 py-1.5">
                    Acciones
                  </div>
                  {filteredCommands.map((cmd) => {
                    const IconComponent = cmd.icono;
                    return (
                      <button
                        key={cmd.id}
                        className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 
                                 transition-colors text-left"
                        onClick={() => handleExecuteCommand(cmd.id)}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{cmd.nombre}</span>
                        </div>
                        {cmd.atajo && (
                          <span className="text-[10px] text-gray-400 font-mono">{cmd.atajo}</span>
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

            <div className="p-2 bg-gray-50 border-t border-gray-200 flex items-center gap-3 text-[10px] text-gray-400">
              <span>↑↓ Navegar</span>
              <span>↵ Seleccionar</span>
              <span>Esc Cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;