// src/features/gestion-inventario/components/disponibilidad/DisponibilidadTable.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  DisponibilidadItem,
  DensidadTabla,
  ColumnaDisponibilidad,
  OrdenamientoDisponibilidad,
  SituacionStock
} from '../../models/disponibilidad.types';

type ThresholdField = 'stockMinimo' | 'stockMaximo';

interface ThresholdUpdatePayload {
  productoId: string;
  field: ThresholdField;
  value: number | null;
}

interface EditingCellState {
  key: string;
  productId: string;
  field: ThresholdField;
  value: string;
  originalValue: string;
}

interface DisponibilidadTableProps {
  datos: DisponibilidadItem[];
  densidad: DensidadTabla;
  columnasVisibles: ColumnaDisponibilidad[];
  ordenamiento: OrdenamientoDisponibilidad;
  onOrdenamientoChange: (campo: ColumnaDisponibilidad) => void;
  onAjustarStock?: (item: DisponibilidadItem) => void;
  canEditThresholds: boolean;
  editThresholdMessage?: string;
  onUpdateThreshold?: (payload: ThresholdUpdatePayload) => Promise<void> | void;
  selectedWarehouseName?: string;
}

const DisponibilidadTable: React.FC<DisponibilidadTableProps> = ({
  datos,
  densidad,
  columnasVisibles,
  ordenamiento,
  onOrdenamientoChange,
  onAjustarStock,
  canEditThresholds,
  editThresholdMessage,
  onUpdateThreshold,
  selectedWarehouseName
}) => {
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [savingCellId, setSavingCellId] = useState<string | null>(null);
  const [cellErrors, setCellErrors] = useState<Record<string, string>>({});
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  const editingCellKey = editingCell?.key;

  useEffect(() => {
    if (editingCellKey && activeInputRef.current) {
      activeInputRef.current.focus();
      activeInputRef.current.select();
    }
  }, [editingCellKey]);

  const getCellKey = useCallback((productId: string, field: ThresholdField) => `${productId}-${field}` , []);

  const formatThresholdValue = useCallback((value?: number) => (
    typeof value === 'number' ? value.toLocaleString() : '—'
  ), []);

  const cleanupCellError = useCallback((cellKey: string) => {
    setCellErrors(prev => {
      if (!prev[cellKey]) {
        return prev;
      }
      const next = { ...prev };
      delete next[cellKey];
      return next;
    });
  }, []);

  const cancelEditing = useCallback(() => {
    if (editingCell) {
      cleanupCellError(editingCell.key);
    }
    setEditingCell(null);
    activeInputRef.current = null;
  }, [editingCell, cleanupCellError]);

  const sanitizeNumericInput = useCallback((rawValue: string) => {
    const digitsAndDot = rawValue.replace(/[^0-9.]/g, '');
    return digitsAndDot.replace(/\.(?=.*\.)/g, '');
  }, []);

  const parseInputValue = useCallback((rawValue: string): number | null | undefined => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
      return undefined;
    }
    return parsed;
  }, []);

  const valuesAreEqual = useCallback((a: number | null, b: number | null) => {
    if (a === null && b === null) {
      return true;
    }
    if (a === null || b === null) {
      return false;
    }
    return Math.abs(a - b) < 1e-9;
  }, []);

  const getThresholdValue = useCallback((item: DisponibilidadItem, field: ThresholdField) => (
    field === 'stockMinimo' ? item.stockMinimo : item.stockMaximo
  ), []);

  const validateValue = useCallback((
    item: DisponibilidadItem,
    field: ThresholdField,
    nextValue: number | null
  ): string | null => {
    if (nextValue !== null && nextValue < 0) {
      return 'Debe ser mayor o igual a 0';
    }

    const otherValue = field === 'stockMinimo' ? item.stockMaximo : item.stockMinimo;

    if (nextValue !== null && otherValue !== undefined) {
      if (field === 'stockMinimo' && otherValue < nextValue) {
        return 'El mínimo no puede ser mayor que el máximo';
      }
      if (field === 'stockMaximo' && nextValue < otherValue) {
        return 'El máximo debe ser mayor o igual al mínimo';
      }
    }

    return null;
  }, []);

  const commitEdit = useCallback(async (
    item: DisponibilidadItem,
    field: ThresholdField
  ) => {
    if (!editingCell || editingCell.productId !== item.productoId || editingCell.field !== field) {
      return;
    }

    const cellKey = editingCell.key;
    const parsedCurrent = parseInputValue(editingCell.value);

    if (parsedCurrent === undefined) {
      setCellErrors(prev => ({ ...prev, [cellKey]: 'Ingresa un número válido' }));
      return;
    }

    const parsedOriginal = parseInputValue(editingCell.originalValue);

    if (parsedOriginal === undefined) {
      // Estado original siempre debería ser válido, pero prevenimos fallos
      cleanupCellError(cellKey);
    }

    if (valuesAreEqual(parsedOriginal ?? null, parsedCurrent)) {
      cancelEditing();
      return;
    }

    const validationMessage = validateValue(item, field, parsedCurrent);
    if (validationMessage) {
      setCellErrors(prev => ({ ...prev, [cellKey]: validationMessage }));
      return;
    }

    if (!onUpdateThreshold) {
      cancelEditing();
      return;
    }

    setSavingCellId(cellKey);
    try {
      await onUpdateThreshold({
        productoId: item.productoId,
        field,
        value: parsedCurrent
      });
      cleanupCellError(cellKey);
      cancelEditing();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el cambio';
      setCellErrors(prev => ({ ...prev, [cellKey]: message }));
    } finally {
      setSavingCellId(null);
    }
  }, [editingCell, parseInputValue, valuesAreEqual, validateValue, onUpdateThreshold, cleanupCellError, cancelEditing]);

  const handleBlur = useCallback((item: DisponibilidadItem, field: ThresholdField) => {
    if (savingCellId) {
      return;
    }
    void commitEdit(item, field);
  }, [commitEdit, savingCellId]);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLInputElement>,
    item: DisponibilidadItem,
    field: ThresholdField
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commitEdit(item, field);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditing();
    }
  }, [commitEdit, cancelEditing]);

  const startEditing = useCallback((item: DisponibilidadItem, field: ThresholdField) => {
    if (!canEditThresholds || savingCellId) {
      return;
    }
    const currentValue = getThresholdValue(item, field);
    const cellKey = getCellKey(item.productoId, field);
    setEditingCell({
      key: cellKey,
      productId: item.productoId,
      field,
      value: typeof currentValue === 'number' ? String(currentValue) : '',
      originalValue: typeof currentValue === 'number' ? String(currentValue) : ''
    });
    cleanupCellError(cellKey);
  }, [canEditThresholds, savingCellId, getThresholdValue, getCellKey, cleanupCellError]);

  const tooltipMessage = canEditThresholds
    ? selectedWarehouseName
      ? `Editar para ${selectedWarehouseName}`
      : 'Editar valor'
    : editThresholdMessage ?? 'Selecciona un establecimiento y un almacén para configurar mínimos/máximos';
  // Clases según densidad - MÁS COMPACTO
  const densidadClasses = {
    compacta: 'py-1.5 px-2.5 text-xs',
    comoda: 'py-2.5 px-3.5 text-sm',
    espaciosa: 'py-3.5 px-4.5 text-base'
  };

  const cellClass = densidadClasses[densidad];
  const thresholdTextSize = {
    compacta: 'text-xs',
    comoda: 'text-sm',
    espaciosa: 'text-base'
  }[densidad];

  // Renderizar badge de situación - ESTILO NEUTRO TIPO JIRA
  const renderSituacionBadge = (situacion: SituacionStock) => {
    switch (situacion) {
      case 'OK':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
            OK
          </span>
        );
      case 'Bajo':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
            Bajo
          </span>
        );
      case 'Crítico':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
            Crítico
          </span>
        );
      case 'Sin stock':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
            Sin stock
          </span>
        );
    }
  };

  // Renderizar header con ordenamiento
  const renderHeader = (
    campo: ColumnaDisponibilidad,
    label: string,
    align: 'left' | 'center' | 'right' = 'left',
    sortable: boolean = true
  ) => {
    if (!columnasVisibles.includes(campo)) return null;

    const isOrdenado = ordenamiento.campo === campo;
    const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

    // Sticky columns para Código y Producto
    const stickyClasses = campo === 'codigo'
      ? 'sticky left-0 z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
      : campo === 'producto'
      ? 'sticky left-[100px] z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]'
      : '';

    return (
      <th
        key={campo}
        scope="col"
        className={`${cellClass} ${alignClass} ${stickyClasses} font-semibold text-[#111827] dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b-2 border-[#E5E7EB] dark:border-gray-700 sticky top-0 z-10`}
      >
        {sortable ? (
          <button
            onClick={() => onOrdenamientoChange(campo)}
            className="inline-flex items-center gap-1.5 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] transition-colors duration-150"
          >
            <span>{label}</span>
            {isOrdenado && (
              <svg
                className={`w-4 h-4 transition-transform ${
                  ordenamiento.direccion === 'desc' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        ) : (
          <span>{label}</span>
        )}
      </th>
    );
  };

  const renderThresholdCell = (item: DisponibilidadItem, field: ThresholdField) => {
    if (!columnasVisibles.includes(field)) {
      return null;
    }

    const cellKey = getCellKey(item.productoId, field);
    const isEditing = editingCell?.key === cellKey;
    const isSaving = savingCellId === cellKey;
    const value = getThresholdValue(item, field);
    const errorMessage = cellErrors[cellKey];

    const inputRef = (node: HTMLInputElement | null) => {
      if (isEditing) {
        activeInputRef.current = node;
      }
    };

    const baseClasses = `${cellClass} text-right`;

    if (isEditing) {
      return (
        <td key={field} className={baseClasses}>
          <div className="flex flex-col items-end gap-1">
            <div className="flex w-full items-center justify-end gap-2">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                className={`w-24 h-8 rounded-md border border-gray-300 bg-transparent px-2 text-right tabular-nums text-gray-900 shadow-sm focus:border-[#6F36FF] focus:ring-2 focus:ring-[#6F36FF]/30 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-100 ${thresholdTextSize}`}
                value={editingCell?.value ?? ''}
                onChange={(event) => {
                  const nextValue = sanitizeNumericInput(event.target.value);
                  setEditingCell(prev => (prev && prev.key === cellKey ? { ...prev, value: nextValue } : prev));
                }}
                onBlur={() => handleBlur(item, field)}
                onKeyDown={(event) => handleKeyDown(event, item, field)}
                disabled={isSaving}
                placeholder="No configurado"
                autoFocus
              />
              {isSaving && (
                <svg
                  className="h-4 w-4 animate-spin text-[#6F36FF]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              )}
            </div>
            {errorMessage && (
              <span className="text-[11px] text-red-500 dark:text-red-400">{errorMessage}</span>
            )}
          </div>
        </td>
      );
    }

    return (
      <td key={field} className={baseClasses}>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => startEditing(item, field)}
            disabled={!canEditThresholds || Boolean(savingCellId)}
            title={tooltipMessage ?? undefined}
            className={`w-full text-right ${thresholdTextSize} font-medium tabular-nums ${
              canEditThresholds ? 'text-gray-900 dark:text-gray-100 hover:text-[#6F36FF]' : 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {formatThresholdValue(value)}
          </button>
          {errorMessage && (
            <span className="text-[11px] text-red-500 dark:text-red-400">{errorMessage}</span>
          )}
        </div>
      </td>
    );
  };

  // Si no hay datos
  if (datos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <svg
          className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No hay productos para mostrar
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ajusta los filtros para ver los datos de inventario
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-[#E5E7EB] dark:border-gray-700 rounded-lg shadow-sm">
      <table className="min-w-full divide-y divide-[#E5E7EB] dark:divide-gray-700">
        <thead>
          <tr>
            {renderHeader('codigo', 'Código', 'left', true)}
            {renderHeader('producto', 'Producto', 'left', true)}
            {renderHeader('unidadMinima', 'Unidad mínima', 'center', false)}
            {renderHeader('real', 'Real', 'right', true)}
            {renderHeader('reservado', 'Reservado', 'right', true)}
            {renderHeader('disponible', 'Disponible', 'right', true)}
            {renderHeader('stockMinimo', 'Stock mínimo', 'right', false)}
            {renderHeader('stockMaximo', 'Stock máximo', 'right', false)}
            {renderHeader('situacion', 'Estado', 'center', true)}
            {renderHeader('acciones', 'Acciones', 'center', false)}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
          {datos.map((item, index) => (
            <tr
              key={`${item.productoId}-${index}`}
              data-focus={`inventario:sku:${item.sku ?? item.productoId ?? index}`}
              className="hover:bg-[#6F36FF]/5 dark:hover:bg-[#6F36FF]/8 transition-colors duration-150"
            >
              {/* Código - STICKY */}
              {columnasVisibles.includes('codigo') && (
                <td className={`${cellClass} font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]`}>
                  {item.sku}
                </td>
              )}

              {/* Producto - STICKY */}
              {columnasVisibles.includes('producto') && (
                <td className={`${cellClass} text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 sticky left-[100px] z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]`}>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.nombre}</span>
                    {item.stockMinimo !== undefined && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Min: {item.stockMinimo}
                        {item.stockMaximo !== undefined && ` | Max: ${item.stockMaximo}`}
                      </span>
                    )}
                  </div>
                </td>
              )}

              {/* Unidad mínima */}
              {columnasVisibles.includes('unidadMinima') && (
                <td className={`${cellClass} text-center text-gray-700 dark:text-gray-300 uppercase`}>
                  {item.unidadMinima || '—'}
                </td>
              )}

              {/* Real */}
              {columnasVisibles.includes('real') && (
                <td className={`${cellClass} text-right font-medium text-gray-900 dark:text-gray-100`}>
                  {item.real.toLocaleString()}
                </td>
              )}

              {/* Reservado - COLOR SEMÁNTICO #D97706 */}
              {columnasVisibles.includes('reservado') && (
                <td className={`${cellClass} text-right text-[#4B5563] dark:text-gray-400`}>
                  {item.reservado > 0 ? (
                    <span className="font-medium text-[#D97706] dark:text-[#F59E0B] tabular-nums">
                      {item.reservado.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
              )}

              {/* Disponible - COLORES SEMÁNTICOS: OK #10B981, Sin stock #EF4444 */}
              {columnasVisibles.includes('disponible') && (
                <td className={`${cellClass} text-right`}>
                  <span
                    className={`font-bold tabular-nums ${
                      item.disponible === 0
                        ? 'text-[#EF4444] dark:text-[#F87171]'
                        : typeof item.stockMinimo === 'number' && item.disponible <= item.stockMinimo
                        ? 'text-[#D97706] dark:text-[#F59E0B]'
                        : 'text-[#10B981] dark:text-[#34D399]'
                    }`}
                  >
                    {item.disponible.toLocaleString()}
                  </span>
                </td>
              )}

              {/* Stock mínimo */}
              {renderThresholdCell(item, 'stockMinimo')}

              {/* Stock máximo */}
              {renderThresholdCell(item, 'stockMaximo')}

              {/* Situación */}
              {columnasVisibles.includes('situacion') && (
                <td className={`${cellClass} text-center`}>
                  {renderSituacionBadge(item.situacion)}
                </td>
              )}

              {/* Acciones */}
              {columnasVisibles.includes('acciones') && (
                <td className={`${cellClass} text-center`}>
                  <button
                    onClick={() => onAjustarStock?.(item)}
                    className="inline-flex items-center justify-center w-8 h-8 text-[#4B5563] dark:text-gray-400 hover:text-[#6F36FF] dark:hover:text-[#8B5CF6] hover:bg-[#6F36FF]/8 dark:hover:bg-[#6F36FF]/15 rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6F36FF]/35 focus:ring-offset-1"
                    title="Ajustar stock (Alt+E)"
                    aria-label={`Ajustar stock de ${item.nombre}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DisponibilidadTable;
