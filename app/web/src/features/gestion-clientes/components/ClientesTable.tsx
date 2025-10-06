import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';

export type Cliente = {
  id: number;
  name: string;
  document: string;
  type: string;
  address: string;
  phone: string;
  enabled: boolean;
};

export type ClientesTableProps = {
  clients: Cliente[];
  onEditClient?: (client: Cliente) => void;
  onDeleteClient?: (client: Cliente) => void;
};

export interface ClientesTableRef {
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
}

const ClientesTable = forwardRef<ClientesTableRef, ClientesTableProps>(({ clients, onEditClient, onDeleteClient }, ref) => {
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>(clients);
  
  // Estados para los filtros
  const [filters, setFilters] = useState({
    name: '',
    document: '',
    type: '',
    address: '',
    phone: ''
  });

  // Estados para controlar qué filtros están visibles
  const [activeFilters, setActiveFilters] = useState({
    name: false,
    document: false,
    type: false,
    address: false,
    phone: false
  });

  // Lista de tipos únicos para el dropdown
  const uniqueTypes = Array.from(new Set(clients.map(client => client.type)));

  // Función para activar/desactivar filtros - activa todos a la vez
  const toggleFilter = () => {
    const allFiltersActive = Object.values(activeFilters).every(active => active);
    
    if (allFiltersActive) {
      // Si todos están activos, desactivar todos
      setActiveFilters({
        name: false,
        document: false,
        type: false,
        address: false,
        phone: false
      });
    } else {
      // Si alguno no está activo, activar todos
      setActiveFilters({
        name: true,
        document: true,
        type: true,
        address: true,
        phone: true
      });
    }
  };

  // Sincronizar el estado local con las props cuando cambien
  useEffect(() => {
    const filteredClients = clients.filter(client => {
      const matchesName = !filters.name || client.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchesDocument = !filters.document || client.document.toLowerCase().includes(filters.document.toLowerCase());
      const matchesType = !filters.type || client.type === filters.type;
      const matchesAddress = !filters.address || client.address.toLowerCase().includes(filters.address.toLowerCase());
      const matchesPhone = !filters.phone || client.phone.includes(filters.phone);
      
      return matchesName && matchesDocument && matchesType && matchesAddress && matchesPhone;
    });
    
    setClientes(filteredClients);
  }, [clients, filters]);

  // Función para manejar cambios en los filtros
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para limpiar todos los filtros
  const clearAllFilters = () => {
    setFilters({
      name: '',
      document: '',
      type: '',
      address: '',
      phone: ''
    });
    setActiveFilters({
      name: false,
      document: false,
      type: false,
      address: false,
      phone: false
    });
  };

  // Verificar si hay algún filtro activo
  const hasInternalActiveFilters = Object.values(activeFilters).some(active => active === true) || 
    Object.values(filters).some(value => value.trim() !== '');

  // Exponer funciones al componente padre via ref
  useImperativeHandle(ref, () => ({
    clearAllFilters,
    hasActiveFilters: () => hasInternalActiveFilters
  }));

  const handleToggleEnabled = (id: number) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    setMenuOpenId(null);
  };

  const handleEdit = (client: Cliente) => {
    if (onEditClient) {
      onEditClient(client);
    } else {
      alert(`Editar cliente: ${client.name}`);
    }
    setMenuOpenId(null);
  };

  const handleRowClick = (client: Cliente, event: React.MouseEvent) => {
    // Evitar edición si se hace clic en botones o elementos interactivos
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('svg')) {
      return;
    }
    
    // Ejecutar la misma acción que el botón "Editar"
    if (onEditClient) {
      onEditClient(client);
    }
  };

  const renderDocument = (document: string) => {
    // Caso especial: "Sin documento" - todo en bold
    if (document.toLowerCase().includes('sin documento')) {
      return <span className="font-semibold">{document}</span>;
    }
    
    // Separar tipo de documento y número para otros casos
    const parts = document.split(' ');
    if (parts.length >= 2) {
      const docType = parts[0]; // RUC, DNI, etc.
      const docNumber = parts.slice(1).join(' '); // El resto es el número
      return (
        <>
          <span className="font-semibold">{docType}</span>{' '}
          <span>{docNumber}</span>
        </>
      );
    }
    // Si no se puede separar, mostrar tal como está
    return document;
  };

  const handleDelete = (client: Cliente) => {
    if (onDeleteClient) {
      onDeleteClient(client);
    }
    setMenuOpenId(null);
  };

  const handleOptionsClick = (clientId: number) => {
    setMenuOpenId(menuOpenId === clientId ? null : clientId);
  };

  return (
    <>
      <style>{`
        .row-disabled { 
          color: #9ca3af;
        }
        .row-disabled .font-medium {
          color: #9ca3af;
        }
        .row-disabled svg {
          color: #9ca3af;
        }
        /* El menú desplegable mantiene colores normales */
        .row-disabled .absolute.right-0.mt-2 {
          color: #374151;
        }
        .row-disabled .absolute.right-0.mt-2 button {
          color: #374151;
        }
        .row-disabled .absolute.right-0.mt-2 .text-red-600 {
          color: #dc2626 !important;
        }
        
        /* Estilos para filtros underlined */
        .filter-underlined {
          border: none;
          border-bottom: 1px solid #e5e7eb;
          background: transparent;
          padding: 8px 0;
          font-size: 14px;
          width: 100%;
          transition: all 0.2s ease;
          color: #374151;
        }
        .dark .filter-underlined {
          color: #d1d5db;
          border-bottom-color: #4b5563;
        }
        .filter-underlined:focus {
          outline: none;
          border-bottom-color: #3b82f6;
          border-bottom-width: 2px;
        }
        .filter-underlined.has-value {
          border-bottom-color: #3b82f6;
          border-bottom-width: 2px;
        }
        .filter-underlined::placeholder {
          color: #9ca3af;
        }
        .dark .filter-underlined::placeholder {
          color: #6b7280;
        }
          color: #9ca3af;
          font-size: 13px;
          font-style: italic;
        }
        
        /* Estilo especial para el select */
        .filter-underlined select {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 4px center;
          background-size: 16px;
          padding-right: 20px;
        }
      `}</style>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden w-full mx-0 px-0 relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed" style={{ minWidth: '1200px' }}>
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              {/* Fila de encabezados con filtros intercambiables */}
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-700 dark:text-gray-300 text-sm" style={{ width: '25%' }}>
                  {activeFilters.name ? (
                    <input
                      type="text"
                      value={filters.name}
                      onChange={(e) => handleFilterChange('name', e.target.value)}
                      className={`filter-underlined ${filters.name ? 'has-value' : ''}`}
                      placeholder="Nombre / Razón Social"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Nombre / Razón Social</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        viewBox="0 0 24 24"
                        onClick={() => toggleFilter()}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '15%' }}>
                  {activeFilters.document ? (
                    <input
                      type="text"
                      value={filters.document}
                      onChange={(e) => handleFilterChange('document', e.target.value)}
                      className={`filter-underlined ${filters.document ? 'has-value' : ''}`}
                      placeholder="Documento"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Documento</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        viewBox="0 0 24 24"
                        onClick={() => toggleFilter()}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '8%' }}>
                  {activeFilters.type ? (
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                      className={`filter-underlined ${filters.type ? 'has-value' : ''}`}
                      autoFocus
                    >
                      <option value="">Todos</option>
                      {uniqueTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Tipo</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        viewBox="0 0 24 24"
                        onClick={() => toggleFilter()}
                      >
                        <path d="M4 7h16M4 12h16M4 17h16" />
                      </svg>
                    </div>
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '30%' }}>
                  {activeFilters.address ? (
                    <input
                      type="text"
                      value={filters.address}
                      onChange={(e) => handleFilterChange('address', e.target.value)}
                      className={`filter-underlined ${filters.address ? 'has-value' : ''}`}
                      placeholder="Dirección"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Dirección</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        viewBox="0 0 24 24"
                        onClick={() => toggleFilter()}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                  )}
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '12%' }}>
                  {activeFilters.phone ? (
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(e) => handleFilterChange('phone', e.target.value)}
                      className={`filter-underlined ${filters.phone ? 'has-value' : ''}`}
                      placeholder="Teléfono"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>Teléfono</span>
                      <svg 
                        className="w-4 h-4 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth={2} 
                        viewBox="0 0 24 24"
                        onClick={() => toggleFilter()}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                  )}
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-700 text-sm" style={{ width: '10%' }}>
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {clientes.map(client => (
                <tr 
                  key={client.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer${!client.enabled ? ' row-disabled' : ''}`}
                  onClick={(e) => handleRowClick(client, e)}
                >
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium break-words whitespace-normal" style={{ width: '25%' }}>{client.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white break-words whitespace-normal" style={{ width: '15%' }}>
                    {renderDocument(client.document)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white break-words whitespace-normal" style={{ width: '8%' }}>{client.type}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white break-words whitespace-normal" style={{ width: '30%' }}>{client.address}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white break-words whitespace-normal" style={{ width: '12%' }}>{client.phone}</td>
                  <td className="px-4 py-2 text-right" style={{ width: '10%' }}>
                    <div className="flex items-center justify-between">
                      <button
                        className="group p-1 rounded focus:outline-none"
                        title="Historial"
                        onClick={() => navigate(`/clientes/${client.id}/${encodeURIComponent(client.name)}/historial`)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500 hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      </button>
                      <div className="relative" style={{ display: 'inline-block' }}>
                        <button
                          className="group p-1 rounded focus:outline-none"
                          title="Opciones"
                          onClick={() => handleOptionsClick(client.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500 hover:text-gray-700 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="19" cy="12" r="2" />
                          </svg>
                        </button>
                        {menuOpenId === client.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              onClick={() => handleToggleEnabled(client.id)}
                            >
                              {client.enabled ? 'Deshabilitar' : 'Habilitar'}
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                              onClick={() => handleEdit(client)}
                            >
                              Editar
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm hover:bg-red-100 text-red-600"
                              onClick={() => handleDelete(client)}
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
});

export default ClientesTable;