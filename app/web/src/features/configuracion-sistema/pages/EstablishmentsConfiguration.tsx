// src/features/configuration/pages/EstablishmentsConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Building,
  Search
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { StatusIndicator } from '../components/common/StatusIndicator';
import type { Establishment } from '../models/Establishment';

interface EstablishmentFormData {
  code: string;
  name: string;
  address: string;
  district: string;
  province: string;
  department: string;
  postalCode: string;
  phone: string;
  email: string;
  type: 'MAIN' | 'BRANCH' | 'WAREHOUSE' | 'OFFICE';
}

export function EstablishmentsConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { establishments } = state;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEstablishmentId, setEditingEstablishmentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<EstablishmentFormData>({
    code: '',
    name: '',
    address: '',
    district: '',
    province: '',
    department: '',
    postalCode: '',
    phone: '',
    email: '',
    type: 'BRANCH'
  });

  // Filter establishments
  const filteredEstablishments = establishments.filter(est => {
    const matchesSearch = est.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         est.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         est.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && est.isActive) ||
                         (filterStatus === 'inactive' && !est.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Generate next establishment code
  const generateNextCode = () => {
    const lastCode = establishments.length > 0 
      ? Math.max(...establishments.map(e => parseInt(e.code) || 0))
      : 0;
    return String(lastCode + 1).padStart(4, '0');
  };

  const handleNew = () => {
    setFormData({
      code: generateNextCode(),
      name: '',
      address: '',
      district: '',
      province: '',
      department: '',
      postalCode: '',
      phone: '',
      email: '',
      type: 'BRANCH'
    });
    setEditingEstablishmentId(null);
    setShowForm(true);
  };

  const handleEdit = (establishment: Establishment) => {
    setFormData({
      code: establishment.code,
      name: establishment.name,
      address: establishment.address,
      district: establishment.district,
      province: establishment.province,
      department: establishment.department,
      postalCode: establishment.postalCode || '',
      phone: establishment.phone || '',
      email: establishment.email || '',
      type: establishment.type
    });
    setEditingEstablishmentId(establishment.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let updatedEstablishments: Establishment[];

      if (editingEstablishmentId) {
        // Update existing
        updatedEstablishments = establishments.map(est =>
          est.id === editingEstablishmentId
            ? {
                ...est,
                ...formData,
                updatedAt: new Date()
              }
            : est
        );
      } else {
        // Create new - simplified version
        const newEstablishment: Establishment = {
          id: Date.now().toString(),
          ...formData,
          coordinates: undefined,
          businessHours: {},
          sunatConfiguration: {
            isRegistered: false
          },
          posConfiguration: undefined,
          inventoryConfiguration: {
            managesInventory: false,
            isWarehouse: false,
            allowNegativeStock: false,
            autoTransferStock: false
          },
          financialConfiguration: {
            handlesCash: true,
            defaultCurrencyId: '',
            acceptedCurrencies: [],
            defaultTaxId: '',
            bankAccounts: []
          },
          status: 'ACTIVE',
          isActive: true,
          isMainEstablishment: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        updatedEstablishments = [...establishments, newEstablishment];
      }

      dispatch({ type: 'SET_ESTABLISHMENTS', payload: updatedEstablishments });
      handleCancel();
    } catch (error) {
      console.error('Error saving establishment:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      name: '',
      address: '',
      district: '',
      province: '',
      department: '',
      postalCode: '',
      phone: '',
      email: '',
      type: 'BRANCH'
    });
    setEditingEstablishmentId(null);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const updatedEstablishments = establishments.filter(est => est.id !== id);
    dispatch({ type: 'SET_ESTABLISHMENTS', payload: updatedEstablishments });
  };

  const handleToggleStatus = (id: string) => {
    const updatedEstablishments = establishments.map(est =>
      est.id === id
        ? { ...est, isActive: !est.isActive, updatedAt: new Date() }
        : est
    );
    dispatch({ type: 'SET_ESTABLISHMENTS', payload: updatedEstablishments });
  };

  if (showForm) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {editingEstablishmentId ? 'Editar Establecimiento' : 'Nuevo Establecimiento'}
            </h1>
            <p className="text-gray-600">
              {editingEstablishmentId ? 'Modifica los datos del establecimiento' : 'Registra un nuevo establecimiento para tu empresa'}
            </p>
          </div>
        </div>

        {/* Form */}
        <ConfigurationCard
          title="Datos del Establecimiento"
          description="Información básica del establecimiento"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  maxLength={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Establecimiento <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="MAIN">Principal</option>
                  <option value="BRANCH">Sucursal</option>
                  <option value="WAREHOUSE">Almacén</option>
                  <option value="OFFICE">Oficina</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Establecimiento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distrito <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provincia <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código Postal
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEstablishmentId ? 'Actualizar' : 'Crear'} Establecimiento
              </button>
            </div>
          </form>
        </ConfigurationCard>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/configuracion')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Establecimientos
          </h1>
          <p className="text-gray-600">
            Gestiona las sucursales, almacenes y puntos de venta de tu empresa
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{establishments.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-gray-900">
                {establishments.filter(e => e.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactivos</p>
              <p className="text-2xl font-bold text-gray-900">
                {establishments.filter(e => !e.isActive).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Principales</p>
              <p className="text-2xl font-bold text-gray-900">
                {establishments.filter(e => e.isMainEstablishment).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar establecimientos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Solo activos</option>
            <option value="inactive">Solo inactivos</option>
          </select>
        </div>

        <button
          onClick={handleNew}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Establecimiento
        </button>
      </div>

      {/* Establishments List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredEstablishments.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' 
                ? 'No se encontraron establecimientos' 
                : 'No hay establecimientos registrados'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== 'all'
                ? 'Intenta cambiar los filtros de búsqueda'
                : 'Comienza registrando tu primer establecimiento'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button
                onClick={handleNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Establecimiento
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEstablishments.map((establishment) => (
              <div key={establishment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {establishment.name}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {establishment.code}
                      </span>
                      <StatusIndicator
                        status={establishment.isActive ? 'success' : 'error'}
                        label={establishment.isActive ? 'Activo' : 'Inactivo'}
                      />
                      {establishment.isMainEstablishment && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          Principal
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">
                      {establishment.address}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>{establishment.district}, {establishment.province}</span>
                      <span>{establishment.department}</span>
                      <span className="capitalize">{establishment.type.toLowerCase()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEdit(establishment)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleToggleStatus(establishment.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        establishment.isActive 
                          ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
                          : 'text-green-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={establishment.isActive ? 'Desactivar' : 'Activar'}
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(establishment.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}