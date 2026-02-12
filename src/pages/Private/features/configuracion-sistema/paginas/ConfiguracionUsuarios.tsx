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
import { ModalConfirmacion } from '../components/comunes/ModalConfirmacion';
import { UsersList } from '../components/usuarios/ListaUsuarios';
import { UserForm } from '../components/usuarios/FormularioUsuario';
import { RolesList } from '../components/roles/ListaRoles';
import { CredentialsModal } from '../components/usuarios/ModalCredenciales';
import { SYSTEM_ROLES } from '../modelos/Role';
import type { User } from '../modelos/User';
import type { Role } from '../modelos/Role';
import { Button, PageHeader } from '@/contasis';

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

  const generateLocalUserId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `user-${Date.now()}`;
  };

  const generateLocalUserCode = () => {
    const nextIndex = users.length + 1;
    return `USR-${String(nextIndex).padStart(3, '0')}`;
  };

  // Reset form
  const resetUserForm = () => {
    setEditingUser(null);
    setShowUserForm(false);
  };

  // Handle create/edit user
  const handleSubmitUser = async (data: UserFormData) => {
    if (data.EstablecimientoIds.length === 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Split full name into first and last name
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];
      const primaryEstablecimientoId =
        data.EstablecimientoIds.length === 1 ? data.EstablecimientoIds[0] : undefined;

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
            documentType: data.documentType || undefined,
            documentNumber: data.documentNumber || undefined,
          },
          assignment: {
            ...editingUser.assignment,
            EstablecimientoId: primaryEstablecimientoId,
            EstablecimientoIds: data.EstablecimientoIds,
          },
          updatedAt: new Date(),
        };

        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      } else {
        // Create new user
        const newUser: User = {
          id: generateLocalUserId(),
          code: generateLocalUserCode(),
          personalInfo: {
            firstName,
            lastName,
            fullName: data.fullName,
            documentType: data.documentType || undefined,
            documentNumber: data.documentNumber || undefined,
            email: data.email,
            phone: data.phone,
          },
          assignment: {
            EstablecimientoId: primaryEstablecimientoId,
            EstablecimientoIds: data.EstablecimientoIds,
          },
          systemAccess: {
            username: data.email.split('@')[0],
            email: data.email,
            roleIds: [],
            roles: [],
            permissions: [],
            loginAttempts: 0,
            isLocked: false,
          },
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date(),
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
    } catch {
      return;
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
    } catch {
      return;
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
    } catch {
      return;
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
      const now = new Date();
      const selectedRoles: Role[] = SYSTEM_ROLES
        .filter((role) => selectedRoleIds.includes(role.id))
        .map((role) => ({
          id: role.id,
          name: role.name ?? '',
          description: role.description ?? '',
          type: role.type ?? 'SYSTEM',
          level: role.level ?? 'STAFF',
          permissions: role.permissions!,
          restrictions: role.restrictions ?? {},
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }));

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
    } catch {
      return;
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
    <div className="flex flex-col h-full">
      <PageHeader
        title="Configuración de Usuarios"
        actions={
          <div className="flex items-center gap-4">
            {activeTab === 'users' && (
              <Button
                onClick={() => setShowUserForm(true)}
                variant="primary"
                size="md"
                icon={<Plus className="w-5 h-5" />}
                iconPosition="left"
              >
                Nuevo Usuario
              </Button>
            )}
            <Button
              variant="secondary"
              icon={<ArrowLeft />}
              onClick={() => navigate('/configuracion')}
            >
              Volver
            </Button>
          </div>
        }
      />
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6 space-y-8">

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users'
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
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'roles'
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
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setRoleAssignmentModal({ show: false });
                  setSelectedRoleIds([]);
                  setRoleError('');
                  setCredentialsModal({ show: false });
                }}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveRoleAssignment}
                disabled={isLoading || selectedRoleIds.length === 0}
              >
                {isLoading ? 'Guardando...' : 'Asignar Roles'}
              </Button>
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
      <ModalConfirmacion
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
      </div>
    </div>
  );
}
