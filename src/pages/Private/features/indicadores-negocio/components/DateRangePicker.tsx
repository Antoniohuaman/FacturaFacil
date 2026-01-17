import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange } from '../models/dateRange';
import { createCurrentMonthRange } from '../models/dateRange';
import {
  BUSINESS_TIMEZONE,
  assertBusinessDate,
  formatDateToBusinessIso,
  getBusinessTodayISODate,
  shiftBusinessDate,
} from '@/shared/time/businessTime';

type DateRangePickerProps = {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

type Preset = {
  label: string;
  getValue: () => DateRange;
};

const businessDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: BUSINESS_TIMEZONE,
});

const formatBusinessDateLabel = (businessDateIso: string) =>
  businessDateFormatter.format(assertBusinessDate(businessDateIso, 'mid'));

const getMonthStartIso = (businessDateIso: string) => `${businessDateIso.slice(0, 7)}-01`;

const shiftMonthStart = (monthStartIso: string, offset: number) => {
  const baseDate = assertBusinessDate(monthStartIso, 'start');
  baseDate.setUTCMonth(baseDate.getUTCMonth() + offset);
  baseDate.setUTCDate(1);
  return formatDateToBusinessIso(baseDate);
};

const getMonthWeekdayIndex = (monthStartIso: string) =>
  assertBusinessDate(monthStartIso, 'start').getUTCDay();

const generateCalendarDays = (monthStartIso: string) => {
  const offset = getMonthWeekdayIndex(monthStartIso);
  const firstDayIso = shiftBusinessDate(monthStartIso, -offset);
  return Array.from({ length: 42 }, (_, index) => shiftBusinessDate(firstDayIso, index));
};

const isSameBusinessMonth = (candidateIso: string, monthStartIso: string) =>
  candidateIso.slice(0, 7) === monthStartIso.slice(0, 7);

const resolveBounds = (start?: string | null, end?: string | null) => {
  if (!start || !end) {
    return null;
  }
  return start <= end
    ? { start, end }
    : { start: end, end: start };
};

const monthNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const weekdayLabels = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const initialRangeRef = useRef<DateRange>(value ?? createCurrentMonthRange());
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonthStart, setCurrentMonthStart] = useState(() =>
    getMonthStartIso(initialRangeRef.current.startDate)
  );
  const [draftStart, setDraftStart] = useState<string | null>(initialRangeRef.current.startDate);
  const [draftEnd, setDraftEnd] = useState<string | null>(initialRangeRef.current.endDate);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const todayIso = getBusinessTodayISODate();

  useEffect(() => {
    if (!value) {
      return;
    }
    setDraftStart(value.startDate);
    setDraftEnd(value.endDate);
    setCurrentMonthStart(getMonthStartIso(value.startDate));
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setHoverDate(null);
      return;
    }
    if (value) {
      setDraftStart(value.startDate);
      setDraftEnd(value.endDate);
      setCurrentMonthStart(getMonthStartIso(value.startDate));
    }
  }, [isOpen, value]);

  const presets: Preset[] = [
    {
      label: 'Hoy',
      getValue: () => {
        const today = getBusinessTodayISODate();
        return { startDate: today, endDate: today, label: 'Hoy' };
      },
    },
    {
      label: 'Últimos 7 días',
      getValue: () => {
        const end = getBusinessTodayISODate();
        const start = shiftBusinessDate(end, -6);
        return { startDate: start, endDate: end, label: 'Últimos 7 días' };
      },
    },
    {
      label: 'Este mes',
      getValue: createCurrentMonthRange,
    },
    {
      label: 'Últimos 30 días',
      getValue: () => {
        const end = getBusinessTodayISODate();
        const start = shiftBusinessDate(end, -29);
        return { startDate: start, endDate: end, label: 'Últimos 30 días' };
      },
    },
    {
      label: 'Mes anterior',
      getValue: () => {
        const currentMonth = getMonthStartIso(getBusinessTodayISODate());
        const previousMonthStart = shiftMonthStart(currentMonth, -1);
        const previousMonthEnd = shiftBusinessDate(shiftMonthStart(currentMonth, 0), -1);
        return { startDate: previousMonthStart, endDate: previousMonthEnd, label: 'Mes anterior' };
      },
    },
  ];

  const effectiveStart = value?.startDate ?? draftStart;
  const effectiveEnd = value?.endDate ?? draftEnd;

  const formatRange = () => {
    if (!effectiveStart || !effectiveEnd) {
      return 'Seleccionar período';
    }
    if (effectiveStart === effectiveEnd) {
      return formatBusinessDateLabel(effectiveStart);
    }
    return `${formatBusinessDateLabel(effectiveStart)} – ${formatBusinessDateLabel(effectiveEnd)}`;
  };

  const calendarDays = useMemo(() => generateCalendarDays(currentMonthStart), [currentMonthStart]);
  const nextMonthStart = useMemo(() => shiftMonthStart(currentMonthStart, 1), [currentMonthStart]);
  const nextMonthDays = useMemo(() => generateCalendarDays(nextMonthStart), [nextMonthStart]);

  const resolvedBounds = useMemo(() => resolveBounds(draftStart, draftEnd ?? hoverDate), [draftStart, draftEnd, hoverDate]);

  const isInRange = (businessDateIso: string) => {
    if (!resolvedBounds) {
      return false;
    }
    return businessDateIso >= resolvedBounds.start && businessDateIso <= resolvedBounds.end;
  };

  const isRangeStart = (businessDateIso: string) => !!draftStart && businessDateIso === draftStart;
  const isRangeEnd = (businessDateIso: string) => !!draftEnd && businessDateIso === draftEnd;

  const handleDateClick = (businessDateIso: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(businessDateIso);
      setDraftEnd(null);
      return;
    }

    if (businessDateIso === draftStart) {
      setDraftEnd(businessDateIso);
      return;
    }

    setDraftEnd(businessDateIso);
  };

  const applySelection = () => {
    const bounds = resolveBounds(draftStart, draftEnd);
    if (!bounds) {
      return;
    }
    const range: DateRange = {
      startDate: bounds.start,
      endDate: bounds.end,
      label: 'Personalizado',
    };
    onChange(range);
    setIsOpen(false);
    setHoverDate(null);
  };

  const handlePreset = (preset: Preset) => {
    const range = preset.getValue();
    setDraftStart(range.startDate);
    setDraftEnd(range.endDate);
    setCurrentMonthStart(getMonthStartIso(range.startDate));
    onChange(range);
    setIsOpen(false);
    setHoverDate(null);
  };

  const getMonthLabel = (monthStartIso: string) => {
    const date = assertBusinessDate(monthStartIso, 'start');
    return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  };

  const renderDayButton = (businessDateIso: string, referenceMonthIso: string) => {
    const isCurrentMonth = isSameBusinessMonth(businessDateIso, referenceMonthIso);
    const isToday = businessDateIso === todayIso;
    const isSelected = isRangeStart(businessDateIso) || isRangeEnd(businessDateIso);
    const inRange = isInRange(businessDateIso);

    return (
      <button
        key={`${referenceMonthIso}-${businessDateIso}`}
        onClick={() => isCurrentMonth && handleDateClick(businessDateIso)}
        onMouseEnter={() => isCurrentMonth && setHoverDate(businessDateIso)}
        onMouseLeave={() => setHoverDate(null)}
        className={`
          w-8 h-8 text-sm rounded-md transition-colors
          ${!isCurrentMonth ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}
          ${isToday ? 'font-bold text-blue-600' : ''}
          ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
          ${inRange && !isSelected ? 'bg-blue-50 text-blue-700' : ''}
        `}
        disabled={!isCurrentMonth}
      >
        {Number(businessDateIso.slice(8, 10))}
      </button>
    );
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 flex items-center space-x-2 px-4 border border-slate-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[240px] hover:border-slate-400 dark:hover:border-gray-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-slate-500 dark:text-gray-400" />
        <span className="flex-1 text-left text-slate-700 dark:text-gray-200 font-medium">{formatRange()}</span>
        <ChevronRight className={`w-4 h-4 text-slate-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-600 z-50 p-4 min-w-[600px]">
          <div className="flex">
            <div className="w-48 pr-4 border-r border-slate-200">
              <div className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-3">Períodos rápidos</div>
              <div className="space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-slate-700 dark:text-gray-200 hover:text-slate-900 dark:hover:text-gray-100"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 pl-4">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentMonthStart((prev) => shiftMonthStart(prev, -1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <h3 className="text-sm font-semibold text-slate-900">{getMonthLabel(currentMonthStart)}</h3>
                    <div className="w-6" />
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdayLabels.map((day) => (
                      <div key={`curr-${day}`} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((dayIso) => renderDayButton(dayIso, currentMonthStart))}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-6" />
                    <h3 className="text-sm font-semibold text-slate-900">{getMonthLabel(nextMonthStart)}</h3>
                    <button
                      onClick={() => setCurrentMonthStart((prev) => shiftMonthStart(prev, 1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdayLabels.map((day) => (
                      <div key={`next-${day}`} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {nextMonthDays.map((dayIso) => renderDayButton(dayIso, nextMonthStart))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setDraftStart(null);
                    setDraftEnd(null);
                    setIsOpen(false);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Limpiar
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={applySelection}
                    disabled={!draftStart || !draftEnd}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
export type { DateRange } from '../models/dateRange';