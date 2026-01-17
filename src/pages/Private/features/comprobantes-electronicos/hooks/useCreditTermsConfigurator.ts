import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/context/ConfigurationContext';
import type { CreditInstallmentDefinition } from '../../../../../shared/payments/paymentTerms';
import {
  buildCreditScheduleFromTemplate,
  validateCreditScheduleTemplate,
} from '../../../../../shared/payments/paymentTerms';
import type { ComprobanteCreditTerms } from '../models/comprobante.types';

interface UseCreditTermsConfiguratorParams {
  paymentMethodId?: string | null;
  total: number;
  issueDate?: string;
}

export const useCreditTermsConfigurator = ({
  paymentMethodId,
  total,
  issueDate,
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

  useEffect(() => {
    if (!isCreditMethod) {
      setTemplates([]);
      lastMethodIdRef.current = null;
      return;
    }

    if (lastMethodIdRef.current !== paymentMethod?.id) {
      setTemplates(defaultTemplates);
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
