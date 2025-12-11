import { assertBusinessDate, formatDateToBusinessIso, getBusinessTodayISODate } from '@/shared/time/businessTime';

export interface DateRange {
  startDate: string;
  endDate: string;
  label: string;
}

export const createCurrentMonthRange = (): DateRange => {
  const todayIso = getBusinessTodayISODate();
  const monthStartIso = `${todayIso.slice(0, 7)}-01`;
  const monthStartDate = assertBusinessDate(monthStartIso, 'start');

  const monthEndDate = new Date(monthStartDate);
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
  monthEndDate.setUTCDate(0);

  return {
    startDate: formatDateToBusinessIso(monthStartDate),
    endDate: formatDateToBusinessIso(monthEndDate),
    label: 'Este mes',
  };
};
