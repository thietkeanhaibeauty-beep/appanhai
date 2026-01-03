import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MobileToolHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const MobileToolHeader = ({ icon: Icon, title, description }: MobileToolHeaderProps) => {
  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
