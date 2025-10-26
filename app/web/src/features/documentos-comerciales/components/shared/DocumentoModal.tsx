// app/web/src/features/documentos-comerciales/components/shared/DocumentoModal.tsx

import { useState, useEffect } from 'react';
import {
  X, Trash2, Save, FileText, Calculator, User, Building, Package, AlertCircle
} from 'lucide-react';
import type {
  Cotizacion, NotaVenta, DocumentoFormData, DocumentoCliente,
  DocumentoItem, TipoDocumento, TipoImpuesto
} from '../../models/types';
import { DocumentoCalculoService, DocumentoValidationService } from '../../services';
import { useDocumentos } from '../../hooks/useDocumentos';
import { useCurrentEstablishmentId } from '../../../../contexts/UserSessionContext';

interface DocumentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: TipoDocumento;
  documento?: Cotizacion | NotaVenta | null;
  cotizacionOrigen?: Cotizacion; // Para conversión
  onSave: (data: DocumentoFormData) => Promise<void>;
}

// Mock de clientes y productos (en producción vendría del API)
const mockClientes: DocumentoCliente[] = [
  {
    tipoDocumento: 'RUC',
    numeroDocumento: '20512345678',
    razonSocial: 'Empresa Constructora SAC',
    direccion: 'Av. Los Constructores 123, Lima',
    correo: 'contacto@constructora.pe',
    telefono: '01-2345678'
  },
  {
    tipoDocumento: 'DNI',
    numeroDocumento: '45678912',
    razonSocial: 'Juan Pérez Rodríguez',
    direccion: 'Calle Las Flores 789, Miraflores',
    correo: 'jperez@gmail.com',
    telefono: '987654321'
  }
];

const mockProductos = [
  { id: 'P001', codigo: 'LAP001', descripcion: 'Laptop HP ProBook', precio: 2800, unidad: 'UND', impuesto: 'IGV' as TipoImpuesto },
  { id: 'P002', codigo: 'MOU001', descripcion: 'Mouse Logitech MX', precio: 350, unidad: 'UND', impuesto: 'IGV' as TipoImpuesto },
  { id: 'P003', codigo: 'SRV001', descripcion: 'Servicio de Instalación', precio: 500, unidad: 'SRV', impuesto: 'EXONERADO' as TipoImpuesto }
];

type TabId = 'encabezado' | 'cliente' | 'items' | 'totales' | 'condiciones' | 'bancos';

export function DocumentoModal({
  isOpen,
  onClose,
  tipo,
  documento,
  cotizacionOrigen,
  onSave
}: DocumentoModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('encabezado');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const calculoService = new DocumentoCalculoService();
  const validationService = new DocumentoValidationService();
  const { obtenerVisibilidad } = useDocumentos();
  const uiVisibility = obtenerVisibilidad();

  // Obtener establecimiento del usuario actual
  const currentEstablishmentId = useCurrentEstablishmentId();

  // Estado del formulario
  const [formData, setFormData] = useState<DocumentoFormData>(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const validoHasta = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      tipo,
      fechaEmision: hoy,
      moneda: 'PEN',
      establecimientoId: currentEstablishmentId || '',
      vendedorId: 'VEN001',
      formaPago: 'CONTADO',
      validoHasta: tipo === 'COTIZACION' ? validoHasta : undefined,
      cliente: {
        tipoDocumento: 'RUC',
        numeroDocumento: '',
        razonSocial: '',
        direccion: ''
      },
      items: [],
      condicionesAtencion: '',
      observaciones: ''
    };
  });

  // Estados auxiliares
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarClientes, setMostrarClientes] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [mostrarProductos, setMostrarProductos] = useState(false);

  // Tabs disponibles con visibilidad condicional
  const tabs = [
    { id: 'encabezado' as TabId, label: 'Encabezado', icon: FileText },
    { id: 'cliente' as TabId, label: 'Cliente', icon: User },
    { id: 'items' as TabId, label: `Items (${formData.items.length})`, icon: Package },
    { id: 'totales' as TabId, label: 'Totales', icon: Calculator },
    { id: 'condiciones' as TabId, label: 'Condiciones', icon: FileText, visible: uiVisibility.condiciones },
    { id: 'bancos' as TabId, label: 'Bancos', icon: Building, visible: uiVisibility.bancos }
  ].filter(tab => tab.visible !== false);

  // Cargar datos si es edición o conversión
  useEffect(() => {
    if (documento) {
      // Edición
      setFormData({
        tipo: documento.tipo,
        fechaEmision: documento.fechaEmision,
        moneda: documento.moneda,
        tipoCambio: documento.tipoCambio,
        establecimientoId: documento.establecimientoId,
        vendedorId: documento.vendedorId,
        formaPago: documento.formaPago,
        diasCredito: documento.diasCredito,
        validoHasta: documento.tipo === 'COTIZACION' ? (documento as Cotizacion).validoHasta : undefined,
        cliente: documento.cliente,
        items: documento.items.map(({ item, importe, ...resto }) => resto),
        descuentoGlobal: documento.totales.descuentoGlobal,
        condicionesAtencion: documento.condicionesAtencion,
        observaciones: documento.observaciones,
        bancos: documento.bancos
      });
      setBusquedaCliente(documento.cliente.razonSocial);
    } else if (cotizacionOrigen) {
      // Conversión desde cotización
      setFormData({
        tipo: 'NOTA_VENTA',
        fechaEmision: new Date().toISOString().split('T')[0],
        moneda: cotizacionOrigen.moneda,
        tipoCambio: cotizacionOrigen.tipoCambio,
        establecimientoId: cotizacionOrigen.establecimientoId,
        vendedorId: cotizacionOrigen.vendedorId,
        formaPago: cotizacionOrigen.formaPago,
        diasCredito: cotizacionOrigen.diasCredito,
        cliente: cotizacionOrigen.cliente,
        items: cotizacionOrigen.items.map(({ item, importe, ...resto }) => resto),
        descuentoGlobal: cotizacionOrigen.totales.descuentoGlobal,
        condicionesAtencion: cotizacionOrigen.condicionesAtencion,
        observaciones: cotizacionOrigen.observaciones,
        bancos: cotizacionOrigen.bancos,
        referenciaOrigen: {
          tipo: 'COTIZACION',
          id: cotizacionOrigen.id
        }
      });
      setBusquedaCliente(cotizacionOrigen.cliente.razonSocial);
    }
  }, [documento, cotizacionOrigen]);

  // Calcular totales
  const totales = calculoService.calcularTotales(
    formData.items.map((item, index) => ({ ...item, item: index + 1, importe: 0 })),
    formData.descuentoGlobal
  );

  // Seleccionar cliente
  const seleccionarCliente = (cliente: DocumentoCliente) => {
    setFormData(prev => ({ ...prev, cliente }));
    setBusquedaCliente(cliente.razonSocial);
    setMostrarClientes(false);
  };

  // Agregar producto
  const agregarProducto = (producto: typeof mockProductos[0]) => {
    const nuevoItem: Omit<DocumentoItem, 'item' | 'importe'> = {
      cantidad: 1,
      unidad: producto.unidad,
      descripcion: producto.descripcion,
      impuesto: producto.impuesto,
      precioUnitario: producto.precio,
      codigo: producto.codigo,
      productoId: producto.id
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));
    setBusquedaProducto('');
    setMostrarProductos(false);
    setActiveTab('items');
  };

  // Actualizar item
  const actualizarItem = (index: number, campo: keyof DocumentoItem, valor: any) => {
    setFormData(prev => {
      const nuevosItems = [...prev.items];
      nuevosItems[index] = { ...nuevosItems[index], [campo]: valor };
      return { ...prev, items: nuevosItems };
    });
  };

  // Eliminar item
  const eliminarItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Guardar documento
  const handleGuardar = async () => {
    setLoading(true);
    setErrors([]);

    // Validar
    const validacion = validationService.validarDocumento(formData);
    if (!validacion.valido) {
      setErrors(validacion.errores);
      setLoading(false);
      return;
    }

    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Error al guardar']);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: formData.moneda,
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {documento ? 'Editar' : 'Nueva'} {tipo === 'COTIZACION' ? 'Cotización' : 'Nota de Venta'}
              </h2>
              {documento && (
                <p className="text-sm text-gray-600 mt-1">
                  {documento.serieNumero} • {documento.estado}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/50">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Errores */}
        {errors.length > 0 && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                {errors.map((error, idx) => (
                  <p key={idx}>{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Encabezado */}
          {activeTab === 'encabezado' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de emisión
                  </label>
                  <input
                    type="date"
                    value={formData.fechaEmision}
                    onChange={(e) => setFormData(prev => ({ ...prev, fechaEmision: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {tipo === 'COTIZACION' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Válido hasta
                    </label>
                    <input
                      type="date"
                      value={formData.validoHasta}
                      onChange={(e) => setFormData(prev => ({ ...prev, validoHasta: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moneda
                  </label>
                  <select
                    value={formData.moneda}
                    onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PEN">Soles (PEN)</option>
                    <option value="USD">Dólares (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de pago
                  </label>
                  <select
                    value={formData.formaPago}
                    onChange={(e) => setFormData(prev => ({ ...prev, formaPago: e.target.value as any }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CONTADO">Contado</option>
                    <option value="CREDITO">Crédito</option>
                  </select>
                </div>

                {formData.formaPago === 'CREDITO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días de crédito
                    </label>
                    <input
                      type="number"
                      value={formData.diasCredito || 0}
                      onChange={(e) => setFormData(prev => ({ ...prev, diasCredito: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                      max="365"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Cliente */}
          {activeTab === 'cliente' && (
            <div className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar cliente
                </label>
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => {
                    setBusquedaCliente(e.target.value);
                    setMostrarClientes(true);
                  }}
                  onFocus={() => setMostrarClientes(true)}
                  placeholder="Buscar por nombre o documento..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                {mostrarClientes && busquedaCliente && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {mockClientes
                      .filter(c => 
                        c.razonSocial.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
                        c.numeroDocumento.includes(busquedaCliente)
                      )
                      .map((cliente, idx) => (
                        <button
                          key={idx}
                          onClick={() => seleccionarCliente(cliente)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b"
                        >
                          <p className="font-medium">{cliente.razonSocial}</p>
                          <p className="text-sm text-gray-500">
                            {cliente.tipoDocumento}: {cliente.numeroDocumento}
                          </p>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {formData.cliente.numeroDocumento && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Tipo de documento</p>
                      <p className="font-medium">{formData.cliente.tipoDocumento}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Número</p>
                      <p className="font-medium">{formData.cliente.numeroDocumento}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dirección</p>
                    <p className="font-medium">{formData.cliente.direccion}</p>
                  </div>
                  {formData.cliente.correo && (
                    <div>
                      <p className="text-xs text-gray-500">Correo</p>
                      <p className="font-medium">{formData.cliente.correo}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Items */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              {/* Buscar producto */}
              <div className="relative">
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => {
                    setBusquedaProducto(e.target.value);
                    setMostrarProductos(true);
                  }}
                  onFocus={() => setMostrarProductos(true)}
                  placeholder="Buscar producto..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                {mostrarProductos && busquedaProducto && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {mockProductos
                      .filter(p => 
                        p.descripcion.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
                        p.codigo.toLowerCase().includes(busquedaProducto.toLowerCase())
                      )
                      .map((producto) => (
                        <button
                          key={producto.id}
                          onClick={() => agregarProducto(producto)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b flex justify-between"
                        >
                          <div>
                            <p className="font-medium">{producto.descripcion}</p>
                            <p className="text-sm text-gray-500">Código: {producto.codigo}</p>
                          </div>
                          <p className="font-semibold text-blue-600">
                            {formatMoney(producto.precio)}
                          </p>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Tabla de items */}
              {formData.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Producto</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Cant.</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">P. Unit</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{item.descripcion}</p>
                            {item.codigo && (
                              <p className="text-xs text-gray-500">Código: {item.codigo}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.cantidad}
                              onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value))}
                              className="w-20 px-2 py-1 text-center border rounded"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={item.precioUnitario}
                              onChange={(e) => actualizarItem(index, 'precioUnitario', parseFloat(e.target.value))}
                              className="w-24 px-2 py-1 text-right border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatMoney(item.cantidad * item.precioUnitario)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => eliminarItem(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p>No hay productos agregados</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Totales */}
          {activeTab === 'totales' && (
            <div className="max-w-lg mx-auto space-y-4">
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatMoney(totales.subtotal)}</span>
                </div>
                
                {totales.totalDescuentos > 0 && (
                  <div className="flex justify-between py-2 text-red-600">
                    <span>Descuentos</span>
                    <span className="font-medium">-{formatMoney(totales.totalDescuentos)}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Op. Gravada</span>
                  <span className="font-medium">{formatMoney(totales.opGravada)}</span>
                </div>
                
                {totales.opExonerada > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Op. Exonerada</span>
                    <span className="font-medium">{formatMoney(totales.opExonerada)}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">IGV (18%)</span>
                  <span className="font-medium">{formatMoney(totales.igv)}</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">{formatMoney(totales.total)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {totales.montoEnLetras}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Condiciones */}
          {activeTab === 'condiciones' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condiciones de atención
                </label>
                <textarea
                  value={formData.condicionesAtencion || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, condicionesAtencion: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Entrega en 5 días hábiles..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {formData.items.length} producto(s) • Total: {formatMoney(totales.total)}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className={`
                  px-6 py-2 text-white rounded-lg flex items-center gap-2
                  ${tipo === 'COTIZACION' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                  }
                  disabled:opacity-50
                `}
                disabled={loading || formData.items.length === 0}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {documento ? 'Actualizar' : 'Crear'} {tipo === 'COTIZACION' ? 'Cotización' : 'Nota de Venta'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}