/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import { useState, useEffect } from 'react';
import { X, Settings, Keyboard, Plus, Edit2, Trash2, Save, Search, FileText, Package, Users, Receipt, UserPlus, CreditCard, BarChart3, DollarSign } from 'lucide-react';

interface Command {
  id: string;
  nombre: string;
  icono: any;
  categoria: 'acciones' | 'navegacion';
  atajo: string;
  isCustom?: boolean;
}

interface CommandsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYSTEM_COMMANDS: Command[] = [
  // ACCIONES PRINCIPALES
  { id: 'nueva-factura', nombre: 'Nueva Factura', icono: FileText, categoria: 'acciones', atajo: 'Ctrl+F' },
  { id: 'nueva-boleta', nombre: 'Nueva Boleta', icono: Receipt, categoria: 'acciones', atajo: 'Ctrl+B' },
  { id: 'buscar-global', nombre: 'Búsqueda Global', icono: Search, categoria: 'acciones', atajo: 'Ctrl+K' },
  { id: 'nuevo-cliente', nombre: 'Nuevo Cliente', icono: UserPlus, categoria: 'acciones', atajo: 'Ctrl+U' },
  { id: 'nuevo-producto', nombre: 'Nuevo Producto', icono: Package, categoria: 'acciones', atajo: 'Ctrl+P' },
  
  // NAVEGACIÓN
  { id: 'ir-comprobantes', nombre: 'Comprobantes Electrónicos', icono: FileText, categoria: 'navegacion', atajo: 'Ctrl+1' },
  { id: 'ir-productos', nombre: 'Gestión de Productos y Servicios', icono: Package, categoria: 'navegacion', atajo: 'Ctrl+2' },
  { id: 'ir-clientes', nombre: 'Gestión de Clientes', icono: Users, categoria: 'navegacion', atajo: 'Ctrl+3' },
  { id: 'ir-caja', nombre: 'Control de Caja', icono: CreditCard, categoria: 'navegacion', atajo: 'Ctrl+4' },
  { id: 'ir-indicadores', nombre: 'Indicadores de Negocio', icono: BarChart3, categoria: 'navegacion', atajo: 'Ctrl+5' },
  { id: 'ir-configuracion', nombre: 'Configuración del Sistema', icono: Settings, categoria: 'navegacion', atajo: 'Ctrl+6' },
  { id: 'ir-precios', nombre: 'Lista de Precios', icono: DollarSign, categoria: 'navegacion', atajo: 'Ctrl+7' },
];

export const CommandsManagementModal: React.FC<CommandsManagementModalProps> = ({ isOpen, onClose }) => {
  const [commands, setCommands] = useState<Command[]>(SYSTEM_COMMANDS);
  const [editingCommand, setEditingCommand] = useState<Command | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Cargar comandos personalizados del localStorage
  useEffect(() => {
    const savedCommands = localStorage.getItem('customCommands');
    if (savedCommands) {
      const customCommands = JSON.parse(savedCommands);
      setCommands([...SYSTEM_COMMANDS, ...customCommands]);
    }
  }, []);

  // Guardar comandos personalizados
  const saveCustomCommands = (newCommands: Command[]) => {
    const customCommands = newCommands.filter(cmd => cmd.isCustom);
    localStorage.setItem('customCommands', JSON.stringify(customCommands));
  };

  const filteredCommands = commands.filter(cmd => 
    cmd.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cmd.atajo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditCommand = (command: Command) => {
    setEditingCommand({ ...command });
    setIsCreating(false);
  };

  const handleCreateCommand = () => {
    setEditingCommand({
      id: '',
      nombre: '',
      icono: Settings,
      categoria: 'acciones',
      atajo: '',
      isCustom: true
    });
    setIsCreating(true);
  };

  const handleSaveCommand = () => {
    if (!editingCommand || !editingCommand.nombre || !editingCommand.atajo) return;

    const newCommands = [...commands];
    
    if (isCreating) {
      // Crear nuevo comando
      const newId = `custom-${Date.now()}`;
      newCommands.push({ ...editingCommand, id: newId });
    } else {
      // Editar comando existente
      const index = newCommands.findIndex(cmd => cmd.id === editingCommand.id);
      if (index !== -1) {
        newCommands[index] = editingCommand;
      }
    }

    setCommands(newCommands);
    saveCustomCommands(newCommands);
    setEditingCommand(null);
    setIsCreating(false);
  };

  const handleDeleteCommand = (commandId: string) => {
    const newCommands = commands.filter(cmd => cmd.id !== commandId);
    setCommands(newCommands);
    saveCustomCommands(newCommands);
  };

  const handleCancel = () => {
    setEditingCommand(null);
    setIsCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" 
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-600 max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl" style={{ backgroundColor: '#1478D4' }}>
              <Keyboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administrar Comandos</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza los atajos de teclado del sistema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex h-[calc(85vh-120px)]">
          {/* Lista de comandos */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Search bar y botón crear */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar comandos por nombre o atajo..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl 
                           focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                />
              </div>

              <button
                onClick={handleCreateCommand}
                className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 
                         rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                         transition-all flex items-center justify-center gap-3 text-gray-600 dark:text-gray-400
                         hover:text-blue-600 dark:hover:text-blue-400 group"
              >
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Crear comando personalizado</span>
              </button>
            </div>

            {/* Commands list */}
            <div className="space-y-6">
              {/* Acciones */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-6 rounded-full" style={{ backgroundColor: '#1478D4' }}></div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Acciones Rápidas
                  </h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                    {filteredCommands.filter(cmd => cmd.categoria === 'acciones').length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {filteredCommands.filter(cmd => cmd.categoria === 'acciones').map((command) => {
                    const IconComponent = command.icono;
                    return (
                      <div
                        key={command.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600
                                 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 
                                 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{command.nombre}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Ejecuta la acción directamente</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                                       rounded-lg text-sm font-mono border border-gray-200 dark:border-gray-600">
                            {command.atajo}
                          </kbd>
                          {command.isCustom ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditCommand(command)}
                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                title="Editar comando"
                              >
                                <Edit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleDeleteCommand(command.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Eliminar comando"
                              >
                                <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                              Sistema
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navegación */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Navegación
                  </h3>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                    {filteredCommands.filter(cmd => cmd.categoria === 'navegacion').length}
                  </span>
                </div>
                <div className="grid gap-3">
                  {filteredCommands.filter(cmd => cmd.categoria === 'navegacion').map((command) => {
                    const IconComponent = command.icono;
                    return (
                      <div
                        key={command.id}
                        className="group flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-600
                                 hover:border-emerald-300 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 
                                 transition-all duration-200 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                            <IconComponent className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-gray-100">{command.nombre}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Navega al módulo correspondiente</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                                       rounded-lg text-sm font-mono border border-gray-200 dark:border-gray-600">
                            {command.atajo}
                          </kbd>
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                            Sistema
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Editor panel */}
          {editingCommand && (
            <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Edit2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {isCreating ? 'Crear Comando' : 'Editar Comando'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {isCreating ? 'Configura tu nuevo comando personalizado' : 'Modifica el comando existente'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Nombre del comando
                    </label>
                    <input
                      type="text"
                      value={editingCommand.nombre}
                      onChange={(e) => setEditingCommand({ ...editingCommand, nombre: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl
                               focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="Ej: Nuevo Reporte Mensual"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Nombre descriptivo que aparecerá en el command palette
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Atajo de teclado
                    </label>
                    <div className="relative">
                      <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                      <input
                        type="text"
                        value={editingCommand.atajo}
                        onChange={(e) => setEditingCommand({ ...editingCommand, atajo: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl
                                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-center"
                        placeholder="Ej: Ctrl+R"
                      />
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">💡 Consejos:</p>
                      <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                        <li>• Usa Ctrl+ para Windows/Linux</li>
                        <li>• Usa Cmd+ para Mac</li>
                        <li>• Ejemplo: Ctrl+Shift+N</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Categoría
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setEditingCommand({ ...editingCommand, categoria: 'acciones' })}
                        className={`p-3 rounded-xl border transition-all ${
                          editingCommand.categoria === 'acciones'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-sm font-medium">Acciones</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ejecuta tareas</div>
                      </button>
                      <button
                        onClick={() => setEditingCommand({ ...editingCommand, categoria: 'navegacion' })}
                        className={`p-3 rounded-xl border transition-all ${
                          editingCommand.categoria === 'navegacion'
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="text-sm font-medium">Navegación</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cambia de página</div>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleCancel}
                      className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 
                               border border-gray-200 dark:border-gray-500 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-500 
                               transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveCommand}
                      disabled={!editingCommand.nombre || !editingCommand.atajo}
                      className="flex-1 px-4 py-3 text-white rounded-xl transition-colors flex items-center justify-center gap-2
                               disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      style={{ backgroundColor: !editingCommand.nombre || !editingCommand.atajo ? '#9CA3AF' : '#1478D4' }}
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1068C4';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1478D4';
                        }
                      }}
                    >
                      <Save className="w-4 h-4" />
                      {isCreating ? 'Crear Comando' : 'Guardar Cambios'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandsManagementModal;