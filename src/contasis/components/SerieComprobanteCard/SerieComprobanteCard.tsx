import { useState } from 'react';
import {
  Hash,
  Circle,
  FileCheck,
  Receipt,
  Clipboard,
  MessageSquare,
  NotebookPen,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';

// Tipos completos de voucher
type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE' | 'COLLECTION';

export interface SerieComprobante {
  id: string;
  codigo: string;
  nombre: string;
  tipo: VoucherType;
  numeroActual: string;
  estadoUso: string;
  activo: boolean;
  esPorDefecto?: boolean;
  tieneUso?: boolean;
}

interface SerieComprobanteCardProps {
  serie: SerieComprobante;
  onToggleActivo: (id: string) => void;
  onEditar: (id: string) => void;
  onEliminar: (id: string) => void;
  onAjustarCorrelativo: (id: string) => void;
  className?: string;
}

// Configuración completa de todos los tipos de voucher
const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileCheck,
    color: 'blue',
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/30'
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'emerald',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/30'
  },
  SALE_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-50 dark:bg-orange-900/30'
  },
  QUOTE: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    colorClass: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-50 dark:bg-purple-900/30'
  },
  COLLECTION: {
    label: 'Recibo de Cobranza',
    icon: NotebookPen,
    color: 'cyan',
    colorClass: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-50 dark:bg-cyan-900/30'
  }
};

// Componente Switch compacto
const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (checked: boolean) => void }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
      checked ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);

// Componente Dropdown Menu compacto
const DropdownMenu = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block text-left">
      {children && Array.isArray(children) ? children.map((child, index) => {
        if (child?.type?.name === 'DropdownMenuTrigger') {
          return (
            <div key={index} onClick={() => setIsOpen(!isOpen)}>
              {child.props.children}
            </div>
          );
        }
        if (child?.type?.name === 'DropdownMenuContent' && isOpen) {
          return (
            <div key={index}>
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-white dark:ring-opacity-10">
                <div className="py-1" onClick={() => setIsOpen(false)}>
                  {child.props.children}
                </div>
              </div>
            </div>
          );
        }
        return null;
      }) : null}
    </div>
  );
};

const DropdownMenuTrigger = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const DropdownMenuContent = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);

const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center dark:text-slate-200 ${className}`}
  >
    {children}
  </button>
);

const DropdownMenuSeparator = () => (
  <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
);

export function SerieComprobanteCard({
  serie,
  onToggleActivo,
  onEditar,
  onEliminar,
  onAjustarCorrelativo,
  className = ''
}: SerieComprobanteCardProps) {
  const config = voucherTypeConfig[serie.tipo];
  const IconComponent = config.icon;

  const getTipoColor = (activo: boolean) => {
    if (!activo) return 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400';
    return `${config.bgClass} ${config.colorClass}`;
  };

  return (
    <div 
      data-focus={`configuracion:series:${serie.id}`}
      className={`transition-all duration-200 hover:shadow-lg rounded-lg border ${
        !serie.activo 
          ? 'opacity-60 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' 
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
      } ${className}`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* Icono del tipo */}
          <div className={`p-2 rounded-lg flex-shrink-0 ${getTipoColor(serie.activo)}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          
          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            {/* Código y Badge de Estado */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                {serie.codigo}
              </h3>
              
              {/* Badge por defecto */}
              {serie.esPorDefecto && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  Por defecto
                </span>
              )}
              
              {/* Badge de estado */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                serie.activo 
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                {serie.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            
            {/* Descripción/Tipo */}
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {config.label}
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <Switch 
                checked={serie.activo}
                onCheckedChange={() => onToggleActivo(serie.id)}
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <MoreVertical className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEditar(serie.id)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onEliminar(serie.id)}
                  className={serie.esPorDefecto || serie.tieneUso ? 'opacity-50 cursor-not-allowed' : 'text-red-600 dark:text-red-400'}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Información de números */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Número Actual */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Número Actual</p>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                {serie.numeroActual.padStart(8, '0')}
              </span>
              <button
                onClick={() => onAjustarCorrelativo(serie.id)}
                className="hover:bg-slate-100 dark:hover:bg-slate-700 rounded p-0.5 transition-colors"
                title="Ajustar correlativo"
              >
                <Hash className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          </div>

          {/* Estado de Uso */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Estado de Uso</p>
            <div className="flex items-center gap-1.5">
              <Circle className={`w-3 h-3 ${
                serie.estadoUso === 'En uso' ? 'text-yellow-500 fill-current' : 'text-slate-400 dark:text-slate-500'
              }`} />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                {serie.estadoUso}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
