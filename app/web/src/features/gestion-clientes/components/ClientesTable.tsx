import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Cliente, ClienteArchivo, PersistedFile } from '../models';
import { CLIENTE_COLUMN_DEFINITIONS, type ClienteColumnId } from '../hooks/useClientesColumns';

export type ClientesTableProps = {
  clients: Cliente[];
  visibleColumnIds: ClienteColumnId[];
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

const COLUMN_DEFINITION_MAP = new Map(
  CLIENTE_COLUMN_DEFINITIONS.map((column) => [column.id, column])
);

const MENU_WIDTH = 208;

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
  ({ clients, visibleColumnIds, onEditClient, onDeleteClient }, ref) => {
    const navigate = useNavigate();
    const [menuOpenId, setMenuOpenId] = useState<number | string | null>(null);
    const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>(clients);
    const visibilitySet = useMemo(() => new Set<ClienteColumnId>(visibleColumnIds), [visibleColumnIds]);
    const isColumnVisible = (columnId: ClienteColumnId): boolean => {
      const definition = COLUMN_DEFINITION_MAP.get(columnId);
      if (definition?.fixed) {
        return true;
      }
      return visibilitySet.has(columnId);
    };
    const activeClient = useMemo(() => clientes.find((client) => client.id === menuOpenId) ?? null, [clientes, menuOpenId]);
    const closeMenu = useCallback(() => {
      setMenuOpenId(null);
      setMenuCoords(null);
    }, []);

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
      closeMenu();
    };

    const handleEdit = (client: Cliente) => {
      onEditClient?.(client);
      closeMenu();
    };

    const handleDelete = (client: Cliente) => {
      onDeleteClient?.(client);
      closeMenu();
    };

    const handleOptionsClick = (id: number | string, e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (menuOpenId === id) {
        closeMenu();
        return;
      }

      if (typeof window === 'undefined') {
        setMenuOpenId(id);
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const margin = 16;
      const scrollX = window.scrollX ?? window.pageXOffset;
      const scrollY = window.scrollY ?? window.pageYOffset;
      const minLeft = scrollX + margin;
      const maxLeft = Math.max(minLeft, scrollX + window.innerWidth - MENU_WIDTH - margin);
      const desiredLeft = scrollX + rect.right - MENU_WIDTH;
      const left = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
      const top = scrollY + rect.bottom + 6;

      setMenuCoords({ top, left });
      setMenuOpenId(id);
    };

    // Cerrar menú al hacer click fuera
    useEffect(() => {
      if (menuOpenId === null) {
        return undefined;
      }

      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && menuRef.current.contains(event.target as Node)) {
          return;
        }
        closeMenu();
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpenId, closeMenu]);

    useEffect(() => {
      if (menuOpenId === null || typeof window === 'undefined') {
        return undefined;
      }

      const handleScroll = () => closeMenu();
      window.addEventListener('scroll', handleScroll, true);
      return () => window.removeEventListener('scroll', handleScroll, true);
    }, [menuOpenId, closeMenu]);

    const portalTarget = typeof window === 'undefined' ? null : document.body;
    const menuPortal =
      portalTarget && menuOpenId !== null && menuCoords && activeClient
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-40">
              <div
                ref={menuRef}
                className="pointer-events-auto rounded-lg border border-gray-200 bg-white py-1 shadow-2xl dark:border-gray-600 dark:bg-gray-800"
                style={{ position: 'absolute', top: menuCoords.top, left: menuCoords.left, width: MENU_WIDTH }}
              >
                <button
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleEnabled(activeClient);
                  }}
                >
                  {activeClient.enabled ? 'Deshabilitar' : 'Habilitar'}
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleEdit(activeClient);
                  }}
                >
                  Editar
                </button>
                <button
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(activeClient);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>,
            portalTarget
          )
        : null;

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
        `}</style>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full compact-table" style={{ minWidth: '1200px' }}>
              <thead>
                <tr>
                  {isColumnVisible('avatar') && <th style={{ width: '60px' }}>Avatar</th>}
                  {isColumnVisible('tipoDocumento') && <th style={{ width: '80px' }}>Tipo doc.</th>}
                  {isColumnVisible('numeroDocumento') && <th style={{ width: '120px' }}>N° documento</th>}
                  {isColumnVisible('nombreRazonSocial') && <th style={{ width: '220px' }}>Nombre / Razón social</th>}
                  {isColumnVisible('direccion') && <th style={{ width: '200px' }}>Dirección</th>}
                  {isColumnVisible('tipoCuenta') && <th style={{ width: '100px' }}>Tipo cuenta</th>}
                  {isColumnVisible('telefono') && <th style={{ width: '110px' }}>Teléfono</th>}
                  {isColumnVisible('correo') && <th style={{ width: '180px' }}>Correo</th>}

                  {isColumnVisible('tipoPersona') && <th style={{ width: '90px' }}>Tipo persona</th>}
                  {isColumnVisible('nombreComercial') && <th style={{ width: '150px' }}>Nombre comercial</th>}
                  {isColumnVisible('paginaWeb') && <th style={{ width: '140px' }}>Página web</th>}
                  {isColumnVisible('pais') && <th style={{ width: '80px' }}>País</th>}
                  {isColumnVisible('departamento') && <th style={{ width: '120px' }}>Departamento</th>}
                  {isColumnVisible('provincia') && <th style={{ width: '120px' }}>Provincia</th>}
                  {isColumnVisible('distrito') && <th style={{ width: '120px' }}>Distrito</th>}
                  {isColumnVisible('ubigeo') && <th style={{ width: '80px' }}>Ubigeo</th>}
                  {isColumnVisible('referenciaDireccion') && <th style={{ width: '150px' }}>Referencia</th>}

                  {isColumnVisible('formaPago') && <th style={{ width: '100px' }}>Forma pago</th>}
                  {isColumnVisible('monedaPreferida') && <th style={{ width: '90px' }}>Moneda</th>}
                  {isColumnVisible('listaPrecio') && <th style={{ width: '140px' }}>Lista precios</th>}
                  {isColumnVisible('usuarioAsignado') && <th style={{ width: '140px' }}>Usuario asignado</th>}
                  {isColumnVisible('clientePorDefecto') && <th style={{ width: '110px' }}>Cliente default</th>}

                  {isColumnVisible('tipoContribuyente') && <th style={{ width: '180px' }}>Tipo contribuyente</th>}
                  {isColumnVisible('estadoSunat') && <th style={{ width: '120px' }}>Estado SUNAT</th>}
                  {isColumnVisible('condicionDomicilio') && <th style={{ width: '110px' }}>Condición dom.</th>}
                  {isColumnVisible('fechaInscripcion') && <th style={{ width: '100px' }}>Fecha insc.</th>}
                  {isColumnVisible('sistemaEmision') && <th style={{ width: '120px' }}>Sistema emisión</th>}
                  {isColumnVisible('esEmisorElectronico') && <th style={{ width: '110px' }}>Emisor electr.</th>}
                  {isColumnVisible('esAgenteRetencion') && <th style={{ width: '110px' }}>Agente reten.</th>}
                  {isColumnVisible('esAgentePercepcion') && <th style={{ width: '110px' }}>Agente percep.</th>}
                  {isColumnVisible('esBuenContribuyente') && <th style={{ width: '120px' }}>Buen contrib.</th>}
                  {isColumnVisible('exceptuadaPercepcion') && <th style={{ width: '130px' }}>Except. percep.</th>}
                  {isColumnVisible('actividadesEconomicas') && <th style={{ width: '250px' }}>Actividades econ.</th>}

                  {isColumnVisible('observaciones') && <th style={{ width: '200px' }}>Observaciones</th>}
                  {isColumnVisible('adjuntos') && <th style={{ width: '90px' }}>Adjuntos</th>}
                  {isColumnVisible('imagenes') && <th style={{ width: '90px' }}>Imágenes</th>}
                  {isColumnVisible('estadoCliente') && <th style={{ width: '120px' }}>Estado cliente</th>}
                  {isColumnVisible('fechaRegistro') && <th style={{ width: '110px' }}>Fecha registro</th>}
                  {isColumnVisible('fechaUltimaModificacion') && <th style={{ width: '110px' }}>Últ. modif.</th>}

                  {isColumnVisible('acciones') && (
                    <th style={{ width: '100px' }} className="text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {clientes.map(client => {
                  // Extraer datos del formato legacy
                  const tipoDoc = extractDocumentType(client.document);
                  const numeroDoc = extractDocumentNumber(client.document);
                  const direccion = client.address === 'Sin dirección' ? '-' : client.address;
                  const avatarUrl = getClienteAvatarUrl(client.imagenes);
                  const focusKey = client.id ?? client.numeroDocumento ?? client.document ?? 'sin-id';
                  
                  // Actividad económica principal (si existe)
                  const actividadPrincipal = client.actividadesEconomicas?.find(a => a.esPrincipal) 
                    || client.actividadesEconomicas?.[0];

                  return (
                    <tr 
                      key={client.id} 
                      data-focus={`clientes:${String(focusKey)}`}
                      className={!client.enabled ? 'row-disabled' : ''}
                      onClick={() => handleEdit(client)}
                    >
                      {isColumnVisible('avatar') && (
                        <td>
                          <div className="flex justify-center">
                            <ClienteAvatar name={client.name} imageUrl={avatarUrl} />
                          </div>
                        </td>
                      )}

                      {isColumnVisible('tipoDocumento') && <td>{tipoDoc}</td>}
                      {isColumnVisible('numeroDocumento') && <td>{numeroDoc}</td>}
                      {isColumnVisible('nombreRazonSocial') && (
                        <td className="font-medium" title={client.name}>
                          {client.name}
                        </td>
                      )}
                      {isColumnVisible('direccion') && <td title={direccion}>{direccion}</td>}
                      {isColumnVisible('tipoCuenta') && <td>{client.type}</td>}
                      {isColumnVisible('telefono') && (
                        <td title={client.telefonos?.map(t => `${t.tipo}: ${t.numero}`).join(', ') || client.phone}>
                          {client.telefonos?.length ? client.telefonos.map(t => t.numero).join(', ') : renderText(client.phone)}
                        </td>
                      )}
                      {isColumnVisible('correo') && (
                        <td title={client.emails?.join(', ') || client.email}>
                          {client.emails?.length ? client.emails.join(', ') : renderText(client.email)}
                        </td>
                      )}

                      {isColumnVisible('tipoPersona') && <td>{renderText(client.tipoPersona)}</td>}
                      {isColumnVisible('nombreComercial') && <td>{renderText(client.nombreComercial)}</td>}
                      {isColumnVisible('paginaWeb') && <td title={client.paginaWeb}>{renderText(client.paginaWeb)}</td>}
                      {isColumnVisible('pais') && <td>{renderText(client.pais)}</td>}
                      {isColumnVisible('departamento') && <td>{renderText(client.departamento)}</td>}
                      {isColumnVisible('provincia') && <td>{renderText(client.provincia)}</td>}
                      {isColumnVisible('distrito') && <td>{renderText(client.distrito)}</td>}
                      {isColumnVisible('ubigeo') && <td>{renderText(client.ubigeo)}</td>}
                      {isColumnVisible('referenciaDireccion') && (
                        <td title={client.referenciaDireccion}>{renderText(client.referenciaDireccion)}</td>
                      )}

                      {isColumnVisible('formaPago') && <td>{renderText(client.formaPago)}</td>}
                      {isColumnVisible('monedaPreferida') && <td>{renderText(client.monedaPreferida)}</td>}
                      {isColumnVisible('listaPrecio') && <td>{renderText(client.listaPrecio)}</td>}
                      {isColumnVisible('usuarioAsignado') && <td>{renderText(client.usuarioAsignado)}</td>}
                      {isColumnVisible('clientePorDefecto') && (
                        <td>
                          <BooleanBadge value={client.clientePorDefecto} />
                        </td>
                      )}

                      {isColumnVisible('tipoContribuyente') && (
                        <td title={client.tipoContribuyente}>{renderText(client.tipoContribuyente)}</td>
                      )}
                      {isColumnVisible('estadoSunat') && (
                        <td>
                          <EstadoSunatBadge estado={client.estadoContribuyente} />
                        </td>
                      )}
                      {isColumnVisible('condicionDomicilio') && <td>{renderText(client.condicionDomicilio)}</td>}
                      {isColumnVisible('fechaInscripcion') && <td>{formatDate(client.fechaInscripcion)}</td>}
                      {isColumnVisible('sistemaEmision') && <td>{renderText(client.sistemaEmision)}</td>}
                      {isColumnVisible('esEmisorElectronico') && (
                        <td>
                          <BooleanBadge value={client.esEmisorElectronico} />
                        </td>
                      )}
                      {isColumnVisible('esAgenteRetencion') && (
                        <td>
                          <BooleanBadge value={client.esAgenteRetencion} />
                        </td>
                      )}
                      {isColumnVisible('esAgentePercepcion') && (
                        <td>
                          <BooleanBadge value={client.esAgentePercepcion} />
                        </td>
                      )}
                      {isColumnVisible('esBuenContribuyente') && (
                        <td>
                          <BooleanBadge value={client.esBuenContribuyente} />
                        </td>
                      )}
                      {isColumnVisible('exceptuadaPercepcion') && (
                        <td>
                          <BooleanBadge value={client.exceptuadaPercepcion} />
                        </td>
                      )}
                      {isColumnVisible('actividadesEconomicas') && (
                        <td title={actividadPrincipal ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}` : '-'}>
                          {actividadPrincipal
                            ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}`
                            : '-'}
                        </td>
                      )}

                      {isColumnVisible('observaciones') && (
                        <td title={client.observaciones || client.additionalData}>
                          {renderText(client.observaciones || client.additionalData)}
                        </td>
                      )}
                      {isColumnVisible('adjuntos') && (
                        <td>{client.adjuntos?.length ? `${client.adjuntos.length} archivo(s)` : '-'}</td>
                      )}
                      {isColumnVisible('imagenes') && (
                        <td>{client.imagenes?.length ? `${client.imagenes.length} imagen(es)` : '-'}</td>
                      )}
                      {isColumnVisible('estadoCliente') && (
                        <td>
                          <EstadoClienteBadge estadoCliente={client.estadoCliente} enabled={client.enabled} />
                        </td>
                      )}
                      {isColumnVisible('fechaRegistro') && <td>{formatDate(client.createdAt)}</td>}
                      {isColumnVisible('fechaUltimaModificacion') && <td>{formatDate(client.updatedAt)}</td>}

                      {isColumnVisible('acciones') && (
                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
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

                            </div>
                          </div>
                        </td>
                      )}
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
        {menuPortal}
      </>
    );
  }
);

ClientesTable.displayName = 'ClientesTable';

export default ClientesTable;
