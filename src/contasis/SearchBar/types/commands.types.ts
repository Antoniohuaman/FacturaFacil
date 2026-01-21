import type { LucideIcon } from 'lucide-react';

export interface BaseCommand {
  id: string;
  nombre: string;
  categoria: 'acciones' | 'navegacion';
  atajo: string;
}

export interface SystemCommand extends BaseCommand {
  icono: LucideIcon;
}

export interface CustomCommand extends BaseCommand {
  icono?: LucideIcon;
}

export type Command = SystemCommand | CustomCommand;

export interface PaletteItem {
  key: string;
  onExecute: () => void;
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: Command[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onExecuteCommand?: (commandId: string) => void;
  searchResults?: Array<{ type: string; item: any }>;
}