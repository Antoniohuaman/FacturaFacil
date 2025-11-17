import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  CLIENTE_FIELD_SECTION_LABELS,
  type ClienteFieldConfig,
  type ClienteFieldId,
  type ClienteFieldSection,
} from './clienteFormConfig';

interface ClienteFormFieldSelectorProps {
  fieldConfigs: ClienteFieldConfig[];
  visibleFieldIds: ClienteFieldId[];
  requiredFieldIds: ClienteFieldId[];
  onToggleVisible: (fieldId: ClienteFieldId) => void;
  onToggleRequired: (fieldId: ClienteFieldId) => void;
  onSelectAll: () => void;
  onReset: () => void;
}

const POPOVER_Z_INDEX = 13000;

const ClienteFormFieldSelector: React.FC<ClienteFormFieldSelectorProps> = ({
  fieldConfigs,
  visibleFieldIds,
  requiredFieldIds,
  onToggleVisible,
  onToggleRequired,
  onSelectAll,
  onReset,
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const visibleSet = useMemo(() => new Set<ClienteFieldId>(visibleFieldIds), [visibleFieldIds]);
  const requiredSet = useMemo(() => new Set<ClienteFieldId>(requiredFieldIds), [requiredFieldIds]);

  const groupedBySection = useMemo(() => {
    return fieldConfigs.reduce<Record<ClienteFieldSection, ClienteFieldConfig[]>>((acc, field) => {
      if (!acc[field.section]) {
        acc[field.section] = [];
      }
      acc[field.section].push(field);
      return acc;
    }, {} as Record<ClienteFieldSection, ClienteFieldConfig[]>);
  }, [fieldConfigs]);

  const closePopover = useCallback(() => setOpen(false), []);

  const togglePopover = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePopover();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closePopover, open]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const popover =
    open && portalTarget
      ? createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/20 p-4"
            style={{ zIndex: POPOVER_Z_INDEX }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cliente-form-field-selector-title"
            onClick={closePopover}
          >
            <div
              ref={popoverRef}
              className="w-full max-w-[420px] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-start justify-between gap-3 text-sm font-semibold text-gray-700 dark:text-gray-100">
                <div>
                  <span id="cliente-form-field-selector-title">Personalizar formulario</span>
                  <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                    Activa solo los campos que quieras mostrar para este formulario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePopover}
                  className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-800"
                  aria-label="Cerrar personalización de formulario"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3 flex items-center justify-end gap-2 text-xs font-medium">
                <button
                  type="button"
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                  onClick={onSelectAll}
                >
                  Marcar todos
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button
                  type="button"
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                  onClick={onReset}
                >
                  Restablecer
                </button>
              </div>

              <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                {Object.entries(groupedBySection).map(([section, fields]) => {
                  if (!fields || fields.length === 0) return null;
                  return (
                    <div key={section}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {CLIENTE_FIELD_SECTION_LABELS[section as ClienteFieldSection]}
                      </p>
                      <div className="space-y-2">
                        {fields.map((field) => {
                          const isVisible = visibleSet.has(field.id);
                          const isRequired = requiredSet.has(field.id);
                          const disableVisible = Boolean(field.alwaysVisible);
                          const disableRequired = Boolean(
                            field.alwaysRequired || field.allowRequiredToggle === false
                          );

                          return (
                            <div
                              key={field.id}
                              className="rounded-md border border-gray-100 px-3 py-2 text-xs dark:border-gray-800"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-gray-800 dark:text-gray-100">{field.label}</p>
                                  <p className="text-[11px] uppercase text-gray-400">
                                    {CLIENTE_FIELD_SECTION_LABELS[field.section]}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={isVisible}
                                      onChange={() => onToggleVisible(field.id)}
                                      disabled={disableVisible}
                                    />
                                    Visible
                                  </label>
                                  <label className="flex items-center gap-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={isRequired}
                                      onChange={() => onToggleRequired(field.id)}
                                      disabled={disableRequired || !isVisible}
                                    />
                                    Obligatorio
                                  </label>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          portalTarget
        )
      : null;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={togglePopover}
        className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
        title="Personalizar formulario"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      {popover}
    </>
  );
};

export default ClienteFormFieldSelector;
