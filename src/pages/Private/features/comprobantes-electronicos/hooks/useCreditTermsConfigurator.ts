import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfigurationContext } from '../../configuracion-sistema/contexto/ContextoConfiguracion';
import type {
  CreditInstallmentDefinition,
  CuotaCalendarioCredito,
  ModoCronogramaCredito,
} from '../../../../../shared/payments/paymentTerms';
import {
  buildCreditScheduleFromDefinition,
  validateCreditSchedule,
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

  const scheduleMode: ModoCronogramaCredito = paymentMethod?.creditScheduleModo ?? 'plantilla';

  const defaultTemplates = useMemo<CreditInstallmentDefinition[]>(
    () => (
      isCreditMethod && scheduleMode === 'plantilla' && paymentMethod?.creditSchedule
        ? paymentMethod.creditSchedule
        : []
    ),
    [isCreditMethod, paymentMethod?.creditSchedule, scheduleMode],
  );

  const defaultCalendario = useMemo<CuotaCalendarioCredito[]>(
    () => (
      isCreditMethod && scheduleMode === 'calendario' && paymentMethod?.creditScheduleCalendario
        ? paymentMethod.creditScheduleCalendario
        : []
    ),
    [isCreditMethod, paymentMethod?.creditScheduleCalendario, scheduleMode],
  );

  const [templates, setTemplates] = useState<CreditInstallmentDefinition[]>(defaultTemplates);
  const [calendarTemplates, setCalendarTemplates] = useState<CuotaCalendarioCredito[]>(defaultCalendario);
  const lastMethodIdRef = useRef<string | null>(paymentMethod?.id ?? null);

  useEffect(() => {
    if (!isCreditMethod) {
      setTemplates([]);
      lastMethodIdRef.current = null;
      return;
    }

    if (lastMethodIdRef.current !== paymentMethod?.id) {
      setTemplates(defaultTemplates);
      setCalendarTemplates(defaultCalendario);
      lastMethodIdRef.current = paymentMethod?.id ?? null;
    }
  }, [defaultCalendario, defaultTemplates, isCreditMethod, paymentMethod?.id]);

  const schedule = useMemo(() => {
    if (!isCreditMethod) {
      return null;
    }

    return buildCreditScheduleFromDefinition({
      modo: scheduleMode,
      plantilla: scheduleMode === 'plantilla' ? templates : undefined,
      calendario: scheduleMode === 'calendario' ? calendarTemplates : undefined,
      issueDate,
      total,
    });
  }, [calendarTemplates, isCreditMethod, issueDate, scheduleMode, templates, total]);

  const errors = useMemo(() => {
    if (!isCreditMethod) {
      return [];
    }
    return validateCreditSchedule(
      scheduleMode === 'calendario' ? calendarTemplates : templates,
      scheduleMode,
      scheduleMode === 'calendario' ? total : undefined,
    );
  }, [calendarTemplates, isCreditMethod, scheduleMode, templates, total]);

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
    if (scheduleMode === 'plantilla') {
      setTemplates(next);
    }
  };

  const restoreDefaults = () => {
    if (scheduleMode === 'plantilla') {
      setTemplates(defaultTemplates);
      return;
    }
    setCalendarTemplates(defaultCalendario);
  };

  return {
    paymentMethod,
    isCreditMethod,
    templates,
    calendarTemplates,
    schedule,
    errors,
    creditTerms,
    scheduleMode,
    setTemplates: updateTemplates,
    setCalendarTemplates,
    restoreDefaults,
  };
};
