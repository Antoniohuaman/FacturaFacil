// src/features/configuration/components/business/TaxesSection.tsx
import { useState } from 'react';
import { Receipt, Calculator, AlertCircle, Info, CheckCircle, Settings } from 'lucide-react';
import { SettingsToggle } from '../common/SettingsToggle';
import { DefaultSelector } from '../common/DefaultSelector';
import { ConfigurationCard } from '../common/ConfigurationCard';

// Interface temporal para configuración de impuestos hasta que se agregue oficialmente
interface TaxConfiguration {
  pricesIncludeTax: boolean;
  affectations: {
    igv: {
      isActive: boolean;
      isDefault: boolean;
    };
    exempt: {
      isActive: boolean;
      isDefault: boolean;
    };
    unaffected: {
      isActive: boolean;
      isDefault: boolean;
    };
  };
}

interface TaxesSectionProps {
  taxConfiguration: TaxConfiguration;
  onUpdate: (config: TaxConfiguration) => Promise<void>;
  isLoading?: boolean;
}

export function TaxesSection({ 
  taxConfiguration, 
  onUpdate, 
  isLoading = false 
}: TaxesSectionProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePriceToggle = async (includeTax: boolean) => {
    setIsUpdating(true);
    try {
      const updatedConfig = {
        ...taxConfiguration,
        pricesIncludeTax: includeTax
      };
      await onUpdate(updatedConfig);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAffectationToggle = async (
    type: 'igv' | 'exempt' | 'unaffected', 
    field: 'isActive' | 'isDefault'
  ) => {
    setIsUpdating(true);
    try {
      let updatedAffectations = { ...taxConfiguration.affectations };
      
      if (field === 'isDefault') {
        // Only one can be default at a time
        Object.keys(updatedAffectations).forEach(key => {
          const affectationKey = key as keyof typeof updatedAffectations;
          updatedAffectations[affectationKey] = {
            ...updatedAffectations[affectationKey],
            isDefault: key === type
          };
        });
      } else {
        // Toggle active status
        updatedAffectations[type] = {
          ...updatedAffectations[type],
          [field]: !updatedAffectations[type][field]
        };

        // If we're deactivating the default affectation, set IGV as default
        if (!updatedAffectations[type][field] && updatedAffectations[type].isDefault) {
          updatedAffectations.igv.isDefault = true;
          updatedAffectations[type].isDefault = false;
        }
      }

      const updatedConfig = {
        ...taxConfiguration,
        affectations: updatedAffectations
      };
      await onUpdate(updatedConfig);
    } finally {
      setIsUpdating(false);
    }
  };

  const getAffectationStatus = (type: 'igv' | 'exempt' | 'unaffected') => {
    const affectation = taxConfiguration.affectations[type];
    if (!affectation.isActive) return 'inactive';
    if (affectation.isDefault) return 'default';
    return 'active';
  };

  const getExampleCalculation = () => {
    const basePrice = 100;
    const igvRate = 0.18; // 18%
    
    if (taxConfiguration.pricesIncludeTax) {
      // Prices include IGV
      const priceWithIgv = basePrice;
      const priceWithoutIgv = basePrice / (1 + igvRate);
      const igvAmount = priceWithIgv - priceWithoutIgv;
      
      return {
        display: `S/ ${basePrice.toFixed(2)}`,
        breakdown: `Base: S/ ${priceWithoutIgv.toFixed(2)} + IGV: S/ ${igvAmount.toFixed(2)} = S/ ${priceWithIgv.toFixed(2)}`
      };
    } else {
      // Prices don't include IGV
      const priceWithoutIgv = basePrice;
      const igvAmount = priceWithoutIgv * igvRate;
      const priceWithIgv = priceWithoutIgv + igvAmount;
      
      return {
        display: `S/ ${priceWithoutIgv.toFixed(2)}`,
        breakdown: `Base: S/ ${priceWithoutIgv.toFixed(2)} + IGV: S/ ${igvAmount.toFixed(2)} = S/ ${priceWithIgv.toFixed(2)}`
      };
    }
  };

  const example = getExampleCalculation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Receipt className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">Modo de precios (IGV)</h3>
      </div>

      {/* Price Configuration */}
      <ConfigurationCard
        title="Configuración de Precios"
        description="Define si los precios de tus productos incluyen o no el IGV"
        icon={Calculator}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* With IGV Option */}
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                taxConfiguration.pricesIncludeTax
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => handlePriceToggle(true)}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={taxConfiguration.pricesIncludeTax}
                  onChange={() => handlePriceToggle(true)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isUpdating}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Precios con IGV</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Los precios que ingresas ya incluyen el IGV (18%)
                  </p>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Ejemplo:</p>
                    <p className="font-mono text-sm text-gray-900">
                      Precio ingresado: S/ 100.00 (incluye IGV)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Without IGV Option */}
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                !taxConfiguration.pricesIncludeTax
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              onClick={() => handlePriceToggle(false)}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={!taxConfiguration.pricesIncludeTax}
                  onChange={() => handlePriceToggle(false)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  disabled={isUpdating}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">Precios sin IGV</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Los precios que ingresas no incluyen IGV, se calcula automáticamente
                  </p>
                  <div className="mt-3 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Ejemplo:</p>
                    <p className="font-mono text-sm text-gray-900">
                      Precio base: S/ 100.00 + IGV: S/ 18.00 = S/ 118.00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calculator className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-gray-900">Ejemplo de Cálculo</h4>
            </div>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="text-gray-600">Precio mostrado al cliente:</span>
                <span className="ml-2 font-mono font-semibold">{example.display}</span>
              </p>
              <p className="text-xs text-gray-500">{example.breakdown}</p>
            </div>
          </div>
        </div>
      </ConfigurationCard>

      {/* Tax Affectations */}
      <ConfigurationCard
        title="Afectaciones Tributarias"
        description="Configura los tipos de afectación fiscal disponibles para tus productos"
        icon={Settings}
      >
        <div className="space-y-6">
          {/* IGV Affectation */}
          <div className={`p-4 border rounded-lg transition-all ${
            getAffectationStatus('igv') === 'default' 
              ? 'border-green-300 bg-green-50' 
              : getAffectationStatus('igv') === 'active'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">IGV (18%)</h4>
                  <p className="text-sm text-gray-600">
                    Impuesto General a las Ventas - Afectación estándar
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <SettingsToggle
                  enabled={taxConfiguration.affectations.igv.isActive}
                  onToggle={() => handleAffectationToggle('igv', 'isActive')}
                  label=""
                  disabled={isUpdating}
                />
                
                <DefaultSelector
                  isDefault={taxConfiguration.affectations.igv.isDefault}
                  onSetDefault={() => handleAffectationToggle('igv', 'isDefault')}
                  disabled={!taxConfiguration.affectations.igv.isActive || isUpdating}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Exempt Affectation */}
          <div className={`p-4 border rounded-lg transition-all ${
            getAffectationStatus('exempt') === 'default' 
              ? 'border-green-300 bg-green-50' 
              : getAffectationStatus('exempt') === 'active'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Exonerado</h4>
                  <p className="text-sm text-gray-600">
                    Productos con exoneración legal del IGV
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <SettingsToggle
                  enabled={taxConfiguration.affectations.exempt.isActive}
                  onToggle={() => handleAffectationToggle('exempt', 'isActive')}
                  label=""
                  disabled={isUpdating}
                />
                
                <DefaultSelector
                  isDefault={taxConfiguration.affectations.exempt.isDefault}
                  onSetDefault={() => handleAffectationToggle('exempt', 'isDefault')}
                  disabled={!taxConfiguration.affectations.exempt.isActive || isUpdating}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Unaffected Affectation */}
          <div className={`p-4 border rounded-lg transition-all ${
            getAffectationStatus('unaffected') === 'default' 
              ? 'border-green-300 bg-green-50' 
              : getAffectationStatus('unaffected') === 'active'
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Inafecto</h4>
                  <p className="text-sm text-gray-600">
                    Productos no sujetos al pago de IGV por naturaleza
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <SettingsToggle
                  enabled={taxConfiguration.affectations.unaffected.isActive}
                  onToggle={() => handleAffectationToggle('unaffected', 'isActive')}
                  label=""
                  disabled={isUpdating}
                />
                
                <DefaultSelector
                  isDefault={taxConfiguration.affectations.unaffected.isDefault}
                  onSetDefault={() => handleAffectationToggle('unaffected', 'isDefault')}
                  disabled={!taxConfiguration.affectations.unaffected.isActive || isUpdating}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Active Affectations Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Estado de Afectaciones</h4>
                <div className="mt-2 space-y-1">
                  {Object.entries(taxConfiguration.affectations).map(([key, affectation]) => {
                    const labels = {
                      igv: 'IGV',
                      exempt: 'Exonerado',
                      unaffected: 'Inafecto'
                    };
                    
                    // Tipado explícito para evitar error de TypeScript
                    const typedAffectation = affectation as { isActive: boolean; isDefault: boolean };
                    
                    return (
                      <div key={key} className="flex items-center space-x-2 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          !typedAffectation.isActive 
                            ? 'bg-gray-400' 
                            : typedAffectation.isDefault 
                              ? 'bg-green-500' 
                              : 'bg-blue-500'
                        }`}></span>
                        <span className="text-blue-800">
                          {labels[key as keyof typeof labels]}: 
                          <span className="ml-1 font-medium">
                            {!typedAffectation.isActive 
                              ? 'Desactivado' 
                              : typedAffectation.isDefault 
                                ? 'Por defecto' 
                                : 'Disponible'
                            }
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-blue-800 mt-3">
                  La afectación por defecto se aplicará automáticamente a nuevos productos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ConfigurationCard>

      {/* Help and Documentation */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Importante sobre Configuración Fiscal</h4>
            <ul className="text-sm text-amber-800 mt-2 space-y-1">
              <li>• La configuración de precios afecta cómo se muestran y calculan los importes en todo el sistema</li>
              <li>• Al menos una afectación debe estar activa y marcada como por defecto</li>
              <li>• Los cambios en afectaciones no afectan productos ya creados, solo nuevos productos</li>
              <li>• La afectación IGV es obligatoria y no se puede desactivar completamente</li>
              <li>• Consulta con un contador si no estás seguro de la configuración fiscal correcta</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}