/* eslint-disable react-refresh/only-export-components -- archivo comparte helpers/constantes; split diferido */
import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type SelectScope = 'page' | 'allResults';

interface SelectionState {
  selectedIds: Set<string>;
  selectedTotal: number;
  selectScope: SelectScope;
}

interface SelectionContextType extends SelectionState {
  toggleSelection: (id: string, total: number) => void;
  toggleAll: (ids: string[], totals: number[]) => void;
  selectAllResults: (ids: string[], totals: number[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within SelectionProvider');
  }
  return context;
};

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SelectionState>({
    selectedIds: new Set<string>(),
    selectedTotal: 0,
    selectScope: 'page'
  });

  const toggleSelection = (id: string, total: number) => {
    setState(prev => {
      const newIds = new Set(prev.selectedIds);
      let newTotal = prev.selectedTotal;

      if (newIds.has(id)) {
        newIds.delete(id);
        newTotal -= total;
      } else {
        newIds.add(id);
        newTotal += total;
      }

      return {
        selectedIds: newIds,
        selectedTotal: newTotal,
        selectScope: prev.selectScope
      };
    });
  };

  const toggleAll = (ids: string[], totals: number[]) => {
    setState(prev => {
      const allSelected = ids.every(id => prev.selectedIds.has(id));
      const newIds = new Set(prev.selectedIds);
      let newTotal = prev.selectedTotal;

      if (allSelected) {
        // Deseleccionar todos de la página
        ids.forEach((id, idx) => {
          if (newIds.has(id)) {
            newIds.delete(id);
            newTotal -= totals[idx];
          }
        });
      } else {
        // Seleccionar todos de la página
        ids.forEach((id, idx) => {
          if (!newIds.has(id)) {
            newIds.add(id);
            newTotal += totals[idx];
          }
        });
      }

      return {
        selectedIds: newIds,
        selectedTotal: newTotal,
        selectScope: 'page'
      };
    });
  };

  const selectAllResults = (ids: string[], totals: number[]) => {
    const newIds = new Set(ids);
    const newTotal = totals.reduce((sum, t) => sum + t, 0);

    setState({
      selectedIds: newIds,
      selectedTotal: newTotal,
      selectScope: 'allResults'
    });
  };

  const clearSelection = () => {
    setState({
      selectedIds: new Set<string>(),
      selectedTotal: 0,
      selectScope: 'page'
    });
  };

  const isSelected = (id: string) => state.selectedIds.has(id);

  return (
    <SelectionContext.Provider
      value={{
        ...state,
        toggleSelection,
        toggleAll,
        selectAllResults,
        clearSelection,
        isSelected,
        selectedCount: state.selectedIds.size
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
};
