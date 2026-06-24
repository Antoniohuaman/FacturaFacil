import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type { CreditInstallmentDefinition } from '../../../../../shared/payments/paymentTerms';
import {
  buildCreditScheduleFromTemplate,
  validateCreditScheduleTemplate,
} from '../../../../../shared/payments/paymentTerms';
import type { ComprobanteCreditTerms } from '../models/comprobante.types';

// Extrae las plantillas de cuota (diasCredito, porcentaje) de un cronograma existente.
function creditTermsToTemplates(creditTerms: ComprobanteCreditTerms): CreditInstallmentDefinition[] {
  return creditTerms.schedule
    .filter((c) => c.porcentaje > 0)
    .map(({ diasCredito, porcentaje }) => ({ diasCredito, porcentaje }));
}

interface UseCreditTermsConfiguratorParams {
  paymentMethodId?: string | null;
  total: number;
  issueDate?: string;
  /** Términos de crédito de una cotización o borrador para hidratar el configurador en lugar del template por defecto del método. */
  initialCreditTerms?: ComprobanteCreditTerms;
}

export const useCreditTermsConfigurator = ({
  paymentMethodId,
  total,
  issueDate,
  initialCreditTerms,
}: UseCreditTermsConfiguratorParams) => {
  const { state } = useConfigurationContext();
  const paymentMethod = state.paymentMethods.find((method) => method.id === paymentMethodId);
  const isCreditMethod = paymentMethod?.code === 'CREDITO';

  const defaultTemplates = useMemo<CreditInstallmentDefinition[]>(
    () => (isCreditMethod && paymentMethod?.creditSchedule ? paymentMethod.creditSchedule : []),
    [isCreditMethod, paymentMethod?.creditSchedule],
  );

  const [templates, setTemplates] = useState<CreditInstallmentDefinition[]>(defaultTemplates);
  const lastMethodIdRef = useRef<string | null>(paymentMethod?.id ?? null);

  // Reflejo síncrono de initialCreditTerms accesible en el efecto sin añadirlo a deps.
  const pendingExternalRef = useRef<ComprobanteCreditTerms | null>(initialCreditTerms ?? null);
  pendingExternalRef.current = initialCreditTerms ?? null;

  // Controla si ya se aplicaron los términos externos para este método.
  const hydratedFromExternalRef = useRef(false);
  // Evita re-hidratar cuando el usuario cambió a contado y volvió a crédito.
  const externalDisabledRef = useRef(false);

  useEffect(() => {
    if (!isCreditMethod) {
      setTemplates([]);
      lastMethodIdRef.current = null;
      if (hydratedFromExternalRef.current) {
        // El usuario fue a contado tras hidratar → no hidratar en el próximo cambio a crédito.
        externalDisabledRef.current = true;
      }
      hydratedFromExternalRef.current = false;
      return;
    }

    if (lastMethodIdRef.current !== paymentMethod?.id) {
      const external = pendingExternalRef.current;
      if (external?.schedule?.length && !hydratedFromExternalRef.current && !externalDisabledRef.current) {
        setTemplates(creditTermsToTemplates(external));
        hydratedFromExternalRef.current = true;
      } else {
        setTemplates(defaultTemplates);
      }
      lastMethodIdRef.current = paymentMethod?.id ?? null;
    }
  }, [defaultTemplates, isCreditMethod, paymentMethod?.id]);

  const schedule = useMemo(() => {
    if (!isCreditMethod) {
      return null;
    }

    return buildCreditScheduleFromTemplate({
      total,
      issueDate,
      templates,
    });
  }, [isCreditMethod, issueDate, templates, total]);

  const errors = useMemo(() => {
    if (!isCreditMethod) {
      return [];
    }
    return validateCreditScheduleTemplate(templates);
  }, [isCreditMethod, templates]);

  const creditTerms: ComprobanteCreditTerms | undefined = useMemo(() => {
    if (!isCreditMethod || !schedule) {
      return undefined;
    }

    return {
      schedule: schedule.cuotas,
      fechaVencimientoGlobal: schedule.fechaVencimientoGlobal,
      totalPorcentaje: schedule.totalPorcentaje,
    };
  }, [isCreditMethod, schedule]);

  const updateTemplates = (next: CreditInstallmentDefinition[]) => {
    setTemplates(next);
  };

  const restoreDefaults = () => {
    setTemplates(defaultTemplates);
  };

  return {
    paymentMethod,
    isCreditMethod,
    templates,
    schedule,
    errors,
    creditTerms,
    setTemplates: updateTemplates,
    restoreDefaults,
  };
};
