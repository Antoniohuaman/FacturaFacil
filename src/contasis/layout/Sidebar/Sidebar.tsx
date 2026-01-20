import { ChevronDown, ChevronRight } from 'lucide-react';
import { getIconComponent } from './iconMapper';
import { useExpandableModules } from './useExpandableModules';
import "./Sidebar.css";


export interface Module {
  id: string;
  title: string;
  sidebarTitle?: string;
  icon: string;
  children?: Module[];
  badge?: string; // Badge text (e.g., count)
}

export interface SidebarProps {
  isOpen: boolean;
  modules: Module[];
  activeModule: string;
  onModuleChange: (id: string) => void;
  theme?: 'light' | 'dark';
}

/**
 * Componente Sidebar para la navegación lateral
 * Muestra una navegación lateral colapsable con módulos jerárquicos
 */
export const Sidebar = ({
  isOpen,
  modules,
  activeModule,
  onModuleChange,
  theme = 'light'
}: SidebarProps) => {
  const { toggleModule, isModuleExpanded } = useExpandableModules();

  /**
   * Maneja el click en un módulo del sidebar
   * Si el módulo tiene hijos, lo expande/colapsa. Si no, lo activa.
   */
  const handleModuleClick = (module: Module) => {
    if (module.children && module.children.length > 0) {
      toggleModule(module.id);
    } else {
      onModuleChange(module.id);
    }
  };

  /**
   * Renderiza un módulo del sidebar de forma recursiva
   * @param module - Módulo a renderizar
   * @param level - Nivel de anidación (para indentación)
   */
  const renderModule = (module: Module, level: number = 0) => {
    const hasChildren = module.children && module.children.length > 0;
    const isExpanded = isModuleExpanded(module.id);

    return (
      <div key={module.id}>
        <button
          className="sidebar-item"
          data-active={activeModule === module.id}
          data-level={level}
          onClick={() => handleModuleClick(module)}
          title={!isOpen ? (module.sidebarTitle || module.title) : undefined}
          style={{
            paddingLeft: isOpen ? `${12 + level * 16}px` : undefined
          }}
        >
          <span className="sidebar-icon">
            {getIconComponent(module.icon)}
          </span>
          <span className="sidebar-label">
            {module.sidebarTitle || module.title}
          </span>
          {module.badge && isOpen && (
            <span className="sidebar-badge">
              {module.badge}
            </span>
          )}
          {hasChildren && isOpen && (
            <span className="sidebar-chevron">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
          {module.badge && !isOpen && (
            <span className="sidebar-badge-dot"></span>
          )}
        </button>

        {hasChildren && isExpanded && isOpen && (
          <div className="sidebar-children">
            {module.children!.map(child => renderModule(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className="sidebar-container"
      data-open={isOpen}
    >
      <nav className="sidebar-nav">
        {modules.map(module => renderModule(module))}
      </nav>
    </aside>
  );
};
