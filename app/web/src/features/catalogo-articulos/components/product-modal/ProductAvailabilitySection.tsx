import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Establishment } from '../../../configuracion-sistema/models/Establishment';
import type { ProductFormData } from '../../models/types';
import type { FormError } from '../../hooks/useProductForm';

interface ProductAvailabilitySectionProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  establishments: Establishment[];
  errors: FormError;
}

export const ProductAvailabilitySection: React.FC<ProductAvailabilitySectionProps> = ({
  formData,
  setFormData,
  establishments,
  errors
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleToggleAll = () => {
    const allSelected = formData.establecimientoIds.length === establishments.length;
    setFormData(prev => ({
      ...prev,
      establecimientoIds: allSelected ? [] : establishments.map(e => e.id)
    }));
  };

  const allSelected = formData.establecimientoIds.length === establishments.length && establishments.length > 0;

  const handleDisponibleEnTodos = () => {
    setFormData(prev => ({
      ...prev,
      disponibleEnTodos: !prev.disponibleEnTodos,
      establecimientoIds: !prev.disponibleEnTodos ? establishments.map(est => est.id) : []
    }));
  };

  const selectedCount = formData.disponibleEnTodos ? establishments.length : formData.establecimientoIds.length;

  const triggerLabel = useMemo(() => {
    if (establishments.length === 0) return 'No hay establecimientos activos';
    if (formData.disponibleEnTodos) return 'Disponible en todos';
    if (selectedCount === 0) return 'Seleccionar establecimientos';
    return `${selectedCount} seleccionado(s)`;
  }, [establishments.length, formData.disponibleEnTodos, selectedCount]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [isOpen]);

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-700">
        Establecimientos <span className="text-red-500">*</span>
      </label>

      <div className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={establishments.length === 0}
          onClick={() => setIsOpen(prev => !prev)}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label="Seleccionar establecimientos"
          className="w-full h-9 px-2.5 rounded-md border border-gray-300 bg-white text-sm text-left flex items-center justify-between gap-3 hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/30 disabled:bg-gray-50 disabled:text-gray-400"
        >
          <span className="truncate">{triggerLabel}</span>
          <span className="text-xs text-gray-500">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Lista de establecimientos"
            className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-gray-100">
              <button
                type="button"
                onClick={handleDisponibleEnTodos}
                className={`inline-flex items-center gap-2 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                  formData.disponibleEnTodos
                    ? 'bg-violet-50 border-violet-200 text-violet-800'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-violet-200'
                }`}
              >
                Disponible en todos
                <span
                  className={`inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                    formData.disponibleEnTodos ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      formData.disponibleEnTodos ? 'translate-x-3' : 'translate-x-0.5'
                    }`}
                  />
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleAll}
                disabled={establishments.length === 0}
                className="text-[11px] font-semibold text-gray-700 hover:text-violet-700 disabled:text-gray-400"
                title={allSelected ? 'Desmarcar todos' : 'Marcar todos'}
              >
                {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto p-1.5">
              {establishments.map(est => {
                const isSelected = formData.establecimientoIds.includes(est.id);
                return (
                  <label
                    key={est.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={formData.disponibleEnTodos}
                      onChange={(e) => {
                        const newIds = e.target.checked
                          ? [...formData.establecimientoIds, est.id]
                          : formData.establecimientoIds.filter(id => id !== est.id);
                        setFormData(prev => ({ ...prev, establecimientoIds: newIds }));
                      }}
                      className="w-3.5 h-3.5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 focus:ring-1 disabled:opacity-50"
                    />
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded">
                      {est.code}
                    </span>
                    <span className="text-xs font-medium text-gray-900 truncate">{est.name}</span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-gray-100">
              <p className="text-[10px] text-gray-600">
                {formData.disponibleEnTodos
                  ? 'Disponible en todos los establecimientos activos'
                  : `${formData.establecimientoIds.length} de ${establishments.length} seleccionado(s)`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className="text-[11px] font-semibold text-violet-700 hover:text-violet-800"
              >
                Listo
              </button>
            </div>
          </div>
        )}
      </div>

      {errors.establecimientoIds && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-300 rounded">
          <svg className="w-3.5 h-3.5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-[10px] text-red-700 font-medium">{errors.establecimientoIds}</p>
        </div>
      )}
    </div>
  );
};
