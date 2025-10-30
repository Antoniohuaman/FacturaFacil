/* eslint-disable @typescript-eslint/no-explicit-any -- boundary legacy; pendiente tipado */
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<Date | null>(value?.startDate || null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(value?.endDate || null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Presets rápidos
  const presets = [
    {
      label: 'Hoy',
      getValue: () => {
        const today = new Date();
        return { startDate: today, endDate: today, label: 'Hoy' };
      }
    },
    {
      label: 'Últimos 7 días',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return { startDate: start, endDate: end, label: 'Últimos 7 días' };
      }
    },
    {
      label: 'Este mes',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { startDate: start, endDate: end, label: 'Este mes' };
      }
    },
    {
      label: 'Últimos 30 días',
      getValue: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { startDate: start, endDate: end, label: 'Últimos 30 días' };
      }
    },
    {
      label: 'Mes anterior',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { startDate: start, endDate: end, label: 'Mes anterior' };
      }
    }
  ];

  // Formatear fecha para mostrar
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Formatear rango para el display
  const formatRange = () => {
    if (!selectedStart || !selectedEnd) return 'Seleccionar período';
    if (selectedStart.toDateString() === selectedEnd.toDateString()) {
      return formatDate(selectedStart);
    }
    return `${formatDate(selectedStart)} – ${formatDate(selectedEnd)}`;
  };

  // Generar días del calendario
  const generateCalendarDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Verificar si una fecha está en el rango seleccionado o hover
  const isInRange = (date: Date) => {
    if (!selectedStart) return false;
    
    const end = selectedEnd || hoverDate;
    if (!end) return false;
    
    const start = selectedStart < end ? selectedStart : end;
    const finish = selectedStart < end ? end : selectedStart;
    
    return date >= start && date <= finish;
  };

  // Verificar si es fecha de inicio o fin
  const isRangeStart = (date: Date) => {
    if (!selectedStart) return false;
    return date.toDateString() === selectedStart.toDateString();
  };

  const isRangeEnd = (date: Date) => {
    if (!selectedEnd) return false;
    return date.toDateString() === selectedEnd.toDateString();
  };

  // Manejar clic en fecha
  const handleDateClick = (date: Date) => {
    if (!selectedStart || selectedEnd) {
      setSelectedStart(date);
      setSelectedEnd(null);
    } else {
      if (date < selectedStart) {
        setSelectedEnd(selectedStart);
        setSelectedStart(date);
      } else {
        setSelectedEnd(date);
      }
    }
  };

  // Aplicar selección
  const applySelection = () => {
    if (selectedStart && selectedEnd) {
      const range: DateRange = {
        startDate: selectedStart,
        endDate: selectedEnd,
        label: 'Personalizado'
      };
      onChange(range);
      setIsOpen(false);
    }
  };

  // Manejar preset
  const handlePreset = (preset: any) => {
    const range = preset.getValue();
    setSelectedStart(range.startDate);
    setSelectedEnd(range.endDate);
    onChange(range);
    setIsOpen(false);
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const currentMonthDays = generateCalendarDays(currentMonth);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const nextMonthDays = generateCalendarDays(nextMonth);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Campo de entrada */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 flex items-center space-x-2 px-4 border border-slate-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-w-[240px] hover:border-slate-400 dark:hover:border-gray-500 transition-colors"
      >
        <Calendar className="w-4 h-4 text-slate-500 dark:text-gray-400" />
        <span className="flex-1 text-left text-slate-700 dark:text-gray-200 font-medium">
          {formatRange()}
        </span>
        <ChevronRight 
          className={`w-4 h-4 text-slate-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
        />
      </button>

      {/* Popover con calendario */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-slate-200 dark:border-gray-600 z-50 p-4 min-w-[600px]">
          <div className="flex">
            {/* Panel izquierdo: Presets */}
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

            {/* Panel derecho: Calendarios */}
            <div className="flex-1 pl-4">
              <div className="flex space-x-4">
                {/* Calendario mes actual */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <div className="w-6"></div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {currentMonthDays.map((date, index) => {
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = isRangeStart(date) || isRangeEnd(date);
                      const isInCurrentRange = isInRange(date);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => isCurrentMonth && handleDateClick(date)}
                          onMouseEnter={() => setHoverDate(date)}
                          className={`
                            w-8 h-8 text-sm rounded-md transition-colors
                            ${!isCurrentMonth ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}
                            ${isToday ? 'font-bold text-blue-600' : ''}
                            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                            ${isInCurrentRange && !isSelected ? 'bg-blue-50 text-blue-700' : ''}
                          `}
                          disabled={!isCurrentMonth}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calendario mes siguiente */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-6"></div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthNames[nextMonth.getMonth()]} {nextMonth.getFullYear()}
                    </h3>
                    <button
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
                      <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {nextMonthDays.map((date, index) => {
                      const isCurrentMonth = date.getMonth() === nextMonth.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = isRangeStart(date) || isRangeEnd(date);
                      const isInCurrentRange = isInRange(date);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => isCurrentMonth && handleDateClick(date)}
                          onMouseEnter={() => setHoverDate(date)}
                          className={`
                            w-8 h-8 text-sm rounded-md transition-colors
                            ${!isCurrentMonth ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'}
                            ${isToday ? 'font-bold text-blue-600' : ''}
                            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                            ${isInCurrentRange && !isSelected ? 'bg-blue-50 text-blue-700' : ''}
                          `}
                          disabled={!isCurrentMonth}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => {
                    setSelectedStart(null);
                    setSelectedEnd(null);
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
                    disabled={!selectedStart || !selectedEnd}
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