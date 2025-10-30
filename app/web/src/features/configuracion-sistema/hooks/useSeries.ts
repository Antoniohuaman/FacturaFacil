/* eslint-disable react-hooks/exhaustive-deps -- dependencias extensas; ajuste diferido */
import { useState, useEffect, useCallback } from 'react';
import { useConfigurationContext } from '../context/ConfigurationContext';
import type { 
  Series, 
  CreateSeriesRequest, 
  UpdateSeriesRequest, 
  SeriesSummary,
  DocumentType
} from '../models/Series';
import { SUNAT_DOCUMENT_TYPES } from '../models/Series';

interface UseSeriesReturn {
  series: Series[];
  documentTypes: DocumentType[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadSeries: () => Promise<void>;
  createSeries: (data: CreateSeriesRequest) => Promise<Series>;
  updateSeries: (id: string, data: UpdateSeriesRequest) => Promise<Series>;
  deleteSeries: (id: string) => Promise<void>;
  setDefaultSeries: (establishmentId: string, documentTypeId: string, seriesId: string) => Promise<void>;
  
  // Getters
  getSeries: (id: string) => Series | undefined;
  getSeriesByEstablishment: (establishmentId: string) => Series[];
  getSeriesByDocumentType: (documentTypeId: string) => Series[];
  getDefaultSeries: (establishmentId: string, documentTypeId: string) => Series | undefined;
  getActiveSeries: () => Series[];
  getSeriesSummaries: () => SeriesSummary[];
  
  // Validation
  validateSeriesCode: (establishmentId: string, series: string, excludeId?: string) => Promise<boolean>;
  validateSeriesData: (data: CreateSeriesRequest | UpdateSeriesRequest) => Promise<string[]>;
  getNextCorrelativeNumber: (seriesId: string) => Promise<number>;
  
  // SUNAT operations
  registerSeriesWithSunat: (seriesId: string) => Promise<void>;
  syncSeriesWithSunat: (seriesId: string) => Promise<void>;
  
  // Statistics
  getSeriesStats: () => {
    total: number;
    active: number;
    electronic: number;
    byDocumentType: Record<string, number>;
    byEstablishment: Record<string, number>;
  };
}

// Mock series data
const MOCK_SERIES: Series[] = [
  {
    id: 'series-1',
    establishmentId: 'est-1',
    documentType: SUNAT_DOCUMENT_TYPES[0], // Factura
    series: 'F001',
    correlativeNumber: 123,
    
    configuration: {
      minimumDigits: 8,
      startNumber: 1,
      autoIncrement: true,
      allowManualNumber: false,
      requireAuthorization: false,
    },
    
    sunatConfiguration: {
      isElectronic: true,
      environmentType: 'TESTING',
      certificateRequired: true,
      mustReportToSunat: true,
      maxDaysToReport: 1,
      sunatResolution: 'R001-2025',
      authorizationDate: new Date('2025-01-01'),
    },
    
    status: 'ACTIVE',
    isDefault: true,
    
    statistics: {
      documentsIssued: 123,
      lastUsedDate: new Date(),
      averageDocumentsPerDay: 5.2,
      estimatedExhaustionDate: new Date('2030-12-31'),
    },
    
    validation: {
      allowZeroAmount: false,
      requireCustomer: true,
      allowedPaymentMethods: ['pm-1', 'pm-2'],
      minAmount: 0.01,
    },
    
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    createdBy: 'admin',
    isActive: true,
  },
  {
    id: 'series-2',
    establishmentId: 'est-1',
    documentType: SUNAT_DOCUMENT_TYPES[1], // Boleta
    series: 'B001',
    correlativeNumber: 456,
    
    configuration: {
      minimumDigits: 8,
      startNumber: 1,
      autoIncrement: true,
      allowManualNumber: false,
      requireAuthorization: false,
    },
    
    sunatConfiguration: {
      isElectronic: true,
      environmentType: 'TESTING',
      certificateRequired: true,
      mustReportToSunat: true,
      maxDaysToReport: 7,
    },
    
    status: 'ACTIVE',
    isDefault: true,
    
    statistics: {
      documentsIssued: 456,
      lastUsedDate: new Date(),
      averageDocumentsPerDay: 12.8,
      estimatedExhaustionDate: new Date('2028-06-15'),
    },
    
    validation: {
      allowZeroAmount: false,
      requireCustomer: false,
      allowedPaymentMethods: ['pm-1', 'pm-2'],
      minAmount: 0.01,
    },
    
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date(),
    createdBy: 'admin',
    isActive: true,
  },
  {
    id: 'series-3',
    establishmentId: 'est-2',
    documentType: SUNAT_DOCUMENT_TYPES[1], // Boleta
    series: 'B002',
    correlativeNumber: 89,
    
    configuration: {
      minimumDigits: 8,
      startNumber: 1,
      autoIncrement: true,
      allowManualNumber: false,
      requireAuthorization: false,
    },
    
    sunatConfiguration: {
      isElectronic: true,
      environmentType: 'TESTING',
      certificateRequired: true,
      mustReportToSunat: true,
      maxDaysToReport: 7,
    },
    
    status: 'ACTIVE',
    isDefault: true,
    
    statistics: {
      documentsIssued: 89,
      lastUsedDate: new Date(),
      averageDocumentsPerDay: 3.1,
    },
    
    validation: {
      allowZeroAmount: false,
      requireCustomer: false,
      allowedPaymentMethods: ['pm-1'],
    },
    
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date(),
    createdBy: 'admin',
    isActive: true,
  },
];

export function useSeries(): UseSeriesReturn {
  const { state, dispatch } = useConfigurationContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const series = state.series;
  const documentTypes = SUNAT_DOCUMENT_TYPES;

  // Load series
  const loadSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      dispatch({ type: 'SET_SERIES', payload: MOCK_SERIES });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading series');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Create series
  const createSeries = useCallback(async (data: CreateSeriesRequest): Promise<Series> => {
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateSeriesData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check series uniqueness
      const isUnique = await validateSeriesCode(data.establishmentId, data.series);
      if (!isUnique) {
        throw new Error('Ya existe una serie con este código en el establecimiento');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find document type
      const documentType = documentTypes.find(dt => dt.id === data.documentTypeId);
      if (!documentType) {
        throw new Error('Tipo de documento no encontrado');
      }
      
      const newSeries: Series = {
        id: `series-${Date.now()}`,
        establishmentId: data.establishmentId,
        documentType,
        series: data.series,
        correlativeNumber: data.configuration.startNumber,
        configuration: data.configuration,
        sunatConfiguration: {
          isElectronic: documentType.properties.isElectronic,
          environmentType: 'TESTING',
          certificateRequired: documentType.properties.isElectronic,
          mustReportToSunat: documentType.properties.isElectronic,
          maxDaysToReport: documentType.category === 'INVOICE' ? 1 : 7,
          ...data.sunatConfiguration,
        },
        status: 'ACTIVE',
        isDefault: !series.some(s => 
          s.establishmentId === data.establishmentId && 
          s.documentType.id === data.documentTypeId && 
          s.isDefault
        ),
        statistics: {
          documentsIssued: 0,
          averageDocumentsPerDay: 0,
        },
        validation: {
          allowZeroAmount: false,
          requireCustomer: documentType.properties.requiresCustomerName,
          ...data.validation,
        },
        notes: data.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'current-user',
        isActive: true,
      };
      
      dispatch({ type: 'ADD_SERIES', payload: newSeries });
      
      return newSeries;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating series');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [series, documentTypes, dispatch]);

  // Update series
  const updateSeries = useCallback(async (id: string, data: UpdateSeriesRequest): Promise<Series> => {
    const existingSeries = getSeries(id);
    if (!existingSeries) {
      throw new Error('Series not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Validate data
      const validationErrors = await validateSeriesData(data);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }
      
      // Check series uniqueness if changed
      if (data.series && data.series !== existingSeries.series) {
        const isUnique = await validateSeriesCode(
          data.establishmentId || existingSeries.establishmentId, 
          data.series, 
          id
        );
        if (!isUnique) {
          throw new Error('Ya existe una serie con este código en el establecimiento');
        }
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find document type if changed
      let documentType = existingSeries.documentType;
      if (data.documentTypeId && data.documentTypeId !== existingSeries.documentType.id) {
        const newDocumentType = documentTypes.find(dt => dt.id === data.documentTypeId);
        if (!newDocumentType) {
          throw new Error('Tipo de documento no encontrado');
        }
        documentType = newDocumentType;
      }
      
      const updatedSeries: Series = {
        ...existingSeries,
        ...data,
        id,
        documentType,
        sunatConfiguration: {
          ...existingSeries.sunatConfiguration,
          ...data.sunatConfiguration
        },
        validation: {
          ...existingSeries.validation,
          ...data.validation
        },
        statistics: existingSeries.statistics,
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'UPDATE_SERIES', payload: updatedSeries });
      
      return updatedSeries;
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating series');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [series, documentTypes, dispatch]);

  // Delete series
  const deleteSeries = useCallback(async (id: string) => {
    const seriesItem = getSeries(id);
    if (!seriesItem) {
      throw new Error('Series not found');
    }
    
    if (seriesItem.statistics.documentsIssued > 0) {
      throw new Error('No se puede eliminar una serie que ya tiene documentos emitidos');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      dispatch({ type: 'DELETE_SERIES', payload: id });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting series');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Set default series for establishment and document type
  const setDefaultSeries = useCallback(async (establishmentId: string, documentTypeId: string, seriesId: string) => {
    const seriesItem = getSeries(seriesId);
    if (!seriesItem) {
      throw new Error('Series not found');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update all series - remove default flag from same establishment + document type, add to selected
      const updatedSeries = series.map(s => ({
        ...s,
        isDefault: s.id === seriesId ? true : (
          s.establishmentId === establishmentId && s.documentType.id === documentTypeId ? false : s.isDefault
        ),
        updatedAt: new Date(),
      }));
      
      dispatch({ type: 'SET_SERIES', payload: updatedSeries });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error setting default series');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [series, dispatch]);

  // Get series by ID
  const getSeries = useCallback((id: string): Series | undefined => {
    return series.find(s => s.id === id);
  }, [series]);

  // Get series by establishment
  const getSeriesByEstablishment = useCallback((establishmentId: string): Series[] => {
    return series.filter(s => s.establishmentId === establishmentId && s.isActive);
  }, [series]);

  // Get series by document type
  const getSeriesByDocumentType = useCallback((documentTypeId: string): Series[] => {
    return series.filter(s => s.documentType.id === documentTypeId && s.isActive);
  }, [series]);

  // Get default series for establishment and document type
  const getDefaultSeries = useCallback((establishmentId: string, documentTypeId: string): Series | undefined => {
    return series.find(s => 
      s.establishmentId === establishmentId && 
      s.documentType.id === documentTypeId && 
      s.isDefault && 
      s.isActive
    );
  }, [series]);

  // Get active series
  const getActiveSeries = useCallback((): Series[] => {
    return series.filter(s => s.status === 'ACTIVE' && s.isActive);
  }, [series]);

  // Get series summaries
  const getSeriesSummaries = useCallback((): SeriesSummary[] => {
    return series.map(s => ({
      id: s.id,
      establishmentName: `Establecimiento ${s.establishmentId}`, // In real app, get from establishments
      documentTypeName: s.documentType.name,
      series: s.series,
      correlativeNumber: s.correlativeNumber,
      status: s.status,
      isDefault: s.isDefault,
      isElectronic: s.sunatConfiguration.isElectronic,
      documentsIssued: s.statistics.documentsIssued,
      estimatedExhaustionDate: s.statistics.estimatedExhaustionDate,
    }));
  }, [series]);

  // Validate series code uniqueness
  const validateSeriesCode = useCallback(async (establishmentId: string, seriesCode: string, excludeId?: string): Promise<boolean> => {
    // Simulate API validation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const exists = series.some(s => 
      s.establishmentId === establishmentId && 
      s.series === seriesCode && 
      s.id !== excludeId && 
      s.isActive
    );
    
    return !exists;
  }, [series]);

  // Validate series data
  const validateSeriesData = useCallback(async (data: CreateSeriesRequest | UpdateSeriesRequest): Promise<string[]> => {
    const errors: string[] = [];
    
    // Basic validations
    if (!data.series?.trim()) {
      errors.push('La serie es requerida');
    } else {
      // Validate series format based on document type
      const documentType = documentTypes.find(dt => dt.id === data.documentTypeId);
      if (documentType) {
        const expectedLength = documentType.seriesConfiguration.seriesLength;
        const allowedPrefixes = documentType.seriesConfiguration.allowedPrefixes;
        
        if (data.series.length !== expectedLength + 3) { // 3 digits for number
          errors.push(`La serie debe tener ${expectedLength + 3} caracteres`);
        }
        
        const prefix = data.series.substring(0, expectedLength);
        if (!allowedPrefixes.includes(prefix)) {
          errors.push(`El prefijo debe ser uno de: ${allowedPrefixes.join(', ')}`);
        }
        
        const numberPart = data.series.substring(expectedLength);
        if (!/^\d+$/.test(numberPart)) {
          errors.push('La parte numérica de la serie debe contener solo dígitos');
        }
      }
    }
    
    // Configuration validations
    if (data.configuration) {
      if (data.configuration.minimumDigits < 1 || data.configuration.minimumDigits > 10) {
        errors.push('Los dígitos mínimos deben estar entre 1 y 10');
      }
      
      if (data.configuration.startNumber < 1) {
        errors.push('El número inicial debe ser mayor a 0');
      }
      
      if (data.configuration.endNumber && data.configuration.endNumber <= data.configuration.startNumber) {
        errors.push('El número final debe ser mayor al número inicial');
      }
    }
    
    // Validation rules
    if (data.validation) {
      if (data.validation.minAmount && data.validation.minAmount < 0) {
        errors.push('El monto mínimo no puede ser negativo');
      }
      
      if (data.validation.maxAmount && data.validation.minAmount && 
          data.validation.maxAmount <= data.validation.minAmount) {
        errors.push('El monto máximo debe ser mayor al monto mínimo');
      }
    }
    
    return errors;
  }, [documentTypes]);

  // Get next correlative number
  const getNextCorrelativeNumber = useCallback(async (seriesId: string): Promise<number> => {
    const seriesItem = getSeries(seriesId);
    if (!seriesItem) {
      throw new Error('Series not found');
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return seriesItem.correlativeNumber + 1;
  }, [series]);

  // Register series with SUNAT
  const registerSeriesWithSunat = useCallback(async (seriesId: string) => {
    const seriesItem = getSeries(seriesId);
    if (!seriesItem) {
      throw new Error('Series not found');
    }
    
    if (!seriesItem.sunatConfiguration.isElectronic) {
      throw new Error('Solo las series electrónicas pueden registrarse en SUNAT');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate SUNAT registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const updatedSeries: Series = {
        ...seriesItem,
        sunatConfiguration: {
          ...seriesItem.sunatConfiguration,
          sunatResolution: `R${seriesId.slice(-3)}-2025`,
          authorizationDate: new Date(),
        },
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'UPDATE_SERIES', payload: updatedSeries });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error registering series with SUNAT');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [series, dispatch]);

  // Sync series with SUNAT
  const syncSeriesWithSunat = useCallback(async (seriesId: string) => {
    const seriesItem = getSeries(seriesId);
    if (!seriesItem) {
      throw new Error('Series not found');
    }
    
    if (!seriesItem.sunatConfiguration.isElectronic) {
      throw new Error('Solo las series electrónicas pueden sincronizarse con SUNAT');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate SUNAT sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock: update statistics from SUNAT
      const updatedSeries: Series = {
        ...seriesItem,
        statistics: {
          ...seriesItem.statistics,
          documentsIssued: seriesItem.statistics.documentsIssued + Math.floor(Math.random() * 5),
        },
        updatedAt: new Date(),
      };
      
      dispatch({ type: 'UPDATE_SERIES', payload: updatedSeries });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error syncing series with SUNAT');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [series, dispatch]);

  // Get series statistics
  const getSeriesStats = useCallback(() => {
    const stats = {
      total: series.length,
      active: 0,
      electronic: 0,
      byDocumentType: {} as Record<string, number>,
      byEstablishment: {} as Record<string, number>,
    };
    
    series.forEach(s => {
      if (s.status === 'ACTIVE') {
        stats.active++;
      }
      
      if (s.sunatConfiguration.isElectronic) {
        stats.electronic++;
      }
      
      // By document type
      const docTypeName = s.documentType.name;
      stats.byDocumentType[docTypeName] = (stats.byDocumentType[docTypeName] || 0) + 1;
      
      // By establishment
      stats.byEstablishment[s.establishmentId] = (stats.byEstablishment[s.establishmentId] || 0) + 1;
    });
    
    return stats;
  }, [series]);

  // Load series on mount
  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  return {
    series,
    documentTypes,
    loading,
    error,
    
    // Actions
    loadSeries,
    createSeries,
    updateSeries,
    deleteSeries,
    setDefaultSeries,
    
    // Getters
    getSeries,
    getSeriesByEstablishment,
    getSeriesByDocumentType,
    getDefaultSeries,
    getActiveSeries,
    getSeriesSummaries,
    
    // Validation
    validateSeriesCode,
    validateSeriesData,
    getNextCorrelativeNumber,
    
    // SUNAT operations
    registerSeriesWithSunat,
    syncSeriesWithSunat,
    
    // Statistics
    getSeriesStats,
  };
}