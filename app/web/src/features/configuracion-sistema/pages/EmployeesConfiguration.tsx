// src/features/configuration/pages/EmployeesConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Building2,
  Search,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfigurationCard } from '../components/common/ConfigurationCard';
import { StatusIndicator } from '../components/common/StatusIndicator';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import type { Employee } from '../models/Employee';

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
type DocumentType = 'DNI' | 'CE' | 'PASSPORT';

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentType: DocumentType | '';
  documentNumber: string;
  position: string;
  department: string;
  establishmentId: string;
}

export function EmployeesConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { employees, establishments } = state;
  
  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | 'ALL'>('ALL');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: '',
    documentNumber: '',
    position: '',
    department: '',
    establishmentId: ''
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; employee?: Employee }>({
    show: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Mock roles data for UI functionality
  const roles = [
    { id: '1', name: 'Administrador', permissions: ['all'] },
    { id: '2', name: 'Vendedor', permissions: ['sales'] },
    { id: '3', name: 'Cajero', permissions: ['cashier'] }
  ];

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const fullName = `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         emp.personalInfo.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || emp.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Reset form
  const resetEmployeeForm = () => {
    setEmployeeFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      documentType: '',
      documentNumber: '',
      position: '',
      department: '',
      establishmentId: ''
    });
    setEditingEmployeeId(null);
    setShowEmployeeForm(false);
  };

  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEmployeeFormData({
      firstName: employee.personalInfo.firstName,
      lastName: employee.personalInfo.lastName,
      email: employee.personalInfo.email,
      phone: employee.personalInfo.phone || '',
      documentType: employee.personalInfo.documentType,
      documentNumber: employee.personalInfo.documentNumber,
      position: employee.employment.position,
      department: employee.employment.department,
      establishmentId: employee.employment.establishmentId
    });
    setEditingEmployeeId(employee.id);
    setShowEmployeeForm(true);
  };

  // Check duplicate email
  const isDuplicateEmail = (email: string) => {
    return employees.some(emp => 
      emp.personalInfo.email === email && emp.id !== editingEmployeeId
    );
  };

  // Handle submit employee
  const handleSubmitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDuplicateEmail(employeeFormData.email)) {
      alert('Ya existe un empleado con ese email');
      return;
    }

    setIsLoading(true);

    try {
      let updatedEmployees: Employee[];

      if (editingEmployeeId) {
        // Update existing
        updatedEmployees = employees.map(emp =>
          emp.id === editingEmployeeId
            ? {
                ...emp,
                personalInfo: {
                  ...emp.personalInfo,
                  firstName: employeeFormData.firstName,
                  lastName: employeeFormData.lastName,
                  fullName: `${employeeFormData.firstName} ${employeeFormData.lastName}`,
                  email: employeeFormData.email,
                  phone: employeeFormData.phone,
                  documentType: employeeFormData.documentType as DocumentType,
                  documentNumber: employeeFormData.documentNumber
                },
                employment: {
                  ...emp.employment,
                  position: employeeFormData.position,
                  department: employeeFormData.department,
                  establishmentId: employeeFormData.establishmentId
                },
                updatedAt: new Date()
              }
            : emp
        );
      } else {
        // Create new
        const newEmployee: Employee = {
          id: Date.now().toString(),
          code: `EMP${(employees.length + 1).toString().padStart(3, '0')}`,
          personalInfo: {
            firstName: employeeFormData.firstName,
            lastName: employeeFormData.lastName,
            fullName: `${employeeFormData.firstName} ${employeeFormData.lastName}`,
            documentType: employeeFormData.documentType as DocumentType,
            documentNumber: employeeFormData.documentNumber,
            email: employeeFormData.email,
            phone: employeeFormData.phone
          },
          employment: {
            position: employeeFormData.position,
            department: employeeFormData.department,
            establishmentId: employeeFormData.establishmentId,
            establishmentIds: [employeeFormData.establishmentId],
            hireDate: new Date(),
            employmentType: 'FULL_TIME',
            workSchedule: {
              mondayToFriday: {
                startTime: '08:00',
                endTime: '18:00'
              }
            }
          },
          systemAccess: {
            username: employeeFormData.email,
            email: employeeFormData.email,
            requiresPinForActions: false,
            roleIds: [],
            roles: [],
            permissions: [],
            loginAttempts: 0,
            isLocked: false,
            sessionTimeout: 30,
            maxConcurrentSessions: 1
          },
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          updatedBy: 'system'
        };
        
        updatedEmployees = [...employees, newEmployee];
      }

      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
      resetEmployeeForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async (employee: Employee) => {
    setIsLoading(true);

    try {
      const updatedEmployees = employees.filter(emp => emp.id !== employee.id);
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
      setDeleteModal({ show: false });
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle status
  const toggleEmployeeStatus = async (employee: Employee) => {
    const newStatus: EmployeeStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    const updatedEmployees = employees.map(emp =>
      emp.id === employee.id
        ? { ...emp, status: newStatus, updatedAt: new Date() }
        : emp
    );

    dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
  };

  // Get establishment name
  const getEstablishmentName = (establishmentId: string) => {
    const establishment = establishments.find(est => est.id === establishmentId);
    return establishment?.name || 'Desconocido';
  };

  // Get status config
  const getStatusConfig = (status: EmployeeStatus) => {
    const configs = {
      ACTIVE: { label: 'Activo', color: 'success' as const, icon: UserCheck },
      INACTIVE: { label: 'Inactivo', color: 'error' as const, icon: AlertCircle },
      SUSPENDED: { label: 'Suspendido', color: 'warning' as const, icon: AlertCircle },
      TERMINATED: { label: 'Terminado', color: 'error' as const, icon: AlertCircle }
    };
    return configs[status];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
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
              Empleados y Roles
            </h1>
            <p className="text-gray-600">
              Gestiona usuarios del sistema, roles y permisos por establecimiento
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowEmployeeForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Empleado</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Empleados ({employees.length})</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Roles ({roles.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {employees.filter(e => e.status === 'ACTIVE').length}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {employees.filter(e => e.status === 'INACTIVE').length}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Establecimientos</p>
                  <p className="text-2xl font-bold text-blue-600">{establishments.length}</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Employee Form Modal */}
          {showEmployeeForm && (
            <ConfigurationCard
              title={editingEmployeeId ? "Editar Empleado" : "Nuevo Empleado"}
              description={editingEmployeeId ? "Modifica los datos del empleado" : "Crea un nuevo empleado en el sistema"}
            >
              <form onSubmit={handleSubmitEmployee} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombres *
                    </label>
                    <input
                      type="text"
                      value={employeeFormData.firstName}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Juan Carlos"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellidos *
                    </label>
                    <input
                      type="text"
                      value={employeeFormData.lastName}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pérez López"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={employeeFormData.email}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="juan.perez@empresa.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={employeeFormData.phone}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="999 123 456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Documento *
                    </label>
                    <select
                      value={employeeFormData.documentType}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, documentType: e.target.value as DocumentType }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="DNI">DNI</option>
                      <option value="CE">Carné de Extranjería</option>
                      <option value="PASSPORT">Pasaporte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Documento *
                    </label>
                    <input
                      type="text"
                      value={employeeFormData.documentNumber}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345678"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cargo *
                    </label>
                    <input
                      type="text"
                      value={employeeFormData.position}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Vendedor, Cajero, etc."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento *
                    </label>
                    <input
                      type="text"
                      value={employeeFormData.department}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ventas, Administración, etc."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Establecimiento Principal *
                  </label>
                  <select
                    value={employeeFormData.establishmentId}
                    onChange={(e) => setEmployeeFormData(prev => ({ ...prev, establishmentId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar establecimiento</option>
                    {establishments.map(est => (
                      <option key={est.id} value={est.id}>{est.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetEmployeeForm}
                    className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isLoading ? 'Guardando...' : editingEmployeeId ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </ConfigurationCard>
          )}

          {/* Employee List */}
          <ConfigurationCard
            title="Lista de Empleados"
            description="Gestiona todos los empleados del sistema"
          >
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todos los estados</option>
                <option value="ACTIVE">Solo activos</option>
                <option value="INACTIVE">Solo inactivos</option>
                <option value="SUSPENDED">Suspendidos</option>
                <option value="TERMINATED">Terminados</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Empleado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contacto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cargo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Establecimiento</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => {
                    const statusConfig = getStatusConfig(employee.status);
                    return (
                      <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {employee.personalInfo.firstName.charAt(0)}{employee.personalInfo.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{employee.personalInfo.fullName}</h3>
                              <p className="text-sm text-gray-500">{employee.code}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{employee.personalInfo.email}</span>
                            </div>
                            {employee.personalInfo.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-600">{employee.personalInfo.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{employee.employment.position}</p>
                            <p className="text-sm text-gray-500">{employee.employment.department}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {getEstablishmentName(employee.employment.establishmentId)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <StatusIndicator
                            status={statusConfig.color}
                            label={statusConfig.label}
                            size="sm"
                          />
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => toggleEmployeeStatus(employee)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title={employee.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                            >
                              <UserCheck className={`w-5 h-5 ${employee.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`} />
                            </button>
                            
                            <button
                              onClick={() => handleEditEmployee(employee)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            
                            <button
                              onClick={() => setDeleteModal({ show: true, employee })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="mx-auto w-12 h-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No se encontraron empleados
                </h3>
                <p className="mt-2 text-gray-500">
                  {searchTerm || filterStatus !== 'ALL' 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Crea tu primer empleado para comenzar'
                  }
                </p>
                {!searchTerm && filterStatus === 'ALL' && (
                  <button
                    onClick={() => setShowEmployeeForm(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crear Empleado
                  </button>
                )}
              </div>
            )}
          </ConfigurationCard>
        </>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <ConfigurationCard
          title="Roles del Sistema"
          description="Gestiona los roles y permisos disponibles"
        >
          <div className="text-center py-12">
            <Shield className="mx-auto w-12 h-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Gestión de Roles
            </h3>
            <p className="mt-2 text-gray-500">
              La configuración de roles estará disponible próximamente
            </p>
          </div>
        </ConfigurationCard>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={() => deleteModal.employee && handleDeleteEmployee(deleteModal.employee)}
        title="Eliminar Empleado"
        message={`¿Estás seguro de que deseas eliminar al empleado "${deleteModal.employee?.personalInfo.fullName}"? Esta acción no se puede deshacer.`}
        type="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
        isLoading={isLoading}
      />
    </div>
  );
}