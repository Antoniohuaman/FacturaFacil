import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Command } from '../types/commands.types';

export const useCommandPalette = (baseCommands: Command[] = []) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [customCommands, setCustomCommands] = useState<Command[]>([]);

  const allCommands = useMemo(() => [...baseCommands, ...customCommands], [baseCommands, customCommands]);

  // Cargar comandos personalizados desde localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedCommands = localStorage.getItem('customCommands');
      if (savedCommands) {
        try {
          const customCmds: Command[] = JSON.parse(savedCommands);
          setCustomCommands(customCmds);
        } catch (error) {
          console.error('Error parsing custom commands:', error);
        }
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const openPalette = useCallback(() => {
    setIsOpen(true);
    setActiveIndex(0);
  }, []);

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const togglePalette = useCallback(() => {
    if (isOpen) {
      closePalette();
    } else {
      openPalette();
    }
  }, [isOpen, openPalette, closePalette]);

  const saveCustomCommand = useCallback((command: Command) => {
    const updatedCommands = [...customCommands, command];
    setCustomCommands(updatedCommands);
    localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
  }, [customCommands]);

  const deleteCustomCommand = useCallback((commandId: string) => {
    const updatedCommands = customCommands.filter(cmd => cmd.id !== commandId);
    setCustomCommands(updatedCommands);
    localStorage.setItem('customCommands', JSON.stringify(updatedCommands));
  }, [customCommands]);

  const filteredCommands = useCallback((query: string) => {
    return allCommands.filter(cmd => 
      cmd.nombre.toLowerCase().includes(query.toLowerCase()) ||
      cmd.atajo.toLowerCase().includes(query.toLowerCase())
    );
  }, [allCommands]);

  return {
    isOpen,
    activeIndex,
    setActiveIndex,
    allCommands,
    customCommands,
    openPalette,
    closePalette,
    togglePalette,
    saveCustomCommand,
    deleteCustomCommand,
    filteredCommands,
  };
};