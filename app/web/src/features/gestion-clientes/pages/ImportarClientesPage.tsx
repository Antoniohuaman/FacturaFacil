/* eslint-disable @typescript-eslint/no-unused-vars -- variables temporales; limpieza diferida */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Download,
  ArrowLeft,
  FileSpreadsheet,
  AlertCircle,
  X,
  FileText,
  Users,
  Info
} from 'lucide-react';
import { useCaja } from '../../control-caja/context/CajaContext';
import * as XLSX from 'xlsx';
import { useClientes } from '../hooks';
import type { Cliente } from '../models';

const ImportarClientesPage = () => {
  const navigate = useNavigate();
  const { showToast } = useCaja();
  const { applyTransientClientes, clearTransientClientes, transientCount } = useClientes();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  type ImportError = { fila: number; motivo: string };
  const [reporte, setReporte] = useState<{
    totalFilas: number;
    importadasOk: number;
    conErrores: number;
    errores: ImportError[];
    candidatos: Cliente[];
  }>({ totalFilas: 0, importadasOk: 0, conErrores: 0, errores: [], candidatos: [] });

  const PRIMARY_COLOR = '#1478D4';

  const cardClass = "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700";
  const buttonPrimaryClass = "px-6 py-2 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-md";
  const buttonSecondaryClass = "px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-all duration-200";
  const buttonOutlineClass = "px-4 py-2 border-2 rounded-lg font-medium transition-all duration-200";
  const iconButtonClass = "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200";

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel") {
        setSelectedFile(file);
        showToast('success', '¡Archivo seleccionado!', `${file.name} está listo para importar`);
      } else {
        showToast('error', 'Tipo de archivo inválido', 'Por favor selecciona un archivo Excel (.xlsx o .xls)');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      showToast('success', '¡Archivo seleccionado!', `${file.name} está listo para importar`);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast('warning', 'Sin archivo', 'Por favor selecciona un archivo Excel para importar');
      return;
    }
    setImporting(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        showToast('error', 'Archivo inválido', 'No se encontró hoja en el archivo');
        setImporting(false);
        return;
      }

      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const errores: ImportError[] = [];
      const candidatos: Cliente[] = [];

      const normalizeKey = (k: string) => k.replace(/\s+/g, '').replace(/_/g, '').toLowerCase();

      const getVal = (row: Record<string, unknown>, keys: string[]): string => {
        const normRow: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[normalizeKey(k)] = v;
        }
        for (const key of keys) {
          const found = normRow[normalizeKey(key)];
          if (found !== undefined && found !== null) return String(found).trim();
        }
        return '';
      };

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      const digits = (s: string) => s.replace(/\D/g, '');

      const allowedDoc = new Set(['RUC', 'DNI', 'PASAPORTE', 'CARNET_EXTRANJERIA', 'SIN_DOCUMENTO']);

      rows.forEach((row, idx) => {
        const fila = idx + 2; // considerando encabezado en fila 1
        const tipoDocumento = getVal(row, ['TipoDocumento']).toUpperCase();
        const numeroDocumento = getVal(row, ['NumeroDocumento']);
        const nombre = getVal(row, ['RazonSocial/Nombre', 'RazonSocial', 'Nombre']);
        const email = getVal(row, ['Email']);
        const telefonoRaw = getVal(row, ['Telefono']);
        const estadoRaw = getVal(row, ['Estado']);

        const errs: string[] = [];

        if (!allowedDoc.has(tipoDocumento)) {
          errs.push('TipoDocumento inválido');
        }

        const telDigits = digits(telefonoRaw);

        // NumeroDocumento rules
        if (tipoDocumento === 'RUC' && digits(numeroDocumento).length !== 11) errs.push('RUC debe tener 11 dígitos');
        if (tipoDocumento === 'DNI' && digits(numeroDocumento).length !== 8) errs.push('DNI debe tener 8 dígitos');
        if ((tipoDocumento === 'PASAPORTE' || tipoDocumento === 'CARNET_EXTRANJERIA') && numeroDocumento.trim().length < 6) errs.push('Nro documento debe tener al menos 6 caracteres');
        if (tipoDocumento === 'SIN_DOCUMENTO' && numeroDocumento.trim().length > 0) errs.push('SIN_DOCUMENTO no debe tener número');

        if (!nombre) errs.push('RazonSocial/Nombre requerido');
        if (email && !isValidEmail(email)) errs.push('Email inválido');
        if (telDigits && (telDigits.length < 7 || telDigits.length > 15)) errs.push('Teléfono debe tener 7 a 15 dígitos');

        const estadoNorm = estadoRaw.toLowerCase();
        let enabled: boolean | null = null;
        if (['activo', '1', 'true'].includes(estadoNorm)) enabled = true;
        else if (['inactivo', '0', 'false'].includes(estadoNorm)) enabled = false;
        else errs.push('Estado inválido');

  // Email y Teléfono son opcionales; si se incluyen, se validan por formato.

        if (errs.length > 0) {
          errores.push({ fila, motivo: errs.join('; ') });
          return;
        }

        const docString = tipoDocumento === 'SIN_DOCUMENTO' ? 'Sin documento' : `${tipoDocumento} ${digits(numeroDocumento)}`;

        const candidato: Cliente = {
          id: `t-${Date.now()}-${idx}`,
          name: nombre,
          document: docString,
          type: 'Cliente',
          address: 'Sin dirección',
          phone: telDigits,
          email: email || undefined,
          enabled: enabled ?? true,
          transient: true,
        };
        candidatos.push(candidato);
      });

      const importadasOk = candidatos.length;
      const conErrores = errores.length;
      const totalFilas = rows.length;
      setReporte({ totalFilas, importadasOk, conErrores, errores, candidatos });
      if (importadasOk > 0) {
        showToast('success', 'Archivo procesado', `Se validaron ${totalFilas} filas. Listas para aplicar: ${importadasOk}`);
      }
      if (conErrores > 0) {
        showToast('warning', 'Validación con observaciones', `${conErrores} fila${conErrores === 1 ? '' : 's'} con errores`);
      }
    } catch (error) {
      showToast('error', 'Error al importar', 'Ocurrió un error al procesar el archivo');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const headers = [
        'TipoDocumento',
        'NumeroDocumento',
        'RazonSocial/Nombre',
        'Email',
        'Telefono',
        'Estado'
      ];

      const data = [
        headers,
        ['DNI', '12345678', 'Juan Pérez', 'juan.perez@correo.com', '987654321', 'Activo'],
        ['RUC', '20123456789', 'Empresa SAC', '', '012345678', 'Inactivo'],
        ['SIN_DOCUMENTO', '', 'Consumidor Final', '', '', 'Activo']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      // Anchos de columnas para mejor lectura
      ws['!cols'] = [
        { wch: 18 }, // TipoDocumento
        { wch: 16 }, // NumeroDocumento
        { wch: 32 }, // RazonSocial/Nombre
        { wch: 28 }, // Email
        { wch: 14 }, // Telefono
        { wch: 12 }  // Estado
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const fileName = `Plantilla_Clientes_${yyyy}-${mm}-${dd}.xlsx`;

      XLSX.writeFile(wb, fileName);
      showToast('success', 'Plantilla lista', 'Se descargó la plantilla de clientes');
    } catch {
      showToast('error', 'No se pudo generar la plantilla', 'Intenta nuevamente');
    }
  };

  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/clientes')}
          className={iconButtonClass}
          title="Volver a Clientes"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Clientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Importa múltiples clientes desde un archivo Excel
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zona de carga */}
        <div className="lg:col-span-2 space-y-6">
          <div className={cardClass}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Archivo de Clientes</h2>
                <button
                  onClick={handleDownloadTemplate}
                  className={buttonOutlineClass}
                  style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Descargar Plantilla
                </button>
              </div>

              {/* Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
                  ${dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-16 h-16 text-green-500 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                    >
                      <X className="w-4 h-4 inline mr-1" />
                      Eliminar archivo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Arrastra y suelta tu archivo aquí
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      o haz clic para seleccionar
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de importar/aplicar */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => navigate('/clientes')}
                  className={buttonSecondaryClass}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedFile || importing}
                  className={buttonPrimaryClass}
                  style={{
                    backgroundColor: (!selectedFile || importing) ? '#9CA3AF' : PRIMARY_COLOR,
                    cursor: (!selectedFile || importing) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline mr-2"></div>
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 inline mr-2" />
                      Importar Clientes
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (reporte.candidatos.length === 0) return;
                    applyTransientClientes(reporte.candidatos);
                  }}
                  disabled={reporte.candidatos.length === 0 || reporte.conErrores > 0}
                  className={buttonOutlineClass}
                  style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR, opacity: (reporte.candidatos.length === 0 || reporte.conErrores > 0) ? 0.6 : 1 }}
                >
                  Aplicar al listado
                </button>
                <button
                  onClick={() => clearTransientClientes()}
                  disabled={transientCount === 0}
                  className={buttonOutlineClass}
                  style={{ borderColor: '#D97706', color: '#D97706', opacity: transientCount === 0 ? 0.6 : 1 }}
                >
                  Deshacer importación
                </button>
              </div>
            </div>
          </div>

          {/* Reporte de validación */}
          <div className={cardClass}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Reporte de validación</h2>
              </div>
              {reporte.totalFilas === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Aún no se ha procesado ningún archivo.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Filas</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">{reporte.totalFilas}</div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-green-700 dark:text-green-300">Importadas</div>
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">{reporte.importadasOk}</div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-yellow-700 dark:text-yellow-300">Errores</div>
                      <div className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{reporte.conErrores}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                      <div className="text-xs text-blue-700 dark:text-blue-300">Transitorios</div>
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-300">{transientCount}</div>
                    </div>
                  </div>
                  {reporte.errores.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Errores</h3>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc pl-5">
                        {reporte.errores.map((e, i) => (
                          <li key={`${e.fila}-${i}`}>Fila {e.fila}: {e.motivo}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Panel de instrucciones */}
        <div className="space-y-6">
          <div className={cardClass}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Info className="w-5 h-5 mr-2" style={{ color: PRIMARY_COLOR }} />
                  Instrucciones
                </h3>
              </div>

              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    1
                  </div>
                  <p>Descarga la plantilla de Excel con el formato correcto</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    2
                  </div>
                  <p>Completa los datos de tus clientes en el archivo</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    3
                  </div>
                  <p>Arrastra el archivo o haz clic para seleccionarlo</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                    style={{ backgroundColor: PRIMARY_COLOR }}>
                    4
                  </div>
                  <p>Haz clic en "Importar Clientes" para procesar el archivo</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Campos requeridos
                    </p>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                      <li>• Nombre/Razón Social</li>
                      <li>• Tipo de Documento</li>
                      <li>• Número de Documento</li>
                      <li>• Estado (Activo/Inactivo)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className={cardClass}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Información
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Formato</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">.xlsx, .xls</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Límite</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Sin límite</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportarClientesPage;
