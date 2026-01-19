/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
// src/features/inventario/components/modals/MassUpdateModal.tsx

import React, { useState } from 'react';
import { useProductStore } from '../../../catalogo-articulos/hooks/useProductStore';
import { useConfigurationContext } from '../../../configuracion-sistema/contexto/ContextoConfiguracion';
import { InventoryService } from '../../services/inventory.service';
import { useAuth } from '../../../autenticacion/hooks';
import type { MovimientoStock } from '../../models';
import * as XLSX from 'xlsx';

interface MassUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MassUpdateModal: React.FC<MassUpdateModalProps> = ({ isOpen, onClose }) => {
  const { allProducts, updateProduct } = useProductStore();
  const { user } = useAuth();
  const { state: configState } = useConfigurationContext();
  const warehouses = configState.warehouses.filter(w => w.isActive);

  const [activeTab, setActiveTab] = useState<'reset' | 'import' | 'manual'>('reset');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [importing, setImporting] = useState(false);
  const [importData, setImportData] = useState<Array<{ codigo: string; almacen?: string; cantidad: number }>>([]);

  // Multi-almacén para operaciones masivas
  const [aplicarATodos, setAplicarATodos] = useState(false);
  const [warehousesSeleccionados, setWarehousesSeleccionados] = useState<string[]>([]);

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

    // Validar selección de almacenes
    if (!aplicarATodos && warehousesSeleccionados.length === 0) {
      alert('⚠️ Selecciona al menos un almacén o activa "Aplicar a todos"');
      return;
    }

    const warehousesAplicar = aplicarATodos
      ? warehouses
      : warehouses.filter(w => warehousesSeleccionados.includes(w.id));

    const confirmacion = confirm(
      `🔄 RESETEAR STOCK A CERO\n\n` +
      `Productos seleccionados: ${selectedProducts.size}\n` +
      `Almacenes: ${aplicarATodos ? `TODOS (${warehousesAplicar.length})` : `${warehousesAplicar.length} seleccionados`}\n\n` +
      `⚠️ Esta acción:\n` +
      `• Pondrá el stock en 0 para todos los productos seleccionados\n` +
      `• Registrará movimientos de ajuste negativo en cada almacén\n` +
      `• No se puede deshacer\n\n` +
      `Total de movimientos a crear: ${selectedProducts.size * warehousesAplicar.length}\n\n` +
      `¿Deseas continuar?`
    );

    if (!confirmacion) return;

    let actualizados = 0;
    const movimientos: MovimientoStock[] = [];

    // Iterar por cada almacén seleccionado
    warehousesAplicar.forEach((warehouse) => {
      selectedProducts.forEach(productId => {
        const producto = allProducts.find(p => p.id === productId);
        if (producto) {
          const stockActual = producto.stockPorAlmacen?.[warehouse.id] ?? 0;

          if (stockActual > 0) {
            // Usar el servicio de inventario para registrar el ajuste
            const result = InventoryService.registerAdjustment(
              producto,
              warehouse,
              {
                productoId: producto.id,
                warehouseId: warehouse.id,
                tipo: 'AJUSTE_NEGATIVO',
                motivo: 'AJUSTE_INVENTARIO',
                cantidad: stockActual, // Resetear a 0 significa restar todo el stock actual
                observaciones: 'Reseteo masivo de stock a cero',
                documentoReferencia: ''
              },
              user?.nombre || 'Usuario'
            );

            // Actualizar el producto en el store
            updateProduct(producto.id, result.product);
            movimientos.push(result.movement);
            actualizados++;
          }
        }
      });
    });

    alert(
      `✅ Stock reseteado exitosamente\n\n` +
      `${actualizados} movimientos registrados\n` +
      `${selectedProducts.size} productos × ${warehousesAplicar.length} almacén(es)`
    );

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
          const almacenIndex = header.findIndex(h => h.includes('almacen') || h.includes('warehouse'));
          const cantidadIndex = header.findIndex(h => h.includes('cantidad') || h.includes('stock') || h.includes('qty'));

          if (codigoIndex === -1 || cantidadIndex === -1) {
            alert('❌ Archivo inválido\n\nEl archivo Excel debe tener columnas:\n• CODIGO (o CODE)\n• CANTIDAD (o STOCK o QTY)\n• ALMACEN (opcional - warehouse code)');
            setImporting(false);
            return;
          }

          // Procesar datos
          const processedData: Array<{ codigo: string; almacen?: string; cantidad: number }> = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const codigo = String(row[codigoIndex] || '').trim();
            const almacen = almacenIndex !== -1 ? String(row[almacenIndex] || '').trim() : undefined;
            const cantidad = parseFloat(row[cantidadIndex]);

            if (codigo && !isNaN(cantidad) && cantidad >= 0) {
              processedData.push({ codigo, almacen, cantidad });
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
          const headerCols = header.split(/[,;\t]/).map(h => h.trim());
          const codigoIdx = headerCols.findIndex(h => h.includes('codigo') || h.includes('code'));
          const almacenIdx = headerCols.findIndex(h => h.includes('almacen') || h.includes('warehouse'));
          const cantidadIdx = headerCols.findIndex(h => h.includes('cantidad') || h.includes('stock') || h.includes('qty'));

          if (codigoIdx === -1 || cantidadIdx === -1) {
            alert('❌ Archivo CSV inválido\n\nEl archivo debe tener columnas:\n• CODIGO (o CODE)\n• CANTIDAD (o STOCK o QTY)\n• ALMACEN (opcional)');
            setImporting(false);
            return;
          }

          // Procesar datos
          const data: Array<{ codigo: string; almacen?: string; cantidad: number }> = [];
          for (let i = 1; i < lines.length; i++) {
            const columns = lines[i].split(/[,;\t]/).map(c => c.trim());
            if (columns.length >= 2) {
              const codigo = columns[codigoIdx];
              const almacen = almacenIdx !== -1 ? columns[almacenIdx] : undefined;
              const cantidad = parseFloat(columns[cantidadIdx]);

              if (codigo && !isNaN(cantidad) && cantidad >= 0) {
                data.push({ codigo, almacen, cantidad });
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

    // Validar selección de almacenes
    if (!aplicarATodos && warehousesSeleccionados.length === 0) {
      alert('⚠️ Selecciona al menos un almacén o activa "Aplicar a todos"');
      return;
    }

    const warehousesAplicar = aplicarATodos
      ? warehouses
      : warehouses.filter(w => warehousesSeleccionados.includes(w.id));

    const confirmacion = confirm(
      `📦 IMPORTAR ACTUALIZACIÓN MASIVA\n\n` +
      `Registros a procesar: ${importData.length}\n` +
      `Almacenes: ${aplicarATodos ? `TODOS (${warehousesAplicar.length})` : `${warehousesAplicar.length} seleccionados`}\n\n` +
      `⚠️ Esta acción actualizará el stock de los productos encontrados\n` +
      `Total de movimientos potenciales: ${importData.length * warehousesAplicar.length}\n\n` +
      `¿Continuar?`
    );

    if (!confirmacion) return;

    let actualizados = 0;
    let sinCambios = 0;
    const noEncontrados: string[] = [];
    const movimientos: MovimientoStock[] = [];

    // Iterar por cada almacén seleccionado
    warehousesAplicar.forEach((warehouse) => {
      importData.forEach(({ codigo, almacen, cantidad }) => {
        // Si el archivo tiene columna ALMACEN, solo procesar si coincide con el warehouse actual
        if (almacen && almacen.toUpperCase() !== warehouse.code.toUpperCase()) {
          return; // Saltar este registro, no es para este almacén
        }

        const producto = allProducts.find(p => p.codigo.toUpperCase() === codigo.toUpperCase());

        if (producto) {
          const stockActual = producto.stockPorAlmacen?.[warehouse.id] ?? 0;

          if (stockActual !== cantidad) {
            // Determinar el tipo de movimiento basado en si aumenta o disminuye
            const diferencia = cantidad - stockActual;
            const tipo = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
            const cantidadMovimiento = Math.abs(diferencia);

            // Usar el servicio de inventario para registrar el ajuste
            const result = InventoryService.registerAdjustment(
              producto,
              warehouse,
              {
                productoId: producto.id,
                warehouseId: warehouse.id,
                tipo,
                motivo: 'AJUSTE_INVENTARIO',
                cantidad: cantidadMovimiento,
                observaciones: `Importación masiva: ${stockActual} → ${cantidad}`,
                documentoReferencia: ''
              },
              user?.nombre || 'Usuario'
            );

            // Actualizar el producto en el store
            updateProduct(producto.id, result.product);
            movimientos.push(result.movement);
            actualizados++;
          } else {
            sinCambios++;
          }
        } else {
          if (!noEncontrados.includes(codigo)) {
            noEncontrados.push(codigo);
          }
        }
      });
    });

    let mensaje = `✅ IMPORTACIÓN COMPLETADA\n\n`;
    mensaje += `📊 Resumen:\n`;
    mensaje += `• Movimientos registrados: ${actualizados}\n`;
    mensaje += `• Almacenes procesados: ${warehousesAplicar.length}\n`;
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

    mensaje += `\n\n✅ Revisa la pestaña "Movimientos" para ver el detalle`;

    alert(mensaje);
    setImportData([]);
    onClose();
  };

  const downloadTemplate = () => {
    // Crear workbook de Excel con columnas: CODIGO, ALMACEN, CANTIDAD
    const data: (string | number)[][] = [
      ['CODIGO', 'ALMACEN', 'CANTIDAD']
    ];

    // Generar filas para cada combinación producto × almacén
    // Tomar los primeros 10 productos y todos los almacenes activos
    const productosMuestra = allProducts.slice(0, 10);

    productosMuestra.forEach(producto => {
      warehouses.forEach(warehouse => {
        const stockActual = producto.stockPorAlmacen?.[warehouse.id] ?? 0;
        data.push([
          producto.codigo,
          warehouse.code,
          stockActual
        ]);
      });
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 15 },  // CODIGO
      { wch: 12 },  // ALMACEN
      { wch: 10 }   // CANTIDAD
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock');

    // Descargar archivo Excel
    XLSX.writeFile(workbook, `plantilla-stock-${Date.now()}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
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
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('reset')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'reset'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Resetear Stock a Cero</h4>
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                        Selecciona los productos cuyo stock deseas resetear a 0. Se registrará un movimiento de ajuste negativo para cada producto.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Multi-selector de Almacenes */}
                <div className="border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Aplicar a Almacenes <span className="text-red-500">*</span>
                      </label>
                    </div>

                    {/* Toggle: Aplicar a todos */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !aplicarATodos;
                        setAplicarATodos(newValue);
                        setWarehousesSeleccionados(newValue ? [] : warehousesSeleccionados);
                      }}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${aplicarATodos ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    >
                      <span className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${aplicarATodos ? 'translate-x-6' : 'translate-x-1'}
                      `} />
                    </button>
                  </div>

                  {/* Mensaje de estado */}
                  <div className={`
                    flex items-center space-x-2 p-3 rounded-lg border-2
                    ${aplicarATodos
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700'
                    }
                  `}>
                    {aplicarATodos ? (
                      <>
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            Aplicar a todos los almacenes
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-400">
                            Se creará un movimiento en los {warehouses.length} almacén(es) activo(s)
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            Selección personalizada
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Elige almacenes específicos
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Lista de almacenes */}
                  {!aplicarATodos && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {warehouses.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <p className="text-sm font-medium">No hay almacenes activos</p>
                        </div>
                      ) : (
                        warehouses.map((wh) => {
                          const isSelected = warehousesSeleccionados.includes(wh.id);
                          return (
                            <label
                              key={wh.id}
                              className={`
                                flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newIds = e.target.checked
                                    ? [...warehousesSeleccionados, wh.id]
                                    : warehousesSeleccionados.filter(id => id !== wh.id);
                                  setWarehousesSeleccionados(newIds);
                                }}
                                className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 truncate">
                                    {wh.name}
                                  </p>
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                                    {wh.code}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                  {wh.establishmentName || 'Sin establecimiento'}
                                </p>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Contador de selección */}
                  {!aplicarATodos && warehouses.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {warehousesSeleccionados.length} de {warehouses.length} almacén(es) seleccionado(s)
                      </p>
                      {warehousesSeleccionados.length > 0 && warehousesSeleccionados.length < warehouses.length && (
                        <button
                          type="button"
                          onClick={() => {
                            setWarehousesSeleccionados(warehouses.map(w => w.id));
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
                        >
                          Seleccionar todos
                        </button>
                      )}
                      {warehousesSeleccionados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setWarehousesSeleccionados([]);
                          }}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium underline"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Select All */}
                <div className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={selectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Seleccionar todos ({filteredProducts.length})
                    </span>
                  </label>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedProducts.size} seleccionados
                  </span>
                </div>

                {/* Product List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {filteredProducts.map(product => {
                    // TODO: Calcular stock cuando se implemente gestión de inventario
                    // Por ahora mostrar 0
                    const stockMostrar = 0;
                    const etiquetaStock = 'Stock Total';

                    return (
                      <label
                        key={product.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedProducts.has(product.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-200">{product.nombre}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{product.codigo}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{etiquetaStock}</p>
                          <p className={`text-lg font-bold ${stockMostrar > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {stockMostrar}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* IMPORT TAB */}
            {activeTab === 'import' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Formatos Aceptados</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Sube archivos <strong>Excel (.xlsx, .xls)</strong> o <strong>CSV (.csv, .txt)</strong>
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        Columnas: <strong>CODIGO</strong>, <strong>ALMACEN</strong>, <strong>CANTIDAD</strong> (también acepta CODE, WAREHOUSE, STOCK, QTY)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Multi-selector de Almacenes - Same as reset tab */}
                <div className="border-2 border-blue-200 dark:border-blue-700 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <label className="text-sm font-semibold text-gray-900 dark:text-gray-200">
                        Aplicar a Almacenes <span className="text-red-500">*</span>
                      </label>
                    </div>

                    {/* Toggle: Aplicar a todos */}
                    <button
                      type="button"
                      onClick={() => {
                        const newValue = !aplicarATodos;
                        setAplicarATodos(newValue);
                        setWarehousesSeleccionados(newValue ? [] : warehousesSeleccionados);
                      }}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                        ${aplicarATodos ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
                      `}
                    >
                      <span className={`
                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${aplicarATodos ? 'translate-x-6' : 'translate-x-1'}
                      `} />
                    </button>
                  </div>

                  {/* Mensaje de estado */}
                  <div className={`
                    flex items-center space-x-2 p-3 rounded-lg border-2
                    ${aplicarATodos
                      ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                      : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-700'
                    }
                  `}>
                    {aplicarATodos ? (
                      <>
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            Aplicar a todos los almacenes
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-400">
                            Se importará el stock en los {warehouses.length} almacén(es) activo(s)
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">
                            Selección personalizada
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Elige almacenes específicos para importar
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Lista de almacenes */}
                  {!aplicarATodos && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {warehouses.length === 0 ? (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                          <p className="text-sm font-medium">No hay almacenes activos</p>
                        </div>
                      ) : (
                        warehouses.map((wh) => {
                          const isSelected = warehousesSeleccionados.includes(wh.id);
                          return (
                            <label
                              key={wh.id}
                              className={`
                                flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  const newIds = e.target.checked
                                    ? [...warehousesSeleccionados, wh.id]
                                    : warehousesSeleccionados.filter(id => id !== wh.id);
                                  setWarehousesSeleccionados(newIds);
                                }}
                                className="w-5 h-5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-200 truncate">
                                    {wh.name}
                                  </p>
                                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full">
                                    {wh.code}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                                  {wh.establishmentName || 'Sin establecimiento'}
                                </p>
                              </div>
                              {isSelected && (
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Contador de selección */}
                  {!aplicarATodos && warehouses.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {warehousesSeleccionados.length} de {warehouses.length} almacén(es) seleccionado(s)
                      </p>
                      {warehousesSeleccionados.length > 0 && warehousesSeleccionados.length < warehouses.length && (
                        <button
                          type="button"
                          onClick={() => {
                            setWarehousesSeleccionados(warehouses.map(w => w.id));
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium underline"
                        >
                          Seleccionar todos
                        </button>
                      )}
                      {warehousesSeleccionados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setWarehousesSeleccionados([]);
                          }}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium underline"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Download Template */}
                <button
                  onClick={downloadTemplate}
                  className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium">Descargar Plantilla Excel (.xlsx)</span>
                  </div>
                </button>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
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
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {importing ? 'Procesando archivo...' : 'Click para seleccionar archivo'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excel (.xlsx, .xls) o CSV (.csv, .txt)</p>
                      <p className="text-xs text-gray-400 mt-1">o arrastra y suelta aquí</p>
                    </div>
                  </label>
                </div>

                {/* Preview */}
                {importData.length > 0 && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Vista Previa ({importData.length} registros)
                      </h4>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Código</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cantidad</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {importData.slice(0, 20).map((item, index) => {
                            const producto = allProducts.find(p => p.codigo.toUpperCase() === item.codigo.toUpperCase());
                            return (
                              <tr key={index} className={producto ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                                <td className="px-4 py-2 text-sm font-mono text-gray-900 dark:text-gray-200">{item.codigo}</td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">{item.cantidad}</td>
                                <td className="px-4 py-2 text-sm">
                                  {producto ? (
                                    <span className="text-green-600 dark:text-green-400">✓ Encontrado</span>
                                  ) : (
                                    <span className="text-red-600 dark:text-red-400">✗ No existe</span>
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
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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

export default MassUpdateModal;
