// src/features/configuration/pages/SeriesConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Hash,
  AlertCircle,
  FileCheck,
  Receipt,
  Clipboard,
  MessageSquare,
  FileText,
  Building2
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import type { Series } from '../models/Series';

type VoucherType = 'INVOICE' | 'RECEIPT' | 'SALE_NOTE' | 'QUOTE';

interface SeriesFormData {
  type: VoucherType;
  series: string;
  establishmentId: string;
  initialNumber: number;
  currentNumber: number;
  isDefault: boolean;
  isActive: boolean;
}

const voucherTypeConfig = {
  INVOICE: {
    label: 'Factura Electrónica',
    icon: FileCheck,
    color: 'blue',
    prefix: 'F',
    description: 'Para ventas a empresas con RUC'
  },
  RECEIPT: {
    label: 'Boleta Electrónica',
    icon: Receipt,
    color: 'green',
    prefix: 'B',
    description: 'Para ventas a consumidores finales'
  },
  SALE_NOTE: {
    label: 'Nota de Venta',
    icon: Clipboard,
    color: 'orange',
    prefix: '',
    description: 'Documento interno, sin validez tributaria'
  },
  QUOTE: {
    label: 'Cotización',
    icon: MessageSquare,
    color: 'purple',
    prefix: '',
    description: 'Propuesta comercial para clientes'
  }
};

// Extended Series interface for this component
interface ExtendedSeries extends Series {
  type: VoucherType;
  initialNumber: number;
  currentNumber: number;
  isDefault: boolean;
  isActive: boolean;
  hasUsage: boolean;
}

export function SeriesConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { series: rawSeries, establishments } = state;
  
  // Transform Series to ExtendedSeries for component compatibility
  const series: ExtendedSeries[] = rawSeries.map(s => ({
    ...s,
    type: 'INVOICE' as VoucherType, // Default type - would come from Series interface
    initialNumber: s.configuration?.startNumber || 1,
    currentNumber: s.correlativeNumber,
    isDefault: false, // Would come from business logic
    isActive: true, // Would come from Series status
    hasUsage: s.correlativeNumber > (s.configuration?.startNumber || 1)
  }));
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SeriesFormData>({
    type: 'INVOICE',
    series: '',
    establishmentId: '',
    initialNumber: 1,
    currentNumber: 1,
    isDefault: false,
    isActive: true
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; series?: ExtendedSeries }>({
    show: false
  });
  const [adjustModal, setAdjustModal] = useState<{ show: boolean; series?: ExtendedSeries }>({
    show: false
  });
  const [newCorrelative, setNewCorrelative] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [filterEstablishment, setFilterEstablishment] = useState('ALL');

  // Filter series
  const filteredSeries = series.filter(s => {
    const matchesType = filterType === 'ALL' || s.type === filterType;
    const matchesEstablishment = filterEstablishment === 'ALL' || s.establishmentId === filterEstablishment;
    return matchesType && matchesEstablishment;
  });

  // Group series by establishment
  const seriesByEstablishment = establishments.map(est => ({
    establishment: est,
    series: filteredSeries.filter(s => s.establishmentId === est.id)
  }));

  const resetForm = () => {
    setFormData({
      type: 'INVOICE',
      series: '',
      establishmentId: establishments[0]?.id || '',
      initialNumber: 1,
      currentNumber: 1,
      isDefault: false,
      isActive: true
    });
    setEditingId(null);
    setShowForm(false);
  };

  const generateSeriesCode = (type: VoucherType) => {
    const config = voucherTypeConfig[type];
    if (!config.prefix) return ''; // For SALE_NOTE and QUOTE, user enters freely
    
    const existingNumbers = series
      .filter(s => s.type === type && s.series.startsWith(config.prefix))
      .map(s => parseInt(s.series.substring(1)) || 0);
    
    const nextNumber = Math.max(0, ...existingNumbers) + 1;
    return `${config.prefix}${nextNumber.toString().padStart(3, '0')}`;
  };

  const handleTypeChange = (type: VoucherType) => {
    setFormData(prev => ({
      ...prev,
      type,
      series: generateSeriesCode(type)
    }));
  };

  const handleEdit = (seriesItem: ExtendedSeries) => {
    setFormData({
      type: seriesItem.type,
      series: seriesItem.series,
      establishmentId: seriesItem.establishmentId,
      initialNumber: seriesItem.initialNumber,
      currentNumber: seriesItem.currentNumber,
      isDefault: seriesItem.isDefault,
      isActive: seriesItem.isActive
    });
    setEditingId(seriesItem.id);
    setShowForm(true);
  };

  const handleNew = () => {
    setFormData({
      type: 'INVOICE',
      series: generateSeriesCode('INVOICE'),
      establishmentId: establishments[0]?.id || '',
      initialNumber: 1,
      currentNumber: 1,
      isDefault: false,
      isActive: true
    });
    setShowForm(true);
  };

  const validateSeries = () => {
    const config = voucherTypeConfig[formData.type];
    
    // Validate prefix for invoice/receipt
    if (config.prefix && !formData.series.startsWith(config.prefix)) {
      return `La serie debe comenzar con "${config.prefix}" para ${config.label}`;
    }
    
    // Validate length for sale notes and quotes (4 characters)
    if (!config.prefix && formData.series.length !== 4) {
      return `La serie debe tener exactamente 4 caracteres para ${config.label}`;
    }
    
    // Check for duplicates
    const isDuplicate = series.some(s => 
      s.series === formData.series && 
      s.establishmentId === formData.establishmentId && 
      s.id !== editingId
    );
    
    if (isDuplicate) {
      return 'Ya existe una serie con este código en el establecimiento seleccionado';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateSeries();
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsLoading(true);

    try {
      let updatedSeries: Series[];

      if (editingId) {
        // Update existing
        updatedSeries = rawSeries.map(s =>
          s.id === editingId
            ? {
                ...s,
                series: formData.series,
                correlativeNumber: formData.currentNumber,
                configuration: {
                  ...s.configuration,
                  startNumber: formData.initialNumber,
                  minimumDigits: 8,
                  autoIncrement: true,
                  allowManualNumber: false,
                  requireAuthorization: false
                },
                updatedAt: new Date()
              }
            : s
        );
      } else {
        // Create new
        const newSeries: Series = {
          id: Date.now().toString(),
          establishmentId: formData.establishmentId,
          documentType: '01' as any, // DocumentType from SUNAT catalog
          series: formData.series,
          correlativeNumber: formData.currentNumber,
          configuration: {
            minimumDigits: 8,
            startNumber: formData.initialNumber,
            autoIncrement: true,
            allowManualNumber: false,
            requireAuthorization: false
          },
          sunatConfiguration: {
            isElectronic: formData.type === 'INVOICE' || formData.type === 'RECEIPT',
            environmentType: 'TESTING',
            certificateRequired: formData.type === 'INVOICE' || formData.type === 'RECEIPT',
            mustReportToSunat: formData.type === 'INVOICE' || formData.type === 'RECEIPT',
            maxDaysToReport: 30
          },
          statistics: {
            documentsIssued: 0,
            averageDocumentsPerDay: 0
          },
          validation: {
            allowZeroAmount: false,
            requireCustomer: formData.type === 'INVOICE'
          },
          status: 'ACTIVE',
          isDefault: formData.isDefault,
          notes: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          isActive: formData.isActive
        };
        
        updatedSeries = [...rawSeries, newSeries];
      }

      dispatch({ type: 'SET_SERIES', payload: updatedSeries });
      resetForm();
    } catch (error) {
      console.error('Error saving series:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (seriesItem: ExtendedSeries) => {
    if (seriesItem.hasUsage) {
      alert('No se puede eliminar una serie que ya tiene documentos emitidos');
      return;
    }

    if (seriesItem.isDefault) {
      alert('No se puede eliminar la serie por defecto');
      return;
    }

    setIsLoading(true);

    try {
      const updatedSeries = rawSeries.filter(s => s.id !== seriesItem.id);
      dispatch({ type: 'SET_SERIES', payload: updatedSeries });
      setDeleteModal({ show: false });
    } catch (error) {
      console.error('Error deleting series:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustCorrelative = async (seriesItem: ExtendedSeries) => {
    const newNumber = parseInt(newCorrelative);
    
    if (newNumber <= seriesItem.currentNumber) {
      alert('El nuevo correlativo debe ser mayor al actual');
      return;
    }

    setIsLoading(true);

    try {
      const updatedSeries = rawSeries.map(s =>
        s.id === seriesItem.id
          ? { ...s, correlativeNumber: newNumber, updatedAt: new Date() }
          : s
      );
      
      dispatch({ type: 'SET_SERIES', payload: updatedSeries });
      setAdjustModal({ show: false });
      setNewCorrelative('');
    } catch (error) {
      console.error('Error adjusting correlative:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSeriesStatus = async (seriesItem: ExtendedSeries) => {
    const updatedSeries = rawSeries.map(s =>
      s.id === seriesItem.id
        ? { ...s, status: (s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED', updatedAt: new Date() }
        : s
    );

    dispatch({ type: 'SET_SERIES', payload: updatedSeries });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/configuracion')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Series de Comprobantes
            </h1>
            <p className="text-gray-600">
              Configura las series para facturas, boletas y otros documentos
            </p>
          </div>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Serie</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(voucherTypeConfig).map(([type, config]) => {
          const count = series.filter(s => s.type === type).length;
          const Icon = config.icon;
          
          return (
            <div key={type} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{config.label}</p>
                  <p className="text-xl font-bold text-gray-900">{count}</p>
                </div>
                <Icon className={`w-6 h-6 text-${config.color}-600`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ConfigurationCard
          title={editingId ? "Editar Serie" : "Nueva Serie"}
          description="Configura la serie de comprobantes"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Voucher Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Comprobante *
                </label>
                <div className="space-y-2">
                  {Object.entries(voucherTypeConfig).map(([type, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.type === type;
                    
                    return (
                      <div key={type}>
                        <input
                          type="radio"
                          id={type}
                          name="type"
                          checked={isSelected}
                          onChange={() => handleTypeChange(type as VoucherType)}
                          className="sr-only"
                        />
                        <label
                          htmlFor={type}
                          className={`
                            flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${isSelected 
                              ? `border-${config.color}-500 bg-${config.color}-50` 
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          <Icon className={`w-5 h-5 mr-3 ${
                            isSelected ? `text-${config.color}-600` : 'text-gray-500'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900">{config.label}</div>
                            <div className="text-xs text-gray-500">{config.description}</div>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Establishment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Establecimiento *
                </label>
                <select
                  value={formData.establishmentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, establishmentId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar establecimiento</option>
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>
                      {est.code} - {est.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Series Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Serie *
              </label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => setFormData(prev => ({ ...prev, series: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={voucherTypeConfig[formData.type].prefix ? `${voucherTypeConfig[formData.type].prefix}001` : 'ABCD'}
                maxLength={4}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {voucherTypeConfig[formData.type].prefix 
                  ? `Debe comenzar con "${voucherTypeConfig[formData.type].prefix}" para ${voucherTypeConfig[formData.type].label}`
                  : `Máximo 4 caracteres para ${voucherTypeConfig[formData.type].label}`
                }
              </p>
            </div>

            {/* Correlative Numbers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número Inicial *
                </label>
                <input
                  type="number"
                  value={formData.initialNumber}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    initialNumber: parseInt(e.target.value) || 1,
                    currentNumber: parseInt(e.target.value) || 1
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="99999999"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número Actual
                </label>
                <input
                  type="number"
                  value={formData.currentNumber}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Serie por Defecto</label>
                  <p className="text-sm text-gray-500">
                    Se selecciona automáticamente para este tipo de comprobante
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <p className="text-sm text-gray-500">
                    Solo las series activas pueden usarse para emitir documentos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className="flex items-center space-x-2"
                >
                  {formData.isActive ? (
                    <ToggleRight className="w-8 h-8 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-400" />
                  )}
                  <span className={`font-medium ${formData.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Serie'}
              </button>
            </div>
          </form>
        </ConfigurationCard>
      )}

      {/* List */}
      <ConfigurationCard
        title="Series por Establecimiento"
        description="Gestiona todas las series de tus establecimientos"
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as VoucherType | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todos los tipos</option>
            {Object.entries(voucherTypeConfig).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>
          
          <select
            value={filterEstablishment}
            onChange={(e) => setFilterEstablishment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="ALL">Todos los establecimientos</option>
            {establishments.map(est => (
              <option key={est.id} value={est.id}>{est.code} - {est.name}</option>
            ))}
          </select>
        </div>

        {/* Series by Establishment */}
        <div className="space-y-8">
          {seriesByEstablishment.map(({ establishment, series: establishmentSeries }) => (
            <div key={establishment.id} className="space-y-4">
              <div className="flex items-center space-x-3 pb-2 border-b border-gray-200">
                <Building2 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {establishment.code} - {establishment.name}
                </h3>
                <StatusIndicator
                  status={establishment.isActive ? 'success' : 'error'}
                  label={establishment.isActive ? 'Activo' : 'Inactivo'}
                  size="sm"
                />
              </div>

              {establishmentSeries.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <FileText className="mx-auto w-8 h-8 text-gray-400" />
                  <p className="mt-2 text-gray-500">No hay series configuradas para este establecimiento</p>
                  <button
                    onClick={handleNew}
                    className="mt-3 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Crear primera serie
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {establishmentSeries.map((seriesItem) => {
                    const config = voucherTypeConfig[seriesItem.type];
                    const Icon = config.icon;
                    
                    return (
                      <div
                        key={seriesItem.id}
                        className={`
                          border-2 rounded-lg p-4 transition-all
                          ${seriesItem.isActive 
                            ? 'border-gray-200 bg-white' 
                            : 'border-gray-100 bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 bg-${config.color}-50 rounded-lg flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 text-${config.color}-600`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-gray-900 text-lg">
                                  {seriesItem.series}
                                </span>
                                {seriesItem.isDefault && (
                                  <StatusIndicator
                                    status="success"
                                    label="Por defecto"
                                    size="sm"
                                  />
                                )}
                                {!seriesItem.isActive && (
                                  <StatusIndicator
                                    status="error"
                                    label="Inactiva"
                                    size="sm"
                                  />
                                )}
                              </div>
                              <p className="text-sm text-gray-500">{config.label}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => toggleSeriesStatus(seriesItem)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title={seriesItem.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {seriesItem.isActive ? (
                                <ToggleRight className="w-5 h-5 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleEdit(seriesItem)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            
                            <button
                              onClick={() => setDeleteModal({ show: true, series: seriesItem })}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar"
                              disabled={seriesItem.isDefault || seriesItem.hasUsage}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Número Actual</p>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-semibold text-gray-900">
                                {seriesItem.currentNumber.toString().padStart(8, '0')}
                              </span>
                              <button
                                onClick={() => {
                                  setAdjustModal({ show: true, series: seriesItem });
                                  setNewCorrelative(seriesItem.currentNumber.toString());
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Ajustar correlativo"
                              >
                                <Hash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 mb-1">Estado de Uso</p>
                            <StatusIndicator
                              status={seriesItem.hasUsage ? 'warning' : 'pending'}
                              label={seriesItem.hasUsage ? 'En uso' : 'Sin uso'}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSeries.length === 0 && series.length > 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto w-12 h-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No se encontraron series
            </h3>
            <p className="mt-2 text-gray-500">
              Ajusta los filtros para ver más resultados
            </p>
          </div>
        )}
      </ConfigurationCard>

      {/* Delete Modal */}
      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={() => deleteModal.series && handleDelete(deleteModal.series)}
        title="Eliminar Serie"
        message={`¿Estás seguro de que deseas eliminar la serie "${deleteModal.series?.series}"? Esta acción no se puede deshacer.`}
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isLoading}
      />

      {/* Adjust Correlative Modal */}
      {adjustModal.show && adjustModal.series && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <Hash className="w-6 h-6 text-blue-600" />
              <h4 className="text-lg font-medium text-gray-900">
                Ajustar Correlativo
              </h4>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Serie: <span className="font-semibold">{adjustModal.series.series}</span>
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  Correlativo actual: <span className="font-mono font-semibold">{adjustModal.series.currentNumber}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo Correlativo
                </label>
                <input
                  type="number"
                  value={newCorrelative}
                  onChange={(e) => setNewCorrelative(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={adjustModal.series.currentNumber + 1}
                  max="99999999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Debe ser mayor a {adjustModal.series.currentNumber}
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    Solo puedes aumentar el correlativo, nunca disminuirlo. Úsalo solo en casos específicos como migración de datos.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setAdjustModal({ show: false });
                    setNewCorrelative('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAdjustCorrelative(adjustModal.series!)}
                  disabled={isLoading || parseInt(newCorrelative) <= adjustModal.series!.currentNumber}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Ajustando...' : 'Ajustar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}