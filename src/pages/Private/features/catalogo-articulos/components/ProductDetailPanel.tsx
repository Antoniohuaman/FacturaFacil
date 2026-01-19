import React, { useMemo } from 'react';
import { DetailPane } from '@/components/layouts/MasterDetail';
import type { Product } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/modelos/Establishment';
import type { Unit } from '../../configuracion-sistema/modelos/Unit';

const UNIT_TYPE_LABELS: Record<string, string> = {
  UNIDADES: 'Unidades',
  PESO: 'Peso',
  VOLUMEN: 'Volumen',
  LONGITUD_AREA: 'Longitud / Área',
  TIEMPO_SERVICIO: 'Tiempo / Servicio'
};

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

type ProductDetailPanelProps = {
  product: Product;
  establishments: Establishment[];
  units: Unit[];
  onEdit: (product: Product) => void;
  onClose: () => void;
};

type InfoItem = {
  label: string;
  value?: React.ReactNode;
};

function formatCurrency(value?: number): string | undefined {
  if (typeof value !== 'number') {
    return undefined;
  }
  return currencyFormatter.format(value);
}

function formatPercent(value?: number): string | undefined {
  if (typeof value !== 'number') {
    return undefined;
  }
  return `${value}%`;
}

function formatDate(value?: Date | string): string | undefined {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return dateFormatter.format(date);
}

function normalizeSentence(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getUnitLabel(units: Unit[], code?: string): string | undefined {
  if (!code) {
    return undefined;
  }
  const unit = units.find((item) => item.code === code);
  if (!unit) {
    return code;
  }
  return `${unit.code} · ${unit.name}`;
}

function renderInfoSection(title: string, items: InfoItem[]) {
  const visibleItems = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
  if (!visibleItems.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-100 bg-white/70 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40"
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</dt>
            <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-50 break-words">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function renderRecordList(
  record?: Record<string, number>,
  resolveLabel?: (key: string) => string,
  emptyLabel?: string
) {
  if (!record) {
    return null;
  }
  const entries = Object.entries(record);
  if (!entries.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-white/70 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/40">
      <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {emptyLabel ?? 'Detalle'}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-slate-600 dark:text-slate-300">{resolveLabel ? resolveLabel(key) : key}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-50">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  product,
  establishments,
  units,
  onEdit,
  onClose
}) => {
  const establishmentsById = useMemo(() => {
    const map = new Map<string, Establishment>();
    establishments.forEach((est) => map.set(est.id, est));
    return map;
  }, [establishments]);

  const subtitleValue = [product.codigo, getUnitLabel(units, product.unidad)].filter(Boolean).join(' • ');
  const additionalUnits = product.unidadesMedidaAdicionales ?? [];
  const enabledEstablishmentIds = product.disponibleEnTodos
    ? establishments.filter(est => est.isActive).map(est => est.id)
    : (product.establecimientoIds ?? []);

  const establishmentBadges = enabledEstablishmentIds
    .map((id) => {
      const est = establishmentsById.get(id);
      return est ? `${est.code} · ${est.name}` : id;
    })
    .filter(Boolean);

  const stockByEstablishmentList = renderRecordList(
    product.stockPorEstablecimiento,
    (key) => establishmentsById.get(key)?.name ?? key,
    'Stock por establecimiento'
  );

  const stockByalmacenList = renderRecordList(
    product.stockPorAlmacen,
    (key) => `Almacén ${key}`,
    'Stock por almacén'
  );

  const reservedStockList = renderRecordList(
    product.stockReservadoPorAlmacen,
    (key) => `Reservado · ${key}`,
    'Stock reservado'
  );

  const minStockList = renderRecordList(
    product.stockMinimoPorAlmacen,
    (key) => `Mínimo · ${key}`,
    'Stock mínimo por almacén'
  );

  const maxStockList = renderRecordList(
    product.stockMaximoPorAlmacen,
    (key) => `Máximo · ${key}`,
    'Stock máximo por almacén'
  );

  const imageBlock = product.imagen ? (
    <div className="mb-6 flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-600 dark:bg-slate-800">
        <img
          src={product.imagen}
          alt={product.nombre}
          className="h-full w-full object-cover"
          onError={(event) => {
            (event.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
      <div className="flex flex-1 flex-col justify-between space-y-2 text-sm">
        <div className="flex flex-wrap gap-2">
          {product.categoria && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {product.categoria}
            </span>
          )}
          {product.marca && (
            <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-200">
              {product.marca}
            </span>
          )}
          {product.modelo && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
              {product.modelo}
            </span>
          )}
          {product.isFavorite && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              ⭐ Favorito
            </span>
          )}
        </div>
        {product.descripcion && (
          <p className="line-clamp-3 text-slate-600 dark:text-slate-300">{product.descripcion}</p>
        )}
      </div>
    </div>
  ) : null;

  const identificationSection = renderInfoSection('Identificación', [
    { label: 'Código interno', value: product.codigo },
    { label: 'Alias', value: product.alias },
    { label: 'Código de barras', value: product.codigoBarras },
    { label: 'Código de fábrica', value: product.codigoFabrica },
    { label: 'Código SUNAT', value: product.codigoSunat }
  ]);

  const classificationSection = renderInfoSection('Clasificación', [
    { label: 'Categoría', value: product.categoria },
    { label: 'Marca', value: product.marca },
    { label: 'Modelo', value: product.modelo },
    { label: 'Tipo de existencia', value: normalizeSentence(product.tipoExistencia) },
    { label: 'Impuesto', value: product.impuesto }
  ]);

  const pricingSection = renderInfoSection('Precios y descuentos', [
    { label: 'Precio de venta referencial', value: formatCurrency(product.precio) },
    { label: 'Precio de compra', value: formatCurrency(product.precioCompra) },
    { label: '% de ganancia', value: formatPercent(product.porcentajeGanancia) },
    { label: 'Descuento aplicado', value: formatPercent(product.descuentoProducto) }
  ]);

  const unitsSection = renderInfoSection('Unidades y presentación', [
    { label: 'Unidad mínima', value: getUnitLabel(units, product.unidad) },
    { label: 'Tipo de unidad', value: UNIT_TYPE_LABELS[product.tipoUnidadMedida] ?? product.tipoUnidadMedida },
    {
      label: 'Unidades adicionales',
      value:
        additionalUnits.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {additionalUnits.map((unit) => (
              <span
                key={`${unit.unidadCodigo}-${unit.factorConversion}`}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-200"
              >
                {unit.unidadCodigo} · x{unit.factorConversion}
              </span>
            ))}
          </div>
        ) : undefined
    },
    { label: 'Peso', value: typeof product.peso === 'number' ? `${product.peso} kg` : undefined }
  ]);

  const availabilitySection = renderInfoSection('Disponibilidad', [
    {
      label: 'Habilitado en',
      value:
        establishmentBadges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {establishmentBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : (
          'Deshabilitado'
        )
    }
  ]);

  const inventorySection = renderInfoSection('Inventario y stock', [
    { label: 'Stock general', value: typeof product.cantidad === 'number' ? product.cantidad : undefined }
  ]);

  const metadataSection = renderInfoSection('Metadata', [
    { label: 'ID interno', value: product.id },
    { label: 'Creado', value: formatDate(product.fechaCreacion) },
    { label: 'Actualizado', value: formatDate(product.fechaActualizacion) }
  ]);

  const descriptionSection = product.descripcion ? (
    <section className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</div>
      <p className="rounded-2xl border border-slate-100 bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
         style={{ whiteSpace: 'pre-wrap' }}
      >
        {product.descripcion}
      </p>
    </section>
  ) : null;

  return (
    <DetailPane
      title={product.nombre || 'Producto sin nombre'}
      subtitle={subtitleValue || undefined}
      actions={
        <button
          type="button"
          onClick={() => onEdit(product)}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar
        </button>
      }
      onClose={onClose}
    >
      <div className="space-y-7">
        {imageBlock}
        {identificationSection}
        {classificationSection}
        {pricingSection}
        {unitsSection}
        {availabilitySection}
        {stockByEstablishmentList}
        {stockByalmacenList}
        {reservedStockList}
        {minStockList}
        {maxStockList}
        {inventorySection}
        {descriptionSection}
        {metadataSection}
      </div>
    </DetailPane>
  );
};

export default ProductDetailPanel;
