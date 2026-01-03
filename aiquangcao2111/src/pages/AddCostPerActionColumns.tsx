import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AddCostPerActionColumns() {
  const [loading, setLoading] = useState(false);

  const handleAddColumns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-cost-per-action-columns');

      if (error) throw error;



      if (data.success) {
        toast.success(`Đã thêm ${data.successful}/${data.totalColumns} cột cost_per_action thành công!`);
      } else {
        toast.error('Có lỗi khi thêm cột');
      }
    } catch (error) {
      console.error('Error adding columns:', error);
      toast.error('Lỗi khi thêm cột: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Thêm Cột Cost Per Action Type</CardTitle>
          <CardDescription>
            Tạo 11 cột riêng biệt cho cost_per_action_type trong bảng facebook_insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Các cột sẽ được tạo:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>cost_per_started_7d</li>
              <li>cost_per_replied_7d</li>
              <li>cost_per_first_reply</li>
              <li>cost_per_messaging_connection</li>
              <li>cost_per_depth_2_message</li>
              <li>cost_per_depth_3_message</li>
              <li>cost_per_welcome_message_view</li>
              <li>cost_per_link_click</li>
              <li>cost_per_video_view</li>
              <li>cost_per_post_engagement</li>
              <li>cost_per_page_engagement</li>
            </ul>
          </div>

          <Button
            onClick={handleAddColumns}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang thêm cột...
              </>
            ) : (
              'Thêm Cột Cost Per Action'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
