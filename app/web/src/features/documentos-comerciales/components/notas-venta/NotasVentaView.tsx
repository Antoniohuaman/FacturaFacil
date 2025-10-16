// app/web/src/features/documentos-comerciales/components/notas-venta/NotasVentaView.tsx

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
  ArrowRight,
  Trash2,
  FileText,
  Calendar,
  User,
  Building,
  RefreshCw,
  Receipt,
  Link
} from 'lucide-react';
import { useDocumentos } from '../../hooks/useDocumentos';
import type { NotaVenta } from '../../models/types';
import { DocumentoModal } from '../shared/DocumentoModal';
import { EstadoBadge } from '../shared/EstadoBadge';
import { FiltrosPanel } from '../shared/FiltrosPanel';

export function NotasVentaView() {
  const {
    notasVenta,
    filtros,
    setFiltros,
    loading,
    crearNotaVenta,
    actualizarNotaVenta,
    duplicarNotaVenta,
    anularNotaVenta,
    cambiarEstadoNotaVenta,
    convertirNotaVentaAComprobante,
    recargarDatos,
    exportarDocumentos
  } = useDocumentos();

  const [modalOpen, setModalOpen] = useState(false);
  const [notaVentaEditar, setNotaVentaEditar] = useState<NotaVenta | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Filtrar notas de venta localmente por búsqueda
  const notasVentaFiltradas = useMemo(() => {
    if (!busqueda) return notasVenta;
    
    const termino = busqueda.toLowerCase();
    return notasVenta.filter(nv => 
      nv.serieNumero.toLowerCase().includes(termino) ||
      nv.cliente.razonSocial.toLowerCase().includes(termino) ||
      nv.cliente.numeroDocumento.includes(termino) ||
      nv.vendedorNombre?.toLowerCase().includes(termino)
    );
  }, [notasVenta, busqueda]);

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

  // Manejar acciones del menú
  const handleAction = async (action: string, notaVenta: NotaVenta) => {
    setMenuAbierto(null);
    
    try {
      switch (action) {
        case 'ver':
          // Implementar vista previa
          console.log('Ver nota de venta:', notaVenta);
          break;
        
        case 'editar':
          setNotaVentaEditar(notaVenta);
          setModalOpen(true);
          break;
        
        case 'duplicar':
          await duplicarNotaVenta(notaVenta.id);
          break;
        
        case 'aprobar':
          await cambiarEstadoNotaVenta(notaVenta.id, 'APROBADO');
          break;
        
        case 'convertir-comprobante':
          await convertirNotaVentaAComprobante(notaVenta.id);
          break;
        
        case 'anular':
          if (confirm('¿Está seguro de anular esta nota de venta?')) {
            const motivo = prompt('Ingrese el motivo de anulación:');
            if (motivo) {
              await anularNotaVenta(notaVenta.id, motivo);
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error al ejecutar acción:', error);
    }
  };

  // Obtener acciones disponibles según estado
  const getAccionesDisponibles = (notaVenta: NotaVenta) => {
    const acciones = [
      { id: 'ver', label: 'Ver detalles', icon: Eye, disponible: true },
      { id: 'duplicar', label: 'Duplicar', icon: Copy, disponible: true }
    ];

    switch (notaVenta.estado) {
      case 'BORRADOR':
      case 'EMITIDO':
        acciones.push(
          { id: 'editar', label: 'Editar', icon: Edit, disponible: true },
          { id: 'aprobar', label: 'Aprobar', icon: FileText, disponible: true },
          { id: 'anular', label: 'Anular', icon: Trash2, disponible: true }
        );
        break;
      
      case 'APROBADO':
        acciones.push(
          { id: 'convertir-comprobante', label: 'Convertir a Comprobante', icon: ArrowRight, disponible: true }
        );
        break;
      
      case 'CONVERTIDO':
        // Solo ver y duplicar disponibles
        break;
      
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`
                px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2
                ${mostrarFiltros 
                  ? 'bg-purple-50 border-purple-200 text-purple-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Filter className="h-4 w-4" />
              Filtros
              {Object.keys(filtros).length > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
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
              onClick={() => exportarDocumentos('NOTA_VENTA', 'excel')}
              className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            
            <button
              onClick={() => {
                setNotaVentaEditar(null);
                setModalOpen(true);
              }}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Nueva Nota de Venta
            </button>
          </div>
        </div>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <FiltrosPanel
            filtros={filtros}
            setFiltros={setFiltros}
            tipo="NOTA_VENTA"
            className="mt-4"
          />
        )}
      </div>

      {/* Tabla de notas de venta */}
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
                Origen
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
            {notasVentaFiltradas.map((notaVenta) => (
              <tr key={notaVenta.id} className="hover:bg-gray-50 transition-colors">
                {/* Documento */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {notaVenta.serieNumero}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(notaVenta.fechaEmision)}
                    </p>
                  </div>
                </td>

                {/* Cliente */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center">
                      <Building className="h-4 w-4 mr-1 text-gray-400" />
                      {notaVenta.cliente.razonSocial}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notaVenta.cliente.tipoDocumento}: {notaVenta.cliente.numeroDocumento}
                    </p>
                  </div>
                </td>

                {/* Vendedor */}
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {notaVenta.vendedorNombre || 'Sin asignar'}
                    </span>
                  </div>
                </td>

                {/* Total */}
                <td className="px-6 py-4 text-right">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatMoney(notaVenta.totales.total, notaVenta.moneda)}
                    </p>
                    {notaVenta.moneda === 'USD' && (
                      <p className="text-xs text-gray-500 mt-1">
                        TC: {notaVenta.tipoCambio?.toFixed(2)}
                      </p>
                    )}
                    {notaVenta.formaPago === 'CREDITO' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Crédito {notaVenta.diasCredito} días
                      </p>
                    )}
                  </div>
                </td>

                {/* Origen */}
                <td className="px-6 py-4">
                  {notaVenta.referencias?.referenciaOrigen ? (
                    <div className="flex items-center">
                      <Link className="h-4 w-4 mr-1 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-600">
                          {notaVenta.referencias.referenciaOrigen.tipo === 'COTIZACION' ? 'Cotización' : ''}
                        </p>
                        <p className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
                          {notaVenta.referencias.referenciaOrigen.numero}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Directo</span>
                  )}
                </td>

                {/* Estado */}
                <td className="px-6 py-4 text-center">
                  <EstadoBadge estado={notaVenta.estado} tipo="NOTA_VENTA" />
                  {notaVenta.convertidoAComprobante && (
                    <p className="text-xs text-gray-500 mt-1">
                      → {notaVenta.convertidoAComprobante.numero}
                    </p>
                  )}
                </td>

                {/* Acciones */}
                <td className="px-6 py-4 text-center">
                  <div className="relative">
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === notaVenta.id ? null : notaVenta.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-500" />
                    </button>
                    
                    {/* Menú desplegable */}
                    {menuAbierto === notaVenta.id && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {getAccionesDisponibles(notaVenta).map((accion, index, array) => (
                            <div key={accion.id}>
                              <button
                                onClick={() => handleAction(accion.id, notaVenta)}
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
            ))}
          </tbody>
        </table>
        
        {/* Estado vacío */}
        {notasVentaFiltradas.length === 0 && (
          <div className="text-center py-16 px-6">
            <Receipt className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              No hay notas de venta
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {busqueda || Object.keys(filtros).length > 0
                ? 'No se encontraron notas de venta con los filtros aplicados'
                : 'Comienza creando tu primera nota de venta'}
            </p>
            <div className="mt-6">
              {busqueda || Object.keys(filtros).length > 0 ? (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setFiltros({});
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Limpiar filtros
                </button>
              ) : (
                <button
                  onClick={() => {
                    setNotaVentaEditar(null);
                    setModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Nota de Venta
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Información de paginación */}
      {notasVentaFiltradas.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{notasVentaFiltradas.length}</span> de{' '}
              <span className="font-medium">{notasVenta.length}</span> notas de venta
            </p>
            {/* Aquí iría la paginación si fuera necesaria */}
          </div>
        </div>
      )}

      {/* Modal de creación/edición */}
      {modalOpen && (
        <DocumentoModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setNotaVentaEditar(null);
          }}
          tipo="NOTA_VENTA"
          documento={notaVentaEditar}
          onSave={async (data) => {
            if (notaVentaEditar) {
              await actualizarNotaVenta(notaVentaEditar.id, data);
            } else {
              await crearNotaVenta(data);
            }
            setModalOpen(false);
            setNotaVentaEditar(null);
          }}
        />
      )}
    </>
  );
}