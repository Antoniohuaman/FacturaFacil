import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import type { Cliente, ClienteArchivo, PersistedFile, DocumentType } from '../models';
import { getDocLabelFromCode, isSunatDocCode, documentCodeFromType } from '../utils/documents';
import { CLIENTE_COLUMN_DEFINITIONS, type ClienteColumnId } from '../hooks/useClientesColumns';
import { usePriceProfilesCatalog } from '../../lista-precios/hooks/usePriceProfilesCatalog';

type ClientesTableProps = {
  clients: Cliente[];
  visibleColumnIds: ClienteColumnId[];
  onEditClient?: (client: Cliente) => void;
  onDeleteClient?: (client: Cliente) => void;
};

interface ClientesTableRef {
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
const extractDocumentType = (client: Cliente): string => {
  const code = (client.tipoDocumento ?? '').trim();
  const number = (client.numeroDocumento ?? '').trim();
  if (isSunatDocCode(code)) {
    if (code === '6') return 'RUC';
    if (code === '1') return 'DNI';
    if (code === '0' || !number) return 'Sin documento';
    return getDocLabelFromCode(code);
  }
  const legacy = (client.document ?? '').trim();
  if (!legacy || legacy === 'Sin documento') return 'Sin documento';
  const firstToken = legacy.split(' ')[0]?.toUpperCase();
  if (firstToken === 'RUC') return 'RUC';
  if (firstToken === 'DNI') return 'DNI';
  const normalizedCode = documentCodeFromType(firstToken as DocumentType);
  return normalizedCode ? getDocLabelFromCode(normalizedCode) : 'Documento';
};

/**
 * Extrae el número de documento del campo "document" legacy
 */
const extractDocumentNumber = (client: Cliente): string => {
  const number = (client.numeroDocumento ?? '').trim();
  const code = (client.tipoDocumento ?? '').trim();
  if (isSunatDocCode(code)) {
    return number || '-';
  }
  const legacy = (client.document ?? '').trim();
  if (!legacy || legacy === 'Sin documento') return '-';
  const parts = legacy.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : legacy;
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

const COLUMN_WIDTHS: Partial<Record<ClienteColumnId, number>> = {
  avatar: 60,
  tipoDocumento: 80,
  numeroDocumento: 120,
  nombreRazonSocial: 220,
  direccion: 200,
  tipoCuenta: 100,
  telefono: 110,
  correo: 180,
  tipoPersona: 90,
  nombreComercial: 150,
  paginaWeb: 140,
  pais: 80,
  departamento: 120,
  provincia: 120,
  distrito: 120,
  ubigeo: 80,
  referenciaDireccion: 150,
  formaPago: 100,
  monedaPreferida: 90,
  listaPrecio: 140,
  usuarioAsignado: 140,
  clientePorDefecto: 110,
  tipoContribuyente: 180,
  estadoSunat: 120,
  condicionDomicilio: 110,
  fechaInscripcion: 100,
  sistemaEmision: 120,
  esEmisorElectronico: 110,
  esAgenteRetencion: 110,
  esAgentePercepcion: 110,
  esBuenContribuyente: 120,
  exceptuadaPercepcion: 130,
  actividadesEconomicas: 250,
  observaciones: 200,
  adjuntos: 90,
  imagenes: 90,
  estadoCliente: 120,
  fechaRegistro: 110,
  fechaUltimaModificacion: 110,
  acciones: 100
};

type ClienteActividad = NonNullable<Cliente['actividadesEconomicas']>[number];

interface RowRenderContext {
  client: Cliente;
  tipoDoc: string;
  numeroDoc: string;
  direccion: string;
  avatarUrl?: string;
  actividadPrincipal?: ClienteActividad;
  perfilPrecioLabel?: string;
  navigate: ReturnType<typeof useNavigate>;
  handleOptionsClick: (id: number | string, event: React.MouseEvent<HTMLButtonElement>) => void;
  rowKey: string | number;
}

interface RenderedCell {
  content: React.ReactNode;
  title?: string;
  className?: string;
  stopClickPropagation?: boolean;
}

const getColumnStyle = (columnId: ClienteColumnId): React.CSSProperties | undefined => {
  const width = COLUMN_WIDTHS[columnId];
  return width ? { width: `${width}px` } : undefined;
};

const renderHeaderCell = (columnId: ClienteColumnId) => {
  const style = getColumnStyle(columnId);
  const label = COLUMN_DEFINITION_MAP.get(columnId)?.label ?? columnId;
  const className = columnId === 'acciones' ? 'text-right' : undefined;
  return (
    <th key={columnId} style={style} className={className}>
      {label}
    </th>
  );
};

const buildCellContent = (columnId: ClienteColumnId, context: RowRenderContext): RenderedCell => {
  const { client, tipoDoc, numeroDoc, direccion, avatarUrl, actividadPrincipal, perfilPrecioLabel, navigate, handleOptionsClick } = context;
  switch (columnId) {
    case 'avatar':
      return {
        content: (
          <div className="flex justify-center">
            <ClienteAvatar name={client.name} imageUrl={avatarUrl} />
          </div>
        )
      };
    case 'tipoDocumento':
      return { content: tipoDoc, title: tipoDoc };
    case 'numeroDocumento':
      return { content: numeroDoc };
    case 'nombreRazonSocial':
      return {
        content: <span className="font-medium">{client.name}</span>,
        title: client.name
      };
    case 'direccion':
      return { content: direccion, title: direccion };
    case 'tipoCuenta':
      return { content: client.type };
    case 'telefono': {
      const phonesDetail = client.telefonos?.map((t) => `${t.tipo}: ${t.numero}`).join(', ') || client.phone || undefined;
      const phonesValue = client.telefonos?.length
        ? client.telefonos.map((t) => t.numero).join(', ')
        : renderText(client.phone);
      return { content: phonesValue, title: phonesDetail };
    }
    case 'correo': {
      const emailsDetail = client.emails?.join(', ') || client.email || undefined;
      const emailsValue = client.emails?.length ? client.emails.join(', ') : renderText(client.email);
      return { content: emailsValue, title: emailsDetail };
    }
    case 'tipoPersona':
      return { content: renderText(client.tipoPersona) };
    case 'nombreComercial':
      return { content: renderText(client.nombreComercial) };
    case 'paginaWeb':
      return { content: renderText(client.paginaWeb), title: client.paginaWeb ?? undefined };
    case 'pais':
      return { content: renderText(client.pais) };
    case 'departamento':
      return { content: renderText(client.departamento) };
    case 'provincia':
      return { content: renderText(client.provincia) };
    case 'distrito':
      return { content: renderText(client.distrito) };
    case 'ubigeo':
      return { content: renderText(client.ubigeo) };
    case 'referenciaDireccion':
      return {
        content: renderText(client.referenciaDireccion),
        title: client.referenciaDireccion ?? undefined
      };
    case 'formaPago':
      return { content: renderText(client.formaPago) };
    case 'monedaPreferida':
      return { content: renderText(client.monedaPreferida) };
    case 'listaPrecio':
      return { content: renderText(perfilPrecioLabel) };
    case 'usuarioAsignado':
      return { content: renderText(client.usuarioAsignado) };
    case 'clientePorDefecto':
      return { content: <BooleanBadge value={client.clientePorDefecto} /> };
    case 'tipoContribuyente':
      return {
        content: renderText(client.tipoContribuyente),
        title: client.tipoContribuyente ?? undefined
      };
    case 'estadoSunat':
      return { content: <EstadoSunatBadge estado={client.estadoContribuyente} /> };
    case 'condicionDomicilio':
      return { content: renderText(client.condicionDomicilio) };
    case 'fechaInscripcion':
      return { content: formatDate(client.fechaInscripcion) };
    case 'sistemaEmision':
      return { content: renderText(client.sistemaEmision) };
    case 'esEmisorElectronico':
      return { content: <BooleanBadge value={client.esEmisorElectronico} /> };
    case 'esAgenteRetencion':
      return { content: <BooleanBadge value={client.esAgenteRetencion} /> };
    case 'esAgentePercepcion':
      return { content: <BooleanBadge value={client.esAgentePercepcion} /> };
    case 'esBuenContribuyente':
      return { content: <BooleanBadge value={client.esBuenContribuyente} /> };
    case 'exceptuadaPercepcion':
      return { content: <BooleanBadge value={client.exceptuadaPercepcion} /> };
    case 'actividadesEconomicas': {
      const actividadLabel = actividadPrincipal
        ? `${actividadPrincipal.codigo} - ${actividadPrincipal.descripcion}`
        : '-';
      return {
        content: actividadLabel,
        title: actividadPrincipal ? actividadLabel : undefined
      };
    }
    case 'observaciones': {
      const notes = client.observaciones || client.additionalData;
      return { content: renderText(notes), title: notes ?? undefined };
    }
    case 'adjuntos':
      return {
        content: client.adjuntos?.length ? `${client.adjuntos.length} archivo(s)` : '-'
      };
    case 'imagenes':
      return {
        content: client.imagenes?.length ? `${client.imagenes.length} imagen(es)` : '-'
      };
    case 'estadoCliente':
      return {
        content: <EstadoClienteBadge estadoCliente={client.estadoCliente} enabled={client.enabled} />
      };
    case 'fechaRegistro':
      return { content: formatDate(client.createdAt) };
    case 'fechaUltimaModificacion':
      return { content: formatDate(client.updatedAt) };
    case 'acciones':
      return {
        content: (
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
        ),
        className: 'text-right',
        stopClickPropagation: true
      };
    default: {
      const fallbackValue = (client as unknown as Record<string, unknown>)[columnId];
      return { content: renderText(typeof fallbackValue === 'string' ? fallbackValue : undefined) };
    }
  }
};

const renderCell = (columnId: ClienteColumnId, context: RowRenderContext) => {
  const cell = buildCellContent(columnId, context);
  const style = getColumnStyle(columnId);
  const props: React.TdHTMLAttributes<HTMLTableCellElement> = {};
  if (cell.title) {
    props.title = cell.title;
  }
  if (cell.className) {
    props.className = cell.className;
  }
  if (cell.stopClickPropagation) {
    props.onClick = (event) => event.stopPropagation();
  }
  return (
    <td key={`${context.rowKey}-${columnId}`} style={style} {...props}>
      {cell.content}
    </td>
  );
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
  ({ clients, visibleColumnIds, onEditClient, onDeleteClient }, ref) => {
    const navigate = useNavigate();
    const { resolveProfileLabel } = usePriceProfilesCatalog();
    const [menuOpenId, setMenuOpenId] = useState<number | string | null>(null);
    const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [clientes, setClientes] = useState<Cliente[]>(clients);
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
                <tr>{visibleColumnIds.map((columnId) => renderHeaderCell(columnId))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {clientes.map((client) => {
                  const tipoDoc = extractDocumentType(client);
                  const numeroDoc = extractDocumentNumber(client);
                  const direccion = client.address === 'Sin dirección' ? '-' : client.address;
                  const avatarUrl = getClienteAvatarUrl(client.imagenes);
                  const focusKey = client.id ?? client.numeroDocumento ?? client.document ?? 'sin-id';
                  const actividadPrincipal = client.actividadesEconomicas?.find((a) => a.esPrincipal) || client.actividadesEconomicas?.[0];
                  const perfilPrecioLabel = resolveProfileLabel(client.listaPrecio);
                  const rowContext: RowRenderContext = {
                    client,
                    tipoDoc,
                    numeroDoc,
                    direccion,
                    avatarUrl,
                    actividadPrincipal,
                    perfilPrecioLabel,
                    navigate,
                    handleOptionsClick,
                    rowKey: focusKey
                  };

                  return (
                    <tr
                      key={focusKey}
                      data-focus={`clientes:${String(focusKey)}`}
                      className={!client.enabled ? 'row-disabled' : ''}
                      onClick={() => handleEdit(client)}
                    >
                      {visibleColumnIds.map((columnId) => renderCell(columnId, rowContext))}
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
