import { useState } from 'react';
import { Plus, Eye, EyeOff, Save, RotateCcw, Upload, Calculator, ChevronUp, ChevronDown, Search, Calendar } from 'lucide-react';

export default function PriceListManager() {
  const [activeTab, setActiveTab] = useState('columns');
  const [searchSKU, setSearchSKU] = useState('');
  const [priceDate, setPriceDate] = useState('');
  const [priceQuantity, setPriceQuantity] = useState(1);
  // Eliminado: editingColumn y setEditingColumn no se usan
  const [fixedPrice, setFixedPrice] = useState('0.00');
  const [validFrom, setValidFrom] = useState('dd/mm/aaaa');
  const [validTo, setValidTo] = useState('dd/mm/aaaa');

  const [columns, setColumns] = useState([
    {
      id: 'P1',
      name: 'Precio',
      mode: 'Fijo',
      base: true,
      visible: true,
      order: 1,
      actions: ['Ocultar', 'Eliminar']
    },
    {
      id: 'P2',
      name: 'Precio',
      mode: 'Matriz por volumen',
      base: false,
      visible: true,
      order: 2,
      actions: ['Ocultar', 'Eliminar']
    },
    {
      id: 'P3',
      name: 'Precio',
      mode: 'Fijo',
      base: false,
      visible: false,
      order: 3,
      actions: ['Mostrar', 'Eliminar']
    }
  ]);

  const modeOptions = ['Fijo', 'Matriz por volumen', 'Porcentaje'];

  const addColumn = () => {
    const newColumn = {
      id: `P${columns.length + 1}`,
      name: 'Precio',
      mode: 'Fijo',
      base: false,
      visible: true,
      order: columns.length + 1,
      actions: ['Ocultar', 'Eliminar']
    };
    setColumns([...columns, newColumn]);
  };

  const toggleVisibility = (id: string) => {
    setColumns(columns.map(col => {
      if (col.id === id) {
        const newVisible = !col.visible;
        return { 
          ...col, 
          visible: newVisible,
          actions: newVisible ? ['Ocultar', 'Eliminar'] : ['Mostrar', 'Eliminar']
        };
      }
      return col;
    }));
  };

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    const currentIndex = columns.findIndex(col => col.id === id);
    if ((direction === 'up' && currentIndex > 0) || 
        (direction === 'down' && currentIndex < columns.length - 1)) {
      const newColumns = [...columns];
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      [newColumns[currentIndex], newColumns[targetIndex]] = [newColumns[targetIndex], newColumns[currentIndex]];
      
      // Update order numbers
      newColumns.forEach((col, index) => {
        col.order = index + 1;
      });
      
      setColumns(newColumns);
    }
  };

  const visibleColumns = columns.filter(col => col.visible);
  const baseColumn = columns.find(col => col.base);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Lista de Precios</h1>
            <p className="text-slate-600 text-sm">
              Módulo unificado para configurar columnas (P1..P10) y definir precios por producto (SKU).
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div className="mb-1">Última actualización: 23/9/2025, 2:13:54 a. m.</div>
            <div>Usuario: <span className="font-medium">usuario.demo</span></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-1 mb-6">
          <button
            onClick={() => setActiveTab('columns')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'columns'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Plantilla de columnas
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === 'prices'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Precios por producto
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3">
            {activeTab === 'columns' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">Plantilla de columnas</h2>
                    <p className="text-slate-600 text-sm">
                      Máximo 10 columnas · Debe existir una sola columna Base · Al menos una visible.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={addColumn}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-blue-600/25"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar columna
                    </button>
                    <button className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-medium transition-colors duration-200">
                      <RotateCcw className="w-4 h-4" />
                      Restablecer por defecto
                    </button>
                  </div>
                </div>

                {/* Columns Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Columna</th>
                        <th className="text-left py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Nombre Visible</th>
                        <th className="text-left py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Modo de Valorización</th>
                        <th className="text-center py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Base</th>
                        <th className="text-center py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Visible</th>
                        <th className="text-center py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Orden</th>
                        <th className="text-center py-3 px-4 text-slate-700 font-semibold text-sm uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((column, index) => (
                        <tr key={column.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                          <td className="py-4 px-4">
                            <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">
                              {column.id}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="text"
                              value={column.name}
                              onChange={(e) => setColumns(columns.map(col => 
                                col.id === column.id ? { ...col, name: e.target.value } : col
                              ))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={column.mode}
                              onChange={(e) => setColumns(columns.map(col => 
                                col.id === column.id ? { ...col, mode: e.target.value } : col
                              ))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              {modeOptions.map(mode => (
                                <option key={mode} value={mode}>{mode}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className={`w-4 h-4 rounded-full mx-auto ${
                              column.base ? 'bg-blue-500' : 'bg-slate-300'
                            }`} />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <button
                              onClick={() => toggleVisibility(column.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                column.visible 
                                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                                  : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                              }`}
                            >
                              {column.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm font-medium text-slate-700">{column.order}</span>
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => moveColumn(column.id, 'up')}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => moveColumn(column.id, 'down')}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                  disabled={index === columns.length - 1}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => toggleVisibility(column.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
                              >
                                {column.visible ? 'Ocultar' : 'Mostrar'}
                              </button>
                              {!column.base && (
                                <button className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200">
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Base Column Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">Base</span>
                    <p className="text-sm text-blue-800">
                      La columna Base define el precio de referencia (ejem: P1). No se puede eliminar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'prices' && (
              <div className="space-y-6">
                {/* SKU Search */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h2 className="text-xl font-semibold text-slate-900 mb-4">Precios por producto (SKU)</h2>
                  <p className="text-slate-600 text-sm mb-4">
                    En cada columna puedes definir un <strong>Precio Fijo</strong> con vigencia o una <strong>Matriz por Volumen</strong> (exclusivos).
                  </p>

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar o ingresar SKU..."
                        value={searchSKU}
                        onChange={(e) => setSearchSKU(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-blue-600/25">
                      <Upload className="w-4 h-4 mr-2 inline" />
                      Cargar
                    </button>
                  </div>
                </div>

                {/* Price Column Tabs */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="flex gap-2 mb-6 overflow-x-auto">
                    <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shadow-lg shadow-blue-600/25">
                      {baseColumn?.id} - Precio de venta al público
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200">
                      P2 - Precio mayorista
                    </button>
                    <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200">
                      P3 - Precio online (oculta)
                    </button>
                  </div>

                  {/* Price Configuration Form */}
                  <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Editar columna P1 — Precio de venta al público
                      </h3>
                      <p className="text-sm text-slate-600">Modo configurado en plantilla: Fijo</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Precio fijo (PEN):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={fixedPrice}
                          onChange={(e) => setFixedPrice(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Vigente desde:
                        </label>
                        <input
                          type="text"
                          placeholder="dd/mm/aaaa"
                          value={validFrom}
                          onChange={(e) => setValidFrom(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Vigente hasta (opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="dd/mm/aaaa"
                          value={validTo}
                          onChange={(e) => setValidTo(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors duration-200 shadow-lg shadow-green-600/25">
                        <Save className="w-4 h-4 mr-2 inline" />
                        Guardar
                      </button>
                      <button className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors duration-200">
                        Eliminar definición
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Resumen</h3>
              <div className="text-sm text-slate-500 mb-4">{columns.length}/10 columnas</div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Columna base</div>
                  <div className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-center">
                    {baseColumn?.id}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Columnas visibles</div>
                  <div className="text-3xl font-bold text-slate-900">{visibleColumns.length}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Modos</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                      <span className="text-sm text-slate-600">Visible</span>
                      <span className="text-sm text-slate-600">Oculta</span>
                      <span className="text-sm text-slate-600">Fijo</span>
                    </div>
                    <div className="bg-slate-100 px-3 py-2 rounded-lg text-sm">
                      <div><strong>Fijo: 2 • Matriz por volumen: 1</strong></div>
                      <div className="text-slate-600">Matriz por volumen</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Calculator */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-slate-900">Resolver precio</h3>
              </div>
              
              <p className="text-sm text-slate-600 mb-4">
                Calcula el precio vigente según <em>fecha y cantidad</em>.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="dd/mm/aaaa"
                      value={priceDate}
                      onChange={(e) => setPriceDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad</label>
                  <input
                    type="number"
                    value={priceQuantity}
                    onChange={(e) => setPriceQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Columna seleccionada</div>
                  <div className="bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold text-center">
                    {baseColumn?.id}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Precio resuelto</div>
                  <div className="text-2xl font-bold text-center border-2 border-dashed border-slate-300 py-8 rounded-lg text-slate-400">
                    —
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-700 mb-2">Origen</div>
                  <div className="text-center border-2 border-dashed border-slate-300 py-4 rounded-lg text-slate-400">
                    —
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}