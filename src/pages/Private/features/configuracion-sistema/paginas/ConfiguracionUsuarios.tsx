// src/features/configuration/pages/UsersConfiguration.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  ArrowLeft,
  Shield
} from 'lucide-react';
import { useConfigurationContext } from '../contexto/ContextoConfiguracion';
import { ConfirmationModal } from '../components/comunes/ModalConfirmacion';
import { UsersList } from '../components/usuarios/ListaUsuarios';
import { UserForm } from '../components/usuarios/FormularioUsuario';
import { RolesList } from '../components/roles/ListaRoles';
import { CredentialsModal } from '../components/usuarios/ModalCredenciales';
import { SYSTEM_ROLES } from '../modelos/Role';
import type { User } from '../modelos/User';
import type { Role } from '../modelos/Role';

// Modal for Role Assignment
import RoleAssignment from '../components/usuarios/AsignacionRol';

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';

interface UserFormData {
  fullName: string;
  email: string;
  phone: string;
  documentType: 'DNI' | 'CE' | 'PASSPORT' | '';
  documentNumber: string;
  EstablecimientoIds: string[];
  password: string;
  requirePasswordChange: boolean;
}

export function UsersConfiguration() {
  const navigate = useNavigate();
  const { state, dispatch } = useConfigurationContext();
  const { users, Establecimientos } = state;

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; user?: User }>({
    show: false
  });
  const [roleAssignmentModal, setRoleAssignmentModal] = useState<{ show: boolean; user?: User }>(
    {
      show: false
    }
  );
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roleError, setRoleError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{
    show: boolean;
    user?: User;
    credentials?: {
      fullName: string;
      email: string;
      username: string;
      password: string;
    };
  }>({ show: false });

  // Get existing emails for validation
  const existingEmails = users
    .filter(user => user.id !== editingUser?.id)
    .map(user => user.personalInfo.email.toLowerCase());

  // Reset form
  const resetUserForm = () => {
    setEditingUser(null);
    setShowUserForm(false);
  };

  // Handle create/edit user
  const handleSubmitUser = async (data: UserFormData) => {
    setIsLoading(true);

    try {
      // Split full name into first and last name
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      if (editingUser) {
        // Update existing user
        const updatedUser: User = {
          ...editingUser,
          personalInfo: {
            ...editingUser.personalInfo,
            firstName,
            lastName,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            documentType: data.documentType || editingUser.personalInfo.documentType,
            documentNumber: data.documentNumber || editingUser.personalInfo.documentNumber,
          },
          assignment: {
            ...editingUser.assignment,
            EstablecimientoIds: data.EstablecimientoIds.length > 0
              ? data.EstablecimientoIds
              : [editingUser.assignment.EstablecimientoId],
          },
          updatedAt: new Date(),
        };

        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      } else {
        // Create new user
        const newUser: User = {
          id: `emp-${Date.now()}`,
          code: `EMP${String(users.length + 1).padStart(3, '0')}`,
          personalInfo: {
            firstName,
            lastName,
            fullName: data.fullName,
            documentType: data.documentType || 'DNI',
            documentNumber: data.documentNumber || '',
            email: data.email,
            phone: data.phone,
          },
          assignment: {
            position: 'Usuario', // Default position
            department: 'General', // Default department
            EstablecimientoId: data.EstablecimientoIds[0] || Establecimientos[0]?.id || 'est-1',
            EstablecimientoIds: data.EstablecimientoIds.length > 0
              ? data.EstablecimientoIds
              : [Establecimientos[0]?.id || 'est-1'],
            hireDate: new Date(),
            assignmentType: 'FULL_TIME',
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

        dispatch({ type: 'ADD_USER', payload: newUser });

        // Open role assignment modal first, then credentials
        setRoleAssignmentModal({ show: true, user: newUser });
        setSelectedRoleIds([]);

        // Store credentials for later display
        setCredentialsModal({
          show: false,
          user: newUser,
          credentials: {
            fullName: data.fullName,
            email: data.email,
            username: data.email.split('@')[0],
            password: data.password
          }
        });
      }

      resetUserForm();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  // Handle delete user
  const handleDeleteUser = async (user: User) => {
    setIsLoading(true);

    try {
      dispatch({ type: 'DELETE_USER', payload: user.id });
      setDeleteModal({ show: false });
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle change user status
  const handleChangeStatus = async (user: User, newStatus: UserStatus, reason?: string) => {
    setIsLoading(true);

    try {
      const updatedUser: User = {
        ...user,
        status: newStatus,
        notes: reason || user.notes,
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
    } catch (error) {
      console.error('Error changing user status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle assign role
  const handleAssignRole = (user: User) => {
    setRoleAssignmentModal({ show: true, user });
    setSelectedRoleIds(user.systemAccess.roleIds);
    setRoleError('');
  };

  // Handle save role assignment
  const handleSaveRoleAssignment = () => {
    if (!roleAssignmentModal.user) return;

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

      const updatedUser: User = {
        ...roleAssignmentModal.user,
        systemAccess: {
          ...roleAssignmentModal.user.systemAccess,
          roleIds: selectedRoleIds,
          roles: selectedRoles,
        },
        updatedAt: new Date(),
      };

      dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      setRoleAssignmentModal({ show: false });
      setSelectedRoleIds([]);
      setRoleError('');

      // Show credentials modal if this was a new user
      if (credentialsModal.credentials && credentialsModal.user?.id === updatedUser.id) {
        setCredentialsModal({
          ...credentialsModal,
          show: true,
          user: updatedUser,
        });
      }
    } catch (error) {
      console.error('Error assigning roles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle remove Establecimiento from user
  const handleRemoveEstablecimiento = (user: User, EstablecimientoId: string) => {
    // Remove Establecimiento from user's list
    const updatedEstablecimientoIds = user.assignment.EstablecimientoIds.filter(
      id => id !== EstablecimientoId
    );

    const updatedUser: User = {
      ...user,
      assignment: {
        ...user.assignment,
        EstablecimientoIds: updatedEstablecimientoIds,
      },
      updatedAt: new Date(),
    };

    dispatch({ type: 'UPDATE_USER', payload: updatedUser });
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
              Usuarios y Roles
            </h1>
            <p className="text-gray-600">
              Gestiona usuarios del sistema, roles y permisos por establecimiento
            </p>
          </div>
        </div>

        {activeTab === 'users' && (
          <button
            onClick={() => setShowUserForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Usuario</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Usuarios ({users.length})</span>
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

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UsersList
          users={users}
          roles={SYSTEM_ROLES as Role[]}
          Establecimientos={Establecimientos}
          onEdit={handleEditUser}
          onDelete={(user) => setDeleteModal({ show: true, user })}
          onChangeStatus={handleChangeStatus}
          onAssignRole={handleAssignRole}
          onRemoveRole={handleRemoveEstablecimiento}
          onCreate={() => setShowUserForm(true)}
          isLoading={isLoading}
        />
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <RolesList
          roles={SYSTEM_ROLES}
          users={users}
          isLoading={isLoading}
        />
      )}

      {/* User Form Modal */}
      {showUserForm && (
        <UserForm
          user={editingUser || undefined}
          Establecimientos={Establecimientos}
          existingEmails={existingEmails}
          onSubmit={handleSubmitUser}
          onCancel={resetUserForm}
          isLoading={isLoading}
        />
      )}

      {/* Role Assignment Modal */}
      {roleAssignmentModal.show && roleAssignmentModal.user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Asignar Roles - {roleAssignmentModal.user.personalInfo.fullName}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona los roles que tendrá este usuario en el sistema
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
      {credentialsModal.show && credentialsModal.credentials && credentialsModal.user && (
        <CredentialsModal
          isOpen={credentialsModal.show}
          onClose={() => setCredentialsModal({ show: false })}
          credentials={credentialsModal.credentials}
          user={credentialsModal.user}
          Establecimientos={Establecimientos}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false })}
        onConfirm={() => deleteModal.user && handleDeleteUser(deleteModal.user)}
        title="Eliminar Usuario"
        message={
          deleteModal.user?.hasTransactions
            ? `No puedes eliminar a "${deleteModal.user?.personalInfo.fullName}" porque tiene transacciones registradas en el sistema. En su lugar, puedes inhabilitarlo para bloquear su acceso.`
            : `¿Estás seguro de que deseas eliminar permanentemente a "${deleteModal.user?.personalInfo.fullName}"? Esta acción no se puede deshacer y eliminará todos sus datos del sistema.`
        }
        type="danger"
        confirmText={deleteModal.user?.hasTransactions ? "Entendido" : "Eliminar"}
        cancelText="Cancelar"
        isLoading={isLoading}
      />
    </div>
  );
}
