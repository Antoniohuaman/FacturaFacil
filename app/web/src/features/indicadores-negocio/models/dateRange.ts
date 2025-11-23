export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

export const createCurrentMonthRange = (): DateRange => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  start.setHours(12, 0, 0, 0);
  end.setHours(12, 0, 0, 0);
  return { startDate: start, endDate: end, label: 'Este mes' };
};
