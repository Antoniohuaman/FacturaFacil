import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center group"
      title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
    >
      {/* Icono de Sol (modo claro) */}
      <Sun 
        className={`w-5 h-5 text-yellow-500 transition-all duration-300 ${
          theme === 'light' 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-0 rotate-90 absolute'
        }`}
      />
      
      {/* Icono de Luna (modo oscuro) */}
      <Moon 
        className={`w-5 h-5 text-blue-400 transition-all duration-300 ${
          theme === 'dark' 
            ? 'opacity-100 scale-100 rotate-0' 
            : 'opacity-0 scale-0 -rotate-90 absolute'
        }`}
      />
      
      {/* Efecto de resplandor */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-yellow-100 to-blue-100 dark:from-yellow-900/20 dark:to-blue-900/20" />
    </button>
  );
}