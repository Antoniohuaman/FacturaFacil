// CajaForm component - Create/Edit cash register form with inline validations
import { useState, useEffect } from 'react';
import { Button, Select, Input, Textarea } from '@/contasis';
import type { CreateCajaInput, UpdateCajaInput, MedioPago } from '../../modelos/Caja';
import { CAJA_CONSTRAINTS, MEDIOS_PAGO_DISPONIBLES } from '../../modelos/Caja';
import type { Currency } from '../../modelos/Currency';
import type { Establecimiento } from '../../modelos/Establecimiento';
import type { ValidationError } from '../../utilidades/validadorCajas';
import {
  validateNombre,
  validateNombreUniqueness,
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
}

export function CajaForm({
  initialData,
  currencies,
  Establecimientos,
  defaultEstablecimientoId,
  onSubmit,
  onCancel,
  isEditing = false,
}: CajaFormProps) {
  const { state } = useConfigurationContext();

  const [formData, setFormData] = useState<CreateCajaInput>({
    establecimientoIdCaja: initialData?.establecimientoIdCaja || defaultEstablecimientoId,
    nombreCaja: initialData?.nombreCaja || '',
    monedaIdCaja: initialData?.monedaIdCaja || '',
    mediosPagoPermitidos: initialData?.mediosPagoPermitidos || [],
    limiteMaximoCaja: initialData?.limiteMaximoCaja || 0,
    margenDescuadreCaja: initialData?.margenDescuadreCaja || 0,
    habilitadaCaja: initialData?.habilitadaCaja ?? true,
    usuariosAutorizadosCaja: initialData?.usuariosAutorizadosCaja || [],
    dispositivosCaja: initialData?.dispositivosCaja || {},
    observacionesCaja: initialData?.observacionesCaja || ''
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time validation
  useEffect(() => {
    const newErrors: ValidationError[] = [];

    if (touched.has('establecimientoIdCaja')) {
      const establecimientoError = validateEstablecimiento(formData.establecimientoIdCaja);
      if (establecimientoError) newErrors.push(establecimientoError);
    }

    if (touched.has('nombreCaja')) {
      const nombreError = validateNombre(formData.nombreCaja);
      if (nombreError) newErrors.push(nombreError);

      const uniquenessError = validateNombreUniqueness(
        formData.nombreCaja,
        state.cajas,
        formData.establecimientoIdCaja,
        isEditing ? initialData?.id : undefined
      );
      if (uniquenessError) newErrors.push(uniquenessError);
    }

    if (touched.has('monedaIdCaja')) {
      const monedaError = validateMoneda(formData.monedaIdCaja);
      if (monedaError) newErrors.push(monedaError);
    }

    if (touched.has('mediosPagoPermitidos') || touched.has('habilitadaCaja')) {
      const mediosError = validateMediosPago(formData.mediosPagoPermitidos, formData.habilitadaCaja);
      if (mediosError) newErrors.push(mediosError);
    }

    if (touched.has('limiteMaximoCaja')) {
      const limiteError = validateLimiteMaximo(formData.limiteMaximoCaja);
      if (limiteError) newErrors.push(limiteError);
    }

    if (touched.has('margenDescuadreCaja')) {
      const margenError = validateMargenDescuadre(formData.margenDescuadreCaja);
      if (margenError) newErrors.push(margenError);
    }

    if (touched.has('usuariosAutorizadosCaja') || touched.has('habilitadaCaja')) {
      const usuariosError = validateUsuariosAutorizados(
        formData.usuariosAutorizadosCaja,
        state.users,
        formData.habilitadaCaja
      );
      if (usuariosError) newErrors.push(usuariosError);
    }

    setErrors(newErrors);
  }, [formData, touched, initialData?.id, isEditing, state.cajas, state.users]);

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
      'establecimientoIdCaja',
      'nombreCaja',
      'monedaIdCaja',
      'mediosPagoPermitidos',
      'limiteMaximoCaja',
      'margenDescuadreCaja'
    ]));

    // Validate all fields
    const allErrors: ValidationError[] = [];

    const establecimientoError = validateEstablecimiento(formData.establecimientoIdCaja);
    if (establecimientoError) allErrors.push(establecimientoError);

    const nombreError = validateNombre(formData.nombreCaja);
    if (nombreError) allErrors.push(nombreError);

    const uniquenessError = validateNombreUniqueness(
      formData.nombreCaja,
      state.cajas,
      formData.establecimientoIdCaja,
      isEditing ? initialData?.id : undefined
    );
    if (uniquenessError) allErrors.push(uniquenessError);

    const monedaError = validateMoneda(formData.monedaIdCaja);
    if (monedaError) allErrors.push(monedaError);

    const mediosError = validateMediosPago(formData.mediosPagoPermitidos, formData.habilitadaCaja);
    if (mediosError) allErrors.push(mediosError);

    const limiteError = validateLimiteMaximo(formData.limiteMaximoCaja);
    if (limiteError) allErrors.push(limiteError);

    const margenError = validateMargenDescuadre(formData.margenDescuadreCaja);
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
        <Select
          label="Establecimiento"
          value={formData.establecimientoIdCaja}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, establecimientoIdCaja: e.target.value }));
            handleBlur('establecimientoIdCaja');
          }}
          disabled={isEditing}
          required
          error={fieldError('establecimientoIdCaja')}
          helperText={fieldError('establecimientoIdCaja')}
          options={[
            { value: '', label: 'Seleccionar establecimiento' },
            ...Establecimientos.map((est) => ({
              value: est.id,
              label: `${est.name} - ${est.code}`
            }))
          ]}
        />
        {isEditing && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            No se puede cambiar el establecimiento de una caja existente
          </p>
        )}
      </div>

      {/* Nombre */}
      <div>
        <Input
          label="Nombre de Caja"
          type="text"
          value={formData.nombreCaja}
          onChange={(e) => setFormData(prev => ({ ...prev, nombreCaja: e.target.value }))}
          onBlur={() => handleBlur('nombreCaja')}
          maxLength={CAJA_CONSTRAINTS.maxLongitudNombreCaja}
          placeholder="Ej: Caja Principal"
          required
          error={fieldError('nombreCaja')}
        />
        <div className="flex justify-end mt-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formData.nombreCaja.length}/{CAJA_CONSTRAINTS.maxLongitudNombreCaja}
          </span>
        </div>
      </div>

      {/* Moneda */}
      <div>
        <Select
          label="Moneda"
          value={formData.monedaIdCaja}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, monedaIdCaja: e.target.value }));
            handleBlur('monedaIdCaja');
          }}
          options={[
            { value: '', label: 'Seleccionar moneda' },
            ...currencies.filter(c => c.isActive).map((currency) => ({
              value: currency.id,
              label: `${currency.code} - ${currency.name}`
            }))
          ]}
          error={fieldError('monedaIdCaja')}
          helperText={fieldError('monedaIdCaja')}
          required
        />
      </div>

      {/* Medios de Pago */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Medios de Pago Permitidos {formData.habilitadaCaja && <span className="text-red-500">*</span>}
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
        <Input
          label="Límite Máximo"
          type="number"
          min={CAJA_CONSTRAINTS.LIMITE_MIN}
          step="0.01"
          value={formData.limiteMaximoCaja}
          onChange={(e) => setFormData(prev => ({ ...prev, limiteMaximoCaja: parseFloat(e.target.value) || 0 }))}
          onBlur={() => handleBlur('limiteMaximoCaja')}
          required
          error={fieldError('limiteMaximoCaja')}
        />

        <Input
          label="Margen de Descuadre (%)"
          type="number"
          min={CAJA_CONSTRAINTS.MARGEN_MIN}
          max={CAJA_CONSTRAINTS.MARGEN_MAX}
          step="0.1"
          value={formData.margenDescuadreCaja}
          onChange={(e) => setFormData(prev => ({ ...prev, margenDescuadreCaja: parseFloat(e.target.value) || 0 }))}
          onBlur={() => handleBlur('margenDescuadreCaja')}
          required
          error={fieldError('margenDescuadreCaja')}
          helperText={`Rango: ${CAJA_CONSTRAINTS.MARGEN_MIN}-${CAJA_CONSTRAINTS.MARGEN_MAX}%`}
        />
      </div>

      {/* Habilitada */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={formData.habilitadaCaja}
          onClick={() => {
            setFormData(prev => ({ ...prev, habilitadaCaja: !prev.habilitadaCaja }));
            setTouched(prev => new Set(prev).add('habilitadaCaja'));
          }}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${formData.habilitadaCaja ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${formData.habilitadaCaja ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Caja Habilitada
        </label>
      </div>

      {/* Observaciones */}
      <div>
        <Textarea
          label="Observaciones"
          value={formData.observacionesCaja}
          onChange={(e) => setFormData(prev => ({ ...prev, observacionesCaja: e.target.value }))}
          rows={3}
          placeholder="Notas adicionales sobre esta caja..."
        />
      </div>

      {/* Usuarios Autorizados */}
      <div>
        <UsuariosAutorizadosSelector
          value={formData.usuariosAutorizadosCaja || []}
          onChange={(selectedIds) => {
            setFormData(prev => ({ ...prev, usuariosAutorizadosCaja: selectedIds }));
            setTouched(prev => new Set(prev).add('usuariosAutorizadosCaja'));
          }}
          filterByCashPermission={true}
          disabled={isSubmitting}
          error={getFieldError(errors, 'usuariosAutorizadosCaja') || getFieldError(errors, 'usuariosAutorizados')}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="md"
          type="submit"
          disabled={isSubmitting || errors.length > 0}
        >
          {isSubmitting ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Caja')}
        </Button>
      </div>
    </form>
  );
}
