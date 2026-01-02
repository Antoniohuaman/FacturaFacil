import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnConfig } from '../../comprobantes-electronicos/lista-comprobantes/types/columnConfig';

const POPOVER_WIDTH_PX = 320; // w-[320px]
const POPOVER_MARGIN_PX = 16;
const POPOVER_OFFSET_PX = 8;

interface DocumentColumnsManagerProps {
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns: () => void;
  onSelectAllColumns: () => void;
  onReorderColumns: (sourceId: string, targetId: string) => void;
  density: 'comfortable' | 'intermediate' | 'compact';
  onDensityChange: (density: 'comfortable' | 'intermediate' | 'compact') => void;
}

interface SortableColumnRowProps {
  column: ColumnConfig;
  onToggle: (columnId: string) => void;
}

const SortableColumnRow: React.FC<SortableColumnRowProps> = ({ column, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const checkboxId = `document-columns-${column.id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm text-gray-700 dark:text-gray-100 ${
        isDragging ? 'bg-blue-50 shadow-sm dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="cursor-grab p-1 text-gray-400 transition hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
        aria-label={`Reordenar ${column.label}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex flex-1 items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={column.visible}
          onChange={() => onToggle(column.id)}
        />
        <label htmlFor={checkboxId} className="flex-1">
          {column.label}
        </label>
      </div>
    </div>
  );
};

const DocumentColumnsManager: React.FC<DocumentColumnsManagerProps> = ({
  columns,
  onToggleColumn,
  onResetColumns,
  onSelectAllColumns,
  onReorderColumns,
  density,
  onDensityChange
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchorPosition, setAnchorPosition] = useState({ top: 0, left: 0 });

  const manageableColumns = columns.filter((column) => !column.fixed);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth ?? document.documentElement?.clientWidth ?? POPOVER_WIDTH_PX;
    const halfWidth = POPOVER_WIDTH_PX / 2;
    const minLeft = halfWidth + POPOVER_MARGIN_PX;
    const maxLeft = Math.max(minLeft, viewportWidth - halfWidth - POPOVER_MARGIN_PX);
    const center = rect.left + rect.width / 2;
    const clampedLeft = Math.min(Math.max(center, minLeft), maxLeft);

    setAnchorPosition({
      top: rect.bottom + POPOVER_OFFSET_PX + (window.scrollY ?? window.pageYOffset ?? 0),
      left: clampedLeft + (window.scrollX ?? window.pageXOffset ?? 0)
    });
  }, []);

  const closeOnOutsideClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) {
        return;
      }
      if (triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    },
    []
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    updatePopoverPosition();
    document.addEventListener('mousedown', closeOnOutsideClick);

    const handleWindowChange = () => updatePopoverPosition();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, closeOnOutsideClick, updatePopoverPosition]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    onReorderColumns(String(active.id), String(over.id));
  };

  const handleTogglePopover = () => {
    if (!open) {
      updatePopoverPosition();
    }
    setOpen((prev) => !prev);
  };

  const portalTarget = typeof window === 'undefined' ? null : document.body;

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={handleTogglePopover}
        className="h-[44px] px-4 flex items-center gap-2 text-sm rounded-[12px] text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
        title="Personalizar columnas"
      >
        <Columns className="w-4 h-4" />
        Columnas
      </button>

      {open && portalTarget &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-[320px] rounded-xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            style={{ top: anchorPosition.top, left: anchorPosition.left, transform: 'translateX(-50%)' }}
          >
            <div className="flex items-center justify-between mb-3 text-sm font-semibold text-gray-700 dark:text-gray-100">
              <span>Personalizar columnas</span>
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={onSelectAllColumns}
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                >
                  Marcar todos
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button
                  type="button"
                  onClick={onResetColumns}
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                >
                  Restablecer
                </button>
              </div>
            </div>

            {manageableColumns.length > 0 ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={manageableColumns.map((column) => column.id)} strategy={verticalListSortingStrategy}>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {manageableColumns.map((column) => (
                      <SortableColumnRow key={column.id} column={column} onToggle={onToggleColumn} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No hay columnas configurables.</p>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Densidad</div>
              <div className="flex gap-2">
                {(['comfortable', 'intermediate', 'compact'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onDensityChange(value)}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors ${
                      density === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {value === 'comfortable' && 'Cómoda'}
                    {value === 'intermediate' && 'Intermedia'}
                    {value === 'compact' && 'Compacta'}
                  </button>
                ))}
              </div>
            </div>
          </div>,
          portalTarget
        )}
    </div>
  );
};

export default DocumentColumnsManager;
