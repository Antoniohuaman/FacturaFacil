// src/features/catalogo-articulos/components/MassStockUpdateModal.tsx

import React, { useState } from 'react';
import { useProductStore } from '../hooks/useProductStore';
import * as XLSX from 'xlsx';

interface MassStockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MassStockUpdateModal: React.FC<MassStockUpdateModalProps> = ({ isOpen, onClose }) => {
  const { allProducts, addMovimiento } = useProductStore();
  const [activeTab, setActiveTab] = useState<'reset' | 'import' | 'manual'>('reset');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<Array<{ codigo: string; cantidad: number }>>([]);

  if (!isOpen) return null;

  const filteredProducts = allProducts.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (id: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedProducts(newSet);
  };

  const selectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const handleResetStock = () => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Selecciona al menos un producto');
      return;
    }

    const confirmacion = confirm(
      `🔄 RESETEAR STOCK A CERO\n\n` +
      `Productos seleccionados: ${selectedProducts.size}\n\n` +
      `⚠️ Esta acción:\n` +
      `• Pondrá el stock en 0 para todos los productos seleccionados\n` +
      `• Registrará movimientos de ajuste negativo\n` +
      `• No se puede deshacer\n\n` +
      `¿Deseas continuar?`
    );

    if (!confirmacion) return;

    let actualizados = 0;
    selectedProducts.forEach(productId => {
      const producto = allProducts.find(p => p.id === productId);
      if (producto && producto.cantidad > 0) {
        // Solo registrar movimiento - addMovimiento actualiza el stock automáticamente
        // El tipo AJUSTE_NEGATIVO restará la cantidad actual, dejando el stock en 0
        addMovimiento(
          productId,
          'AJUSTE_NEGATIVO',
          'AJUSTE_INVENTARIO',
          producto.cantidad, // Resta toda la cantidad actual
          `Reseteo masivo de stock`,
          '',
          'Sistema'
        );
        
        actualizados++;
      }
    });

    alert(`✅ Stock reseteado exitosamente\n\n${actualizados} productos actualizados a stock 0`);
    setSelectedProducts(new Set());
    onClose();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    const reader = new FileReader();
    
    // Detectar si es Excel o CSV
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      // Leer archivo Excel
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Tomar la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            alert('❌ Archivo vacío\n\nEl archivo Excel debe tener al menos una fila de encabezados y una fila de datos');
            setImporting(false);
            return;
          }

          // Validar header (primera fila)
          const header = jsonData[0].map((h: any) => String(h).toLowerCase());
          const codigoIndex = header.findIndex(h => h.includes('codigo') || h.includes('code'));
          const cantidadIndex = header.findIndex(h => h.includes('cantidad') || h.includes('stock') || h.includes('qty'));
          
          if (codigoIndex === -1 || cantidadIndex === -1) {
            alert('❌ Archivo inválido\n\nEl archivo Excel debe tener columnas:\n• CODIGO (o CODE)\n• CANTIDAD (o STOCK o QTY)');
            setImporting(false);
            return;
          }

          // Procesar datos
          const processedData: Array<{ codigo: string; cantidad: number }> = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const codigo = String(row[codigoIndex] || '').trim();
            const cantidad = parseFloat(row[cantidadIndex]);
            
            if (codigo && !isNaN(cantidad) && cantidad >= 0) {
              processedData.push({ codigo, cantidad });
            }
          }

          if (processedData.length === 0) {
            alert('❌ No se encontraron datos válidos en el archivo Excel');
            setImporting(false);
            return;
          }

          setImportData(processedData);
          setImporting(false);
          
          alert(
            `📊 ARCHIVO EXCEL CARGADO\n\n` +
            `${processedData.length} registros encontrados\n` +
            `Hoja: ${sheetName}\n\n` +
            `Revisa la vista previa y haz click en "Aplicar Cambios"`
          );

        } catch (error) {
          console.error('Error al leer Excel:', error);
          alert('❌ Error al leer el archivo Excel\n\nAsegúrate de que sea un archivo Excel válido (.xlsx o .xls)');
          setImporting(false);
        }
      };

      reader.readAsBinaryString(file);
      
    } else {
      // Leer archivo CSV/TXT (código original)
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          // Validar header
          const header = lines[0].toLowerCase();
          if (!header.includes('codigo') || !header.includes('cantidad')) {
            alert('❌ Archivo CSV inválido\n\nEl archivo debe tener columnas: CODIGO, CANTIDAD');
            setImporting(false);
            return;
          }

          // Procesar datos
          const data: Array<{ codigo: string; cantidad: number }> = [];
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(/[,;\t]/).map(c => c.trim());
            if (columns.length >= 2) {
              const codigo = columns[0];
              const cantidad = parseFloat(columns[1]);
              
              if (codigo && !isNaN(cantidad) && cantidad >= 0) {
                data.push({ codigo, cantidad });
              }
            }
          }

          if (data.length === 0) {
            alert('❌ No se encontraron datos válidos en el archivo CSV');
            setImporting(false);
            return;
          }

          setImportData(data);
          setImporting(false);
          
          alert(
            `📊 ARCHIVO CSV CARGADO\n\n` +
            `${data.length} registros encontrados\n\n` +
            `Revisa la vista previa y haz click en "Aplicar Cambios"`
          );

        } catch (error) {
          alert('❌ Error al leer el archivo CSV\n\nAsegúrate de que sea un archivo CSV válido');
          setImporting(false);
        }
      };

      reader.readAsText(file);
    }
  };

  const handleApplyImport = () => {
    if (importData.length === 0) {
      alert('⚠️ No hay datos para importar');
      return;
    }

    const confirmacion = confirm(
      `📦 IMPORTAR ACTUALIZACIÓN MASIVA\n\n` +
      `Registros a procesar: ${importData.length}\n\n` +
      `⚠️ Esta acción actualizará el stock de los productos encontrados\n\n` +
      `¿Continuar?`
    );

    if (!confirmacion) return;

    let actualizados = 0;
    let sinCambios = 0;
    let noEncontrados: string[] = [];

    importData.forEach(({ codigo, cantidad }) => {
      const producto = allProducts.find(p => p.codigo.toUpperCase() === codigo.toUpperCase());
      
      if (producto) {
        const cantidadAnterior = producto.cantidad;
        const diferencia = cantidad - cantidadAnterior;
        
        // Solo procesar si hay diferencia (evita movimientos innecesarios)
        if (diferencia !== 0) {
          // addMovimiento ya actualiza el stock automáticamente
          // No usar updateProduct() para evitar doble actualización
          addMovimiento(
            producto.id,
            diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
            'AJUSTE_INVENTARIO',
            Math.abs(diferencia),
            `Importación masiva de stock - Archivo Excel/CSV`,
            `Lote: ${new Date().toISOString().split('T')[0]}`,
            'Sistema'
          );
          actualizados++;
        } else {
          sinCambios++;
        }
      } else {
        noEncontrados.push(codigo);
      }
    });

    let mensaje = `✅ IMPORTACIÓN COMPLETADA\n\n`;
    mensaje += `📊 Resumen:\n`;
    mensaje += `• Productos actualizados: ${actualizados}\n`;
    if (sinCambios > 0) {
      mensaje += `• Sin cambios (mismo stock): ${sinCambios}\n`;
    }
    
    if (noEncontrados.length > 0) {
      mensaje += `\n⚠️ No encontrados (${noEncontrados.length}):\n`;
      mensaje += noEncontrados.slice(0, 10).join(', ');
      if (noEncontrados.length > 10) {
        mensaje += `\n... y ${noEncontrados.length - 10} más`;
      }
    }
    
    mensaje += `\n\n✅ Movimientos registrados: ${actualizados}`;
    mensaje += `\nRevisa la pestaña "Movimientos" para ver el detalle`;

    alert(mensaje);
    setImportData([]);
    onClose();
  };

  const downloadTemplate = () => {
    // Crear workbook de Excel
    const data = [
      ['CODIGO', 'CANTIDAD'],
      ...allProducts.slice(0, 10).map(p => [p.codigo, p.cantidad])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

    // Descargar archivo Excel
    XLSX.writeFile(workbook, `plantilla-stock-${Date.now()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Actualización Masiva de Stock</h3>
                  <p className="text-sm text-blue-100">Gestiona el inventario de múltiples productos</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white hover:text-blue-100 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('reset')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reset'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Resetear Stock</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('import')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'import'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Importar desde Archivo</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-96 overflow-y-auto">
            {/* RESET TAB */}
            {activeTab === 'reset' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Resetear Stock a Cero</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Selecciona los productos cuyo stock deseas resetear a 0. Se registrará un movimiento de ajuste negativo para cada producto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Select All */}
                <div className="flex items-center justify-between py-2 border-b">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Seleccionar todos ({filteredProducts.length})
                    </span>
                  </label>
                  <span className="text-sm text-gray-500">
                    {selectedProducts.size} seleccionados
                  </span>
                </div>

                {/* Product List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <label
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedProducts.has(product.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.nombre}</p>
                          <p className="text-sm text-gray-500 font-mono">{product.codigo}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Stock Actual</p>
                        <p className={`text-lg font-bold ${product.cantidad > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.cantidad}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* IMPORT TAB */}
            {activeTab === 'import' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Formatos Aceptados</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Sube archivos <strong>Excel (.xlsx, .xls)</strong> o <strong>CSV (.csv, .txt)</strong>
                      </p>
                      <p className="text-xs text-blue-600 mt-2">
                        Columnas requeridas: <strong>CODIGO</strong> y <strong>CANTIDAD</strong> (también acepta STOCK, QTY, CODE)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Download Template */}
                <button
                  onClick={downloadTemplate}
                  className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">Descargar Plantilla Excel (.xlsx)</span>
                  </div>
                </button>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {importing ? 'Procesando archivo...' : 'Click para seleccionar archivo'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Excel (.xlsx, .xls) o CSV (.csv, .txt)</p>
                      <p className="text-xs text-gray-400 mt-1">o arrastra y suelta aquí</p>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                {importData.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700">
                        Vista Previa ({importData.length} registros)
                      </h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importData.slice(0, 20).map((item, index) => {
                            const producto = allProducts.find(p => p.codigo.toUpperCase() === item.codigo.toUpperCase());
                            return (
                              <tr key={index} className={producto ? '' : 'bg-red-50'}>
                                <td className="px-4 py-2 text-sm font-mono text-gray-900">{item.codigo}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{item.cantidad}</td>
                                <td className="px-4 py-2 text-sm">
                                  {producto ? (
                                    <span className="text-green-600">✓ Encontrado</span>
                                  ) : (
                                    <span className="text-red-600">✗ No existe</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            {activeTab === 'reset' && (
              <button
                onClick={handleResetStock}
                disabled={selectedProducts.size === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Resetear Stock ({selectedProducts.size})
              </button>
            )}
            
            {activeTab === 'import' && (
              <button
                onClick={handleApplyImport}
                disabled={importData.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Aplicar Cambios ({importData.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MassStockUpdateModal;
