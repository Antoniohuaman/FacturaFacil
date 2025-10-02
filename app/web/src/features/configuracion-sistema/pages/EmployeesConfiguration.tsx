// src/features/configuration/pages/EmployeesConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { EmployeesList } from '../components/employees/EmployeesList';
import { EmployeeForm } from '../components/employees/EmployeeForm';
import { RolesList } from '../components/roles/RolesList';
import { CredentialsModal } from '../components/employees/CredentialsModal';
import { SYSTEM_ROLES } from '../models/Role';
import type { Employee } from '../models/Employee';
import type { Role } from '../models/Role';

// Modal for Role Assignment
import RoleAssignment from '../components/employees/RoleAssignment';

type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';

interface EmployeeFormData {
  fullName: string;
  email: string;
  phone: string;
  documentType: 'DNI' | 'CE' | 'PASSPORT' | '';
  documentNumber: string;
  establishmentIds: string[];
  password: string;
  requirePasswordChange: boolean;
}

export function EmployeesConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { employees, establishments } = state;

  const [activeTab, setActiveTab] = useState<'employees' | 'roles'>('employees');
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; employee?: Employee }>({
    show: false
  });
  const [roleAssignmentModal, setRoleAssignmentModal] = useState<{ show: boolean; employee?: Employee }>({
    show: false
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{
    show: boolean;
    employee?: Employee;
    credentials?: {
      fullName: string;
      email: string;
      username: string;
      password: string;
    };
  }>({ show: false });

  // Get existing emails for validation
  const existingEmails = employees
    .filter(emp => emp.id !== editingEmployee?.id)
    .map(emp => emp.personalInfo.email.toLowerCase());

  // Reset form
  const resetEmployeeForm = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  // Handle create/edit employee
  const handleSubmitEmployee = async (data: EmployeeFormData) => {
    setIsLoading(true);

    try {
      // Split full name into first and last name
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      if (editingEmployee) {
        // Update existing employee
        const updatedEmployee: Employee = {
          ...editingEmployee,
          personalInfo: {
            ...editingEmployee.personalInfo,
            firstName,
            lastName,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            documentType: data.documentType || editingEmployee.personalInfo.documentType,
            documentNumber: data.documentNumber || editingEmployee.personalInfo.documentNumber,
          },
          employment: {
            ...editingEmployee.employment,
            establishmentIds: data.establishmentIds.length > 0
              ? data.establishmentIds
              : [editingEmployee.employment.establishmentId],
          },
          updatedAt: new Date(),
        };

        dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
      } else {
        // Create new employee
        const newEmployee: Employee = {
          id: `emp-${Date.now()}`,
          code: `EMP${String(employees.length + 1).padStart(3, '0')}`,
          personalInfo: {
            firstName,
            lastName,
            fullName: data.fullName,
            documentType: data.documentType || 'DNI',
            documentNumber: data.documentNumber || '',
            email: data.email,
            phone: data.phone,
          },
          employment: {
            position: 'Empleado', // Default position
            department: 'General', // Default department
            establishmentId: data.establishmentIds[0] || establishments[0]?.id || 'est-1',
            establishmentIds: data.establishmentIds.length > 0
              ? data.establishmentIds
              : [establishments[0]?.id || 'est-1'],
            hireDate: new Date(),
            employmentType: 'FULL_TIME',
            workSchedule: {
              mondayToFriday: {
                startTime: '09:00',
                endTime: '18:00',
              },
            },
          },
          systemAccess: {
            username: data.email.split('@')[0],
            email: data.email,
            password: data.password, // Note: In production, this should be hashed on the backend
            requiresPasswordChange: data.requirePasswordChange,
            requiresPinForActions: false,
            roleIds: [],
            roles: [],
            permissions: [],
            loginAttempts: 0,
            isLocked: false,
            sessionTimeout: 30,
            maxConcurrentSessions: 1,
          },
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system',
          updatedBy: 'system',
        };

        dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });

        // Open role assignment modal first, then credentials
        setRoleAssignmentModal({ show: true, employee: newEmployee });
        setSelectedRoleIds([]);

        // Store credentials for later display
        setCredentialsModal({
          show: false,
          employee: newEmployee,
          credentials: {
            fullName: data.fullName,
            email: data.email,
            username: data.email.split('@')[0],
            password: data.password
          }
        });
      }

      resetEmployeeForm();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit employee
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  // Handle delete employee
  const handleDeleteEmployee = async (employee: Employee) => {
    setIsLoading(true);

    try {
      dispatch({ type: 'DELETE_EMPLOYEE', payload: employee.id });
      setDeleteModal({ show: false });
    } catch (error) {
      console.error('Error deleting employee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle change employee status
  const handleChangeStatus = async (employee: Employee, newStatus: EmployeeStatus, reason?: string) => {
    setIsLoading(true);

    try {
      const updatedEmployee: Employee = {
        ...employee,
        status: newStatus,
        notes: reason || employee.notes,
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
    } catch (error) {
      console.error('Error changing employee status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle assign role
  const handleAssignRole = (employee: Employee) => {
    setRoleAssignmentModal({ show: true, employee });
    setSelectedRoleIds(employee.systemAccess.roleIds);
    setRoleError('');
  };

  // Handle save role assignment
  const handleSaveRoleAssignment = () => {
    if (!roleAssignmentModal.employee) return;

    if (selectedRoleIds.length === 0) {
      setRoleError('Debes seleccionar al menos un rol');
      return;
    }

    setIsLoading(true);

    try {
      // Map roleIds to actual Role objects
      const selectedRoles: Role[] = SYSTEM_ROLES
        .map((role, index) => {
          if (selectedRoleIds.includes(`role-${index + 1}`)) {
            return {
              ...role,
              id: `role-${index + 1}`,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: 'system',
              updatedBy: 'system',
            } as Role;
          }
          return null;
        })
        .filter((role): role is Role => role !== null);

      const updatedEmployee: Employee = {
        ...roleAssignmentModal.employee,
        systemAccess: {
          ...roleAssignmentModal.employee.systemAccess,
          roleIds: selectedRoleIds,
          roles: selectedRoles,
        },
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
      setRoleAssignmentModal({ show: false });
      setSelectedRoleIds([]);
      setRoleError('');

      // Show credentials modal if this was a new employee
      if (credentialsModal.credentials && credentialsModal.employee?.id === updatedEmployee.id) {
        setCredentialsModal({
          ...credentialsModal,
          show: true,
          employee: updatedEmployee,
        });
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove establishment from employee
  const handleRemoveEstablishment = (employee: Employee, establishmentId: string) => {
    // Remove establishment from employee's list
    const updatedEstablishmentIds = employee.employment.establishmentIds.filter(
      id => id !== establishmentId
    );

    const updatedEmployee: Employee = {
      ...employee,
      employment: {
        ...employee.employment,
        establishmentIds: updatedEstablishmentIds,
      },
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
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

        {activeTab === 'employees' && (
          <button
            onClick={() => setShowEmployeeForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Empleado</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'roles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Roles ({SYSTEM_ROLES.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <EmployeesList
          employees={employees}
          roles={SYSTEM_ROLES as Role[]}
          establishments={establishments}
          onEdit={handleEditEmployee}
          onDelete={(employee) => setDeleteModal({ show: true, employee })}
          onChangeStatus={handleChangeStatus}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveEstablishment}
          onCreate={() => setShowEmployeeForm(true)}
          isLoading={isLoading}
        />
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <RolesList
          roles={SYSTEM_ROLES}
          employees={employees}
          isLoading={isLoading}
        />
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <EmployeeForm
          employee={editingEmployee || undefined}
          establishments={establishments}
          existingEmails={existingEmails}
          onSubmit={handleSubmitEmployee}
          onCancel={resetEmployeeForm}
          isLoading={isLoading}
        />
      )}

      {/* Role Assignment Modal */}
      {roleAssignmentModal.show && roleAssignmentModal.employee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Asignar Roles - {roleAssignmentModal.employee.personalInfo.fullName}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona los roles que tendrá este empleado en el sistema
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <RoleAssignment
                selectedRoleIds={selectedRoleIds}
                onChange={setSelectedRoleIds}
                error={roleError}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setRoleAssignmentModal({ show: false });
                  setSelectedRoleIds([]);
                  setRoleError('');
                }}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoleAssignment}
                disabled={isLoading || selectedRoleIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Guardando...' : 'Asignar Roles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal */}
      {credentialsModal.show && credentialsModal.credentials && credentialsModal.employee && (
        <CredentialsModal
          isOpen={credentialsModal.show}
          onClose={() => setCredentialsModal({ show: false })}
          credentials={credentialsModal.credentials}
          employee={credentialsModal.employee}
          establishments={establishments}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={() => deleteModal.employee && handleDeleteEmployee(deleteModal.employee)}
        title="Eliminar Empleado"
        message={
          deleteModal.employee?.hasTransactions
            ? `No puedes eliminar a "${deleteModal.employee?.personalInfo.fullName}" porque tiene transacciones registradas en el sistema. En su lugar, puedes inhabilitarlo para bloquear su acceso.`
            : `¿Estás seguro de que deseas eliminar permanentemente a "${deleteModal.employee?.personalInfo.fullName}"? Esta acción no se puede deshacer y eliminará todos sus datos del sistema.`
        }
        type="danger"
        confirmText={deleteModal.employee?.hasTransactions ? "Entendido" : "Eliminar"}
        cancelText="Cancelar"
        isLoading={isLoading}
      />
    </div>
  );
}
