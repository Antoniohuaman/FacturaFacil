import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Layers, GripVertical } from 'lucide-react';
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
import type { ClienteColumnConfig, ClienteColumnId } from '../hooks/useClientesColumns';

const POPOVER_WIDTH_PX = 288; // Tailwind w-72
const POPOVER_MARGIN_PX = 12;
const POPOVER_OFFSET_PX = 8;

interface ColumnSelectorProps {
  columns: ClienteColumnConfig[];
  onToggleColumn: (columnId: ClienteColumnId) => void;
  onReset: () => void;
  onSelectAll: () => void;
  onReorderColumns: (activeId: ClienteColumnId, overId: ClienteColumnId) => void;
}

const SortableColumnRow: React.FC<{
  column: ClienteColumnConfig;
  onToggle: (columnId: ClienteColumnId) => void;
}> = ({ column, onToggle }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: column.id, disabled: column.fixed });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const checkboxId = `clientes-column-${column.id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 text-sm text-gray-700 dark:text-gray-100 ${
        isDragging ? 'bg-blue-50 shadow-sm dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/60'
      }`}
    >
      {!column.fixed ? (
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
      ) : (
        <span className="w-5" aria-hidden="true" />
      )}
      <div className="flex flex-1 items-center gap-2">
        <input
          id={checkboxId}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={column.fixed ? true : column.visible}
          onChange={() => onToggle(column.id)}
          disabled={column.fixed}
        />
        <label
          htmlFor={checkboxId}
          className={`flex-1 ${column.fixed ? 'text-gray-400 dark:text-gray-500' : ''}`}
        >
          {column.label}
        </label>
      </div>
    </div>
  );
};

const ColumnSelector: React.FC<ColumnSelectorProps> = ({
  columns,
  onToggleColumn,
  onReset,
  onSelectAll,
  onReorderColumns
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [anchorPosition, setAnchorPosition] = useState({ top: 0, left: 0 });

  const updatePopoverPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth ?? document.documentElement?.clientWidth ?? POPOVER_WIDTH_PX;
    const halfWidth = POPOVER_WIDTH_PX / 2;
    const usableMin = halfWidth + POPOVER_MARGIN_PX;
    const usableMax = Math.max(usableMin, viewportWidth - halfWidth - POPOVER_MARGIN_PX);
    const center = rect.left + rect.width / 2;
    const left = Math.min(Math.max(center, usableMin), usableMax);

    setAnchorPosition({
      top: rect.bottom + POPOVER_OFFSET_PX,
      left
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) {
        return;
      }
      if (triggerRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    updatePopoverPosition();

    const handleWindowChange = () => updatePopoverPosition();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [open, updatePopoverPosition]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    onReorderColumns(active.id as ClienteColumnId, over.id as ClienteColumnId);
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
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        <Layers className="h-4 w-4" />
        Columnas
      </button>

      {open && portalTarget &&
        createPortal(
          <div
            ref={popoverRef}
            className="fixed z-50 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            style={{ top: anchorPosition.top, left: anchorPosition.left, transform: 'translateX(-50%)' }}
          >
            <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-100">
              <span>Personaliza columnas</span>
              <div className="flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                >
                  Marcar todos
                </button>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <button
                  type="button"
                  onClick={onReset}
                  className="text-blue-600 transition hover:text-blue-500 dark:text-blue-400"
                >
                  Restablecer
                </button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={columns.map((column) => column.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {columns.map((column) => (
                    <SortableColumnRow key={column.id} column={column} onToggle={onToggleColumn} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>,
          portalTarget
        )}
    </div>
  );
};

export default ColumnSelector;
