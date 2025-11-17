import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { CLIENTES_FILTERS_INITIAL_STATE, type ClientesFilterValues } from './clientesFiltersConfig';

type ClientesFiltersProps = {
  filters: ClientesFilterValues;
  isActive: boolean;
  onApply: (filters: ClientesFilterValues) => void;
  onClear: () => void;
};

const ClientesFilters: React.FC<ClientesFiltersProps> = ({ filters, isActive, onApply, onClear }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ClientesFilterValues>(() => ({ ...filters }));
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraft({ ...filters });
    }
  }, [filters, open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const hasDraftChanges = useMemo(() => {
    return (
      draft.search !== filters.search ||
      draft.tipoCuenta !== filters.tipoCuenta ||
      draft.estadoCliente !== filters.estadoCliente
    );
  }, [draft, filters]);

  const handleApply = () => {
    const normalized: ClientesFilterValues = {
      search: draft.search.trim(),
      tipoCuenta: draft.tipoCuenta,
      estadoCliente: draft.estadoCliente,
    };
    onApply(normalized);
    setOpen(false);
  };

  const handleClear = () => {
    onClear();
    setDraft({ ...CLIENTES_FILTERS_INITIAL_STATE });
    setOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-gray-800/60 ${
          isActive ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        <Filter className="h-4 w-4" />
        Filtros
        {isActive && <span className="ml-1 h-2 w-2 rounded-full bg-blue-600"></span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-2xl focus:outline-none dark:border-gray-700 dark:bg-gray-900">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Búsqueda
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={draft.search}
                  onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="Nombre o documento"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Tipo de cuenta
              <select
                value={draft.tipoCuenta}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, tipoCuenta: event.target.value as ClientesFilterValues['tipoCuenta'] }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Todos</option>
                <option value="Cliente">Cliente</option>
                <option value="Proveedor">Proveedor</option>
                <option value="Cliente-Proveedor">Cliente / Proveedor</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
              Estado cliente
              <select
                value={draft.estadoCliente}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, estadoCliente: event.target.value as ClientesFilterValues['estadoCliente'] }))
                }
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-0 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">Todos</option>
                <option value="Habilitado">Activos</option>
                <option value="Deshabilitado">Deshabilitados</option>
              </select>
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!hasDraftChanges && !isActive}
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesFilters;