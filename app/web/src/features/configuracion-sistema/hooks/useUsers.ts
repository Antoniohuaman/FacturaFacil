/* eslint-disable react-hooks/exhaustive-deps -- dependencias extensas; ajuste diferido */
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
  employees: User[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadEmployees: () => Promise<void>;
  createEmployee: (data: CreateUserRequest) => Promise<User>;
  updateEmployee: (id: string, data: UpdateUserRequest) => Promise<User>;
  deleteEmployee: (id: string) => Promise<void>;
  activateEmployee: (id: string) => Promise<void>;
  suspendEmployee: (id: string, reason?: string) => Promise<void>;
  terminateEmployee: (id: string, reason?: string) => Promise<void>;
  
  // Getters
  getEmployee: (id: string) => User | undefined;
  getEmployeesByEstablishment: (establishmentId: string) => User[];
  getEmployeesByRole: (roleId: string) => User[];
  getActiveEmployees: () => User[];
  getEmployeeSummaries: () => UserSummary[];
  
  // Authentication & Sessions
  authenticateEmployee: (username: string, pin?: string) => Promise<User | null>;
  updateLastLogin: (employeeId: string) => Promise<void>;
  lockEmployee: (employeeId: string, reason?: string) => Promise<void>;
  unlockEmployee: (employeeId: string) => Promise<void>;
  
  // Validation
  validateEmployeeCode: (code: string, excludeId?: string) => Promise<boolean>;
  validateUsername: (username: string, excludeId?: string) => Promise<boolean>;
  validateEmployeeData: (data: CreateUserRequest | UpdateUserRequest) => Promise<string[]>;
  
  // Statistics
  getEmployeeStats: () => {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    terminated: number;
    byEstablishment: Record<string, number>;
    byRole: Record<string, number>;
  };
}

// Mock employees data
const MOCK_EMPLOYEES: User[] = [
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
    
    employment: {
      position: 'Gerente de Ventas',
      department: 'Ventas',
      establishmentId: 'est-1',
      establishmentIds: ['est-1', 'est-2'],
      hireDate: new Date('2025-01-01'),
      employmentType: 'FULL_TIME',
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
    notes: 'Empleado destacado con excelente rendimiento',
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
    
    employment: {
      position: 'Vendedora Senior',
      department: 'Ventas',
      establishmentId: 'est-1',
      establishmentIds: ['est-1'],
      hireDate: new Date('2025-01-05'),
      employmentType: 'FULL_TIME',
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
      roleIds: ['role-3'], // Employee role
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
    
    employment: {
      position: 'Vendedor',
      department: 'Ventas',
      establishmentId: 'est-2',
      establishmentIds: ['est-2'],
      hireDate: new Date('2025-01-10'),
      employmentType: 'PART_TIME',
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
      roleIds: ['role-3'], // Employee role
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
    notes: 'Empleado en período de prueba',
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

  const employees = state.employees;

  // Load employees
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      dispatch({ type: 'SET_EMPLOYEES', payload: MOCK_EMPLOYEES });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading employees');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Generate employee code
  const generateEmployeeCode = useCallback(() => {
    const maxCode = employees.reduce((max, emp) => {
      const codeNumber = parseInt(emp.code.replace(/\D/g, ''), 10) || 0;
      return Math.max(max, codeNumber);
    }, 0);
    
    return `EMP${String(maxCode + 1).padStart(3, '0')}`;
  }, [employees]);

  // Create employee
  const createEmployee = useCallback(async (data: CreateUserRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEmployeeData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness
      const code = data.code || generateEmployeeCode();
      const isCodeUnique = await validateEmployeeCode(code);
      if (!isCodeUnique) {
        throw new Error('El código del empleado ya existe');
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
        data.systemAccess.roleIds.includes(`role-${index + 1}`)
      ) as Role[];
      
      const newEmployee: User = {
        id: `emp-${Date.now()}`,
        code,
        personalInfo: {
          ...data.personalInfo,
          fullName: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`,
        },
        employment: {
          ...data.employment,
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
      
      dispatch({ type: 'ADD_EMPLOYEE', payload: newEmployee });
      
      return newEmployee;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch]);

  // Update employee
  const updateEmployee = useCallback(async (id: string, data: UpdateUserRequest): Promise<User> => {
    const existingEmployee = getEmployee(id);
    if (!existingEmployee) {
      throw new Error('Employee not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateEmployeeData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check code uniqueness if changed
      if (data.code && data.code !== existingEmployee.code) {
        const isCodeUnique = await validateEmployeeCode(data.code, id);
        if (!isCodeUnique) {
          throw new Error('El código del empleado ya existe');
        }
      }
      
      // Check username uniqueness if changed
      if (data.systemAccess?.username && data.systemAccess.username !== existingEmployee.systemAccess.username) {
        const isUsernameUnique = await validateUsername(data.systemAccess.username, id);
        if (!isUsernameUnique) {
          throw new Error('El nombre de usuario ya existe');
        }
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update roles if roleIds changed
      let updatedRoles = existingEmployee.systemAccess.roles;
      if (data.systemAccess?.roleIds) {
        updatedRoles = SYSTEM_ROLES.filter((_, index) => 
          data.systemAccess!.roleIds.includes(`role-${index + 1}`)
        ) as Role[];
      }
      
      const updatedEmployee: User = {
        ...existingEmployee,
        ...data,
        id,
        personalInfo: {
          ...existingEmployee.personalInfo,
          ...data.personalInfo,
          fullName: data.personalInfo?.firstName && data.personalInfo?.lastName 
            ? `${data.personalInfo.firstName} ${data.personalInfo.lastName}`
            : existingEmployee.personalInfo.fullName,
        },
        employment: {
          ...existingEmployee.employment,
          ...data.employment,
        },
        systemAccess: {
          ...existingEmployee.systemAccess,
          ...data.systemAccess,
          roles: updatedRoles,
        },
        updatedAt: new Date(),
        updatedBy: 'current-user',
      };
      
      dispatch({ type: 'UPDATE_EMPLOYEE', payload: updatedEmployee });
      
      return updatedEmployee;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Delete employee
  const deleteEmployee = useCallback(async (id: string) => {
    const employee = getEmployee(id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      dispatch({ type: 'DELETE_EMPLOYEE', payload: id });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting employee');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Activate employee
  const activateEmployee = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedEmployees = employees.map(emp =>
        emp.id === id ? { ...emp, status: 'ACTIVE' as const, updatedAt: new Date() } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error activating employee');
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch]);

  // Suspend employee
  const suspendEmployee = useCallback(async (id: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notes = reason ? `Suspendido: ${reason}` : 'Suspendido';
      const updatedEmployees = employees.map(emp =>
        emp.id === id ? { 
          ...emp, 
          status: 'SUSPENDED' as const, 
          notes,
          updatedAt: new Date() 
        } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error suspending employee');
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch]);

  // Terminate employee
  const terminateEmployee = useCallback(async (id: string, reason?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notes = reason ? `Desvinculado: ${reason}` : 'Desvinculado';
      const updatedEmployees = employees.map(emp =>
        emp.id === id ? { 
          ...emp, 
          status: 'TERMINATED' as const, 
          notes,
          updatedAt: new Date() 
        } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error terminating employee');  
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch]);

  // Get employee by ID
  const getEmployee = useCallback((id: string): User | undefined => {
    return employees.find(emp => emp.id === id);
  }, [employees]);

  // Get employees by establishment
  const getEmployeesByEstablishment = useCallback((establishmentId: string): User[] => {
    return employees.filter(emp => 
      emp.employment.establishmentIds.includes(establishmentId) && 
      emp.status === 'ACTIVE'
    );
  }, [employees]);

  // Get employees by role
  const getEmployeesByRole = useCallback((roleId: string): User[] => {
    return employees.filter(emp => 
      emp.systemAccess.roleIds.includes(roleId) && 
      emp.status === 'ACTIVE'
    );
  }, [employees]);

  // Get active employees
  const getActiveEmployees = useCallback((): User[] => {
    return employees.filter(emp => emp.status === 'ACTIVE');
  }, [employees]);

  // Get employee summaries
  const getEmployeeSummaries = useCallback((): UserSummary[] => {
    return employees.map(emp => ({
      id: emp.id,
      code: emp.code,
      fullName: emp.personalInfo.fullName,
      position: emp.employment.position,
      establishment: `Establecimiento ${emp.employment.establishmentId}`, // In real app, get name
      status: emp.status,
      lastLogin: emp.systemAccess.lastLogin,
      avatar: emp.avatar,
    }));
  }, [employees]);

  // Authenticate employee
  const authenticateEmployee = useCallback(async (username: string, pin?: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const employee = employees.find(emp => 
        emp.systemAccess.username === username && 
        emp.status === 'ACTIVE' && 
        !emp.systemAccess.isLocked
      );
      
      if (!employee) {
        return null;
      }
      
      // Check PIN if required and provided
      if (employee.systemAccess.pin && pin) {
        if (employee.systemAccess.pin !== pin) {
          // Increment login attempts - update directly
          const updatedEmployees = employees.map(emp =>
            emp.id === employee.id ? {
              ...emp,
              systemAccess: {
                ...emp.systemAccess,
                loginAttempts: emp.systemAccess.loginAttempts + 1,
              },
              updatedAt: new Date()
            } : emp
          );
          dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
          return null;
        }
      }
      
      // Update last login
      await updateLastLogin(employee.id);
      
      return employee;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error authenticating employee');
      return null;
    } finally {
      setLoading(false);
    }
  }, [employees, updateEmployee]);

  // Update last login
  const updateLastLogin = useCallback(async (employeeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedEmployees = employees.map(emp =>
        emp.id === employeeId ? {
          ...emp,
          systemAccess: {
            ...emp.systemAccess,
            lastLogin: new Date(),
            loginAttempts: 0,
          },
          updatedAt: new Date()
        } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating last login');
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch]);

  // Lock employee
  const lockEmployee = useCallback(async (employeeId: string, reason?: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const notes = reason ? `Bloqueado: ${reason}` : employee.notes;
      const updatedEmployees = employees.map(emp =>
        emp.id === employeeId ? {
          ...emp,
          systemAccess: {
            ...emp.systemAccess,
            isLocked: true,
            lockoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
          notes,
          updatedAt: new Date()
        } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error locking employee');
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch, getEmployee]);

  // Unlock employee
  const unlockEmployee = useCallback(async (employeeId: string) => {
    const employee = getEmployee(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedEmployees = employees.map(emp =>
        emp.id === employeeId ? {
          ...emp,
          systemAccess: {
            ...emp.systemAccess,
            isLocked: false,
            lockoutUntil: undefined,
            loginAttempts: 0,
          },
          updatedAt: new Date()
        } : emp
      );
      
      dispatch({ type: 'SET_EMPLOYEES', payload: updatedEmployees });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error unlocking employee');
    } finally {
      setLoading(false);
    }
  }, [employees, dispatch, getEmployee]);

  // Validate employee code uniqueness
  const validateEmployeeCode = useCallback(async (code: string, excludeId?: string): Promise<boolean> => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const exists = employees.some(emp => 
      emp.code === code && emp.id !== excludeId
    );
    
    return !exists;
  }, [employees]);

  // Validate username uniqueness
  const validateUsername = useCallback(async (username: string, excludeId?: string): Promise<boolean> => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const exists = employees.some(emp => 
      emp.systemAccess.username === username && emp.id !== excludeId
    );
    
    return !exists;
  }, [employees]);

  // Validate employee data
  const validateEmployeeData = useCallback(async (data: CreateUserRequest | UpdateUserRequest): Promise<string[]> => {
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
    
    // Employment validations
    if (data.employment) {
      const { employment } = data;
      
      if (!employment.position?.trim()) {
        errors.push('El cargo es requerido');
      }
      
      if (!employment.department?.trim()) {
        errors.push('El departamento es requerido');
      }
      
      if (!employment.establishmentId?.trim()) {
        errors.push('El establecimiento principal es requerido');
      }
      
      if (!employment.establishmentIds || employment.establishmentIds.length === 0) {
        errors.push('Debe seleccionar al menos un establecimiento');
      }
      
      if (employment.salary && employment.salary < 0) {
        errors.push('El salario no puede ser negativo');
      }
      
      if (employment.commissionRate && (employment.commissionRate < 0 || employment.commissionRate > 100)) {
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
      
      if (systemAccess.sessionTimeout && (systemAccess.sessionTimeout < 5 || systemAccess.sessionTimeout > 480)) {
        errors.push('El tiempo de sesión debe estar entre 5 y 480 minutos');
      }
      
      if (systemAccess.maxConcurrentSessions && (systemAccess.maxConcurrentSessions < 1 || systemAccess.maxConcurrentSessions > 5)) {
        errors.push('Las sesiones concurrentes deben estar entre 1 y 5');
      }
    }
    
    return errors;
  }, []);

  // Get employee statistics
  const getEmployeeStats = useCallback(() => {
    const stats = {
      total: employees.length,
      active: 0,
      inactive: 0,
      suspended: 0,
      terminated: 0,
      byEstablishment: {} as Record<string, number>,
      byRole: {} as Record<string, number>,
    };
    
    employees.forEach(emp => {
      switch (emp.status) {
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
      const establishment = emp.employment.establishmentId;
      stats.byEstablishment[establishment] = (stats.byEstablishment[establishment] || 0) + 1;
      
      // By role
      emp.systemAccess.roleIds.forEach(roleId => {
        stats.byRole[roleId] = (stats.byRole[roleId] || 0) + 1;
      });
    });
    
    return stats;
  }, [employees]);

  // Load employees on mount
  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  return {
    employees,
    loading,
    error,
    
    // Actions
    loadEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    activateEmployee,
    suspendEmployee,
    terminateEmployee,
    
    // Getters
    getEmployee,
    getEmployeesByEstablishment,
    getEmployeesByRole,
    getActiveEmployees,
    getEmployeeSummaries,
    
    // Authentication & Sessions
    authenticateEmployee,
    updateLastLogin,
    lockEmployee,
    unlockEmployee,
    
    // Validation
    validateEmployeeCode,
    validateUsername,
    validateEmployeeData,
    
    // Statistics
    getEmployeeStats,
  };
}