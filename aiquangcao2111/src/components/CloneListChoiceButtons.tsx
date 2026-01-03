import { List, Search } from "lucide-react";
import { Button } from "./ui/button";

interface CloneListChoiceButtonsProps {
  onChooseList: () => void;
  onChooseSearch: () => void;
  onCancel: () => void;
}

export function CloneListChoiceButtons({ onChooseList, onChooseSearch, onCancel }: CloneListChoiceButtonsProps) {
  return (
    <div className="space-y-3 w-full max-w-lg">
      <div className="text-sm font-medium">
        💡 Anh chọn cách nào nhé?
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          className="flex items-center gap-2 h-auto py-4"
          onClick={onChooseList}
        >
          <List className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Hiển thị danh sách</div>
            <div className="text-xs text-muted-foreground">Chọn từ list</div>
          </div>
        </Button>
        
        <Button
          variant="outline"
          className="flex items-center gap-2 h-auto py-4"
          onClick={onChooseSearch}
        >
          <Search className="h-5 w-5" />
          <div className="text-left">
            <div className="font-semibold">Tìm kiếm</div>
            <div className="text-xs text-muted-foreground">Nhập tên</div>
          </div>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="w-full"
      >
        Hủy
      </Button>
    </div>
  );
}
