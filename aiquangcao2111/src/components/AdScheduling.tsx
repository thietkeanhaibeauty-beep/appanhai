import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface AdSchedulingProps {
  schedulingGrid: boolean[][];
  onGridChange: (grid: boolean[][]) => void;
}

const DAYS = [
  { label: "Thứ Hai", value: 1 },
  { label: "Thứ Ba", value: 2 },
  { label: "Thứ Tư", value: 3 },
  { label: "Thứ Năm", value: 4 },
  { label: "Thứ Sáu", value: 5 },
  { label: "Thứ Bảy", value: 6 },
  { label: "Chủ Nhật", value: 0 },
];

// Full 24 hours
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const AdScheduling = ({ schedulingGrid, onGridChange }: AdSchedulingProps) => {
  // Toggle a single hour
  const toggleHour = (day: number, hour: number) => {
    const newGrid = schedulingGrid.map((row, dayIndex) =>
      dayIndex === day
        ? row.map((cell, hourIndex) => (hourIndex === hour ? !cell : cell))
        : [...row]
    );
    onGridChange(newGrid);
  };

  // Toggle entire day (all 24 hours)
  const toggleDay = (day: number) => {
    const dayFullySelected = schedulingGrid[day].every(cell => cell);
    const newGrid = schedulingGrid.map((row, dayIndex) =>
      dayIndex === day ? row.map(() => !dayFullySelected) : [...row]
    );
    onGridChange(newGrid);
  };

  // Toggle "Hàng ngày" - all days for a specific hour
  const toggleEveryday = (hour: number) => {
    const allSelected = schedulingGrid.every(row => row[hour]);
    const newGrid = schedulingGrid.map(row =>
      row.map((cell, hourIndex) => (hourIndex === hour ? !allSelected : cell))
    );
    onGridChange(newGrid);
  };

  const clearAll = () => {
    const newGrid = Array(7).fill(null).map(() => Array(24).fill(false));
    onGridChange(newGrid);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Lên lịch quảng cáo</Label>
        <Button size="sm" variant="outline" onClick={clearAll}>
          Xóa tất cả
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/30">
              <th className="border-r border-b p-2 text-xs font-normal text-left sticky left-0 bg-muted/30 z-10 min-w-[100px]"></th>
              {HOURS.map((hour) => (
                <th key={hour} className="border-r border-b p-1 text-[10px] font-normal text-center min-w-[32px]">
                  {hour}h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day.value} className="hover:bg-muted/10">
                <td 
                  className="border-r border-b p-2 text-sm cursor-pointer hover:bg-muted/20 sticky left-0 bg-white z-10"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </td>
                {HOURS.map((hour) => (
                  <td
                    key={hour}
                    className={`border-r border-b cursor-pointer transition-colors ${
                      schedulingGrid[day.value][hour]
                        ? "bg-primary/10 hover:bg-primary/20"
                        : "bg-background hover:bg-muted/30"
                    }`}
                    onClick={() => toggleHour(day.value, hour)}
                  >
                    <div className="w-full h-8" />
                  </td>
                ))}
              </tr>
            ))}
            
            {/* Hàng ngày row */}
            <tr className="bg-muted/20">
              <td className="border-r border-b p-2 text-sm font-medium sticky left-0 bg-muted/20 z-10">
                Hàng ngày
              </td>
              {HOURS.map((hour) => (
                <td
                  key={hour}
                  className={`border-r border-b cursor-pointer transition-colors ${
                    schedulingGrid.every(row => row[hour])
                      ? "bg-primary/10 hover:bg-primary/20"
                      : "bg-background hover:bg-muted/30"
                  }`}
                  onClick={() => toggleEveryday(hour)}
                >
                  <div className="w-full h-8" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-4 h-4 bg-primary/10 border" />
        <span>Giờ đã lên lịch</span>
      </div>
    </div>
  );
};

export default AdScheduling;
