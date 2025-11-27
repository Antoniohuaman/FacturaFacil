import React from 'react';
import { AlertTriangle, ChevronDown, Clock, Copy, Edit, Filter, MoreHorizontal, Search, Send, Trash2 } from 'lucide-react';
import type { Draft } from '../../mockData/drafts.mock';

interface DraftsTableProps {
  drafts: Draft[];
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
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>N° Borrador</span>
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Tipo</span>
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>N° Doc Cliente</span>
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Cliente</span>
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Creado</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Vence</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Vendedor</span>
                  <Search className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Total
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center space-x-2">
                  <span>Estado</span>
                  <Filter className="w-4 h-4 text-gray-400" />
                </div>
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {drafts.map(draft => (
              <tr
                key={draft.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedDraftIds.includes(draft.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <td className="px-6 py-3 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedDraftIds.includes(draft.id)}
                    onChange={() => onToggleDraft(draft.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label={`Seleccionar ${draft.id}`}
                  />
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {draft.id.startsWith('DRAFT-')
                    ? draft.id.replace(/^DRAFT-([A-Z0-9]+)-.*/, '$1')
                    : draft.id}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.type}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.clientDoc || '—'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.client || 'Cliente sin nombre'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.createdDate}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.expiryDate || '—'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {draft.vendor || '—'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  S/ {draft.total.toFixed(2)}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {statusBadge(draft)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 dark:text-gray-500">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
