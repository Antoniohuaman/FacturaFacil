// app/web/src/features/documentos-comerciales/components/cotizaciones/CotizacionesView.tsx

import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  ArrowRight,
  Trash2,
  FileText,
  Calendar,
  User,
  Building,
  RefreshCw,
  Receipt,
  Sparkles
} from 'lucide-react';
import { useDocumentos } from '../../hooks/useDocumentos';
import type { Cotizacion } from '../../models/types';
import { FormularioDocumentoModal } from '../shared/FormularioDocumentoModal';
import { EstadoBadge } from '../shared/EstadoBadge';
import { FiltrosPanel } from '../shared/FiltrosPanel';
import { ConversionButton } from '../shared/ConversionButton';
import { DocumentoRelacionado } from '../shared/DocumentoRelacionado';
import { ConversionPreviewModal } from '../shared/ConversionPreviewModal';

export function CotizacionesView() {
  const {
    cotizaciones,
    filtros,
    setFiltros,
    loading,
    crearCotizacion,
    actualizarCotizacion,
    duplicarCotizacion,
    anularCotizacion,
    cambiarEstadoCotizacion,
    convertirCotizacionANotaVenta,
    convertirCotizacionAComprobante,
    recargarDatos,
    exportarDocumentos
  } = useDocumentos();

  const [modalOpen, setModalOpen] = useState(false);
  const [cotizacionEditar, setCotizacionEditar] = useState<Cotizacion | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [cotizacionExpandida, setCotizacionExpandida] = useState<string | null>(null);
  const [conversionModal, setConversionModal] = useState<{
    open: boolean;
    cotizacion: Cotizacion | null;
    tipo: 'NOTA_VENTA' | 'COMPROBANTE' | null;
  }>({ open: false, cotizacion: null, tipo: null });

  // Filtrar cotizaciones localmente por búsqueda
  const cotizacionesFiltradas = useMemo(() => {
    if (!busqueda) return cotizaciones;
    
    const termino = busqueda.toLowerCase();
    return cotizaciones.filter(cot => 
      cot.serieNumero.toLowerCase().includes(termino) ||
      cot.cliente.razonSocial.toLowerCase().includes(termino) ||
      cot.cliente.numeroDocumento.includes(termino) ||
      cot.vendedorNombre?.toLowerCase().includes(termino)
    );
  }, [cotizaciones, busqueda]);

  // Formatear moneda
  const formatMoney = (amount: number, currency: 'PEN' | 'USD' | 'EUR' = 'PEN') => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Formatear fecha
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calcular días restantes para vencimiento
  const getDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  // Manejar confirmación de conversión
  const handleConfirmConversion = async () => {
    if (!conversionModal.cotizacion || !conversionModal.tipo) return;

    try {
      if (conversionModal.tipo === 'NOTA_VENTA') {
        await convertirCotizacionANotaVenta(conversionModal.cotizacion.id);
      } else {
        await convertirCotizacionAComprobante(conversionModal.cotizacion.id);
      }
      setConversionModal({ open: false, cotizacion: null, tipo: null });
    } catch (error) {
      console.error('Error al convertir:', error);
      throw error;
    }
  };

  // Manejar acciones del menú
  const handleAction = async (action: string, cotizacion: Cotizacion) => {
    setMenuAbierto(null);

    try {
      switch (action) {
        case 'ver':
          // Implementar vista previa
          console.log('Ver cotización:', cotizacion);
          break;
        
        case 'editar':
          setCotizacionEditar(cotizacion);
          setModalOpen(true);
          break;
        
        case 'duplicar':
          await duplicarCotizacion(cotizacion.id);
          break;
        
        case 'enviar':
          await cambiarEstadoCotizacion(cotizacion.id, 'EMITIDO');
          break;
        
        case 'aprobar':
          await cambiarEstadoCotizacion(cotizacion.id, 'APROBADO');
          break;
        
        case 'rechazar':
          await cambiarEstadoCotizacion(cotizacion.id, 'RECHAZADO');
          break;
        
        case 'convertir-nota':
          setConversionModal({
            open: true,
            cotizacion: cotizacion,
            tipo: 'NOTA_VENTA'
          });
          break;

        case 'convertir-comprobante':
          setConversionModal({
            open: true,
            cotizacion: cotizacion,
            tipo: 'COMPROBANTE'
          });
          break;
        
        case 'anular':
          if (confirm('¿Está seguro de anular esta cotización?')) {
            const motivo = prompt('Ingrese el motivo de anulación:');
            if (motivo) {
              await anularCotizacion(cotizacion.id, motivo);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error al ejecutar acción:', error);
    }
  };

  // Obtener acciones disponibles según estado
  const getAccionesDisponibles = (cotizacion: Cotizacion) => {
    const acciones = [
      { id: 'ver', label: 'Ver detalles', icon: Eye, disponible: true },
      { id: 'duplicar', label: 'Duplicar', icon: Copy, disponible: true }
    ];

    switch (cotizacion.estado) {
      case 'BORRADOR':
        acciones.push(
          { id: 'editar', label: 'Editar', icon: Edit, disponible: true },
          { id: 'enviar', label: 'Emitir', icon: Send, disponible: true },
          { id: 'anular', label: 'Anular', icon: Trash2, disponible: true }
        );
        break;
      
      case 'EMITIDO':
        acciones.push(
          { id: 'editar', label: 'Editar', icon: Edit, disponible: true },
          { id: 'aprobar', label: 'Aprobar', icon: CheckCircle, disponible: true },
          { id: 'rechazar', label: 'Rechazar', icon: XCircle, disponible: true },
          { id: 'anular', label: 'Anular', icon: Trash2, disponible: true }
        );
        break;
      
      case 'APROBADO':
        acciones.push(
          { id: 'convertir-nota', label: 'Convertir a Nota de Venta', icon: ArrowRight, disponible: true },
          { id: 'convertir-comprobante', label: 'Convertir a Comprobante', icon: FileText, disponible: true }
        );
        break;
      
      case 'CONVERTIDO':
        // Solo ver y duplicar disponibles
        break;
      
      case 'RECHAZADO':
      case 'ANULADO':
        // Solo ver y duplicar disponibles
        break;
    }

    return acciones;
  };

  return (
    <>
      {/* Barra de herramientas */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            {/* Búsqueda */}
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, cliente, vendedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`
                px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2
                ${mostrarFiltros 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {Object.keys(filtros).length > 0 && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                  {Object.keys(filtros).length}
                </span>
              )}
            </button>

            {/* Botón recargar */}
            <button
              onClick={recargarDatos}
              className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportarDocumentos('COTIZACION', 'excel')}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            
            <button
              onClick={() => {
                setCotizacionEditar(null);
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva Cotización
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <FiltrosPanel
            filtros={filtros}
            setFiltros={setFiltros}
            tipo="COTIZACION"
            className="mt-4"
          />
        )}
      </div>

      {/* Tabla de cotizaciones */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Vendedor
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Vencimiento
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {cotizacionesFiltradas.map((cotizacion) => {
              const diasRestantes = getDiasRestantes(cotizacion.validoHasta);
              const vencido = diasRestantes < 0 && cotizacion.estado === 'EMITIDO';
              const tieneConversiones = cotizacion.convertidoANotaVenta || cotizacion.convertidoAComprobante;
              const estaExpandida = cotizacionExpandida === cotizacion.id;

              return (
                <>
                <tr
                  key={cotizacion.id}
                  className={`
                    transition-colors
                    ${estaExpandida ? 'bg-blue-50' : 'hover:bg-gray-50'}
                    ${tieneConversiones ? 'border-l-4 border-l-purple-400' : ''}
                  `}
                >
                  {/* Documento */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cotizacion.serieNumero}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(cotizacion.fechaEmision)}
                      </p>
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 flex items-center">
                        <Building className="h-4 w-4 mr-1 text-gray-400" />
                        {cotizacion.cliente.razonSocial}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {cotizacion.cliente.tipoDocumento}: {cotizacion.cliente.numeroDocumento}
                      </p>
                    </div>
                  </td>

                  {/* Vendedor */}
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {cotizacion.vendedorNombre || 'Sin asignar'}
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-6 py-4 text-right">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatMoney(cotizacion.totales.total, cotizacion.moneda)}
                      </p>
                      {cotizacion.moneda === 'USD' && (
                        <p className="text-xs text-gray-500 mt-1">
                          TC: {cotizacion.tipoCambio?.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Vencimiento */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-700">
                        {formatDate(cotizacion.validoHasta)}
                      </p>
                      {(cotizacion.estado === 'EMITIDO' || cotizacion.estado === 'BORRADOR') && (
                        <p className={`
                          text-xs mt-1
                          ${vencido ? 'text-red-600 font-medium' : 
                            diasRestantes <= 3 ? 'text-orange-600' : 'text-gray-500'}
                        `}>
                          {vencido ? '⚠ Vencida' : `${diasRestantes} días restantes`}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <EstadoBadge estado={cotizacion.estado} tipo="COTIZACION" />
                      {tieneConversiones && (
                        <button
                          onClick={() => setCotizacionExpandida(estaExpandida ? null : cotizacion.id)}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          {estaExpandida ? 'Ocultar' : 'Ver'} conversiones
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-6 py-4 text-center">
                    <div className="relative">
                      <button
                        onClick={() => setMenuAbierto(menuAbierto === cotizacion.id ? null : cotizacion.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-5 w-5 text-gray-500" />
                      </button>
                      
                      {/* Menú desplegable */}
                      {menuAbierto === cotizacion.id && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                          <div className="py-1">
                            {getAccionesDisponibles(cotizacion).map((accion, index, array) => (
                              <div key={accion.id}>
                                <button
                                  onClick={() => handleAction(accion.id, cotizacion)}
                                  className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                  disabled={!accion.disponible}
                                >
                                  <accion.icon className="h-4 w-4 mr-3 text-gray-400" />
                                  <span>{accion.label}</span>
                                </button>
                                {/* Separador antes de acciones destructivas */}
                                {accion.id === 'duplicar' && index < array.length - 1 && (
                                  <div className="border-t border-gray-100 my-1"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Fila expandible con detalles de conversiones */}
                {estaExpandida && (
                  <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="space-y-4">
                        {/* Documentos relacionados */}
                        <DocumentoRelacionado
                          destinos={[
                            ...(cotizacion.convertidoANotaVenta
                              ? [{
                                  tipo: 'NOTA_VENTA' as const,
                                  numero: cotizacion.convertidoANotaVenta.numero,
                                  fecha: cotizacion.convertidoANotaVenta.fecha,
                                  id: cotizacion.convertidoANotaVenta.id
                                }]
                              : []),
                            ...(cotizacion.convertidoAComprobante
                              ? [{
                                  tipo: 'COMPROBANTE' as const,
                                  numero: cotizacion.convertidoAComprobante.numero,
                                  fecha: cotizacion.convertidoAComprobante.fecha,
                                  id: cotizacion.convertidoAComprobante.id
                                }]
                              : [])
                          ]}
                        />

                        {/* Botones de conversión rápida si está aprobado */}
                        {cotizacion.estado === 'APROBADO' && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Acciones de conversión
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {!cotizacion.convertidoANotaVenta && (
                                <ConversionButton
                                  tipo="nota-venta"
                                  onClick={() => {
                                    setConversionModal({
                                      open: true,
                                      cotizacion: cotizacion,
                                      tipo: 'NOTA_VENTA'
                                    });
                                  }}
                                />
                              )}
                              {!cotizacion.convertidoAComprobante && (
                                <ConversionButton
                                  tipo="comprobante"
                                  onClick={() => {
                                    setConversionModal({
                                      open: true,
                                      cotizacion: cotizacion,
                                      tipo: 'COMPROBANTE'
                                    });
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
        
        {/* Estado vacío */}
        {cotizacionesFiltradas.length === 0 && (
          <div className="text-center py-16 px-6">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              No hay cotizaciones
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {busqueda || Object.keys(filtros).length > 0
                ? 'No se encontraron cotizaciones con los filtros aplicados'
                : 'Comienza creando tu primera cotización'}
            </p>
            <div className="mt-6">
              {busqueda || Object.keys(filtros).length > 0 ? (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setFiltros({});
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Limpiar filtros
                </button>
              ) : (
                <button
                  onClick={() => {
                    setCotizacionEditar(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cotización
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Información de paginación */}
      {cotizacionesFiltradas.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{cotizacionesFiltradas.length}</span> de{' '}
              <span className="font-medium">{cotizaciones.length}</span> cotizaciones
            </p>
            {/* Aquí iría la paginación si fuera necesaria */}
          </div>
        </div>
      )}

      {/* Modal de creación/edición con formulario completo */}
      <FormularioDocumentoModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCotizacionEditar(null);
        }}
        tipo="COTIZACION"
        documentoEditar={cotizacionEditar}
        onSave={async (data) => {
          if (cotizacionEditar) {
            await actualizarCotizacion(cotizacionEditar.id, data);
          } else {
            await crearCotizacion(data);
          }
          setModalOpen(false);
          setCotizacionEditar(null);
        }}
      />

      {/* Modal de confirmación de conversión */}
      {conversionModal.open && conversionModal.cotizacion && conversionModal.tipo && (
        <ConversionPreviewModal
          isOpen={conversionModal.open}
          onClose={() => setConversionModal({ open: false, cotizacion: null, tipo: null })}
          onConfirm={handleConfirmConversion}
          documentoOrigen={conversionModal.cotizacion}
          tipoDestino={conversionModal.tipo}
        />
      )}
    </>
  );
}