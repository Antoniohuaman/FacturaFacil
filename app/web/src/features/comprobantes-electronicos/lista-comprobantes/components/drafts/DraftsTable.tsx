import React from 'react';
import { AlertTriangle, ChevronDown, Clock, Copy, Edit, Filter, MoreHorizontal, Search, Send, Trash2 } from 'lucide-react';
import type { ColumnConfig } from '../../types/columnConfig';
import type { Draft } from '../../mockData/drafts.mock';

interface DraftsTableProps {
  drafts: Draft[];
  visibleColumns: ColumnConfig[];
  density: 'comfortable' | 'intermediate' | 'compact';
  selectedDraftIds: string[];
  onToggleDraft: (id: string) => void;
  onToggleAll: () => void;
  onEditDraft: (id: string) => void;
  onEmitDraft: (id: string) => void;
  onDuplicateDraft: (id: string) => void;
  onDeleteDraft: (id: string) => void;
  onShareDraft: (id: string) => void;
}

const statusBadge = (draft: Draft) => {
  const { status, statusColor, daysLeft } = draft;
  const isExpired = status === 'Vencido' || statusColor === 'red';
  const isDueSoon = status === 'Por vencer' || statusColor === 'orange';

  const colors = {
    green: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
    orange: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200',
    red: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
  } as const;

  const text = isExpired
    ? 'Vencido'
    : isDueSoon
      ? `Vence en ${Math.max(daysLeft, 0)}d`
      : `${Math.max(daysLeft, 0)} días`;

  const colorClass = colors[draft.statusColor];

  const icon = status === 'Vencido'
    ? <AlertTriangle className="w-3.5 h-3.5" />
    : <Clock className="w-3.5 h-3.5" />;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {icon}
      {text}
    </span>
  );
};

export const DraftsTable: React.FC<DraftsTableProps> = ({
  drafts,
  visibleColumns,
  density,
  selectedDraftIds,
  onToggleDraft,
  onToggleAll,
  onEditDraft,
  onEmitDraft,
  onDuplicateDraft,
  onDeleteDraft,
  onShareDraft
}) => {
  const allSelected = drafts.length > 0 && drafts.every(draft => selectedDraftIds.includes(draft.id));
  const rowPadding = density === 'compact' ? 'py-2' : density === 'intermediate' ? 'py-3' : 'py-4';
  const headerDecorators: Partial<Record<string, React.ReactNode>> = {
    draftNumber: <Search className="w-4 h-4 text-gray-400" />,
    type: <Filter className="w-4 h-4 text-gray-400" />,
    clientDoc: <Search className="w-4 h-4 text-gray-400" />,
    client: <Search className="w-4 h-4 text-gray-400" />,
    createdDate: <ChevronDown className="w-4 h-4 text-gray-400" />,
    expiryDate: <ChevronDown className="w-4 h-4 text-gray-400" />,
    vendor: <Search className="w-4 h-4 text-gray-400" />,
    status: <Filter className="w-4 h-4 text-gray-400" />
  };
  const formatDraftId = (draftId: string) => draftId.startsWith('DRAFT-')
    ? draftId.replace(/^DRAFT-([A-Z0-9]+)-.*/, '$1')
    : draftId;

  const formatFallbackValue = (value: unknown): string => {
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    return '—';
  };

  const renderCellContent = (columnId: string, draft: Draft) => {
    switch (columnId) {
      case 'draftNumber':
        return (
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDraftId(draft.id)}
          </span>
        );
      case 'type':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.type}</span>;
      case 'clientDoc':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.clientDoc || '—'}</span>;
      case 'client':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.client || 'Cliente sin nombre'}</span>;
      case 'createdDate':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.createdDate}</span>;
      case 'expiryDate':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.expiryDate || '—'}</span>;
      case 'vendor':
        return <span className="text-sm text-gray-700 dark:text-gray-300">{draft.vendor || '—'}</span>;
      case 'total':
        return <span className="text-sm font-medium text-gray-900 dark:text-white">S/ {draft.total.toFixed(2)}</span>;
      case 'status':
        return statusBadge(draft);
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onEditDraft(draft.id)}
              className="p-1.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Editar"
              aria-label={`Editar borrador ${draft.id}`}
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEmitDraft(draft.id)}
              className="p-1.5 text-green-500 hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              title="Emitir"
              aria-label={`Emitir borrador ${draft.id}`}
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDuplicateDraft(draft.id)}
              className="p-1.5 text-purple-500 hover:text-purple-700 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              title="Duplicar"
              aria-label={`Duplicar borrador ${draft.id}`}
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteDraft(draft.id)}
              className="p-1.5 text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              title="Eliminar"
              aria-label={`Eliminar borrador ${draft.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onShareDraft(draft.id)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              title="Más opciones"
              aria-label={`Más opciones para borrador ${draft.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        );
      default: {
        const value = (draft as unknown as Record<string, unknown>)[columnId];
        return <span className="text-sm text-gray-700 dark:text-gray-300">{formatFallbackValue(value)}</span>;
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-blue-500"
                />
              </th>
              {visibleColumns.map(column => {
                const decorator = headerDecorators[column.id];
                const alignment = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                const justifyContent = column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start';
                const widthClass = column.width ?? '';
                const stickyClass = column.fixed === 'left'
                  ? 'sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 shadow-[2px_0_4px_rgba(0,0,0,0.06)]'
                  : column.fixed === 'right'
                    ? 'sticky right-0 z-10 bg-gray-50 dark:bg-gray-700 shadow-[-2px_0_4px_rgba(0,0,0,0.06)]'
                    : '';

                return (
                  <th
                    key={column.id}
                    className={`px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider ${alignment} ${widthClass} ${stickyClass}`}
                  >
                    <div className={`flex items-center gap-2 ${justifyContent}`}>
                      <span>{column.label}</span>
                      {decorator ?? null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {drafts.map(draft => {
              const isSelected = selectedDraftIds.includes(draft.id);
              return (
                <tr
                  key={draft.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <td className={`px-6 ${rowPadding} whitespace-nowrap ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleDraft(draft.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      aria-label={`Seleccionar ${draft.id}`}
                    />
                  </td>
                  {visibleColumns.map(column => {
                    const alignment = column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left';
                    const widthClass = column.width ?? '';
                    const stickyBase = column.fixed === 'left'
                      ? 'sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.04)]'
                      : column.fixed === 'right'
                        ? 'sticky right-0 z-10 shadow-[-2px_0_4px_rgba(0,0,0,0.04)]'
                        : '';
                    const stickyBackground = column.fixed
                      ? isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                      : '';

                    return (
                      <td
                        key={`${draft.id}-${column.id}`}
                        className={`px-6 ${rowPadding} whitespace-nowrap ${alignment} ${widthClass} ${stickyBase} ${stickyBackground}`}
                      >
                        {renderCellContent(column.id, draft)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
