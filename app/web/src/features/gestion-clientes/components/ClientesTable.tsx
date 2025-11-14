import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cliente } from '../models';

export type ClientesTableProps = {
  clients: Cliente[];
  onEditClient?: (client: Cliente) => void;
  onDeleteClient?: (client: Cliente) => void;
  onFiltersActiveChange?: (active: boolean) => void;
};

export interface ClientesTableRef {
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
}

// Helper para obtener label de tipo documento
const getTipoDocLabel = (codigo?: string): string => {
  const map: Record<string, string> = {
    '0': 'OTRO', '1': 'DNI', '4': 'CE', '6': 'RUC', '7': 'PAS',
    'A': 'CED', 'B': 'DOC', 'C': 'TIN', 'D': 'IN', 'E': 'TAM',
    'F': 'PTP', 'G': 'SAL', 'H': 'CPP'
  };
  return map[codigo || ''] || codigo || '-';
};

// Helper para formatear fecha
const formatDate = (date?: string): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '-';
  }
};

// Helper para badge Si/No
const Badge: React.FC<{ value: boolean | undefined; label?: string }> = ({ value, label }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
    value ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  }`}>
    {label || (value ? 'Sí' : 'No')}
  </span>
);

const ClientesTable = forwardRef<ClientesTableRef, ClientesTableProps>(({ clients, onEditClient, onDeleteClient }, ref) => {
  const navigate = useNavigate();
  const [menuOpenId, setMenuOpenId] = useState<number | string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>(clients);
  
  // Sincronizar clientes con props
  useEffect(() => {
    setClientes(clients);
  }, [clients]);

  // Funciones de referencia
  const clearAllFilters = () => {
    // Placeholder para filtros futuros
  };

  const hasInternalActiveFilters = false;

  useImperativeHandle(ref, () => ({
    clearAllFilters,
    hasActiveFilters: () => hasInternalActiveFilters
  }));

  const handleToggleEnabled = (id: number | string) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    setMenuOpenId(null);
  };

  const handleEdit = (client: Cliente) => {
    onEditClient?.(client);
    setMenuOpenId(null);
  };

  const handleDelete = (client: Cliente) => {
    onDeleteClient?.(client);
    setMenuOpenId(null);
  };

  const handleOptionsClick = (id: number | string) => {
    setMenuOpenId(menuOpenId === id ? null : id);
  };

  const renderDocument = (doc: string) => {
    if (!doc) return '-';
    if (doc.length === 8) return `DNI ${doc}`;
    if (doc.length === 11) return `RUC ${doc}`;
    return doc;
  };

  return (
    <>
      <style>{`
        .row-disabled {
          opacity: 0.5;
        }
        .compact-table th,
        .compact-table td {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 8px 12px !important;
          font-size: 13px !important;
        }
        .compact-table th {
          font-weight: 600;
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }
        .dark .compact-table th {
          background: #374151;
          border-bottom-color: #4b5563;
        }
        .compact-table tbody tr:hover {
          background: #f3f4f6 !important;
        }
        .dark .compact-table tbody tr:hover {
          background: #4b5563 !important;
        }
      `}</style>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full compact-table" style={{ minWidth: '3500px' }}>
            <thead>
              <tr>
                {/* Columnas prioritarias */}
                <th style={{ width: '80px' }}>Tipo doc.</th>
                <th style={{ width: '120px' }}>N° documento</th>
                <th style={{ width: '220px' }}>Nombre / Razón social</th>
                <th style={{ width: '200px' }}>Dirección</th>
                <th style={{ width: '100px' }}>Tipo cuenta</th>
                <th style={{ width: '90px' }}>Tipo persona</th>
                <th style={{ width: '110px' }}>Teléfono</th>
                <th style={{ width: '180px' }}>Correo</th>
                
                {/* Datos adicionales */}
                <th style={{ width: '150px' }}>Nombre comercial</th>
                <th style={{ width: '140px' }}>Página web</th>
                <th style={{ width: '80px' }}>País</th>
                <th style={{ width: '120px' }}>Departamento</th>
                <th style={{ width: '120px' }}>Provincia</th>
                <th style={{ width: '120px' }}>Distrito</th>
                <th style={{ width: '80px' }}>Ubigeo</th>
                <th style={{ width: '150px' }}>Referencia</th>
                
                {/* Configuración comercial */}
                <th style={{ width: '100px' }}>Forma pago</th>
                <th style={{ width: '90px' }}>Moneda</th>
                <th style={{ width: '140px' }}>Lista precios</th>
                <th style={{ width: '140px' }}>Usuario asignado</th>
                <th style={{ width: '110px' }}>Cliente default</th>
                
                {/* Información SUNAT */}
                <th style={{ width: '180px' }}>Tipo contribuyente</th>
                <th style={{ width: '100px' }}>Estado contrib.</th>
                <th style={{ width: '110px' }}>Condición dom.</th>
                <th style={{ width: '100px' }}>Fecha insc.</th>
                <th style={{ width: '120px' }}>Sistema emisión</th>
                <th style={{ width: '110px' }}>Emisor electr.</th>
                <th style={{ width: '110px' }}>Agente reten.</th>
                <th style={{ width: '110px' }}>Agente percep.</th>
                <th style={{ width: '120px' }}>Buen contrib.</th>
                <th style={{ width: '130px' }}>Except. percep.</th>
                <th style={{ width: '250px' }}>Actividades econ.</th>
                
                {/* Adicionales */}
                <th style={{ width: '200px' }}>Observaciones</th>
                <th style={{ width: '90px' }}>Adjuntos</th>
                <th style={{ width: '100px' }}>Estado</th>
                <th style={{ width: '110px' }}>Fecha registro</th>
                <th style={{ width: '110px' }}>Últ. modif.</th>
                
                {/* Acciones */}
                <th style={{ width: '100px' }} className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {clientes.map(client => {
                const nombreCompleto = client.nombreCompleto || client.name;
                const actividadPrincipal = client.actividadesEconomicas?.find(a => a.esPrincipal) || client.actividadesEconomicas?.[0];
                
                return (
                  <tr 
                    key={client.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors${!client.enabled ? ' row-disabled' : ''}`}
                  >
                    <td>{getTipoDocLabel(client.tipoDocumento)}</td>
                    <td>{client.numeroDocumento || renderDocument(client.document)}</td>
                    <td className="font-medium" title={nombreCompleto}>{nombreCompleto}</td>
                    <td title={client.direccion || client.address}>{client.direccion || client.address || '-'}</td>
                    <td>{client.tipoCuenta || client.type}</td>
                    <td>{client.tipoPersona || '-'}</td>
                    <td>{client.telefonos?.[0]?.numero || client.phone || '-'}</td>
                    <td title={client.emails?.[0] || client.email}>{client.emails?.[0] || client.email || '-'}</td>
                    
                    <td>{client.nombreComercial || '-'}</td>
                    <td title={client.paginaWeb}>{client.paginaWeb || '-'}</td>
                    <td>{client.pais || '-'}</td>
                    <td>{client.departamento || '-'}</td>
                    <td>{client.provincia || '-'}</td>
                    <td>{client.distrito || '-'}</td>
                    <td>{client.ubigeo || '-'}</td>
                    <td title={client.referenciaDireccion}>{client.referenciaDireccion || '-'}</td>
                    
                    <td>{client.formaPago || '-'}</td>
                    <td>{client.monedaPreferida || '-'}</td>
                    <td>{client.listaPrecio || '-'}</td>
                    <td>{client.usuarioAsignado || '-'}</td>
                    <td><Badge value={client.clientePorDefecto} /></td>
                    
                    <td title={client.tipoContribuyente}>{client.tipoContribuyente || '-'}</td>
                    <td>{client.estadoContribuyente || '-'}</td>
                    <td>{client.condicionDomicilio || '-'}</td>
                    <td>{formatDate(client.fechaInscripcion)}</td>
                    <td>{client.sistemaEmision || '-'}</td>
                    <td><Badge value={client.esEmisorElectronico} /></td>
                    <td><Badge value={client.esAgenteRetencion} /></td>
                    <td><Badge value={client.esAgentePercepcion} /></td>
                    <td><Badge value={client.esBuenContribuyente} /></td>
                    <td><Badge value={client.exceptuadaPercepcion} /></td>
                    <td title={actividadPrincipal ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}` : '-'}>
                      {actividadPrincipal ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}` : '-'}
                    </td>
                    
                    <td title={client.observaciones}>{client.observaciones || '-'}</td>
                    <td>{client.adjuntos?.length ? `${client.adjuntos.length} archivo(s)` : '-'}</td>
                    <td>
                      <Badge value={client.enabled} label={client.estadoCliente || (client.enabled ? 'Activo' : 'Inactivo')} />
                    </td>
                    <td>{formatDate(client.fechaRegistro || client.createdAt)}</td>
                    <td>{formatDate(client.fechaUltimaModificacion || client.updatedAt)}</td>
                    
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                          title="Historial"
                          onClick={() => navigate(`/clientes/${client.id}/${encodeURIComponent(nombreCompleto)}/historial`)}
                        >
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        </button>
                        <div className="relative">
                          <button
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                            onClick={() => handleOptionsClick(client.id)}
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                          {menuOpenId === client.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                              <button
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleToggleEnabled(client.id)}
                              >
                                {client.enabled ? 'Deshabilitar' : 'Habilitar'}
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                onClick={() => handleEdit(client)}
                              >
                                Editar
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-100 text-red-600"
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
                );
              })}
            </tbody>
          </table>
        </div>
        {clientes.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No hay clientes para mostrar
          </div>
        )}
      </div>
    </>
  );
});

ClientesTable.displayName = 'ClientesTable';

export default ClientesTable;
