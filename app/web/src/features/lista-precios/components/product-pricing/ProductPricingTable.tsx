import React, { useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Check, MoreHorizontal, Settings, Loader2, Pencil } from 'lucide-react';
import type { Column, Price, Product } from '../../models/PriceTypes';
import type { EffectivePriceResult, EffectivePriceSource } from '../../utils/priceHelpers';
import {
  formatDate,
  formatPrice,
  getPriceRange,
  getVolumePreview,
  getVolumeTooltip,
  isGlobalColumn
} from '../../utils/priceHelpers';
import type { CellStatus, InlineCellState, UnitOption } from './types';
import { cellKey } from './utils';

type VolumePrice = Extract<Price, { type: 'volume' }>;

type UnitResolver = (product: Product) => string;
type UnitSelectHandler = (product: Product, unitCode: string) => void;
type PriceResolver = (product: Product, columnId: string, unitOverride?: string) => Price | undefined;
type EffectivePriceResolver = (sku: string, columnId: string, unitCode: string) => EffectivePriceResult | undefined;
type InlineEditStarter = (product: Product, column: Column, unitCode?: string) => void;
type VolumeConfigurator = (product: Product, column: Column, unitOverride?: string) => void;

type InlineCommitHandler = () => Promise<void> | void;
type InlineChangeHandler = (value: string) => void;
type InlineCancelHandler = () => void;
type ToggleHandler = (sku: string) => void;

type UnitOptionsResolver = (product: Product) => UnitOption[];
type UnitDisplayResolver = (code: string) => string;
type BaseUnitResolver = (sku: string) => string;

interface ProductPricingTableProps {
  orderedColumns: Column[];
  baseColumnId?: string;
  paginatedProducts: Product[];
  expandedRows: Record<string, boolean>;
  unitMenuOpenSku: string | null;
  rowMenuOpenSku: string | null;
  onToggleUnitMenu: ToggleHandler;
  onToggleRowMenu: ToggleHandler;
  onToggleRowExpansion: ToggleHandler;
  onUnitSelect: UnitSelectHandler;
  getUnitOptions: UnitOptionsResolver;
  resolveActiveUnit: UnitResolver;
  getUnitDisplay: UnitDisplayResolver;
  getBaseUnitForSKU: BaseUnitResolver;
  firstVolumeColumn?: Column;
  onEditProduct: (product: Product) => void;
  onConfigureVolumePrice: VolumeConfigurator;
  getPriceForColumnUnit: PriceResolver;
  resolveEffectivePrice: EffectivePriceResolver;
  isEditingCell: (sku: string, columnId: string, unitCode: string) => boolean;
  beginInlineEdit: InlineEditStarter;
  handleInlineValueChange: InlineChangeHandler;
  commitInlineSave: InlineCommitHandler;
  cancelInlineEdit: InlineCancelHandler;
  cellStatuses: Record<string, CellStatus>;
  cellSavingState: Record<string, boolean>;
  editingCell: InlineCellState | null;
}

export const ProductPricingTable: React.FC<ProductPricingTableProps> = ({
  orderedColumns,
  baseColumnId,
  paginatedProducts,
  expandedRows,
  unitMenuOpenSku,
  rowMenuOpenSku,
  onToggleUnitMenu,
  onToggleRowMenu,
  onToggleRowExpansion,
  onUnitSelect,
  getUnitOptions,
  resolveActiveUnit,
  getUnitDisplay,
  getBaseUnitForSKU,
  firstVolumeColumn,
  onEditProduct,
  onConfigureVolumePrice,
  getPriceForColumnUnit,
  resolveEffectivePrice,
  isEditingCell,
  beginInlineEdit,
  handleInlineValueChange,
  commitInlineSave,
  cancelInlineEdit,
  cellStatuses,
  cellSavingState,
  editingCell
}) => {
  const totalColumns = orderedColumns.length + 5;

  const renderPriceCell = (product: Product, column: Column): React.ReactNode => {
    const activeUnit = resolveActiveUnit(product);
    const price = getPriceForColumnUnit(product, column.id, activeUnit);
    const meta = resolveEffectivePrice(product.sku, column.id, activeUnit);
    const key = cellKey(product.sku, column.id, activeUnit);
    const status = cellStatuses[key];
    const isSaving = !!cellSavingState[key];
    const currentlyEditing = isEditingCell(product.sku, column.id, activeUnit);

    if (column.mode === 'fixed' && isGlobalColumn(column)) {
      return (
        <GlobalRuleCell
          resolvedValue={meta?.value}
          variant="compact"
        />
      );
    }

    if (column.mode === 'fixed') {
      return (
        <FixedPriceCell
          column={column}
          price={price}
          isEditing={currentlyEditing}
          draftValue={currentlyEditing ? editingCell?.value || '' : ''}
          onStartEdit={() => beginInlineEdit(product, column, activeUnit)}
          onChangeValue={handleInlineValueChange}
          onCommit={commitInlineSave}
          onCancel={cancelInlineEdit}
          status={status}
          isSaving={isSaving}
          unitCode={activeUnit}
          isBase={column.id === baseColumnId}
          variant="compact"
          showUnitMeta={false}
          showValidityLabel={false}
          showEmptyHint={false}
          resolvedValue={meta?.value}
          valueSource={meta?.source}
        />
      );
    }

    if (column.mode === 'volume') {
      const isValidPriceType = price?.type === 'volume';
      if (!price) {
        return (
          <VolumePriceCell
            state="empty"
            onConfigure={() => onConfigureVolumePrice(product, column, activeUnit)}
          />
        );
      }

      if (!isValidPriceType) {
        return <span className="text-[12px] text-red-500">Tipo inválido</span>;
      }

      return (
        <VolumePriceCell
          state="filled"
          price={price}
          onConfigure={() => onConfigureVolumePrice(product, column, activeUnit)}
        />
      );
    }

    return <span className="text-xs text-gray-400">Sin configuración</span>;
  };

  if (orderedColumns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">👁️</div>
        <p>No hay columnas visibles en la tabla</p>
        <p className="text-sm">Ve a "Plantilla de columnas" y activa "Visible en tabla" al menos en una columna</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="w-8 text-center py-1.5 px-2" aria-label="Toggle"></th>
            <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[90px] uppercase">
              SKU
            </th>
            <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[220px] uppercase">
              Producto
            </th>
            <th className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[140px] uppercase">
              Unidad
            </th>
            {orderedColumns.map(column => (
              <th
                key={column.id}
                className="text-left py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 min-w-[130px] uppercase"
                title={column.name}
              >
                <span className="text-[11px] text-gray-700 font-semibold normal-case">
                  {column.isBase ? 'Precio base' : column.name}
                </span>
              </th>
            ))}
            <th className="text-right py-1.5 px-3 text-[11px] font-semibold tracking-wide text-gray-600 uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {paginatedProducts.map((product) => (
            <React.Fragment key={product.sku}>
              <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-1.5 px-2 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onToggleRowExpansion(product.sku)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    aria-label={expandedRows[product.sku] ? 'Contraer producto' : 'Expandir producto'}
                    aria-expanded={expandedRows[product.sku]}
                    aria-controls={`product-details-${product.sku}`}
                  >
                    {expandedRows[product.sku] ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                  </button>
                </td>
                <td className="py-1.5 px-3 font-semibold text-gray-900 text-sm align-middle">
                  {product.sku}
                </td>
                <td className="py-1.5 px-3 text-gray-700 align-middle">
                  {product.name}
                </td>
                <td className="py-1.5 px-3 text-gray-700 align-middle">
                    <UnitSelector
                    product={product}
                    options={getUnitOptions(product)}
                    activeUnit={resolveActiveUnit(product)}
                    activeUnitLabel={getUnitDisplay(resolveActiveUnit(product))}
                    baseUnitLabel={getUnitDisplay(getBaseUnitForSKU(product.sku))}
                    isOpen={unitMenuOpenSku === product.sku}
                    onToggle={() => onToggleUnitMenu(product.sku)}
                    onSelect={onUnitSelect}
                  />
                </td>
                {orderedColumns.map(column => (
                  <td key={column.id} className="py-1 px-2 align-middle">
                    {renderPriceCell(product, column)}
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right relative" data-row-menu="true">
                  <button
                    type="button"
                    onClick={() => onToggleRowMenu(product.sku)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                    title="Más acciones"
                    aria-label="Abrir menú de acciones"
                    aria-haspopup="menu"
                    aria-expanded={rowMenuOpenSku === product.sku}
                    aria-controls={`row-menu-${product.sku}`}
                  >
                    <MoreHorizontal size={16} aria-hidden />
                  </button>
                  {rowMenuOpenSku === product.sku && (
                    <div
                      className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white shadow-lg text-sm py-1 z-10"
                      role="menu"
                      id={`row-menu-${product.sku}`}
                      aria-label="Acciones sobre producto"
                    >
                      <button
                        className="w-full text-left px-4 py-2 hover:bg-gray-50"
                        onClick={() => onEditProduct(product)}
                        role="menuitem"
                      >
                        Gestionar precios
                      </button>
                      {firstVolumeColumn && (
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-50"
                          onClick={() => onConfigureVolumePrice(product, firstVolumeColumn, resolveActiveUnit(product))}
                          role="menuitem"
                        >
                          Configurar matriz
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              {expandedRows[product.sku] && (
                <tr className="border-b border-gray-100 bg-gray-50/70" id={`product-details-${product.sku}`}>
                  <td colSpan={totalColumns} className="px-6 py-4">
                    <UnitPricesPanel
                      product={product}
                      columns={orderedColumns}
                      baseColumnId={baseColumnId}
                      getUnitOptions={getUnitOptions}
                      getPriceForColumnUnit={getPriceForColumnUnit}
                      getEffectivePriceMeta={resolveEffectivePrice}
                      isEditingCell={isEditingCell}
                      beginInlineEdit={beginInlineEdit}
                      handleInlineValueChange={handleInlineValueChange}
                      commitInlineSave={commitInlineSave}
                      cancelInlineEdit={cancelInlineEdit}
                      cellStatuses={cellStatuses}
                      cellSavingState={cellSavingState}
                      handleConfigureVolumePrice={onConfigureVolumePrice}
                      editingCell={editingCell}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface UnitSelectorProps {
  product: Product;
  options: UnitOption[];
  activeUnit: string;
  activeUnitLabel: string;
  baseUnitLabel: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: UnitSelectHandler;
}

const UnitSelector: React.FC<UnitSelectorProps> = ({
  product,
  options,
  activeUnit,
  activeUnitLabel,
  baseUnitLabel,
  isOpen,
  onToggle,
  onSelect
}) => {
  const menuId = `unit-menu-${product.sku}`;

  return (
    <div className="relative inline-block" data-unit-selector="true">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 bg-white text-[11px] font-semibold text-gray-700 shadow-sm hover:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
      <span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
      <span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeUnitLabel}</span>
      <ChevronDown size={12} className="text-gray-400" aria-hidden />
      </button>

      {isOpen && (
        <div
          className="absolute z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg p-1"
          role="listbox"
          id={menuId}
          aria-activedescendant={`${product.sku}-${activeUnit}`}
        >
          {options.map(option => (
            <button
              key={`${product.sku}-${option.code}`}
              type="button"
              onClick={() => onSelect(product, option.code)}
              className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-start justify-between gap-2 hover:bg-blue-50 ${option.code === activeUnit ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              role="option"
              aria-selected={option.code === activeUnit}
              id={`${product.sku}-${option.code}`}
            >
              <div>
                <div className="font-semibold flex items-center gap-1">
                  <span>{option.code}</span>
                  <span className="text-[11px] font-normal text-gray-500">{option.label}</span>
                </div>
                {option.factor && (
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    1 {option.code} = {option.factor} {baseUnitLabel}
                  </div>
                )}
              </div>
              {option.code === activeUnit && <Check size={12} className="text-blue-600 mt-1" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface GlobalRuleCellProps {
  resolvedValue?: number;
  variant?: 'default' | 'compact';
}

const GlobalRuleCell: React.FC<GlobalRuleCellProps> = ({ resolvedValue, variant = 'default' }) => {
  const hasValue = typeof resolvedValue === 'number';
  const valueLabel = hasValue ? formatPrice(resolvedValue as number) : '—';
  const spacing = variant === 'compact' ? 'min-h-[44px] py-2' : 'min-h-[60px] py-3';

  return (
    <div className={`w-full px-3 ${spacing} rounded-md border border-transparent bg-transparent flex items-center`}>
      <span className={`text-sm font-semibold ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
        {valueLabel}
      </span>
    </div>
  );
};

interface FixedPriceCellProps {
  column: Column;
  price?: Price;
  isEditing: boolean;
  draftValue: string;
  onStartEdit: () => void;
  onChangeValue: (value: string) => void;
  onCommit: () => Promise<void> | void;
  onCancel: () => void;
  status?: CellStatus;
  isSaving: boolean;
  unitCode?: string;
  isBase?: boolean;
  variant?: 'default' | 'compact';
  showUnitMeta?: boolean;
  showValidityLabel?: boolean;
  showEmptyHint?: boolean;
  resolvedValue?: number;
  valueSource?: EffectivePriceSource;
}

const FixedPriceCell: React.FC<FixedPriceCellProps> = ({
  column,
  price,
  isEditing,
  draftValue,
  onStartEdit,
  onChangeValue,
  onCommit,
  onCancel,
  status,
  isSaving,
  unitCode,
  isBase,
  variant = 'default',
  showUnitMeta = true,
  showValidityLabel = true,
  showEmptyHint = true,
  resolvedValue,
  valueSource
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedUnit = unitCode || '—';
  const isCompact = variant === 'compact';
  const buttonSpacing = isCompact ? 'min-h-[44px] py-2' : 'min-h-[72px] py-3';
  const inputPaddingY = isCompact ? 'py-1' : 'py-1.5';

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, status?.error]);

  const validityLabel = price?.type === 'fixed' && price.validUntil
    ? `Vence ${formatDate(price.validUntil)}`
    : null;

  const rawValue = typeof resolvedValue === 'number'
    ? resolvedValue
    : (price && price.type === 'fixed' ? price.value : undefined);
  const formattedValue = typeof rawValue === 'number' ? formatPrice(rawValue) : '—';
  const resolvedSource = valueSource ?? (price && price.type === 'fixed' ? 'explicit' : 'none');
  const valueClass = typeof rawValue === 'number'
    ? (resolvedSource === 'explicit' ? 'text-gray-900' : 'text-gray-700')
    : 'text-gray-400';

  if (!isEditing) {
    return (
      <button
        className={`group relative w-full text-left px-3 ${buttonSpacing} rounded-md border border-transparent hover:border-gray-200 hover:bg-gray-50 focus:outline-none`}
        onClick={onStartEdit}
      >
        {showUnitMeta && (
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="font-semibold uppercase text-gray-500">{normalizedUnit}</span>
            {isBase && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-semibold">
                Base
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm font-semibold ${valueClass}`}>
            {formattedValue}
          </span>
          {showEmptyHint && typeof rawValue !== 'number' && (
            <span className="text-[11px] text-gray-400">Editar</span>
          )}
        </div>
        {showValidityLabel && validityLabel && (
          <span className="text-[11px] text-gray-500 block mt-1">{validityLabel}</span>
        )}
        <Pencil
          size={14}
          className={`absolute opacity-0 group-hover:opacity-80 text-gray-400 ${showUnitMeta ? 'top-2 right-2' : 'top-1.5 right-1.5'} transition-opacity`}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {showUnitMeta && (
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold uppercase">
          <span>{normalizedUnit}</span>
          {isBase && <span className="text-blue-600">Base</span>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={draftValue}
          onChange={(e) => onChangeValue(e.target.value)}
          onBlur={() => void onCommit()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void onCommit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
          className={`w-full px-2 ${inputPaddingY} rounded border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400`}
        />
        {isSaving && <Loader2 size={16} className="animate-spin text-gray-400" />}
      </div>
      {status?.error && <span className="text-[11px] text-red-500">{status.error}</span>}
      {!status?.error && showValidityLabel && validityLabel && (
        <span className="text-[11px] text-gray-400">{validityLabel}</span>
      )}
      {typeof rawValue !== 'number' && !status?.error && showEmptyHint && (
        <span className="text-[11px] text-gray-400">{column.isBase ? 'Define el precio base' : 'Agregar precio'}</span>
      )}
    </div>
  );
};

type VolumePriceCellProps =
  | { state: 'empty'; price?: undefined; onConfigure: () => void }
  | { state: 'filled'; price: VolumePrice; onConfigure: () => void };

const VolumePriceCell: React.FC<VolumePriceCellProps> = (props) => {
  if (props.state === 'empty') {
    return (
      <button
        className="w-full min-h-[48px] text-left px-3 py-2 rounded-md border border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-200 hover:text-blue-600"
        onClick={props.onConfigure}
      >
        Configurar rangos
      </button>
    );
  }

  const { price, onConfigure } = props;
  return (
    <button
      className="w-full min-h-[48px] text-left px-3 py-2 rounded-md border border-transparent hover:border-blue-200 hover:bg-blue-50/40"
      onClick={onConfigure}
      title={getVolumeTooltip(price.ranges)}
    >
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span className="font-semibold text-gray-800">{getPriceRange(price.ranges)}</span>
        <Settings size={14} className="text-gray-400" aria-hidden />
      </div>
      <div className="text-[11px] text-gray-500 leading-snug">
        {getVolumePreview(price.ranges, 3)}
      </div>
      <div className="text-[11px] text-gray-400 mt-1">Vence {formatDate(price.validUntil)}</div>
    </button>
  );
};

interface UnitPricesPanelProps {
  product: Product;
  columns: Column[];
  baseColumnId?: string;
  getUnitOptions: UnitOptionsResolver;
  getPriceForColumnUnit: PriceResolver;
  getEffectivePriceMeta: EffectivePriceResolver;
  isEditingCell: (sku: string, columnId: string, unitCode: string) => boolean;
  beginInlineEdit: InlineEditStarter;
  handleInlineValueChange: InlineChangeHandler;
  commitInlineSave: InlineCommitHandler;
  cancelInlineEdit: InlineCancelHandler;
  cellStatuses: Record<string, CellStatus>;
  cellSavingState: Record<string, boolean>;
  handleConfigureVolumePrice: VolumeConfigurator;
  editingCell: InlineCellState | null;
}

const UnitPricesPanel: React.FC<UnitPricesPanelProps> = ({
  product,
  columns,
  baseColumnId,
  getUnitOptions,
  getPriceForColumnUnit,
  getEffectivePriceMeta,
  isEditingCell,
  beginInlineEdit,
  handleInlineValueChange,
  commitInlineSave,
  cancelInlineEdit,
  cellStatuses,
  cellSavingState,
  handleConfigureVolumePrice,
  editingCell
}) => {
  const unitOptions = getUnitOptions(product);
  if (unitOptions.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No se encontraron unidades asociadas a este producto.
      </div>
    );
  }

  const baseUnit = unitOptions.find(option => option.isBase) || unitOptions[0];
  const baseUnitCode = baseUnit.code;
  const activeUnitCode = product.activeUnitCode || baseUnitCode;

  const renderUnitPriceCell = (column: Column, unitCode: string) => {
    const price = getPriceForColumnUnit(product, column.id, unitCode);
    const meta = getEffectivePriceMeta(product.sku, column.id, unitCode);
    const key = cellKey(product.sku, column.id, unitCode);
    const status = cellStatuses[key];
    const isSaving = !!cellSavingState[key];
    const editing = isEditingCell(product.sku, column.id, unitCode);
    const draftValue = editing ? editingCell?.value || '' : '';

    if (column.mode === 'fixed' && isGlobalColumn(column)) {
      return (
        <GlobalRuleCell
          resolvedValue={meta?.value}
          variant="compact"
        />
      );
    }

    if (column.mode === 'fixed') {
      return (
        <FixedPriceCell
          column={column}
          price={price}
          isEditing={editing}
          draftValue={draftValue}
          onStartEdit={() => beginInlineEdit(product, column, unitCode)}
          onChangeValue={handleInlineValueChange}
          onCommit={commitInlineSave}
          onCancel={cancelInlineEdit}
          status={status}
          isSaving={isSaving}
          unitCode={unitCode}
          isBase={column.id === baseColumnId}
          variant="compact"
          showUnitMeta={false}
          showValidityLabel
          showEmptyHint={false}
          resolvedValue={meta?.value}
          valueSource={meta?.source}
        />
      );
    }

    if (column.mode === 'volume') {
      const isValidPriceType = price?.type === 'volume';
      const cellContent = !price ? (
        <VolumePriceCell
          state="empty"
          onConfigure={() => handleConfigureVolumePrice(product, column, unitCode)}
        />
      ) : isValidPriceType ? (
        <VolumePriceCell
          state="filled"
          price={price}
          onConfigure={() => handleConfigureVolumePrice(product, column, unitCode)}
        />
      ) : (
        <div className="text-[11px] text-red-500">Tipo inválido</div>
      );

      return (
        <div className="space-y-1">
          {cellContent}
          {status?.error && <p className="text-[10px] text-red-500">{status.error}</p>}
        </div>
      );
    }

    return <span className="text-[11px] text-gray-400">Sin configuración</span>;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-inner">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Unidades y columnas detalladas</p>
          <p className="text-[11px] text-gray-500">Gestiona cada unidad sin salir de la tabla</p>
        </div>
        <span className="text-[11px] text-gray-500">
          {unitOptions.length} unidad{unitOptions.length !== 1 ? 'es' : ''}
        </span>
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-separate border-spacing-y-1">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500">Unidad</th>
              {columns.map(column => (
                <th
                  key={`unit-panel-${column.id}`}
                  className="text-left px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500 min-w-[120px]"
                  title={column.name}
                >
                  <span className="text-[10px] text-gray-600 font-semibold normal-case">
                    {column.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {unitOptions.map(option => (
              <tr key={`${product.sku}-${option.code}`} className="align-top">
                <td className="align-top px-2 py-2">
                  <div className="flex items-center gap-2 text-[12px] text-gray-900 font-semibold">
                    <span>{option.code}</span>
                    {option.isBase && (
                      <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px]">Base</span>
                    )}
                    {option.code === activeUnitCode && (
                      <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200 text-[10px]">Actual</span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500">{option.label}</div>
                  {option.factor && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      1 {option.code} = {option.factor} {baseUnitCode}
                    </div>
                  )}
                </td>
                {columns.map(column => (
                  <td key={`${product.sku}-${option.code}-${column.id}`} className="align-top px-2 py-1">
                    {renderUnitPriceCell(column, option.code)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
