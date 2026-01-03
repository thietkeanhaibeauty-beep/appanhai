import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAllLabels, deleteLabel, CampaignLabel } from '@/services/nocodb/campaignLabelsService';
import { getAllRules, deleteRule } from '@/services/nocodb/automatedRulesService';
import { AutomationRule } from '@/types/automationRules';
import { toast } from 'sonner';

export default function AdminCleanup() {
  const [labels, setLabels] = useState<CampaignLabel[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [labelsData, rulesData] = await Promise.all([
        getAllLabels(),
        getAllRules()
      ]);
      setLabels(labelsData);
      setRules(rulesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteLabel = async (label: CampaignLabel) => {
    if (!label.Id) {
      toast.error('Không có ID để xóa');
      return;
    }

    setDeleting(`label-${label.Id}`);
    try {
      await deleteLabel(label.Id);
      toast.success(`Đã xóa label: ${label.label_name}`);
      loadData();
    } catch (error: any) {
      console.error('Error deleting label:', error);
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteRule = async (rule: AutomationRule) => {
    if (!rule.Id) {
      toast.error('Không có ID để xóa');
      return;
    }

    setDeleting(`rule-${rule.Id}`);
    try {
      await deleteRule(rule.Id);
      toast.success(`Đã xóa rule: ${rule.rule_name}`);
      loadData();
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      toast.error(`Lỗi: ${error.message || 'NocoDB DELETE API không hoạt động'}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Cleanup Tool</h1>
          <p className="text-muted-foreground">Xóa dữ liệu test và debug API</p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Labels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Campaign Labels ({labels.length})
          </CardTitle>
          <CardDescription>
            Test labels trong database - Click delete để xóa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : labels.length === 0 ? (
            <p className="text-muted-foreground">Không có labels</p>
          ) : (
            <div className="space-y-3">
              {labels.map((label) => (
                <div key={label.Id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge style={{ backgroundColor: label.label_color }} className="text-white">
                      {label.label_name}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ID: {label.Id} | User: {label.user_id}
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteLabel(label)}
                    disabled={deleting === `label-${label.Id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting === `label-${label.Id}` ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Automation Rules ({rules.length})
          </CardTitle>
          <CardDescription>
            Test rules trong database - Click delete để test NocoDB DELETE API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : rules.length === 0 ? (
            <p className="text-muted-foreground">Không có rules</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.Id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex flex-col gap-1">
                    <div className="font-medium">{rule.rule_name}</div>
                    <div className="text-xs text-muted-foreground">
                      ID: {rule.Id} | Scope: {rule.scope} | User: {rule.user_id}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRule(rule)}
                    disabled={deleting === `rule-${rule.Id}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleting === `rule-${rule.Id}` ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Debug Info */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="text-sm">Debug Info</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <div><strong>Labels Table:</strong> m0idnywr0mcv8he</div>
          <div><strong>Rules Table:</strong> mhmhfd4m16a1hln</div>
          <div><strong>API Base:</strong> https://nocodata.proai.vn/api/v2/tables</div>
          <div><strong>DELETE Endpoint:</strong> /tables/[tableId]/records/[recordId]</div>
          <div className="pt-2 text-yellow-600">
            ⚠️ Nếu DELETE trả về 404, có thể NocoDB API không hỗ trợ DELETE endpoint hoặc cần query params khác
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
