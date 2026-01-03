import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYear, endOfYear, isToday, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";


interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(value);

  // ✅ Detect mobile for responsive layout
  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  }, []);

  // Sync pendingRange when value changes externally
  useEffect(() => {
    setPendingRange(value);
  }, [value]);

  const presets = [
    {
      label: "Hôm nay",
      getValue: () => {
        const today = new Date();
        return {
          from: today,
          to: today,
        };
      },
    },
    {
      label: "Hôm qua",
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        return {
          from: yesterday,
          to: yesterday,
        };
      },
    },
    {
      label: "7 ngày qua",
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: "30 ngày qua",
      getValue: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
    {
      label: "Tháng này",
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: "Tháng trước",
      getValue: () => {
        const lastMonth = subDays(startOfMonth(new Date()), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
    {
      label: "Năm nay",
      getValue: () => ({
        from: startOfYear(new Date()),
        to: endOfYear(new Date()),
      }),
    },
    {
      label: "Năm trước",
      getValue: () => {
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        return {
          from: startOfYear(lastYear),
          to: endOfYear(lastYear),
        };
      },
    },
    {
      label: "Tối đa",
      getValue: () => ({
        from: startOfDay(new Date(2020, 0, 1)),
        to: endOfDay(new Date()),
      }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onChange(range);
    setIsOpen(false);
  };

  const handleRangeDateSelect = (range: DateRange | undefined) => {
    // Nếu không có range (cleared by calendar) → deselect
    if (!range?.from) {
      setPendingRange(undefined);
      return;
    }

    // Check if clicking on same single day to deselect
    if (
      pendingRange?.from &&
      pendingRange?.to &&
      isSameDay(pendingRange.from, pendingRange.to) && // đang chọn 1 ngày
      isSameDay(range.from, pendingRange.from) && // click vào chính ngày đó
      !range.to // range mới không có end date
    ) {
      // Deselect: bỏ chọn
      setPendingRange(undefined);
      return;
    }

    // Check if clicking on end date of a range to deselect it
    if (
      pendingRange?.from &&
      pendingRange?.to &&
      !isSameDay(pendingRange.from, pendingRange.to) && // đang chọn 1 range
      range.from &&
      isSameDay(range.from, pendingRange.from) &&
      !range.to // click vào from date again
    ) {
      // Reset to single day
      setPendingRange({ from: pendingRange.from, to: pendingRange.from });
      return;
    }

    // Normal selection
    if (!range.to) {
      // Chọn 1 ngày: from = to
      setPendingRange({ from: range.from, to: range.from });
    } else {
      // Chọn range: from → to
      setPendingRange(range);
    }
  };

  const handleApply = () => {
    // Apply pending selection và trigger data load
    onChange(pendingRange);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset về giá trị ban đầu
    setPendingRange(value);
    setIsOpen(false);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          setPendingRange(value); // Sync khi mở
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal h-6 px-1.5 text-[10px]",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="w-2.5 h-2.5 mr-1" />
          {value?.from ? (
            value.to ? (
              // Check if it's "Today"
              isToday(value.from) && isSameDay(value.from, value.to) ? (
                <span>Hôm nay</span>
              ) : isSameDay(value.from, value.to) ? (
                format(value.from, "dd/MM/yyyy", { locale: vi })
              ) : (
                <>
                  {format(value.from, "dd/MM/yyyy", { locale: vi })} -{" "}
                  {format(value.to, "dd/MM/yyyy", { locale: vi })}
                </>
              )
            ) : (
              format(value.from, "dd/MM/yyyy", { locale: vi })
            )
          ) : (
            <span>Chọn khoảng thời gian</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit p-0" align="start">
        <div className="flex flex-row">
          {/* Quick select presets - vertical on left */}
          <div className="border-r py-1 sm:py-2 w-[60px] sm:w-[110px]">
            <div className="text-[9px] sm:text-xs font-semibold mb-0.5 sm:mb-1 px-1 sm:px-3">Nhanh</div>
            <div className="flex flex-col gap-0 px-0.5 sm:px-0">
              {presets.slice(0, 6).map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-[8px] sm:text-xs h-5 sm:h-7 px-1 sm:px-3 w-full"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col">
            <div className="p-0.5 sm:p-3">
              <Calendar
                mode="range"
                selected={pendingRange}
                onSelect={handleRangeDateSelect}
                numberOfMonths={isMobile ? 1 : 2}
                locale={vi}
                className="pointer-events-auto w-full"
                classNames={{
                  months: "flex flex-col sm:flex-row",
                  month: "space-y-1 sm:space-y-4",
                  caption: "flex justify-center pt-0 sm:pt-1 relative items-center",
                  caption_label: "text-xs sm:text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-5 w-5 sm:h-7 sm:w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-0",
                  nav_button_next: "absolute right-0",
                  table: "w-full border-collapse",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-6 sm:w-9 font-normal text-[9px] sm:text-xs",
                  row: "flex w-full mt-0.5 sm:mt-2",
                  cell: "text-center text-[10px] sm:text-sm p-0 relative w-6 h-6 sm:w-9 sm:h-9 focus-within:relative focus-within:z-20",
                  day: "h-6 w-6 sm:h-9 sm:w-9 p-0 font-normal text-[10px] sm:text-sm",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                modifiers={{
                  today: () => false
                }}
                modifiersClassNames={{
                  today: ""
                }}
              />
            </div>
            <div className="flex gap-2 px-1 pb-1 sm:border-t sm:px-3 sm:py-2">
              <Button
                variant="outline"
                size="sm"
                className="h-6 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-4"
                onClick={handleCancel}
              >
                Hủy
              </Button>
              <Button
                size="sm"
                className="h-6 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-4"
                onClick={handleApply}
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
