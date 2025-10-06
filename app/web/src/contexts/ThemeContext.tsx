import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verificar si hay un tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      return savedTheme;
    }
    
    // Por defecto usar 'system'
    return 'system';
  });

  const toggleTheme = () => {
    setTheme(prevTheme => {
      switch (prevTheme) {
        case 'light': return 'dark';
        case 'dark': return 'system';
        case 'system': return 'light';
        default: return 'light';
      }
    });
  };

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Función para obtener el tema efectivo
  const getEffectiveTheme = (currentTheme: Theme) => {
    if (currentTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return currentTheme;
  };

  useEffect(() => {
    console.log('Theme changed to:', theme);
    // Deshabilitar transiciones temporalmente para cambio instantáneo
    document.documentElement.classList.add('changing-theme');
    
    const effectiveTheme = getEffectiveTheme(theme);
    console.log('Effective theme:', effectiveTheme);
    console.log('Document element classes before:', document.documentElement.className);
    
    // Aplicar tema al documento
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to document');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from document');
    }
    
    console.log('Document element classes after:', document.documentElement.className);
    
    // Guardar tema en localStorage
    localStorage.setItem('theme', theme);
    
    // Rehabilitar transiciones después de un frame
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('changing-theme');
    });
  }, [theme]);

  // Escuchar cambios en las preferencias del sistema solo cuando está en modo 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Solo actualizar si el tema está en modo 'system'
      if (theme === 'system') {
        const effectiveTheme = getEffectiveTheme(theme);
        if (effectiveTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}