import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Product } from '../../models/types';
import type { Unit } from '../../../configuracion-sistema/modelos/Unit';
import type { Establecimiento } from '../../../configuracion-sistema/modelos/Establecimiento';
import type { ColumnKey } from './columnConfig';
import type { ProductTableColumnState } from '../../hooks/useProductColumnsManager';

const getEstablecimientoShortName = (name: string, maxLength = 18) => {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const words = trimmed.split(' ');
  const candidate = words.slice(0, 2).join(' ');
  if (candidate.length <= maxLength) {
    return candidate;
  }

  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
};

type AvailabilityCellProps = {
  row: Product;
  Establecimientos: Establecimiento[];
  EstablecimientoScope: string;
};

const AvailabilityCell: React.FC<AvailabilityCellProps> = ({ row, Establecimientos, EstablecimientoScope }) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const closeTimerRef = useRef<number | null>(null);

  const enabledActive = useMemo(() => {
    const active = Establecimientos.filter(est => est.isActive);
    const enabledIds = row.disponibleEnTodos ? active.map(est => est.id) : (row.establecimientoIds ?? []);
    return active.filter(est => enabledIds.includes(est.id));
  }, [Establecimientos, row.disponibleEnTodos, row.establecimientoIds]);

  const enabledInScope = useMemo(() => {
    if (EstablecimientoScope === 'ALL') {
      return null;
    }
    return enabledActive.some(est => est.id === EstablecimientoScope) || Boolean(row.disponibleEnTodos);
  }, [enabledActive, EstablecimientoScope, row.disponibleEnTodos]);

  const computePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const popoverWidth = 320;
    const popoverHeight = 280;

    let left = rect.left;
    let top = rect.bottom + gap;

    const maxLeft = Math.max(8, window.innerWidth - popoverWidth - 8);
    left = Math.min(Math.max(8, left), maxLeft);

    const maxTop = Math.max(8, window.innerHeight - popoverHeight - 8);
    if (top > maxTop) {
      top = Math.max(8, rect.top - gap - popoverHeight);
    }

    setPosition({ top, left });
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 80);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    computePosition();

    const handleResize = () => computePosition();
    const handleScroll = () => computePosition();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (EstablecimientoScope !== 'ALL') {
    return (
      <td className="px-6 py-4 whitespace-nowrap bg-purple-50/50 dark:bg-purple-900/10">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            enabledInScope ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {enabledInScope ? 'Habilitado' : 'Deshabilitado'}
        </span>
      </td>
    );
  }

  if (enabledActive.length === 0) {
    return (
      <td className="px-6 py-4 whitespace-nowrap bg-purple-50/50 dark:bg-purple-900/10">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
          Deshabilitado
        </span>
      </td>
    );
  }

  const visible = enabledActive.slice(0, 2);
  const extraCount = Math.max(0, enabledActive.length - visible.length);
  const popoverId = `product-availability-${row.id}`;

  const popover = open
    ? createPortal(
        <div
          role="tooltip"
          id={popoverId}
          className="fixed z-[80] w-[320px] rounded-lg border border-gray-200 bg-white shadow-lg"
          style={{ top: position.top, left: position.left }}
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          data-no-row-click="true"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-700">Establecimientos habilitados</div>
            <div className="text-[11px] text-gray-500">{enabledActive.length} en total</div>
          </div>
          <ul className="py-2 max-h-64 overflow-auto">
            {enabledActive.map(est => (
              <li key={est.id} className="px-3 py-1.5 text-xs text-gray-700">
                <span className="font-mono font-semibold text-gray-900">{est.code}</span>
                <span className="text-gray-400"> · </span>
                <span>{est.name}</span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )
    : null;

  return (
    <td className="px-6 py-4 whitespace-nowrap bg-purple-50/50 dark:bg-purple-900/10">
      <div
        ref={anchorRef}
        className="inline-flex max-w-[260px] items-center gap-1 overflow-hidden"
        onMouseEnter={() => {
          cancelClose();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(current => !current);
        }}
        aria-describedby={open ? popoverId : undefined}
        data-no-row-click="true"
      >
        {visible.map(est => (
          <span
            key={est.id}
            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-800"
            title={`${est.code} · ${est.name}`}
          >
            <span className="font-mono font-semibold">{est.code}</span>
            <span className="text-purple-500">·</span>
            <span className="truncate">{getEstablecimientoShortName(est.name)}</span>
          </span>
        ))}

        {extraCount > 0 && (
          <span
            className="inline-flex items-center rounded-full bg-purple-200/60 px-2 py-0.5 text-[11px] font-semibold text-purple-900"
            title="Ver todos"
          >
            +{extraCount}
          </span>
        )}

        {popover}
      </div>
    </td>
  );
};

interface ProductTableRowProps {
  row: Product;
  columns: ProductTableColumnState[];
  selected: boolean;
  onToggleSelect: (productId: string, checked: boolean) => void;
  onToggleFavorite: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  units: Unit[];
  Establecimientos: Establecimiento[];
  EstablecimientoScope?: string;
  formatCurrency: (amount: number) => string;
  onRowClick?: (productId: string) => void;
  isActive?: boolean;
}

const getUnitLabel = (units: Unit[], code?: string) => {
  if (!code) return '';
  const unit = units.find(unitItem => unitItem.code === code);
  return unit ? `${unit.code} - ${unit.name}` : code;
};

const formatDate = (value?: Date | string) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export const ProductTableRow: React.FC<ProductTableRowProps> = ({
  row,
  columns,
  selected,
  onToggleSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
  units,
  Establecimientos,
  EstablecimientoScope = 'ALL',
  formatCurrency,
  onRowClick,
  isActive = false
}) => {
  const handleRowClick = (event: React.MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick) {
      return;
    }
    const interactiveElement = (event.target as HTMLElement).closest(
      'button, a, input, label, select, textarea, [role="button"], [data-no-row-click="true"]'
    );
    if (interactiveElement) {
      return;
    }
    onRowClick(row.id);
  };

  const renderColumnCell = (columnKey: ColumnKey): React.ReactElement | null => {
    switch (columnKey) {
      case 'favorito':
        return (
          <td className="px-4 py-4 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onToggleFavorite(row.id)}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400 ${
                row.isFavorite
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label={row.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
              aria-pressed={row.isFavorite ? true : false}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill={row.isFavorite ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118L2.979 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.518-4.674z"
                />
              </svg>
            </button>
          </td>
        );
      case 'codigo':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{row.codigo}</div>
          </td>
        );
      case 'nombre':
        return (
          <td className="px-6 py-4">
            <div className="text-sm font-medium text-gray-900 dark:text-white max-w-xs truncate">{row.nombre}</div>
            {row.descripcion && (
              <div className="text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{row.descripcion}</div>
            )}
          </td>
        );
      case 'establecimiento':
        return (
          <AvailabilityCell row={row} Establecimientos={Establecimientos} EstablecimientoScope={EstablecimientoScope} />
        );
      case 'imagen':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.imagen ? (
              <img
                src={row.imagen}
                alt={row.nombre}
                className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                onError={(event) => {
                  (event.target as HTMLImageElement).src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"%3E%3Crect width="24" height="24" fill="%23f3f4f6"/%3E%3Cpath stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </td>
        );
      case 'unidad':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {getUnitLabel(units, row.unidad)}
            </span>
          </td>
        );
      case 'categoria':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {row.categoria}
            </span>
          </td>
        );
      case 'descripcion':
        return (
          <td className="px-6 py-4">
            {row.descripcion ? (
              <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate">{row.descripcion}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'impuesto':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.impuesto ? (
              <span className="text-sm font-medium text-gray-900">{row.impuesto}</span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'alias':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.alias ? (
              <div className="text-sm text-gray-900">{row.alias}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'precioCompra':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.precioCompra ? (
              <div className="text-sm font-medium text-gray-900">{formatCurrency(row.precioCompra)}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'porcentajeGanancia':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {typeof row.porcentajeGanancia === 'number' ? (
              <div className="text-sm text-gray-900">{row.porcentajeGanancia}%</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'codigoBarras':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.codigoBarras ? (
              <div className="text-sm font-mono text-gray-900">{row.codigoBarras}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'codigoFabrica':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.codigoFabrica ? (
              <div className="text-sm font-mono text-gray-900">{row.codigoFabrica}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'codigoSunat':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.codigoSunat ? (
              <div className="text-sm font-mono text-gray-900">{row.codigoSunat}</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'descuentoProducto':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {typeof row.descuentoProducto === 'number' ? (
              <div className="text-sm text-gray-900">{row.descuentoProducto}%</div>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'marca':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.marca ? <div className="text-sm text-gray-900">{row.marca}</div> : <span className="text-sm text-gray-400">-</span>}
          </td>
        );
      case 'modelo':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.modelo ? <div className="text-sm text-gray-900">{row.modelo}</div> : <span className="text-sm text-gray-400">-</span>}
          </td>
        );
      case 'peso':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.peso ? <div className="text-sm text-gray-900">{row.peso} kg</div> : <span className="text-sm text-gray-400">-</span>}
          </td>
        );
      case 'tipoExistencia':
        return (
          <td className="px-6 py-4 whitespace-nowrap">
            {row.tipoExistencia ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {row.tipoExistencia.replace(/_/g, ' ')}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </td>
        );
      case 'fechaCreacion':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {formatDate(row.fechaCreacion)}
          </td>
        );
      case 'fechaActualizacion':
        return (
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {formatDate(row.fechaActualizacion)}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <tr
      data-focus={`productos:${row.id}`}
      onClick={handleRowClick}
      className={`
        hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${onRowClick ? 'cursor-pointer' : ''}
        ${selected ? 'bg-red-50 dark:bg-red-900/20' : ''}
        ${isActive ? 'ring-1 ring-violet-200 bg-violet-50/60 dark:bg-violet-900/20 dark:ring-violet-500/40' : ''}
      `}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded"
          checked={selected}
          onChange={(event) => onToggleSelect(row.id, event.target.checked)}
        />
      </td>

      {columns.map(column => {
        const cell = renderColumnCell(column.key);
        if (!cell) {
          return null;
        }
        return React.cloneElement(cell, { key: column.key });
      })}

      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(row)}
            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Editar producto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                onDelete(row.id);
              }
            }}
            className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Eliminar producto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          <div className="relative">
            <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-50" title="Más opciones">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
