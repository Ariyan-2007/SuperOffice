import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export interface DateRangeValue {
  from: string; // ISO 8601, start of day
  to: string; // ISO 8601, end of day
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function toRange(a: Date, b: Date): DateRangeValue {
  const [from, to] = a <= b ? [a, b] : [b, a];
  return { from: startOfDay(from).toISOString(), to: endOfDay(to).toISOString() };
}
function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function formatDayYear(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

interface Preset {
  label: string;
  range: () => DateRangeValue;
}

function buildPresets(minDate?: Date): Preset[] {
  const today = new Date();
  return [
    { label: "Today", range: () => toRange(today, today) },
    { label: "Last 7 days", range: () => toRange(addDays(today, -6), today) },
    { label: "Last 30 days", range: () => toRange(addDays(today, -29), today) },
    { label: "This month", range: () => toRange(new Date(today.getFullYear(), today.getMonth(), 1), today) },
    {
      label: "Last month",
      range: () => toRange(new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)),
    },
    {
      label: "This quarter",
      range: () => toRange(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1), today),
    },
    { label: "This year", range: () => toRange(new Date(today.getFullYear(), 0, 1), today) },
    { label: "All time", range: () => toRange(minDate ?? new Date(today.getFullYear() - 2, 0, 1), today) },
  ];
}

function sameRange(a: DateRangeValue, b: DateRangeValue): boolean {
  return a.from.slice(0, 10) === b.from.slice(0, 10) && a.to.slice(0, 10) === b.to.slice(0, 10);
}

function labelFor(value: DateRangeValue, presets: Preset[]): string {
  const preset = presets.find((p) => sameRange(p.range(), value));
  if (preset) return preset.label;
  const from = new Date(value.from);
  const to = new Date(value.to);
  if (isSameDay(from, to)) return formatDayYear(from);
  const sameYear = from.getFullYear() === to.getFullYear();
  return `${formatDay(from)} – ${sameYear ? formatDay(to) : formatDayYear(to)}, ${to.getFullYear()}`;
}

interface DayCell {
  date: Date;
  inMonth: boolean;
}

function buildMonthGrid(viewMonth: Date): DayCell[] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const start = addDays(firstOfMonth, -firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.getMonth() === viewMonth.getMonth() };
  });
}

// A self-drawn, theme-aware calendar — native <input type="date"> pickers are OS-styled, can't
// be themed, and vary wildly across browsers. Presets on the left cover the common cases in one
// click; the grid on the right is for everything else.
export function DateRangePicker({
  value,
  onChange,
  minDate,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  minDate?: string;
}) {
  const presets = useMemo(() => buildPresets(minDate ? new Date(minDate) : undefined), [minDate]);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => new Date(new Date(value.to).getFullYear(), new Date(value.to).getMonth(), 1));
  const [selStart, setSelStart] = useState<Date | null>(() => new Date(value.from));
  const [selEnd, setSelEnd] = useState<Date | null>(() => new Date(value.to));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    // Re-sync the working selection to the committed value every time it's reopened.
    const currentFrom = new Date(value.from);
    const currentTo = new Date(value.to);
    setSelStart(currentFrom);
    setSelEnd(currentTo);
    setHoverDate(null);
    setViewMonth(new Date(currentTo.getFullYear(), currentTo.getMonth(), 1));
    setOpen(true);
  };

  const applyPreset = (preset: Preset) => {
    onChange(preset.range());
    setOpen(false);
  };

  const pickDay = (date: Date) => {
    if (!selStart || selEnd) {
      setSelStart(date);
      setSelEnd(null);
    } else if (date < selStart) {
      setSelEnd(selStart);
      setSelStart(date);
    } else {
      setSelEnd(date);
    }
  };

  const applyCustom = () => {
    if (!selStart) return;
    onChange(toRange(selStart, selEnd ?? selStart));
    setOpen(false);
  };

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = new Date();
  const previewEnd = selStart && !selEnd ? hoverDate : selEnd;
  const rangeStart = selStart && previewEnd && previewEnd < selStart ? previewEnd : selStart;
  const rangeEnd = selStart && previewEnd ? (previewEnd < selStart ? selStart : previewEnd) : null;

  return (
    <div className="date-range-picker" ref={containerRef}>
      <button type="button" className="date-range-trigger" onClick={() => (open ? setOpen(false) : openPicker())}>
        <CalendarDays size={14} />
        <span>{labelFor(value, presets)}</span>
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="date-range-popover">
          <div className="date-range-popover-body">
            <div className="date-range-presets">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={clsx("date-range-preset", sameRange(p.range(), value) && "active")}
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="date-range-calendar">
              <div className="date-range-cal-header">
                <button type="button" className="icon-btn" onClick={() => setViewMonth((m) => addMonths(m, -1))} aria-label="Previous month">
                  <ChevronLeft size={14} />
                </button>
                <span>{viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
                <button type="button" className="icon-btn" onClick={() => setViewMonth((m) => addMonths(m, 1))} aria-label="Next month">
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="date-range-weekdays">
                {WEEKDAY_LABELS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="date-range-days" onMouseLeave={() => setHoverDate(null)}>
                {grid.map(({ date, inMonth }) => {
                  const isStart = !!rangeStart && isSameDay(date, rangeStart);
                  // No confirmed/previewed end yet — the lone anchor day reads as a single point
                  // (both ends of its own one-day range) rather than half-rounded.
                  const isEnd = rangeEnd ? isSameDay(date, rangeEnd) : isStart;
                  const inRange = !!rangeStart && !!rangeEnd && date > rangeStart && date < rangeEnd;
                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      disabled={!inMonth}
                      className={clsx(
                        "date-range-day",
                        !inMonth && "muted",
                        isSameDay(date, today) && "today",
                        isStart && "range-start",
                        isEnd && "range-end",
                        inRange && "in-range",
                      )}
                      onMouseEnter={() => setHoverDate(date)}
                      onClick={() => pickDay(date)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="date-range-footer">
            <span className="date-range-footer-summary">
              {selStart ? formatDayYear(selStart) : "Start date"} – {selEnd ? formatDayYear(selEnd) : "End date"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" disabled={!selStart} onClick={applyCustom}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
