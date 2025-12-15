/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
// src/features/catalogo-articulos/components/ExportProductsModal.tsx

import React, { useState, useEffect } from 'react';
import type { Product } from '../models/types';
import { exportProductsToExcel } from '../utils/excelHelpers';

interface ExportColumn {
  key: string;
  label: string;
  type: 'text' | 'currency' | 'number' | 'date' | 'boolean';
  required?: boolean;
}

interface ExportProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  totalProductsCount: number;
  currentFilters: any;
}

const AVAILABLE_COLUMNS: ExportColumn[] = [
  { key: 'codigo', label: 'Código', type: 'text', required: true },
  { key: 'nombre', label: 'Nombre', type: 'text', required: true },
  { key: 'precio', label: 'Precio de Venta', type: 'currency' },
  { key: 'unidad', label: 'Unidad', type: 'text' },
  { key: 'categoria', label: 'Categoría', type: 'text' },
  { key: 'impuesto', label: 'Tipo de Impuesto', type: 'text' },
  { key: 'descripcion', label: 'Descripción', type: 'text' },
  // Campos avanzados
  { key: 'alias', label: 'Alias del Producto', type: 'text' },
  { key: 'precioCompra', label: 'Precio de Compra', type: 'currency' },
  { key: 'porcentajeGanancia', label: 'Porcentaje de Ganancia (%)', type: 'number' },
  { key: 'descuentoProducto', label: 'Descuento (%)', type: 'number' },
  { key: 'codigoBarras', label: 'Código de Barras', type: 'text' },
  { key: 'codigoFabrica', label: 'Código de Fábrica', type: 'text' },
  { key: 'codigoSunat', label: 'Código SUNAT', type: 'text' },
  { key: 'marca', label: 'Marca', type: 'text' },
  { key: 'modelo', label: 'Modelo', type: 'text' },
  { key: 'peso', label: 'Peso (KG)', type: 'number' },
  { key: 'tipoExistencia', label: 'Tipo de Existencia', type: 'text' },
  { key: 'fechaCreacion', label: 'Fecha de Creación', type: 'date' },
  { key: 'fechaActualizacion', label: 'Última Actualización', type: 'date' }
];

const BASIC_COLUMNS = ['codigo', 'nombre', 'precio', 'unidad', 'categoria'];

const ExportProductsModal: React.FC<ExportProductsModalProps> = ({
  isOpen,
  onClose,
  products,
  totalProductsCount,
  currentFilters
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [columnSet, setColumnSet] = useState<'basic' | 'all' | 'custom'>('basic');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (columnSet === 'basic') {
      setSelectedColumns([...BASIC_COLUMNS]);
    } else if (columnSet === 'all') {
      setSelectedColumns(AVAILABLE_COLUMNS.map(col => col.key));
    }
  }, [columnSet]);

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('excel');
      setColumnSet('basic');
      setSelectedColumns([...BASIC_COLUMNS]);
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleColumnToggle = (columnKey: string) => {
    const column = AVAILABLE_COLUMNS.find(col => col.key === columnKey);
    if (column?.required) return; // No permitir desmarcar columnas requeridas

    setSelectedColumns(prev => 
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleSelectAllColumns = (checked: boolean) => {
    if (checked) {
      setSelectedColumns(AVAILABLE_COLUMNS.map(col => col.key));
    } else {
      const requiredColumns = AVAILABLE_COLUMNS.filter(col => col.required).map(col => col.key);
      setSelectedColumns(requiredColumns);
    }
  };

  const formatCellValue = (value: any, type: ExportColumn['type']) => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'PEN'
        }).format(value);
      case 'date':
        return new Date(value).toLocaleDateString('es-PE');
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'number':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const generateExportData = () => {
    const selectedColumnObjects = AVAILABLE_COLUMNS.filter(col => 
      selectedColumns.includes(col.key)
    );

    const headers = selectedColumnObjects.map(col => col.label);
    const rows = products.map(product => 
      selectedColumnObjects.map(col => 
        formatCellValue(product[col.key as keyof Product], col.type)
      )
    );

    return { headers, rows, columns: selectedColumnObjects };
  };

  const handleExport = async () => {
    if (products.length === 0) {
      alert('No hay productos para exportar');
      return;
    }

    setIsExporting(true);

    try {
      const { columns } = generateExportData();

      if (selectedFormat === 'excel') {
        exportProductsToExcel(products, selectedColumns, columns);
      } else if (selectedFormat === 'csv') {
        const { headers, rows } = generateExportData();
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `productos_${new Date().getTime()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('Exportación a PDF no implementada aún');
      }

      onClose();
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Error al exportar productos. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm transition-opacity" />
        
        <div className="relative inline-block w-full max-w-4xl overflow-hidden rounded-xl bg-white text-left align-middle shadow-2xl transition-all transform">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Exportar productos
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Descarga tus productos en el formato que prefieras
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Options */}
              <div className="space-y-6">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Formato
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'excel', label: 'Excel', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'green' },
                      { value: 'csv', label: 'CSV', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'blue' },
                      { value: 'pdf', label: 'PDF', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'red' }
                    ].map((format) => (
                      <button
                        key={format.value}
                        onClick={() => setSelectedFormat(format.value as any)}
                        className={`p-3 border-2 rounded-lg text-center transition-all ${
                          selectedFormat === format.value
                            ? `border-${format.color}-500 bg-${format.color}-50 text-${format.color}-700`
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={format.icon} />
                        </svg>
                        <span className="text-sm font-medium">{format.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Columnas
                  </label>
                  <div className="space-y-3">
                    {[
                      { value: 'basic', label: 'Básicas', desc: 'Código, nombre, precio, unidad, categoría' },
                      { value: 'all', label: 'Todas', desc: 'Incluye todas las columnas disponibles' },
                      { value: 'custom', label: 'Personalizadas', desc: 'Selecciona las columnas que necesites' }
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                          columnSet === option.value
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="columnSet"
                          value={option.value}
                          checked={columnSet === option.value}
                          onChange={(e) => setColumnSet(e.target.value as any)}
                          className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Export Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Se exportarán</p>
                      <p className="mt-1 text-blue-700">
                        {products.length} productos de {totalProductsCount} total
                        {Object.keys(currentFilters).length > 0 && ' (con filtros aplicados)'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Column Selection (for custom) */}
              <div className="space-y-4">
                {columnSet === 'custom' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-900">
                        Seleccionar columnas ({selectedColumns.length})
                      </label>
                      <label className="flex items-center text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={selectedColumns.length === AVAILABLE_COLUMNS.length}
                          onChange={(e) => handleSelectAllColumns(e.target.checked)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-2"
                        />
                        Seleccionar todas
                      </label>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      {AVAILABLE_COLUMNS.map((column) => (
                        <label
                          key={column.key}
                          className={`flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                            column.required ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumns.includes(column.key)}
                            onChange={() => handleColumnToggle(column.key)}
                            disabled={column.required}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {column.label}
                              {column.required && (
                                <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                  Requerido
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              Tipo: {column.type}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Toggle */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-900">Vista previa</span>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                      showPreview ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showPreview ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Preview Table */}
                {showPreview && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900">Vista previa</h4>
                    </div>
                    <div className="max-h-40 overflow-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {AVAILABLE_COLUMNS
                              .filter(col => selectedColumns.includes(col.key))
                              .slice(0, 4)
                              .map((column) => (
                                <th key={column.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {column.label}
                                </th>
                              ))}
                            {selectedColumns.length > 4 && (
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                +{selectedColumns.length - 4} más
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.slice(0, 3).map((product, index) => (
                            <tr key={index}>
                              {AVAILABLE_COLUMNS
                                .filter(col => selectedColumns.includes(col.key))
                                .slice(0, 4)
                                .map((column) => (
                                  <td key={column.key} className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                    {formatCellValue(product[column.key as keyof Product], column.type)}
                                  </td>
                                ))}
                              {selectedColumns.length > 4 && (
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 border-t border-gray-200">
            <button
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
              className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar {selectedFormat.toUpperCase()}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isExporting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportProductsModal;