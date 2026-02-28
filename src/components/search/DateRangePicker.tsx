import { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  getDay,
  isSameDay,
  isBefore,
  isAfter,
  isWithinInterval,
  startOfDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DateRangePickerProps {
  value: { from: string; to: string };
  onChange: (range: { from: string; to: string }) => void;
  flexible?: boolean;
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

export default function DateRangePicker({
  value,
  onChange,
  flexible = false,
}: DateRangePickerProps) {
  const today = startOfDay(new Date());
  const [baseMonth, setBaseMonth] = useState(() => {
    if (value.from) {
      try {
        return startOfMonth(parseISO(value.from));
      } catch {
        return startOfMonth(today);
      }
    }
    return startOfMonth(today);
  });

  const [hovered, setHovered] = useState<Date | null>(null);
  const [selectingEnd, setSelectingEnd] = useState(false);

  const fromDate = value.from ? parseISO(value.from) : null;
  const toDate = value.to ? parseISO(value.to) : null;

  const handlePrevMonth = useCallback(() => {
    setBaseMonth((m) => subMonths(m, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setBaseMonth((m) => addMonths(m, 1));
  }, []);

  const handleDayClick = useCallback(
    (day: Date) => {
      if (isBefore(day, today)) return;

      if (!selectingEnd || !fromDate) {
        // Selecting departure date
        onChange({
          from: format(day, 'yyyy-MM-dd'),
          to: '',
        });
        setSelectingEnd(true);
      } else {
        // Selecting return date
        if (isBefore(day, fromDate)) {
          // Clicked before departure, reset departure
          onChange({
            from: format(day, 'yyyy-MM-dd'),
            to: '',
          });
        } else {
          onChange({
            from: value.from,
            to: format(day, 'yyyy-MM-dd'),
          });
          setSelectingEnd(false);
        }
      }
    },
    [selectingEnd, fromDate, today, onChange, value.from],
  );

  const months = useMemo(
    () => [baseMonth, addMonths(baseMonth, 1)],
    [baseMonth],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Mes anterior"
        >
          <ChevronLeft />
        </button>

        <div className="flex items-center gap-6">
          {months.map((m) => (
            <span
              key={m.toISOString()}
              className="text-sm font-semibold text-gray-700 capitalize"
            >
              {format(m, "MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          ))}
        </div>

        <button
          onClick={handleNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Proximo mes"
        >
          <ChevronRight />
        </button>
      </div>

      {/* Two month grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {months.map((month) => (
          <MonthGrid
            key={month.toISOString()}
            month={month}
            today={today}
            fromDate={fromDate}
            toDate={toDate}
            hovered={hovered}
            selectingEnd={selectingEnd}
            onDayClick={handleDayClick}
            onDayHover={setHovered}
          />
        ))}
      </div>

      {/* Selected range summary */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600 inline-block" />
            <span className="text-gray-600">
              Ida:{' '}
              {fromDate ? (
                <span className="font-medium text-gray-900">
                  {format(fromDate, 'dd/MM/yyyy')}
                </span>
              ) : (
                <span className="text-gray-400">Selecione</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" />
            <span className="text-gray-600">
              Volta:{' '}
              {toDate ? (
                <span className="font-medium text-gray-900">
                  {format(toDate, 'dd/MM/yyyy')}
                </span>
              ) : (
                <span className="text-gray-400">Selecione</span>
              )}
            </span>
          </div>
        </div>

        {flexible && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            Datas flexiveis
          </span>
        )}
      </div>
    </div>
  );
}

function MonthGrid({
  month,
  today,
  fromDate,
  toDate,
  hovered,
  selectingEnd,
  onDayClick,
  onDayHover,
}: {
  month: Date;
  today: Date;
  fromDate: Date | null;
  toDate: Date | null;
  hovered: Date | null;
  selectingEnd: boolean;
  onDayClick: (day: Date) => void;
  onDayHover: (day: Date | null) => void;
}) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });
  const startPadding = getDay(start);

  const paddedDays: (Date | null)[] = [
    ...Array.from<null>({ length: startPadding }).fill(null),
    ...days,
  ];

  return (
    <div>
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-gray-400 font-medium py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {paddedDays.map((day, i) => {
          if (!day) {
            return <div key={`pad-${i}`} className="aspect-square" />;
          }

          const isPast = isBefore(day, today);
          const isFrom = fromDate ? isSameDay(day, fromDate) : false;
          const isTo = toDate ? isSameDay(day, toDate) : false;

          // Determine if this day is in the range
          let inRange = false;
          if (fromDate && toDate) {
            inRange =
              isWithinInterval(day, { start: fromDate, end: toDate }) &&
              !isFrom &&
              !isTo;
          } else if (
            fromDate &&
            !toDate &&
            selectingEnd &&
            hovered &&
            isAfter(hovered, fromDate)
          ) {
            inRange =
              isWithinInterval(day, { start: fromDate, end: hovered }) &&
              !isFrom &&
              !isSameDay(day, hovered);
          }

          const isHoveredEnd =
            hovered &&
            isSameDay(day, hovered) &&
            selectingEnd &&
            !toDate &&
            fromDate &&
            isAfter(hovered, fromDate);

          let dayClasses =
            'aspect-square flex items-center justify-center text-xs rounded-lg transition-colors relative ';

          if (isPast) {
            dayClasses += 'text-gray-300 cursor-not-allowed';
          } else if (isFrom) {
            dayClasses +=
              'bg-blue-600 text-white font-bold cursor-pointer';
          } else if (isTo) {
            dayClasses +=
              'bg-blue-400 text-white font-bold cursor-pointer';
          } else if (isHoveredEnd) {
            dayClasses +=
              'bg-blue-200 text-blue-800 font-medium cursor-pointer';
          } else if (inRange) {
            dayClasses +=
              'bg-blue-50 text-blue-700 cursor-pointer';
          } else {
            dayClasses +=
              'text-gray-700 hover:bg-gray-100 cursor-pointer';
          }

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={dayClasses}
              onClick={() => !isPast && onDayClick(day)}
              onMouseEnter={() => !isPast && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
            >
              {format(day, 'd')}
              {isSameDay(day, today) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
