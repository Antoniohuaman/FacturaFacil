// src/features/catalogo-articulos/utils/excelHelpers.ts

import * as XLSX from 'xlsx';
import type { Product, ProductFormData } from '../models/types';
import type { Establishment } from '../../configuracion-sistema/models/Establishment';
import { inferUnitMeasureType } from './unitMeasureHelpers';

// ====================================================================
// TIPOS Y CONSTANTES
// ====================================================================

export interface ExcelColumn {
  key: string;
  label: string;
  required: boolean;
  example?: string;
  type: 'text' | 'number' | 'select' | 'multiselect';
}

export interface ImportValidationError {
  fila: number;
  columna: string;
  mensaje: string;
  valorRecibido?: string;
}

export interface ImportResult {
  totalFilas: number;
  validas: number;
  invalidas: number;
  creadas: number;
  actualizadas: number;
  conError: number;
  errores: ImportValidationError[];
  filasValidas: ProductFormData[];
  filasInvalidas: Array<Record<string, unknown> & { _errores: string[] }>;
}

// Columnas obligatorias para ambos tipos de importación
const REQUIRED_COLUMNS = [
  'Tipo de producto',
  'Nombre',
  'Código',
  'Unidad',
  'Impuesto',
  'Establecimientos'
];

// ====================================================================
// DEFINICIÓN DE COLUMNAS - IMPORTACIÓN BÁSICA
// ====================================================================

export const BASIC_IMPORT_COLUMNS: ExcelColumn[] = [
  { key: 'tipoProducto', label: 'Tipo de producto', required: true, example: 'Bien', type: 'select' },
  { key: 'nombre', label: 'Nombre', required: true, example: 'Producto de ejemplo', type: 'text' },
  { key: 'codigo', label: 'Código', required: true, example: 'PROD001', type: 'text' },
  { key: 'unidad', label: 'Unidad', required: true, example: 'NIU', type: 'select' },
  { key: 'categoria', label: 'Categoría', required: false, example: 'General', type: 'text' },
  { key: 'impuesto', label: 'Impuesto', required: true, example: 'IGV (18.00%)', type: 'select' },
  { key: 'establecimientos', label: 'Establecimientos', required: true, example: '0001,0002', type: 'multiselect' }
];

// ====================================================================
// DEFINICIÓN DE COLUMNAS - IMPORTACIÓN COMPLETA
// ====================================================================

export const COMPLETE_IMPORT_COLUMNS: ExcelColumn[] = [
  ...BASIC_IMPORT_COLUMNS,
  { key: 'descripcion', label: 'Descripción', required: false, example: 'Descripción detallada', type: 'text' },
  { key: 'alias', label: 'Alias', required: false, example: 'Nombre alternativo', type: 'text' },
  { key: 'codigoBarras', label: 'Código de barras', required: false, example: '7501234567890', type: 'text' },
  { key: 'codigoFabrica', label: 'Código de fábrica', required: false, example: 'FAB-001', type: 'text' },
  { key: 'codigoSunat', label: 'Código SUNAT', required: false, example: '12345678', type: 'text' },
  { key: 'marca', label: 'Marca', required: false, example: 'Marca ejemplo', type: 'text' },
  { key: 'modelo', label: 'Modelo', required: false, example: 'Modelo 2024', type: 'text' },
  { key: 'peso', label: 'Peso (KG)', required: false, example: '1.5', type: 'number' },
  { key: 'precioCompra', label: 'Precio de compra', required: false, example: '80.00', type: 'number' },
  { key: 'porcentajeGanancia', label: 'Porcentaje de ganancia (%)', required: false, example: '25', type: 'number' },
  { key: 'descuentoProducto', label: 'Descuento (%)', required: false, example: '10', type: 'number' },
  { key: 'tipoExistencia', label: 'Tipo de existencia', required: false, example: 'MERCADERIAS', type: 'select' }
];

// ====================================================================
// GENERACIÓN DE PLANTILLA EXCEL
// ====================================================================

export function generateExcelTemplate(
  tipo: 'basica' | 'completa',
  availableUnits: Array<{ code: string; name: string }>,
  availableEstablishments: Establishment[]
): void {
  const columns = tipo === 'basica' ? BASIC_IMPORT_COLUMNS : COMPLETE_IMPORT_COLUMNS;

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Preparar datos de ejemplo con 2 filas
  const headers = columns.map(col => col.label);
  const exampleRow1 = columns.map(col => col.example || '');
  const exampleRow2 = columns.map(col => {
    if (col.key === 'codigo') return 'PROD002';
    if (col.key === 'nombre') return 'Otro producto';
    if (col.key === 'tipoProducto') return 'Servicio';
    return col.example || '';
  });

  // Crear hoja con encabezados y ejemplos
  const wsData = [headers, exampleRow1, exampleRow2];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configurar ancho de columnas
  const colWidths = columns.map(col => ({ wch: Math.max(col.label.length, 15) }));
  ws['!cols'] = colWidths;

  // Agregar hoja al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Crear hoja de instrucciones
  const instructionsData = [
    ['INSTRUCCIONES DE IMPORTACIÓN'],
    [''],
    ['Campos obligatorios (marcados con *)'],
    ...REQUIRED_COLUMNS.map(col => [`  - ${col}`]),
    [''],
    ['Tipo de producto: valores válidos'],
    ['  - Bien'],
    ['  - Servicio'],
    [''],
    ['Unidades disponibles:'],
    ...availableUnits.slice(0, 10).map(u => [`  - ${u.code} (${u.name})`]),
    [''],
    ['Impuestos disponibles:'],
    ['  - IGV (18.00%)'],
    ['  - IGV (10.00%)'],
    ['  - Exonerado (0.00%)'],
    ['  - Inafecto (0.00%)'],
    [''],
    ['Establecimientos (códigos separados por coma):'],
    ...availableEstablishments.slice(0, 10).map(e => [`  - ${e.code} (${e.name})`]),
    [''],
    ['Tipo de existencia (opcional):'],
    ['  - MERCADERIAS'],
    ['  - PRODUCTOS_TERMINADOS'],
    ['  - MATERIAS_PRIMAS'],
    ['  - ENVASES'],
    ['  - MATERIALES_AUXILIARES'],
    ['  - SUMINISTROS'],
    ['  - REPUESTOS'],
    ['  - EMBALAJES'],
    ['  - OTROS']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  // Descargar archivo
  const fileName = `plantilla_productos_${tipo}_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ====================================================================
// VALIDACIÓN Y PARSEO DE ARCHIVO IMPORTADO
// ====================================================================

export function parseExcelFile(
  file: File,
  tipo: 'basica' | 'completa',
  _existingProducts: Product[],
  availableUnits: Array<{ code: string; name: string }>,
  availableEstablishments: Establishment[],
  availableCategories: Array<{ nombre: string }>
): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Leer primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Array<Record<string, unknown>>;

        if (jsonData.length === 0) {
          reject(new Error('El archivo no contiene datos'));
          return;
        }

        // Validar y procesar cada fila
        const result = validateAndParseRows(
          jsonData,
          tipo,
          availableUnits,
          availableEstablishments,
          availableCategories
        );

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
}

// ====================================================================
// VALIDACIÓN DE FILAS
// ====================================================================

function validateAndParseRows(
  rows: Array<Record<string, unknown>>,
  tipo: 'basica' | 'completa',
  availableUnits: Array<{ code: string; name: string }> ,
  availableEstablishments: Establishment[],
  availableCategories: Array<{ nombre: string }>
): ImportResult {
  const columns = tipo === 'basica' ? BASIC_IMPORT_COLUMNS : COMPLETE_IMPORT_COLUMNS;
  const errores: ImportValidationError[] = [];
  const filasValidas: ProductFormData[] = [];
  const filasInvalidas: Array<Record<string, unknown> & { _errores: string[] }> = [];

  rows.forEach((row, index) => {
    const fila = index + 2; // +2 porque index 0 = fila 2 (después de encabezado)
    const rowErrors: string[] = [];

    // Validar campos obligatorios
    columns.filter(col => col.required).forEach(col => {
      const value = row[col.label];
      if (!value || String(value).trim() === '') {
        errores.push({
          fila,
          columna: col.label,
          mensaje: 'Campo obligatorio vacío',
          valorRecibido: String(value || '')
        });
        rowErrors.push(`${col.label}: Campo obligatorio vacío`);
      }
    });

    // Si hay errores en obligatorios, marcar fila como inválida y continuar
    if (rowErrors.length > 0) {
      filasInvalidas.push({ ...row, _errores: rowErrors });
      return;
    }

    // Validar y parsear fila
    try {
      const parsedRow = parseRow(
        row,
        fila,
        availableUnits,
        availableEstablishments,
        availableCategories,
        errores,
        rowErrors
      );

      if (rowErrors.length === 0) {
        filasValidas.push(parsedRow);
      } else {
        filasInvalidas.push({ ...row, _errores: rowErrors });
      }
    } catch (error) {
      rowErrors.push(`Error al procesar: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      filasInvalidas.push({ ...row, _errores: rowErrors });
    }
  });

  return {
    totalFilas: rows.length,
    validas: filasValidas.length,
    invalidas: filasInvalidas.length,
    creadas: 0, // Se calculará después del procesamiento
    actualizadas: 0, // Se calculará después del procesamiento
    conError: filasInvalidas.length,
    errores,
    filasValidas,
    filasInvalidas
  };
}

// ====================================================================
// PARSEO DE FILA INDIVIDUAL
// ====================================================================

function parseRow(
  row: Record<string, unknown>,
  fila: number,
  availableUnits: Array<{ code: string; name: string }>,
  availableEstablishments: Establishment[],
  availableCategories: Array<{ nombre: string }>,
  errores: ImportValidationError[],
  rowErrors: string[]
): ProductFormData {
  // Tipo de producto
  const tipoProducto = String(row['Tipo de producto'] || '').trim().toUpperCase();
  if (tipoProducto !== 'BIEN' && tipoProducto !== 'SERVICIO') {
    errores.push({
      fila,
      columna: 'Tipo de producto',
      mensaje: 'Valor debe ser "Bien" o "Servicio"',
      valorRecibido: tipoProducto
    });
    rowErrors.push('Tipo de producto inválido');
  }

  // Código
  const codigo = String(row['Código'] || '').trim();

  // Unidad
  const unidadValue = String(row['Unidad'] || '').trim().toUpperCase();
  const unidad = availableUnits.find(u => u.code.toUpperCase() === unidadValue);
  if (!unidad) {
    errores.push({
      fila,
      columna: 'Unidad',
      mensaje: `Unidad no encontrada. Códigos válidos: ${availableUnits.slice(0, 5).map(u => u.code).join(', ')}`,
      valorRecibido: unidadValue
    });
    rowErrors.push('Unidad no válida');
  }

  // Impuesto
  const impuestoValue = String(row['Impuesto'] || '').trim();
  const impuestosValidos = ['IGV (18.00%)', 'IGV (10.00%)', 'Exonerado (0.00%)', 'Inafecto (0.00%)'];
  if (!impuestosValidos.includes(impuestoValue)) {
    errores.push({
      fila,
      columna: 'Impuesto',
      mensaje: `Impuesto no válido. Valores permitidos: ${impuestosValidos.join(', ')}`,
      valorRecibido: impuestoValue
    });
    rowErrors.push('Impuesto no válido');
  }

  // Establecimientos
  const establecimientosValue = String(row['Establecimientos'] || '').trim();
  const establecimientosCodes = establecimientosValue.split(',').map(c => c.trim()).filter(c => c);
  const establecimientoIds: string[] = [];

  establecimientosCodes.forEach(code => {
    const est = availableEstablishments.find(e => e.code === code);
    if (est) {
      establecimientoIds.push(est.id);
    } else {
      errores.push({
        fila,
        columna: 'Establecimientos',
        mensaje: `Establecimiento con código "${code}" no encontrado`,
        valorRecibido: code
      });
      rowErrors.push(`Establecimiento ${code} no válido`);
    }
  });

  if (establecimientoIds.length === 0 && establecimientosCodes.length > 0) {
    errores.push({
      fila,
      columna: 'Establecimientos',
      mensaje: 'Ningún establecimiento válido encontrado',
      valorRecibido: establecimientosValue
    });
    rowErrors.push('Sin establecimientos válidos');
  }

  // Categoría (validar si existe)
  const categoriaValue = String(row['Categoría'] || '').trim();
  if (categoriaValue && !availableCategories.find(c => c.nombre === categoriaValue)) {
    errores.push({
      fila,
      columna: 'Categoría',
      mensaje: `Categoría "${categoriaValue}" no existe`,
      valorRecibido: categoriaValue
    });
    rowErrors.push('Categoría no existe');
  }

  // Parsear valores numéricos
  const parseNumber = (value: unknown, defaultValue = 0): number => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return isNaN(num) ? defaultValue : num;
  };

  // Construir objeto ProductFormData
  return {
    nombre: String(row['Nombre'] || '').trim(),
    codigo: codigo,
    tipoUnidadMedida: inferUnitMeasureType(unidad?.code || 'NIU'),
    unidad: unidad?.code || 'NIU',
    unidadesMedidaAdicionales: [],
    categoria: categoriaValue || '',
    impuesto: impuestoValue,
    descripcion: String(row['Descripción'] || '').trim(),
    establecimientoIds: establecimientoIds,
    disponibleEnTodos: false,
    alias: String(row['Alias'] || '').trim(),
    precioCompra: parseNumber(row['Precio de compra'], 0),
    porcentajeGanancia: parseNumber(row['Porcentaje de ganancia (%)'], 0),
    codigoBarras: String(row['Código de barras'] || '').trim(),
    codigoFabrica: String(row['Código de fábrica'] || '').trim(),
    codigoSunat: String(row['Código SUNAT'] || '').trim(),
    descuentoProducto: parseNumber(row['Descuento (%)'], 0),
    marca: String(row['Marca'] || '').trim(),
    modelo: String(row['Modelo'] || '').trim(),
    peso: parseNumber(row['Peso (KG)'], 0),
    tipoExistencia: (String(row['Tipo de existencia'] || '').trim() || 'MERCADERIAS') as ProductFormData['tipoExistencia']
  };
}

// ====================================================================
// EXPORTACIÓN DE PRODUCTOS A EXCEL
// ====================================================================

export function exportProductsToExcel(
  products: Product[],
  visibleColumns: string[],
  columnDefinitions: Array<{ key: string; label: string; type: string }>
): void {
  if (products.length === 0) {
    throw new Error('No hay productos para exportar');
  }

  // Filtrar solo columnas visibles
  const columnsToExport = columnDefinitions.filter(col => visibleColumns.includes(col.key));

  // Crear encabezados
  const headers = columnsToExport.map(col => col.label);

  // Crear filas de datos
  const rows = products.map(product => {
    return columnsToExport.map(col => {
      const value = product[col.key as keyof Product];

      // Formatear según tipo
      if (value === null || value === undefined) return '';

      if (col.type === 'currency') {
        return typeof value === 'number' ? value.toFixed(2) : '';
      }

      if (col.type === 'date') {
        return value instanceof Date ? value.toLocaleDateString('es-PE') : '';
      }

      if (col.type === 'boolean') {
        return value ? 'Sí' : 'No';
      }

      if (Array.isArray(value)) {
        return value.join(', ');
      }

      return String(value);
    });
  });

  // Crear workbook
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configurar ancho de columnas
  const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Productos');

  // Descargar archivo
  const fileName = `productos_export_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// ====================================================================
// EXPORTACIÓN DE ERRORES DE IMPORTACIÓN
// ====================================================================

export function exportImportErrors(
  filasInvalidas: Array<Record<string, unknown> & { _errores: string[] }>
): void {
  if (filasInvalidas.length === 0) {
    throw new Error('No hay errores para exportar');
  }

  // Obtener todas las columnas
  const allColumns = new Set<string>();
  filasInvalidas.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key !== '_errores') allColumns.add(key);
    });
  });

  const headers = [...Array.from(allColumns), 'ERRORES'];

  // Crear filas
  const rows = filasInvalidas.map(row => {
    const rowData: (string | number)[] = [];
    allColumns.forEach(col => {
      rowData.push(String(row[col] || ''));
    });
    rowData.push(row._errores.join(' | '));
    return rowData;
  });

  // Crear workbook
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configurar ancho de columnas
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Errores de Importación');

  // Descargar archivo
  const fileName = `errores_importacion_${new Date().getTime()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
