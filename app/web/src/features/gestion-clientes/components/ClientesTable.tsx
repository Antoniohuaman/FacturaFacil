import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Cliente, ClienteArchivo, PersistedFile } from '../models';

export type ClientesTableProps = {
  clients: Cliente[];
  onEditClient?: (client: Cliente) => void;
  onDeleteClient?: (client: Cliente) => void;
};

export interface ClientesTableRef {
  clearAllFilters: () => void;
  hasActiveFilters: () => boolean;
}

// ============================================================================
// HELPERS - Extraer datos del formato legacy del backend
// ============================================================================

/**
 * Extrae el tipo de documento del campo "document" legacy
 * Formato: "RUC 20123456789" o "DNI 12345678"
 */
const extractDocumentType = (document: string): string => {
  if (!document || document === 'Sin documento') return '-';
  
  const parts = document.split(' ');
  if (parts.length > 1) {
    const typeMap: Record<string, string> = {
      'RUC': 'RUC',
      'DNI': 'DNI',
      'CARNET_EXTRANJERIA': 'CE',
      'PASAPORTE': 'PAS',
      'NO_DOMICILIADO': 'OTRO'
    };
    return typeMap[parts[0]] || parts[0];
  }
  
  // Inferir por longitud si no tiene prefijo
  if (document.length === 11) return 'RUC';
  if (document.length === 8) return 'DNI';
  return '-';
};

/**
 * Extrae el número de documento del campo "document" legacy
 */
const extractDocumentNumber = (document: string): string => {
  if (!document || document === 'Sin documento') return '-';
  const parts = document.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : document;
};

/**
 * Formatea fecha en formato peruano (dd/mm/yyyy)
 */
const formatDate = (date?: string | null): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('es-PE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  } catch {
    return '-';
  }
};

/**
 * Renderiza texto nullable: null/undefined/vacío → "-"
 */
const renderText = (value?: string | null): string => {
  return value && value.trim() !== '' ? value : '-';
};

const isPersistedFile = (file: ClienteArchivo | null | undefined): file is PersistedFile => {
  return Boolean(file && typeof (file as PersistedFile).dataUrl === 'string');
};

const getClienteAvatarUrl = (imagenes?: ClienteArchivo[] | null): string | undefined => {
  if (!imagenes || imagenes.length === 0) return undefined;
  const persisted = imagenes.find(isPersistedFile);
  return persisted?.dataUrl;
};

/**
 * Componente Badge para valores booleanos
 * Distingue entre false (muestra "No") y null/undefined (muestra "-")
 */
const BooleanBadge: React.FC<{ value?: boolean | null }> = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>;
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      value 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }`}>
      {value ? 'Sí' : 'No'}
    </span>
  );
};

/**
 * Badge de estado del cliente (Habilitado/Deshabilitado según estadoCliente)
 */
const EstadoClienteBadge: React.FC<{ estadoCliente?: string; enabled: boolean }> = ({ estadoCliente, enabled }) => {
  // Priorizar estadoCliente si existe, sino usar enabled
  const estado = estadoCliente || (enabled ? 'Habilitado' : 'Deshabilitado');
  const isHabilitado = estado === 'Habilitado' || enabled;
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      isHabilitado
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }`}>
      {estado}
    </span>
  );
};

/**
 * Badge de estado de SUNAT (Activo/Inactivo/etc)
 */
const EstadoSunatBadge: React.FC<{ estado?: string }> = ({ estado }) => {
  if (!estado) return <span className="text-gray-400 dark:text-gray-500 text-xs">-</span>;
  
  const esActivo = estado.toUpperCase() === 'ACTIVO';
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
      esActivo
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    }`}>
      {estado}
    </span>
  );
};

/**
 * Avatar circular con iniciales del cliente
 */
const ClienteAvatar: React.FC<{ name: string; imageUrl?: string }> = ({ name, imageUrl }) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  if (imageUrl) {
    return (
      <img 
        src={imageUrl} 
        alt={name} 
        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
      />
    );
  }
  
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-gray-200 dark:border-gray-600">
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{initials}</span>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ClientesTable = forwardRef<ClientesTableRef, ClientesTableProps>(
  ({ clients, onEditClient, onDeleteClient }, ref) => {
    const navigate = useNavigate();
    const [menuOpenId, setMenuOpenId] = useState<number | string | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>(clients);

    // Sincronizar con props
    useEffect(() => {
      setClientes(clients);
    }, [clients]);

    // Implementar ref API
    useImperativeHandle(ref, () => ({
      clearAllFilters: () => {
        // Placeholder para filtros futuros
      },
      hasActiveFilters: () => false
    }));

    // Handlers
    const handleToggleEnabled = (client: Cliente) => {
      // La lógica de toggle debe estar en el padre (ClientesPage)
      // Aquí solo actualizamos el estado local para feedback inmediato
      setClientes(prev => 
        prev.map(c => c.id === client.id ? { ...c, enabled: !c.enabled } : c)
      );
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

    const handleOptionsClick = (id: number | string, e: React.MouseEvent) => {
      e.stopPropagation();
      setMenuOpenId(menuOpenId === id ? null : id);
    };

    // Cerrar menú al hacer click fuera
    useEffect(() => {
      const handleClickOutside = () => setMenuOpenId(null);
      if (menuOpenId !== null) {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
      }
    }, [menuOpenId]);

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
            position: sticky;
            top: 0;
            z-index: 10;
          }
          .dark .compact-table th {
            background: #374151;
            border-bottom-color: #4b5563;
          }
          .compact-table tbody tr {
            cursor: pointer;
          }
          .compact-table tbody tr:hover {
            background: #f3f4f6 !important;
          }
          .dark .compact-table tbody tr:hover {
            background: #4b5563 !important;
          }
          .menu-dropdown {
            position: absolute;
            right: 0;
            top: 100%;
            z-index: 9999 !important;
            min-width: 144px;
          }
          .actions-cell {
            position: relative;
          }
        `}</style>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full compact-table" style={{ minWidth: '3700px' }}>
              <thead>
                <tr>
                  {/* Avatar */}
                  <th style={{ width: '60px' }}>Avatar</th>
                  
                  {/* Columnas prioritarias - Datos que SÍ vienen del backend */}
                  <th style={{ width: '80px' }}>Tipo doc.</th>
                  <th style={{ width: '120px' }}>N° documento</th>
                  <th style={{ width: '220px' }}>Nombre / Razón social</th>
                  <th style={{ width: '200px' }}>Dirección</th>
                  <th style={{ width: '100px' }}>Tipo cuenta</th>
                  <th style={{ width: '110px' }}>Teléfono</th>
                  <th style={{ width: '180px' }}>Correo</th>

                  {/* Columnas extendidas */}
                  <th style={{ width: '90px' }}>Tipo persona</th>
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

                  {/* Información SUNAT - Solo lectura */}
                  <th style={{ width: '180px' }}>Tipo contribuyente</th>
                  <th style={{ width: '120px' }}>Estado SUNAT</th>
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
                  <th style={{ width: '90px' }}>Imágenes</th>
                  <th style={{ width: '120px' }}>Estado cliente</th>
                  <th style={{ width: '110px' }}>Fecha registro</th>
                  <th style={{ width: '110px' }}>Últ. modif.</th>

                  {/* Acciones */}
                  <th style={{ width: '100px' }} className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {clientes.map(client => {
                  // Extraer datos del formato legacy
                  const tipoDoc = extractDocumentType(client.document);
                  const numeroDoc = extractDocumentNumber(client.document);
                  const direccion = client.address === 'Sin dirección' ? '-' : client.address;
                  const avatarUrl = getClienteAvatarUrl(client.imagenes);
                  
                  // Actividad económica principal (si existe)
                  const actividadPrincipal = client.actividadesEconomicas?.find(a => a.esPrincipal) 
                    || client.actividadesEconomicas?.[0];

                  return (
                    <tr 
                      key={client.id} 
                      className={!client.enabled ? 'row-disabled' : ''}
                      onClick={() => handleEdit(client)}
                    >
                      {/* Avatar */}
                      <td>
                        <div className="flex justify-center">
                          <ClienteAvatar name={client.name} imageUrl={avatarUrl} />
                        </div>
                      </td>
                      
                      {/* Datos reales del backend */}
                      <td>{tipoDoc}</td>
                      <td>{numeroDoc}</td>
                      <td className="font-medium" title={client.name}>{client.name}</td>
                      <td title={direccion}>{direccion}</td>
                      <td>{client.type}</td>
                      <td title={client.telefonos?.map(t => `${t.tipo}: ${t.numero}`).join(', ') || client.phone}>
                        {client.telefonos?.length ? client.telefonos.map(t => t.numero).join(', ') : renderText(client.phone)}
                      </td>
                      <td title={client.emails?.join(', ') || client.email}>
                        {client.emails?.length ? client.emails.join(', ') : renderText(client.email)}
                      </td>

                      {/* Campos extendidos */}
                      <td>{renderText(client.tipoPersona)}</td>
                      <td>{renderText(client.nombreComercial)}</td>
                      <td title={client.paginaWeb}>{renderText(client.paginaWeb)}</td>
                      <td>{renderText(client.pais)}</td>
                      <td>{renderText(client.departamento)}</td>
                      <td>{renderText(client.provincia)}</td>
                      <td>{renderText(client.distrito)}</td>
                      <td>{renderText(client.ubigeo)}</td>
                      <td title={client.referenciaDireccion}>{renderText(client.referenciaDireccion)}</td>

                      {/* Configuración comercial */}
                      <td>{renderText(client.formaPago)}</td>
                      <td>{renderText(client.monedaPreferida)}</td>
                      <td>{renderText(client.listaPrecio)}</td>
                      <td>{renderText(client.usuarioAsignado)}</td>
                      <td><BooleanBadge value={client.clientePorDefecto} /></td>

                      {/* SUNAT - Solo lectura */}
                      <td title={client.tipoContribuyente}>{renderText(client.tipoContribuyente)}</td>
                      <td><EstadoSunatBadge estado={client.estadoContribuyente} /></td>
                      <td>{renderText(client.condicionDomicilio)}</td>
                      <td>{formatDate(client.fechaInscripcion)}</td>
                      <td>{renderText(client.sistemaEmision)}</td>
                      <td><BooleanBadge value={client.esEmisorElectronico} /></td>
                      <td><BooleanBadge value={client.esAgenteRetencion} /></td>
                      <td><BooleanBadge value={client.esAgentePercepcion} /></td>
                      <td><BooleanBadge value={client.esBuenContribuyente} /></td>
                      <td><BooleanBadge value={client.exceptuadaPercepcion} /></td>
                      <td title={actividadPrincipal ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}` : '-'}>
                        {actividadPrincipal 
                          ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}` 
                          : '-'}
                      </td>

                      {/* Adicionales */}
                      <td title={client.observaciones || client.additionalData}>
                        {renderText(client.observaciones || client.additionalData)}
                      </td>
                      <td>
                        {client.adjuntos?.length ? `${client.adjuntos.length} archivo(s)` : '-'}
                      </td>
                      <td>
                        {client.imagenes?.length ? `${client.imagenes.length} imagen(es)` : '-'}
                      </td>
                      <td><EstadoClienteBadge estadoCliente={client.estadoCliente} enabled={client.enabled} /></td>
                      <td>{formatDate(client.createdAt)}</td>
                      <td>{formatDate(client.updatedAt)}</td>

                      {/* Acciones */}
                      <td className="text-right actions-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            title="Ver historial"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/clientes/${client.id}/${encodeURIComponent(client.name)}/historial`);
                            }}
                          >
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                              <circle cx="12" cy="12" r="10" />
                            </svg>
                          </button>
                          
                          <div className="relative inline-block">
                            <button
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              onClick={(e) => handleOptionsClick(client.id, e)}
                              title="Más opciones"
                            >
                              <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="5" cy="12" r="2" />
                                <circle cx="12" cy="12" r="2" />
                                <circle cx="19" cy="12" r="2" />
                              </svg>
                            </button>
                            
                            {menuOpenId === client.id && (
                              <div className="menu-dropdown bg-white dark:bg-gray-800 rounded-md shadow-xl border border-gray-200 dark:border-gray-600">
                                <button
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-t-md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleEnabled(client);
                                  }}
                                >
                                  {client.enabled ? 'Deshabilitar' : 'Habilitar'}
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(client);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors rounded-b-md"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(client);
                                  }}
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
  }
);

ClientesTable.displayName = 'ClientesTable';

export default ClientesTable;
