// CajaForm component - Create/Edit cash register form with inline validations
import { useState, useEffect } from 'react';
import type { CreateCajaInput, UpdateCajaInput, MedioPago } from '../../modelos/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../../modelos/Caja';
import type { Currency } from '../../modelos/Currency';
import type { Establecimiento } from '../../modelos/Establecimiento';
import type { ValidationError } from '../../utilidades/validadorCajas';
import { 
  validateNombre, 
  validateMoneda, 
  validateEstablecimiento,
  validateMediosPago,
  validateLimiteMaximo,
  validateMargenDescuadre,
  validateUsuariosAutorizados,
  getFieldError
} from '../../utilidades/validadorCajas';
import { UsuariosAutorizadosSelector } from './UsuariosAutorizadosSelector';
import { useConfigurationContext } from '../../contexto/ContextoConfiguracion';

interface CajaFormProps {
  initialData?: UpdateCajaInput;
  currencies: Currency[];
  Establecimientos: Establecimiento[];
  defaultEstablecimientoId: string;
  onSubmit: (data: CreateCajaInput | UpdateCajaInput) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  existingNames?: string[]; // For uniqueness validation
}

export function CajaForm({
  initialData,
  currencies,
  Establecimientos,
  defaultEstablecimientoId,
  onSubmit,
  onCancel,
  isEditing = false,
  existingNames = []
}: CajaFormProps) {
  const { state } = useConfigurationContext();
  
  const [formData, setFormData] = useState<CreateCajaInput>({
    establecimientoId: initialData?.establecimientoId || defaultEstablecimientoId,
    nombre: initialData?.nombre || '',
    monedaId: initialData?.monedaId || '',
    mediosPagoPermitidos: initialData?.mediosPagoPermitidos || [],
    limiteMaximo: initialData?.limiteMaximo || 0,
    margenDescuadre: initialData?.margenDescuadre || 0,
    habilitada: initialData?.habilitada ?? true,
    usuariosAutorizados: initialData?.usuariosAutorizados || [],
    dispositivos: initialData?.dispositivos || {},
    observaciones: initialData?.observaciones || ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time validation
  useEffect(() => {
    const newErrors: ValidationError[] = [];

    if (touched.has('establecimientoId')) {
      const establecimientoError = validateEstablecimiento(formData.establecimientoId);
      if (establecimientoError) newErrors.push(establecimientoError);
    }

    if (touched.has('nombre')) {
      const nombreError = validateNombre(formData.nombre);
      if (nombreError) newErrors.push(nombreError);
      
      // Check uniqueness
      if (formData.nombre && existingNames.includes(formData.nombre.trim().toLowerCase()) && !isEditing) {
        newErrors.push({ field: 'nombre', message: 'Ya existe una caja con este nombre' });
      }
    }

    if (touched.has('monedaId')) {
      const monedaError = validateMoneda(formData.monedaId);
      if (monedaError) newErrors.push(monedaError);
    }

    if (touched.has('mediosPagoPermitidos') || touched.has('habilitada')) {
      const mediosError = validateMediosPago(formData.mediosPagoPermitidos, formData.habilitada);
      if (mediosError) newErrors.push(mediosError);
    }

    if (touched.has('limiteMaximo')) {
      const limiteError = validateLimiteMaximo(formData.limiteMaximo);
      if (limiteError) newErrors.push(limiteError);
    }

    if (touched.has('margenDescuadre')) {
      const margenError = validateMargenDescuadre(formData.margenDescuadre);
      if (margenError) newErrors.push(margenError);
    }

    if (touched.has('usuariosAutorizados') || touched.has('habilitada')) {
      const usuariosError = validateUsuariosAutorizados(
        formData.usuariosAutorizados,
        state.users,
        formData.habilitada
      );
      if (usuariosError) newErrors.push(usuariosError);
    }

    setErrors(newErrors);
  }, [formData, touched, existingNames, isEditing, state.users]);

  const handleBlur = (field: string) => {
    setTouched(prev => new Set(prev).add(field));
  };

  const toggleMedioPago = (medio: MedioPago) => {
    setFormData(prev => ({
      ...prev,
      mediosPagoPermitidos: prev.mediosPagoPermitidos.includes(medio)
        ? prev.mediosPagoPermitidos.filter(m => m !== medio)
        : [...prev.mediosPagoPermitidos, medio]
    }));
    setTouched(prev => new Set(prev).add('mediosPagoPermitidos'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(new Set([
      'establecimientoId',
      'nombre', 
      'monedaId', 
      'mediosPagoPermitidos', 
      'limiteMaximo', 
      'margenDescuadre'
    ]));

    // Validate all fields
    const allErrors: ValidationError[] = [];
    
    const establecimientoError = validateEstablecimiento(formData.establecimientoId);
    if (establecimientoError) allErrors.push(establecimientoError);
    
    const nombreError = validateNombre(formData.nombre);
    if (nombreError) allErrors.push(nombreError);
    
    const monedaError = validateMoneda(formData.monedaId);
    if (monedaError) allErrors.push(monedaError);
    
    const mediosError = validateMediosPago(formData.mediosPagoPermitidos, formData.habilitada);
    if (mediosError) allErrors.push(mediosError);
    
    const limiteError = validateLimiteMaximo(formData.limiteMaximo);
    if (limiteError) allErrors.push(limiteError);
    
    const margenError = validateMargenDescuadre(formData.margenDescuadre);
    if (margenError) allErrors.push(margenError);

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && initialData?.id) {
        await onSubmit({ ...formData, id: initialData.id });
      } else {
        await onSubmit(formData);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: string) => getFieldError(errors, field);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Establecimiento */}
      <div>
        <label htmlFor="establecimiento" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Establecimiento <span className="text-red-500">*</span>
        </label>
        <select
          id="establecimiento"
          value={formData.establecimientoId}
          onChange={(e) => setFormData(prev => ({ ...prev, establecimientoId: e.target.value }))}
          onBlur={() => handleBlur('establecimientoId')}
          disabled={isEditing} // Cannot change Establecimiento when editing
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-700
            ${fieldError('establecimientoId') ? 'border-red-500' : 'border-gray-300'}
          `}
          aria-label="Establecimiento"
          aria-describedby={fieldError('establecimientoId') ? 'establecimiento-error' : undefined}
          aria-invalid={!!fieldError('establecimientoId')}
        >
          <option value="">Seleccionar establecimiento</option>
          {Establecimientos.map((est) => (
            <option key={est.id} value={est.id}>
              {est.name} - {est.code}
            </option>
          ))}
        </select>
        {fieldError('establecimientoId') && (
          <span id="establecimiento-error" className="text-sm text-red-600 dark:text-red-400 mt-1 block">
            {fieldError('establecimientoId')}
          </span>
        )}
        {isEditing && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No se puede cambiar el establecimiento de una caja existente
          </p>
        )}
      </div>

      {/* Nombre */}
      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nombre de Caja <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre"
          type="text"
          value={formData.nombre}
          onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
          onBlur={() => handleBlur('nombre')}
          maxLength={CAJA_CONSTRAINTS.NOMBRE_MAX_LENGTH}
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            ${fieldError('nombre') ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder="Ej: Caja Principal"
          aria-label="Nombre de caja"
          aria-describedby={fieldError('nombre') ? 'nombre-error' : undefined}
          aria-invalid={!!fieldError('nombre')}
        />
        <div className="flex justify-between mt-1">
          {fieldError('nombre') && (
            <span id="nombre-error" className="text-sm text-red-600 dark:text-red-400">
              {fieldError('nombre')}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
            {formData.nombre.length}/{CAJA_CONSTRAINTS.NOMBRE_MAX_LENGTH}
          </span>
        </div>
      </div>

      {/* Moneda */}
      <div>
        <label htmlFor="moneda" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Moneda <span className="text-red-500">*</span>
        </label>
        <select
          id="moneda"
          value={formData.monedaId}
          onChange={(e) => setFormData(prev => ({ ...prev, monedaId: e.target.value }))}
          onBlur={() => handleBlur('monedaId')}
          className={`
            w-full px-4 py-2 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            ${fieldError('monedaId') ? 'border-red-500' : 'border-gray-300'}
          `}
          aria-label="Moneda"
          aria-describedby={fieldError('monedaId') ? 'moneda-error' : undefined}
          aria-invalid={!!fieldError('monedaId')}
        >
          <option value="">Seleccionar moneda</option>
          {currencies.filter(c => c.isActive).map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code} - {currency.name}
            </option>
          ))}
        </select>
        {fieldError('monedaId') && (
          <span id="moneda-error" className="text-sm text-red-600 dark:text-red-400 mt-1 block">
            {fieldError('monedaId')}
          </span>
        )}
      </div>

      {/* Medios de Pago */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Medios de Pago Permitidos {formData.habilitada && <span className="text-red-500">*</span>}
        </label>
        <div className="flex flex-wrap gap-2">
          {MEDIOS_PAGO_DISPONIBLES.map((medio) => (
            <button
              key={medio}
              type="button"
              onClick={() => toggleMedioPago(medio)}
              className={`
                px-4 py-2 rounded-lg border-2 transition-all
                ${formData.mediosPagoPermitidos.includes(medio)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'}
              `}
              aria-pressed={formData.mediosPagoPermitidos.includes(medio)}
              aria-label={`Medio de pago ${medio}`}
            >
              {medio}
            </button>
          ))}
        </div>
        {fieldError('mediosPagoPermitidos') && (
          <span className="text-sm text-red-600 dark:text-red-400 mt-2 block">
            {fieldError('mediosPagoPermitidos')}
          </span>
        )}
      </div>

      {/* Límite Máximo y Margen */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="limiteMaximo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Límite Máximo <span className="text-red-500">*</span>
          </label>
          <input
            id="limiteMaximo"
            type="number"
            min={CAJA_CONSTRAINTS.LIMITE_MIN}
            step="0.01"
            value={formData.limiteMaximo}
            onChange={(e) => setFormData(prev => ({ ...prev, limiteMaximo: parseFloat(e.target.value) || 0 }))}
            onBlur={() => handleBlur('limiteMaximo')}
            className={`
              w-full px-4 py-2 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:bg-gray-800 dark:border-gray-600 dark:text-white
              ${fieldError('limiteMaximo') ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-label="Límite máximo"
            aria-describedby={fieldError('limiteMaximo') ? 'limite-error' : undefined}
            aria-invalid={!!fieldError('limiteMaximo')}
          />
          {fieldError('limiteMaximo') && (
            <span id="limite-error" className="text-sm text-red-600 dark:text-red-400 mt-1 block">
              {fieldError('limiteMaximo')}
            </span>
          )}
        </div>

        <div>
          <label htmlFor="margenDescuadre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Margen de Descuadre (%) <span className="text-red-500">*</span>
          </label>
          <input
            id="margenDescuadre"
            type="number"
            min={CAJA_CONSTRAINTS.MARGEN_MIN}
            max={CAJA_CONSTRAINTS.MARGEN_MAX}
            step="0.1"
            value={formData.margenDescuadre}
            onChange={(e) => setFormData(prev => ({ ...prev, margenDescuadre: parseFloat(e.target.value) || 0 }))}
            onBlur={() => handleBlur('margenDescuadre')}
            className={`
              w-full px-4 py-2 border rounded-lg
              focus:outline-none focus:ring-2 focus:ring-blue-500
              dark:bg-gray-800 dark:border-gray-600 dark:text-white
              ${fieldError('margenDescuadre') ? 'border-red-500' : 'border-gray-300'}
            `}
            aria-label="Margen de descuadre"
            aria-describedby={fieldError('margenDescuadre') ? 'margen-error' : undefined}
            aria-invalid={!!fieldError('margenDescuadre')}
          />
          {fieldError('margenDescuadre') && (
            <span id="margen-error" className="text-sm text-red-600 dark:text-red-400 mt-1 block">
              {fieldError('margenDescuadre')}
            </span>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Rango: {CAJA_CONSTRAINTS.MARGEN_MIN}-{CAJA_CONSTRAINTS.MARGEN_MAX}%
          </p>
        </div>
      </div>

      {/* Habilitada */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={formData.habilitada}
          onClick={() => {
            setFormData(prev => ({ ...prev, habilitada: !prev.habilitada }));
            setTouched(prev => new Set(prev).add('habilitada'));
          }}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${formData.habilitada ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${formData.habilitada ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Caja Habilitada
        </label>
      </div>

      {/* Observaciones */}
      <div>
        <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Observaciones
        </label>
        <textarea
          id="observaciones"
          value={formData.observaciones}
          onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          placeholder="Notas adicionales sobre esta caja..."
          aria-label="Observaciones"
        />
      </div>

      {/* Usuarios Autorizados */}
      <div>
        <UsuariosAutorizadosSelector
          value={formData.usuariosAutorizados || []}
          onChange={(selectedIds) => {
            setFormData(prev => ({ ...prev, usuariosAutorizados: selectedIds }));
            setTouched(prev => new Set(prev).add('usuariosAutorizados'));
          }}
          filterByCashPermission={true}
          disabled={isSubmitting}
          error={getFieldError(errors, 'usuariosAutorizados')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting || errors.length > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Caja')}
        </button>
      </div>
    </form>
  );
}
