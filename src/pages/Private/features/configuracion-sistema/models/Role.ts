export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'SYSTEM' | 'CUSTOM';
  level: 'ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'STAFF' | 'GUEST';
  
  // Permissions grouped by module
  permissions: {
    // Sales module
    sales: {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canApprove: boolean;
      canCancel: boolean;
      canApplyDiscounts: boolean;
      maxDiscountPercentage?: number;
      canModifyPrices: boolean;
      canViewReports: boolean;
      canAccessAllEstablishments: boolean;
      establishmentIds?: string[];
    };
    
    // Inventory module
    inventory: {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canAdjustStock: boolean;
      canTransferStock: boolean;
      canViewCosts: boolean;
      canEditCosts: boolean;
      canViewReports: boolean;
      canManageSuppliers: boolean;
      canApprovePurchases: boolean;
    };
    
    // Customers module
    customers: {
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canViewHistory: boolean;
      canManageCredit: boolean;
      canViewSensitiveData: boolean;
      canExportData: boolean;
    };
    
    // Reports module
    reports: {
      canViewSalesReports: boolean;
      canViewInventoryReports: boolean;
      canViewFinancialReports: boolean;
      canViewUserReports: boolean;
      canExportReports: boolean;
      canScheduleReports: boolean;
      canViewAllEstablishments: boolean;
      establishmentIds?: string[];
    };
    
    // Configuration module
    configuration: {
      canView: boolean;
      canEditCompany: boolean;
      canEditEstablishments: boolean;
      canEditUsers: boolean;
      canEditRoles: boolean;
      canEditTaxes: boolean;
      canEditPaymentMethods: boolean;
      canEditSeries: boolean;
      canEditIntegrations: boolean;
      canBackupData: boolean;
      canRestoreData: boolean;
    };
    
    // Cash management
    cash: {
      canOpenRegister: boolean;
      canCloseRegister: boolean;
      canViewCashFlow: boolean;
      canMakeAdjustments: boolean;
      canViewOtherRegisters: boolean;
      canApproveCashOperations: boolean;
    };
    
    // Administrative permissions
    admin: {
      canManageUsers: boolean;
      canManageRoles: boolean;
      canViewSystemLogs: boolean;
      canManageIntegrations: boolean;
      canAccessAllData: boolean;
      canDeleteAnyRecord: boolean;
      canModifySystemSettings: boolean;
    };
  };
  
  // Access restrictions
  restrictions: {
    timeRestrictions?: {
      allowedDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
      allowedHours: {
        start: string; // HH:mm
        end: string; // HH:mm
      };
    };
    ipRestrictions?: {
      allowedIps: string[];
      allowedNetworks: string[];
    };
    deviceRestrictions?: {
      maxDevices: number;
      allowedDeviceTypes: ('desktop' | 'tablet' | 'mobile')[];
    };
    establishmentRestrictions?: {
      allowedEstablishments: string[];
      canSwitchEstablishments: boolean;
    };
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  level: Role['level'];
  permissions: Role['permissions'];
  restrictions?: Role['restrictions'];
}

export interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  id: string;
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  type: Role['type'];
  level: Role['level'];
  userCount: number;
  isActive: boolean;
}

// Predefined system roles
export const SYSTEM_ROLES: Partial<Role>[] = [
  {
    name: 'Super Administrador',
    description: 'Acceso completo a todas las funcionalidades del sistema',
    type: 'SYSTEM',
    level: 'ADMIN',
    permissions: {
      sales: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canCancel: true,
        canApplyDiscounts: true,
        canModifyPrices: true,
        canViewReports: true,
        canAccessAllEstablishments: true,
      },
      inventory: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canAdjustStock: true,
        canTransferStock: true,
        canViewCosts: true,
        canEditCosts: true,
        canViewReports: true,
        canManageSuppliers: true,
        canApprovePurchases: true,
      },
      customers: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canViewHistory: true,
        canManageCredit: true,
        canViewSensitiveData: true,
        canExportData: true,
      },
      reports: {
        canViewSalesReports: true,
        canViewInventoryReports: true,
        canViewFinancialReports: true,
        canViewUserReports: true,
        canExportReports: true,
        canScheduleReports: true,
        canViewAllEstablishments: true,
      },
      configuration: {
        canView: true,
        canEditCompany: true,
        canEditEstablishments: true,
        canEditUsers: true,
        canEditRoles: true,
        canEditTaxes: true,
        canEditPaymentMethods: true,
        canEditSeries: true,
        canEditIntegrations: true,
        canBackupData: true,
        canRestoreData: true,
      },
      cash: {
        canOpenRegister: true,
        canCloseRegister: true,
        canViewCashFlow: true,
        canMakeAdjustments: true,
        canViewOtherRegisters: true,
        canApproveCashOperations: true,
      },
      admin: {
        canManageUsers: true,
        canManageRoles: true,
        canViewSystemLogs: true,
        canManageIntegrations: true,
        canAccessAllData: true,
        canDeleteAnyRecord: true,
        canModifySystemSettings: true,
      },
    },
  },
  {
    name: 'Gerente',
    description: 'Acceso a gestión de ventas, inventario y reportes',
    type: 'SYSTEM',
    level: 'MANAGER',
    permissions: {
      sales: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canCancel: true,
        canApplyDiscounts: true,
        maxDiscountPercentage: 20,
        canModifyPrices: true,
        canViewReports: true,
        canAccessAllEstablishments: true,
      },
      inventory: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canAdjustStock: true,
        canTransferStock: true,
        canViewCosts: true,
        canEditCosts: true,
        canViewReports: true,
        canManageSuppliers: true,
        canApprovePurchases: true,
      },
      customers: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canViewHistory: true,
        canManageCredit: true,
        canViewSensitiveData: true,
        canExportData: true,
      },
      reports: {
        canViewSalesReports: true,
        canViewInventoryReports: true,
        canViewFinancialReports: true,
        canViewUserReports: true,
        canExportReports: true,
        canScheduleReports: true,
        canViewAllEstablishments: true,
      },
      configuration: {
        canView: true,
        canEditCompany: false,
        canEditEstablishments: false,
        canEditUsers: false,
        canEditRoles: false,
        canEditTaxes: false,
        canEditPaymentMethods: false,
        canEditSeries: false,
        canEditIntegrations: false,
        canBackupData: false,
        canRestoreData: false,
      },
      cash: {
        canOpenRegister: true,
        canCloseRegister: true,
        canViewCashFlow: true,
        canMakeAdjustments: true,
        canViewOtherRegisters: true,
        canApproveCashOperations: true,
      },
      admin: {
        canManageUsers: false,
        canManageRoles: false,
        canViewSystemLogs: true,
        canManageIntegrations: false,
        canAccessAllData: false,
        canDeleteAnyRecord: false,
        canModifySystemSettings: false,
      },
    },
  },
  {
    name: 'Vendedor',
    description: 'Acceso básico a ventas y consulta de inventario',
    type: 'SYSTEM',
    level: 'STAFF',
    permissions: {
      sales: {
        canView: true,
        canCreate: true,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canCancel: false,
        canApplyDiscounts: true,
        maxDiscountPercentage: 5,
        canModifyPrices: false,
        canViewReports: false,
        canAccessAllEstablishments: false,
      },
      inventory: {
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canAdjustStock: false,
        canTransferStock: false,
        canViewCosts: false,
        canEditCosts: false,
        canViewReports: false,
        canManageSuppliers: false,
        canApprovePurchases: false,
      },
      customers: {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canViewHistory: true,
        canManageCredit: false,
        canViewSensitiveData: false,
        canExportData: false,
      },
      reports: {
        canViewSalesReports: false,
        canViewInventoryReports: false,
        canViewFinancialReports: false,
        canViewUserReports: false,
        canExportReports: false,
        canScheduleReports: false,
        canViewAllEstablishments: false,
      },
      configuration: {
        canView: false,
        canEditCompany: false,
        canEditEstablishments: false,
        canEditUsers: false,
        canEditRoles: false,
        canEditTaxes: false,
        canEditPaymentMethods: false,
        canEditSeries: false,
        canEditIntegrations: false,
        canBackupData: false,
        canRestoreData: false,
      },
      cash: {
        canOpenRegister: true,
        canCloseRegister: true,
        canViewCashFlow: false,
        canMakeAdjustments: false,
        canViewOtherRegisters: false,
        canApproveCashOperations: false,
      },
      admin: {
        canManageUsers: false,
        canManageRoles: false,
        canViewSystemLogs: false,
        canManageIntegrations: false,
        canAccessAllData: false,
        canDeleteAnyRecord: false,
        canModifySystemSettings: false,
      },
    },
  },
];

export const ROLE_LEVELS = [
  { value: 'ADMIN', label: 'Administrador', color: 'red' },
  { value: 'MANAGER', label: 'Gerente', color: 'orange' },
  { value: 'SUPERVISOR', label: 'Supervisor', color: 'yellow' },
  { value: 'STAFF', label: 'Usuario', color: 'blue' },
  { value: 'GUEST', label: 'Invitado', color: 'gray' },
] as const;