/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import type { Role } from './Role';

export interface User {
  id: string;
  code: string; // Employee code for internal identification
  
  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    fullName: string;
    documentType: 'DNI' | 'CE' | 'PASSPORT';
    documentNumber: string;
    email: string;
    phone?: string;
    address?: string;
    birthDate?: Date;
    gender?: 'M' | 'F' | 'OTHER';
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  // Employment Information
  employment: {
    position: string;
    department: string;
    establishmentId: string; // Primary establishment
    establishmentIds: string[]; // All establishments the employee can access
    hireDate: Date;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
    salary?: number;
    commissionRate?: number;
    workSchedule: {
      mondayToFriday: {
        startTime: string;
        endTime: string;
        breakStartTime?: string;
        breakEndTime?: string;
      };
      saturday?: {
        startTime: string;
        endTime: string;
        breakStartTime?: string;
        breakEndTime?: string;
      };
      sunday?: {
        startTime: string;
        endTime: string;
        breakStartTime?: string;
        breakEndTime?: string;
      };
    };
  };

  // System Access
  systemAccess: {
    username: string;
    email: string;
    password?: string; // Hashed password (only stored temporarily during creation)
    requiresPasswordChange?: boolean; // Force password change on first login
    pin?: string; // 4-6 digit PIN for quick access
    requiresPinForActions: boolean;
    roleIds: string[];
    roles: Role[];
    permissions: Permission[];
    lastLogin?: Date;
    lastPasswordChange?: Date;
    loginAttempts: number;
    isLocked: boolean;
    lockoutUntil?: Date;
    sessionTimeout: number; // in minutes
    maxConcurrentSessions: number;
  };

  // Status and Metadata
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  avatar?: string;
  notes?: string;
  hasTransactions?: boolean; // Flag to track if employee has any transactions (sales, purchases, etc.)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface Permission {
  id: string;
  module: string; // sales, inventory, reports, etc.
  action: string; // create, read, update, delete, approve, etc.
  resource?: string; // specific resource if applicable
  conditions?: Record<string, any>; // additional conditions
}

export interface CreateUserRequest {
  code?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    documentType: 'DNI' | 'CE' | 'PASSPORT';
    documentNumber: string;
    email: string;
    phone?: string;
    address?: string;
    birthDate?: Date;
    gender?: 'M' | 'F' | 'OTHER';
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  employment: {
    position: string;
    department: string;
    establishmentId: string;
    establishmentIds: string[];
    hireDate: Date;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
    salary?: number;
    commissionRate?: number;
  };
  systemAccess: {
    username: string;
    pin?: string;
    requiresPinForActions: boolean;
    roleIds: string[];
    sessionTimeout?: number;
    maxConcurrentSessions?: number;
  };
  notes?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  id: string;
}

export interface UserSummary {
  id: string;
  code: string;
  fullName: string;
  position: string;
  establishment: string;
  status: User['status'];
  lastLogin?: Date;
  avatar?: string;
}

export const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Tiempo Completo' },
  { value: 'PART_TIME', label: 'Medio Tiempo' },
  { value: 'CONTRACT', label: 'Por Contrato' },
  { value: 'INTERNSHIP', label: 'Prácticas' },
] as const;

export const USER_STATUS = [
  { value: 'ACTIVE', label: 'Activo', color: 'green' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'gray' },
  { value: 'SUSPENDED', label: 'Suspendido', color: 'yellow' },
  { value: 'TERMINATED', label: 'Desvinculado', color: 'red' },
] as const;

export const DOCUMENT_TYPES = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de Extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'OTHER', label: 'Otro' },
] as const;