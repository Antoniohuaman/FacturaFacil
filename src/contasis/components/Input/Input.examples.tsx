import { useState } from 'react';
import { FileText, Search, Mail, Building2 } from 'lucide-react';
import { Input } from './Input';

/**
 * Ejemplos de uso del componente Input integrado con variants de validación
 */

// ============================================================================
// EJEMPLO 1: Formulario RUC Completo (Usando Input integrado)
// ============================================================================
export function FormularioRUCCompleto() {
  const [ruc, setRuc] = useState('20508997567');
  const [isValidated, setIsValidated] = useState(true);
  const [razonSocial, setRazonSocial] = useState('CONTASIS S.A.C.');
  const [isLoading, setIsLoading] = useState(false);

  const handleConsultar = async () => {
    setIsLoading(true);
    
    // Simular llamada a API SUNAT
    setTimeout(() => {
      setIsValidated(true);
      setRazonSocial('CONTASIS S.A.C.');
      setIsLoading(false);
    }, 2000);
  };

  const handleRUCChange = (value: string) => {
    setRuc(value);
    // Si cambia el RUC, resetear validación
    if (value !== '20508997567') {
      setIsValidated(false);
      setRazonSocial('');
    }
  };

  return (
    <div className="max-w-2xl bg-surface-1 rounded-lg p-8 border border-strong">
      <h3 className="text-xl font-bold text-primary mb-6">
        Datos Legales y Tributarios
      </h3>
      
      <div className="space-y-6">
        {/* RUC - Validado pero Editable */}
        <div>
          {isValidated ? (
            <Input
              label="RUC"
              required
              value={ruc}
              maxLength={11}
              leftIcon={<FileText size={18} />}
              variant="validated-editable"
              validationMessage={{
                title: "RUC Validado Correctamente",
                description: "RUC válido. Datos completados automáticamente desde SUNAT."
              }}
              showValidationMessage
              onChange={(e) => setRuc(e.target.value)}
              onValueChange={handleRUCChange}
            />
          ) : (
            <div>
              <label className="block text-ui-base font-medium mb-2 text-tertiary">
                RUC <span className="text-error">*</span>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <FileText 
                    size={18} 
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" 
                  />
                  <input
                    type="text"
                    value={ruc}
                    onChange={(e) => setRuc(e.target.value)}
                    maxLength={11}
                    placeholder="Ingrese RUC de 11 dígitos"
                    className="w-full h-10 pl-11 pr-4 font-sans border border-strong rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary hover:border-strong bg-surface-1 text-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleConsultar}
                  disabled={ruc.length !== 11 || isLoading}
                  className="px-6 h-10 text-ui-base font-medium bg-primary-brand text-white rounded-lg hover:bg-primary-brand/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                >
                  <Search size={18} />
                  <span>{isLoading ? 'Consultando...' : 'Consultar'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Razón Social - Validado y Readonly (Solo Informativo) */}
        {isValidated && (
          <Input
            label="Razón Social"
            required
            value={razonSocial}
            variant="validated-readonly"
            helperText="Auto-completado desde SUNAT"
            readOnly
          />
        )}

        {/* Nombre Comercial - Campo Editable Normal */}
        <Input
          label="Nombre Comercial"
          placeholder="Opcional"
        />
      </div>
    </div>
  );
}

// ============================================================================
// EJEMPLO 2: Comparación de Variantes (Input integrado)
// ============================================================================
export function ComparacionVariantes() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Editable */}
      <div className="bg-surface-1 rounded-lg p-6 border border-strong">
        <h3 className="text-lg font-bold text-primary mb-4">
          variant="validated-editable"
        </h3>
        <p className="text-ui-sm text-secondary mb-4">
          Validado pero EDITABLE - El usuario puede cambiar el valor
        </p>
        
        <Input
          label="RUC"
          required
          value="20508997567"
          leftIcon={<FileText size={18} />}
          variant="validated-editable"
          validationMessage={{
            title: "RUC Validado Correctamente"
          }}
          showValidationMessage
        />

        <div className="mt-4 p-3 bg-surface-2 rounded text-caption text-secondary">
          <strong>Características:</strong>
          <ul className="list-disc ml-4 mt-1">
            <li>Border verde sólido (border-2)</li>
            <li>Fondo blanco (editable)</li>
            <li>Cursor text</li>
            <li>Permite edición</li>
            <li>Check verde visible</li>
          </ul>
        </div>
      </div>

      {/* Readonly */}
      <div className="bg-surface-1 rounded-lg p-6 border border-strong">
        <h3 className="text-lg font-bold text-primary mb-4">
          variant="validated-readonly"
        </h3>
        <p className="text-ui-sm text-secondary mb-4">
          Validado y READONLY - Solo informativo, no editable
        </p>
        
        <Input
          label="Razón Social"
          required
          value="CONTASIS S.A.C."
          variant="validated-readonly"
          helperText="Auto-completado desde SUNAT"
          readOnly
        />

        <div className="mt-4 p-3 bg-surface-2 rounded text-caption text-secondary">
          <strong>Características:</strong>
          <ul className="list-disc ml-4 mt-1">
            <li>Border verde sutil (border-success/40)</li>
            <li>Fondo gris claro (readonly)</li>
            <li>Cursor default</li>
            <li>No editable</li>
            <li>Check verde visible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EJEMPLO 3: Múltiples Campos Auto-completados
// ============================================================================
export function FormularioAutocompletado() {
  return (
    <div className="max-w-2xl bg-surface-1 rounded-lg p-8 border border-strong">
      <h3 className="text-xl font-bold text-primary mb-6">
        Datos de la Empresa
      </h3>
      
      <div className="space-y-6">
        {/* RUC - Editable */}
        <Input
          label="RUC"
          required
          value="20508997567"
          leftIcon={<FileText size={18} />}
          variant="validated-editable"
        />

        {/* Todos los demás campos readonly */}
        <Input
          label="Razón Social"
          required
          value="CONTASIS S.A.C."
          variant="validated-readonly"
          helperText="Auto-completado desde SUNAT"
          readOnly
        />

        <Input
          label="Dirección Fiscal"
          value="Av. Javier Prado Este 123, San Isidro, Lima"
          variant="validated-readonly"
          helperText="Auto-completado desde SUNAT"
          readOnly
        />

        <Input
          label="Estado"
          value="ACTIVO"
          variant="validated-readonly"
          helperText="Auto-completado desde SUNAT"
          readOnly
        />

        <Input
          label="Condición"
          value="HABIDO"
          variant="validated-readonly"
          helperText="Auto-completado desde SUNAT"
          readOnly
        />
      </div>
    </div>
  );
}

// ============================================================================
// EJEMPLO 4: Email Verificado (Editable)
// ============================================================================
export function EmailVerificado() {
  const [email, setEmail] = useState('contacto@contasis.com');
  const [isVerified, setIsVerified] = useState(true);

  return (
    <div className="max-w-md">
      <Input
        label="Correo Electrónico"
        required
        type="email"
        value={email}
        leftIcon={<Mail size={18} />}
        variant="validated-editable"
        validationMessage={{
          title: "Email Verificado",
          description: "Hemos enviado un código de confirmación a este correo."
        }}
        showValidationMessage
        onChange={(e) => setEmail(e.target.value)}
        onValueChange={(value) => {
          // Si cambia el email, resetear verificación
          if (value !== 'contacto@contasis.com') {
            setIsVerified(false);
          }
        }}
      />
    </div>
  );
}

// ============================================================================
// EJEMPLO 5: Flujo Completo con Estados
// ============================================================================
export function FlujoCompletoEstados() {
  const [step, setStep] = useState<'unvalidated' | 'loading' | 'validated'>('unvalidated');
  const [ruc, setRuc] = useState('');

  const handleValidate = () => {
    setStep('loading');
    setTimeout(() => {
      setStep('validated');
      setRuc('20508997567');
    }, 2000);
  };

  return (
    <div className="max-w-md space-y-4">
      <h3 className="text-lg font-bold text-primary">Flujo de Validación</h3>
      
      {/* Estado: Sin Validar */}
      {step === 'unvalidated' && (
        <div>
          <label className="block text-ui-base font-medium mb-2 text-tertiary">
            RUC <span className="text-error">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={ruc}
              onChange={(e) => setRuc(e.target.value)}
              maxLength={11}
              placeholder="Ingrese RUC"
              className="flex-1 h-10 pl-4 pr-4 font-sans border border-strong rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary bg-surface-1 text-primary"
            />
            <button
              onClick={handleValidate}
              disabled={ruc.length !== 11}
              className="px-6 h-10 bg-primary-brand text-white rounded-lg hover:bg-primary-brand/90 disabled:opacity-50"
            >
              Consultar
            </button>
          </div>
        </div>
      )}

      {/* Estado: Loading */}
      {step === 'loading' && (
        <div>
          <label className="block text-ui-base font-medium mb-2 text-tertiary">
            RUC <span className="text-error">*</span>
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={ruc}
              readOnly
              className="flex-1 h-10 pl-4 pr-4 font-sans border-2 border-primary rounded-lg bg-surface-1 text-primary"
            />
            <button
              disabled
              className="px-6 h-10 bg-primary-brand text-white rounded-lg opacity-75 flex items-center gap-2"
            >
              <span className="animate-spin">⏳</span>
              <span>Consultando...</span>
            </button>
          </div>
        </div>
      )}

      {/* Estado: Validado */}
      {step === 'validated' && (
        <>
          <Input
            label="RUC"
            required
            value={ruc}
            leftIcon={<FileText size={18} />}
            variant="validated-editable"
            validationMessage={{
              title: "RUC Validado Correctamente"
            }}
            showValidationMessage
            onValueChange={() => setStep('unvalidated')}
          />
          
          <Input
            label="Razón Social"
            value="CONTASIS S.A.C."
            variant="validated-readonly"
            helperText="Auto-completado desde SUNAT"
            readOnly
          />
        </>
      )}
    </div>
  );
}