import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { 
  User, 
  CreateUserRequest, 
  UpdateUserRequest, 
  UserSummary 
} from '../models/User';
import type { Role } from '../models/Role';
import { SYSTEM_ROLES } from '../models/Role';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadUsers: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<User>;
  updateUser: (id: string, data: UpdateUserRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  activateUser: (id: string) => Promise<void>;
  suspendUser: (id: string, reason?: string) => Promise<void>;
  terminateUser: (id: string, reason?: string) => Promise<void>;
  
  // Getters
  getUser: (id: string) => User | undefined;
  getUsersByEstablishment: (establishmentId: string) => User[];
  getUsersByRole: (roleId: string) => User[];
  getActiveUsers: () => User[];
  getUserSummaries: () => UserSummary[];
  
  // Authentication & Sessions
  authenticateUser: (username: string, pin?: string) => Promise<User | null>;
  updateLastLogin: (userId: string) => Promise<void>;
  lockUser: (userId: string, reason?: string) => Promise<void>;
  unlockUser: (userId: string) => Promise<void>;
  
  // Validation
  validateUserCode: (code: string, excludeId?: string) => Promise<boolean>;
  validateUsername: (username: string, excludeId?: string) => Promise<boolean>;
  validateUserData: (data: CreateUserRequest | UpdateUserRequest) => Promise<string[]>;
  
  // Statistics
  getUserStats: () => {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    terminated: number;
    byEstablishment: Record<string, number>;
    byRole: Record<string, number>;
  };
}

// Mock users data
const MOCK_USERS: User[] = [
  {
    id: 'emp-1',
    code: 'EMP001',
    
    personalInfo: {
      firstName: 'Juan Carlos',
      lastName: 'Pérez González',
      fullName: 'Juan Carlos Pérez González',
      documentType: 'DNI',
      documentNumber: '12345678',
      email: 'juan.perez@empresademo.com',
      phone: '987654321',
      address: 'Av. Los Olivos 123, Lima',
      birthDate: new Date('1990-05-15'),
      gender: 'M',
      emergencyContact: {
        name: 'María Pérez',
        phone: '987654322',
        relationship: 'Esposa',
      },
    },
    
    assignment: {
      position: 'Gerente de Ventas',
      department: 'Ventas',
      establishmentId: 'est-1',
      establishmentIds: ['est-1', 'est-2'],
      hireDate: new Date('2025-01-01'),
      assignmentType: 'FULL_TIME',
      salary: 3500.00,
      commissionRate: 5.0,
      workSchedule: {
        mondayToFriday: {
          startTime: '09:00',
          endTime: '18:00',
          breakStartTime: '13:00',
          breakEndTime: '14:00',
        },
        saturday: {
          startTime: '09:00',
          endTime: '13:00',
          breakStartTime: '',
          breakEndTime: '',
        },
      },
    },
    
    systemAccess: {
      username: 'juan.perez',
      email: 'juan.perez@empresademo.com',
      pin: '1234',
      requiresPinForActions: true,
      roleIds: ['role-2'], // Manager role
      roles: [SYSTEM_ROLES[1] as Role], // Manager
      permissions: [],
      lastLogin: new Date(),
      loginAttempts: 0,
      isLocked: false,
      sessionTimeout: 60,
      maxConcurrentSessions: 2,
    },
    
    status: 'ACTIVE',
    avatar: undefined,
    notes: 'Usuario destacado con excelente rendimiento',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    createdBy: 'admin',
    updatedBy: 'admin',
  },
  {
    id: 'emp-2',
    code: 'EMP002',
    
    personalInfo: {
      firstName: 'Ana María',
      lastName: 'Rodriguez Silva',
      fullName: 'Ana María Rodriguez Silva',
      documentType: 'DNI',
      documentNumber: '87654321',
      email: 'ana.rodriguez@empresademo.com',
      phone: '987654323',
      address: 'Jr. Las Flores 456, Lima',
      birthDate: new Date('1985-08-22'),
      gender: 'F',
    },
    
    assignment: {
      position: 'Vendedora Senior',
      department: 'Ventas',
      establishmentId: 'est-1',
      establishmentIds: ['est-1'],
      hireDate: new Date('2025-01-05'),
      assignmentType: 'FULL_TIME',
      salary: 1800.00,
      commissionRate: 3.0,
      workSchedule: {
        mondayToFriday: {
          startTime: '09:00',
          endTime: '18:00',
          breakStartTime: '13:00',
          breakEndTime: '14:00',
        },
      },
    },
    
    systemAccess: {
      username: 'ana.rodriguez',
      email: 'ana.rodriguez@empresademo.com',
      pin: '5678',
      requiresPinForActions: true,
      roleIds: ['role-3'], // User role
      roles: [SYSTEM_ROLES[2] as Role], // Vendedor
      permissions: [],
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      loginAttempts: 0,
      isLocked: false,
      sessionTimeout: 60,
      maxConcurrentSessions: 1,
    },
    
    status: 'ACTIVE',
    avatar: undefined,
    notes: '',
    createdAt: new Date('2025-01-05'),
    updatedAt: new Date(),
    createdBy: 'juan.perez',
    updatedBy: 'juan.perez',
  },
  {
    id: 'emp-3',
    code: 'EMP003',
    
    personalInfo: {
      firstName: 'Luis Miguel',
      lastName: 'Torres Mendoza',
      fullName: 'Luis Miguel Torres Mendoza',
      documentType: 'DNI',
      documentNumber: '11223344',
      email: 'luis.torres@empresademo.com',
      phone: '987654324',
      address: 'Av. Universitaria 789, Lima',
      birthDate: new Date('1992-12-10'),
      gender: 'M',
    },
    
    assignment: {
      position: 'Vendedor',
      department: 'Ventas',
      establishmentId: 'est-2',
      establishmentIds: ['est-2'],
      hireDate: new Date('2025-01-10'),
      assignmentType: 'PART_TIME',
      salary: 1200.00,
      commissionRate: 2.5,
      workSchedule: {
        mondayToFriday: {
          startTime: '14:00',
          endTime: '20:00',
          breakStartTime: '',
          breakEndTime: '',
        },
      },
    },
    
    systemAccess: {
      username: 'luis.torres',
      email: 'luis.torres@empresademo.com',
      requiresPinForActions: false,
      roleIds: ['role-3'], // User role
      roles: [SYSTEM_ROLES[2] as Role], // Vendedor
      permissions: [],
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      loginAttempts: 0,
      isLocked: false,
      sessionTimeout: 30,
      maxConcurrentSessions: 1,
    },
    
    status: 'ACTIVE',
    avatar: undefined,
    notes: 'Usuario en período de prueba',
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date(),
    createdBy: 'juan.perez',
    updatedBy: 'juan.perez',
  },
];

export function useUsers(): UseUsersReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const users = state.users;

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      dispatch({ type: 'SET_USERS', payload: MOCK_USERS });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Generate user code
  const generateUserCode = useCallback(() => {
    const maxCode = users.reduce((max, user) => {
      const codeNumber = parseInt(user.code.replace(/\D/g, ''), 10) || 0;
      return Math.max(max, codeNumber);
    }, 0);

    return `EMP${String(maxCode + 1).padStart(3, '0')}`;
  }, [users]);

  // Validate user code uniqueness
  const validateUserCode = useCallback(
    async (code: string, excludeId?: string): Promise<boolean> => {
      // Simulate API validation
      await new Promise(resolve => setTimeout(resolve, 300));

      const exists = users.some(user => user.code === code && user.id !== excludeId);

      return !exists;
    },
    [users],
  );

  // Validate username uniqueness
  const validateUsername = useCallback(
    async (username: string, excludeId?: string): Promise<boolean> => {
      // Simulate API validation
      await new Promise(resolve => setTimeout(resolve, 300));

      const exists = users.some(
        user => user.systemAccess.username === username && user.id !== excludeId,
      );

      return !exists;
    },
    [users],
  );

  // Validate user data
  const validateUserData = useCallback(
    async (data: CreateUserRequest | UpdateUserRequest): Promise<string[]> => {
      const errors: string[] = [];

      // Personal info validations
      if (data.personalInfo) {
        const { personalInfo } = data;

        if (!personalInfo.firstName?.trim()) {
          errors.push('El nombre es requerido');
        }

        if (!personalInfo.lastName?.trim()) {
          errors.push('El apellido es requerido');
        }

        if (!personalInfo.documentNumber?.trim()) {
          errors.push('El número de documento es requerido');
        } else {
          const docNumber = personalInfo.documentNumber;
          const docType = personalInfo.documentType;

          if (docType === 'DNI' && (docNumber.length !== 8 || !/^\d+$/.test(docNumber))) {
            errors.push('El DNI debe tener 8 dígitos');
          } else if (docType === 'CE' && docNumber.length < 6) {
            errors.push('El carné de extranjería debe tener al menos 6 caracteres');
          }
        }

        if (!personalInfo.email?.trim()) {
          errors.push('El email es requerido');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
          errors.push('El email no tiene un formato válido');
        }

        if (personalInfo.phone && !/^\d{9}$/.test(personalInfo.phone.replace(/\D/g, ''))) {
          // Optional: validate phone format
        }
      }

      // Assignment validations
      if (data.assignment) {
        const { assignment } = data;

        if (!assignment.position?.trim()) {
          errors.push('El cargo es requerido');
        }

        if (!assignment.department?.trim()) {
          errors.push('El departamento es requerido');
        }

        if (!assignment.establishmentId?.trim()) {
          errors.push('El establecimiento principal es requerido');
        }

        if (!assignment.establishmentIds || assignment.establishmentIds.length === 0) {
          errors.push('Debe seleccionar al menos un establecimiento');
        }

        if (assignment.salary && assignment.salary < 0) {
          errors.push('El salario no puede ser negativo');
        }

        if (
          assignment.commissionRate &&
          (assignment.commissionRate < 0 || assignment.commissionRate > 100)
        ) {
          errors.push('El porcentaje de comisión debe estar entre 0 y 100');
        }
      }

      // System access validations
      if (data.systemAccess) {
        const { systemAccess } = data;

        if (!systemAccess.username?.trim()) {
          errors.push('El nombre de usuario es requerido');
        } else if (systemAccess.username.length < 3) {
          errors.push('El nombre de usuario debe tener al menos 3 caracteres');
        }

        if (!systemAccess.roleIds || systemAccess.roleIds.length === 0) {
          errors.push('Debe asignar al menos un rol');
        }

        if (systemAccess.pin && (systemAccess.pin.length < 4 || systemAccess.pin.length > 6)) {
          errors.push('El PIN debe tener entre 4 y 6 dígitos');
        }

        if (
          systemAccess.sessionTimeout &&
          (systemAccess.sessionTimeout < 5 || systemAccess.sessionTimeout > 480)
        ) {
          errors.push('El tiempo de sesión debe estar entre 5 y 480 minutos');
        }

        if (
          systemAccess.maxConcurrentSessions &&
          (systemAccess.maxConcurrentSessions < 1 || systemAccess.maxConcurrentSessions > 5)
        ) {
          errors.push('Las sesiones concurrentes deben estar entre 1 y 5');
        }
      }

      return errors;
    },
    [],
  );

  // Get user by ID
  const getUser = useCallback(
    (id: string): User | undefined => users.find(user => user.id === id),
    [users],
  );

  // Get users by establishment
  const getUsersByEstablishment = useCallback(
    (establishmentId: string): User[] =>
      users.filter(
        user =>
          user.assignment.establishmentIds.includes(establishmentId) &&
          user.status === 'ACTIVE',
      ),
    [users],
  );

  // Get users by role
  const getUsersByRole = useCallback(
    (roleId: string): User[] =>
      users.filter(
        user => user.systemAccess.roleIds.includes(roleId) && user.status === 'ACTIVE',
      ),
    [users],
  );

  // Get active users
  const getActiveUsers = useCallback(
    (): User[] => users.filter(user => user.status === 'ACTIVE'),
    [users],
  );

  // Get user summaries
  const getUserSummaries = useCallback(
    (): UserSummary[] =>
      users.map(user => ({
        id: user.id,
        code: user.code,
        fullName: user.personalInfo.fullName,
        position: user.assignment.position,
        establishment: `Establecimiento ${user.assignment.establishmentId}`, // In real app, get name
        status: user.status,
        lastLogin: user.systemAccess.lastLogin,
        avatar: user.avatar,
      })),
    [users],
  );

  // Create user
  const createUser = useCallback(
    async (data: CreateUserRequest): Promise<User> => {
      setLoading(true);
      setError(null);

      try {
        // Validate data
        const validationErrors = await validateUserData(data);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }

        // Check code uniqueness
        const code = data.code || generateUserCode();
        const isCodeUnique = await validateUserCode(code);
        if (!isCodeUnique) {
          throw new Error('El código del usuario ya existe');
        }

        // Check username uniqueness
        const isUsernameUnique = await validateUsername(data.systemAccess.username);
        if (!isUsernameUnique) {
          throw new Error('El nombre de usuario ya existe');
        }

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Create roles array from roleIds (in real app, fetch from API)
        const roles = SYSTEM_ROLES.filter((_, index) =>
          data.systemAccess.roleIds.includes(`role-${index + 1}`),
        ) as Role[];

        const newUser: User = {
          id: `emp-${Date.now()}`,
          code,
          personalInfo: {
            ...data.personalInfo,
            fullName: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`,
          },
          assignment: {
            ...data.assignment,
            workSchedule: {
              mondayToFriday: {
                startTime: '09:00',
                endTime: '18:00',
              },
            },
          },
          systemAccess: {
            ...data.systemAccess,
            email: data.personalInfo.email,
            roles,
            permissions: [], // Will be calculated from roles
            loginAttempts: 0,
            isLocked: false,
            sessionTimeout: data.systemAccess.sessionTimeout || 30,
            maxConcurrentSessions: data.systemAccess.maxConcurrentSessions || 1,
          },
          status: 'ACTIVE',
          notes: data.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'current-user',
          updatedBy: 'current-user',
        };

        dispatch({ type: 'ADD_USER', payload: newUser });

        return newUser;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error creating user');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, generateUserCode, validateUserCode, validateUserData, validateUsername],
  );

  // Update user
  const updateUser = useCallback(
    async (id: string, data: UpdateUserRequest): Promise<User> => {
      const existingUser = getUser(id);
      if (!existingUser) {
        throw new Error('User not found');
      }

      setLoading(true);
      setError(null);

      try {
        // Validate data
        const validationErrors = await validateUserData(data);
        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(', '));
        }

        // Check code uniqueness if changed
        if (data.code && data.code !== existingUser.code) {
          const isCodeUnique = await validateUserCode(data.code, id);
          if (!isCodeUnique) {
            throw new Error('El código del usuario ya existe');
          }
        }

        // Check username uniqueness if changed
        if (
          data.systemAccess?.username &&
          data.systemAccess.username !== existingUser.systemAccess.username
        ) {
          const isUsernameUnique = await validateUsername(data.systemAccess.username, id);
          if (!isUsernameUnique) {
            throw new Error('El nombre de usuario ya existe');
          }
        }

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Update roles if roleIds changed
        let updatedRoles = existingUser.systemAccess.roles;
        if (data.systemAccess?.roleIds) {
          updatedRoles = SYSTEM_ROLES.filter((_, index) =>
            data.systemAccess!.roleIds.includes(`role-${index + 1}`),
          ) as Role[];
        }

        const updatedUser: User = {
          ...existingUser,
          ...data,
          id,
          personalInfo: {
            ...existingUser.personalInfo,
            ...data.personalInfo,
            fullName:
              data.personalInfo?.firstName && data.personalInfo?.lastName
                ? `${data.personalInfo.firstName} ${data.personalInfo.lastName}`
                : existingUser.personalInfo.fullName,
          },
          assignment: {
            ...existingUser.assignment,
            ...data.assignment,
          },
          systemAccess: {
            ...existingUser.systemAccess,
            ...data.systemAccess,
            roles: updatedRoles,
          },
          updatedAt: new Date(),
          updatedBy: 'current-user',
        };

        dispatch({ type: 'UPDATE_USER', payload: updatedUser });

        return updatedUser;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error updating user');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, getUser, validateUserCode, validateUserData, validateUsername],
  );

  // Delete user
  const deleteUser = useCallback(
    async (id: string) => {
      const user = getUser(id);
      if (!user) {
        throw new Error('User not found');
      }

      setLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 600));

        dispatch({ type: 'DELETE_USER', payload: id });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error deleting user');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, getUser],
  );

  // Activate user
  const activateUser = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedUsers = users.map(user =>
          user.id === id ? { ...user, status: 'ACTIVE' as const, updatedAt: new Date() } : user,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error activating user');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, users],
  );

  // Suspend user
  const suspendUser = useCallback(
    async (id: string, reason?: string) => {
      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const notes = reason ? `Suspendido: ${reason}` : 'Suspendido';
        const updatedUsers = users.map(user =>
          user.id === id
            ? {
                ...user,
                status: 'SUSPENDED' as const,
                notes,
                updatedAt: new Date(),
              }
            : user,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error suspending user');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, users],
  );

  // Terminate user
  const terminateUser = useCallback(
    async (id: string, reason?: string) => {
      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const notes = reason ? `Desvinculado: ${reason}` : 'Desvinculado';
        const updatedUsers = users.map(user =>
          user.id === id
            ? {
                ...user,
                status: 'TERMINATED' as const,
                notes,
                updatedAt: new Date(),
              }
            : user,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error terminating user');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, users],
  );

  // Update last login
  const updateLastLogin = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 300));

        const updatedUsers = users.map(user =>
          user.id === userId
            ? {
                ...user,
                systemAccess: {
                  ...user.systemAccess,
                  lastLogin: new Date(),
                  loginAttempts: 0,
                },
                updatedAt: new Date(),
              }
            : user,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error updating last login');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, users],
  );

  // Authenticate user
  const authenticateUser = useCallback(
    async (username: string, pin?: string): Promise<User | null> => {
      setLoading(true);
      setError(null);

      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));

        const user = users.find(
          candidate =>
            candidate.systemAccess.username === username &&
            candidate.status === 'ACTIVE' &&
            !candidate.systemAccess.isLocked,
        );

        if (!user) {
          return null;
        }

        // Check PIN if required and provided
        if (user.systemAccess.pin && pin) {
          if (user.systemAccess.pin !== pin) {
            // Increment login attempts - update directly
            const updatedUsers = users.map(candidate =>
              candidate.id === user.id
                ? {
                    ...candidate,
                    systemAccess: {
                      ...candidate.systemAccess,
                      loginAttempts: candidate.systemAccess.loginAttempts + 1,
                    },
                    updatedAt: new Date(),
                  }
                : candidate,
            );
            dispatch({ type: 'SET_USERS', payload: updatedUsers });
            return null;
          }
        }

        // Update last login
        await updateLastLogin(user.id);

        return user;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error authenticating user');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dispatch, updateLastLogin, users],
  );

  // Lock user
  const lockUser = useCallback(
    async (userId: string, reason?: string) => {
      const user = getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const notes = reason ? `Bloqueado: ${reason}` : user.notes;
        const updatedUsers = users.map(candidate =>
          candidate.id === userId
            ? {
                ...candidate,
                systemAccess: {
                  ...candidate.systemAccess,
                  isLocked: true,
                  lockoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                },
                notes,
                updatedAt: new Date(),
              }
            : candidate,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error locking user');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, getUser, users],
  );

  // Unlock user
  const unlockUser = useCallback(
    async (userId: string) => {
      const user = getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      setLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        const updatedUsers = users.map(candidate =>
          candidate.id === userId
            ? {
                ...candidate,
                systemAccess: {
                  ...candidate.systemAccess,
                  isLocked: false,
                  lockoutUntil: undefined,
                  loginAttempts: 0,
                },
                updatedAt: new Date(),
              }
            : candidate,
        );

        dispatch({ type: 'SET_USERS', payload: updatedUsers });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error unlocking user');
      } finally {
        setLoading(false);
      }
    },
    [dispatch, getUser, users],
  );

  // Get user statistics
  const getUserStats = useCallback(() => {
    const stats = {
      total: users.length,
      active: 0,
      inactive: 0,
      suspended: 0,
      terminated: 0,
      byEstablishment: {} as Record<string, number>,
      byRole: {} as Record<string, number>,
    };

    users.forEach(user => {
      switch (user.status) {
        case 'ACTIVE':
          stats.active++;
          break;
        case 'INACTIVE':
          stats.inactive++;
          break;
        case 'SUSPENDED':
          stats.suspended++;
          break;
        case 'TERMINATED':
          stats.terminated++;
          break;
      }

      // By establishment
      const establishment = user.assignment.establishmentId;
      stats.byEstablishment[establishment] =
        (stats.byEstablishment[establishment] || 0) + 1;

      // By role
      user.systemAccess.roleIds.forEach(roleId => {
        stats.byRole[roleId] = (stats.byRole[roleId] || 0) + 1;
      });
    });

    return stats;
  }, [users]);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return {
    users,
    loading,
    error,

    // Actions
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    activateUser,
    suspendUser,
    terminateUser,

    // Getters
    getUser,
    getUsersByEstablishment,
    getUsersByRole,
    getActiveUsers,
    getUserSummaries,

    // Authentication & Sessions
    authenticateUser,
    updateLastLogin,
    lockUser,
    unlockUser,

    // Validation
    validateUserCode,
    validateUsername,
    validateUserData,

    // Statistics
    getUserStats,
  };
}