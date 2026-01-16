# Contasis UI Library

Librería de componentes React reutilizables para el Design System Contasis.

## Instalación

```bash
npm install @contasis/ui
```

## Uso

```tsx
import { Button } from '@contasis/ui';

export function App() {
  return (
    <>
      <Button variant="primary" size="md">
        Botón Primario
      </Button>
      <Button variant="secondary" icon={<Download />}>
        Descargar
      </Button>
      <Button variant="tertiary" iconOnly icon={<Settings />} />
    </>
  );
}
```

## Estilos

Asegúrate de importar los estilos de la librería en tu proyecto:

```tsx
import '@contasis/ui/dist/styles.css';
```

## Componentes disponibles

- **Button** - Botón interactivo con variantes y tamaños
- Próximamente: Checkbox, Table, Card, Input, etc.

## Temas

La librería soporta light/dark mode automáticamente:

```tsx
// En tu HTML
<html data-theme="dark">
```

## Props

### Button

```tsx
interface ButtonProps {
  size?: 'sm' | 'md' | 'lg';           // Tamaño (default: 'md')
  variant?: 'primary' | 'secondary' | 'tertiary';  // Variante (default: 'primary')
  icon?: React.ReactNode;              // Ícono a mostrar
  iconPosition?: 'left' | 'right';     // Posición del ícono (default: 'left')
  iconOnly?: boolean;                  // Solo mostrar ícono (default: false)
  disabled?: boolean;                  // Deshabilitar (default: false)
  fullWidth?: boolean;                 // Ancho completo (default: false)
  children?: React.ReactNode;          // Contenido del botón
}
```

## Licencia

MIT
