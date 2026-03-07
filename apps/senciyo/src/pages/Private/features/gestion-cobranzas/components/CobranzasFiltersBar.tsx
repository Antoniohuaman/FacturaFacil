import { Calendar, Filter, RefreshCw, Search } from 'lucide-react';
import type { CobranzaFilters } from '../models/cobranzas.types';
import type { PaymentMeanOption } from '@/shared/payments/paymentMeans';

interface CobranzasFiltersBarProps {
  filters: CobranzaFilters;
  onFilterChange: <K extends keyof CobranzaFilters>(key: K, value: CobranzaFilters[K]) => void;
  onDateChange: (key: 'from' | 'to', value: string) => void;
  onReset: () => void;
  paymentMeans: PaymentMeanOption[];
}

const estadoOptions = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Abono' },
  { value: 'cancelado', label: 'Cobrado' },
  { value: 'vencido', label: 'Vencido' },
  { value: 'anulado', label: 'Anulado' },
];

const formaPagoOptions = [
  { value: 'todos', label: 'Contado o crédito' },
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
];

const genericOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'Principal', label: 'Principal' },
  { value: 'Sucursal Norte', label: 'Sucursal Norte' },
  { value: 'Caja Principal', label: 'Caja Principal' },
];

export const CobranzasFiltersBar = ({ filters, onFilterChange, onDateChange, onReset, paymentMeans }: CobranzasFiltersBarProps) => {
  const medioPagoOptions = [
    { value: 'todos', label: 'Cualquier medio' },
    ...paymentMeans.map((option) => ({ value: option.code, label: option.label })),
  ];

  return (
  <section className="mt-6 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-sm">
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
        <Filter className="w-4 h-4" />
        Filtros de búsqueda
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Limpiar filtros
      </button>
    </header>
    <div className="px-4 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Desde</span>
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="date"
            value={filters.rangoFechas.from}
            onChange={(event) => onDateChange('from', event.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Hasta</span>
        <div className="relative">
          <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="date"
            value={filters.rangoFechas.to}
            onChange={(event) => onDateChange('to', event.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Cliente</span>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Nombre o documento"
            value={filters.cliente}
            onChange={(event) => onFilterChange('cliente', event.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Estado</span>
        <select
          value={filters.estado}
          onChange={(event) => onFilterChange('estado', event.target.value as CobranzaFilters['estado'])}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {estadoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Forma de pago</span>
        <select
          value={filters.formaPago}
          onChange={(event) => onFilterChange('formaPago', event.target.value as CobranzaFilters['formaPago'])}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {formaPagoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Medio de pago</span>
        <select
          value={filters.medioPago}
          onChange={(event) => onFilterChange('medioPago', event.target.value as CobranzaFilters['medioPago'])}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {medioPagoOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Sucursal</span>
        <select
          value={filters.sucursal}
          onChange={(event) => onFilterChange('sucursal', event.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {genericOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-gray-400">Cajero</span>
        <select
          value={filters.cajero}
          onChange={(event) => onFilterChange('cajero', event.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {genericOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  </section>
  );
};
