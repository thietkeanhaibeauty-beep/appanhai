import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const NOCODB_BASE_URL = 'https://nocodata.proai.vn';
const NOCODB_API_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';

const TABLES = {
  FEATURE_FLAGS: 'mbctnl9dbktdz9f',
  ROLE_FEATURE_FLAGS: 'mskba16vzzcofe6',
  USER_ROLES: 'mcd6xqgbq12msbj',
};

const PopulateNocoDBFeatures = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const populateNocoDB = async () => {
    setLoading(true);
    const results: any = {
      features: [],
      roleAssignments: [],
      userRoles: [],
    };

    try {
      // 1. Create feature flags
      const features = [
        // Manual tools - 5 features
        { key: 'manual_create_ads', name: '🎨 Tạo quảng cáo thủ công', description: 'Tạo quảng cáo cơ bản', category: 'manual', enabled: true },
        { key: 'manual_create_message', name: '💬 Tạo QC tin nhắn', description: 'Tạo quảng cáo tin nhắn', category: 'manual', enabled: true },
        { key: 'manual_audience', name: '👥 Tạo đối tượng', description: 'Tạo đối tượng quảng cáo', category: 'manual', enabled: true },
        { key: 'manual_advanced_ads', name: '⚡ ADS nâng cao', description: 'Quản lý quảng cáo nâng cao', category: 'manual', enabled: true },
        { key: 'manual_quick_ad', name: '⚡ Bài viết sẵn nhanh', description: 'Tạo quảng cáo từ bài viết nhanh', category: 'manual', enabled: true },
        
        // Reports - 3 features
        { key: 'report_ads', name: '📊 Báo cáo ads', description: 'Xem báo cáo quảng cáo', category: 'report', enabled: true },
        { key: 'report_sales', name: '📄 Báo cáo sale', description: 'Xem báo cáo bán hàng', category: 'report', enabled: true },
        { key: 'report_summary', name: '📈 Báo cáo tổng', description: 'Xem báo cáo tổng hợp', category: 'report', enabled: true },
        
        // AI features - 5 features
        { key: 'ai_quick_post', name: '📱 Quick Post - Tạo QC từ bài viết', description: 'Tạo quảng cáo tự động từ bài viết Facebook', category: 'ai', enabled: true },
        { key: 'ai_creative_campaign', name: '🎨 Creative Campaign - Tạo QC với media', description: 'Tạo chiến dịch quảng cáo từ hình ảnh/video', category: 'ai', enabled: true },
        { key: 'ai_audience_creator', name: '👥 Audience Creator - Tạo đối tượng', description: 'Tạo đối tượng quảng cáo tự động bằng AI', category: 'ai', enabled: true },
        { key: 'ai_clone_tool', name: '📋 Clone Tool - Nhân bản', description: 'Nhân bản và tối ưu chiến dịch quảng cáo', category: 'ai', enabled: true },
        { key: 'ai_report_analysis', name: '📊 Report Analysis - Phân tích báo cáo', description: 'Phân tích và đề xuất tối ưu từ báo cáo', category: 'ai', enabled: true },
      ];

      for (const feature of features) {
        try {
          const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`, {
            method: 'POST',
            headers: {
              'xc-token': NOCODB_API_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(feature),
          });

          if (response.ok) {
            results.features.push({ key: feature.key, status: 'created' });
          } else {
            const error = await response.text();
            results.features.push({ key: feature.key, status: 'failed', error });
          }
        } catch (error) {
          results.features.push({ key: feature.key, status: 'error', error: String(error) });
        }
      }

      // 2. Assign features to roles
      const manualTools = ['manual_create_ads', 'manual_create_message', 'manual_audience', 'manual_advanced_ads', 'manual_quick_ad'];
      const reports = ['report_ads', 'report_sales', 'report_summary'];
      const aiFeatures = ['ai_quick_post', 'ai_creative_campaign', 'ai_audience_creator', 'ai_clone_tool', 'ai_report_analysis'];

      // All users get manual tools and reports
      const roleAssignments = [
        { role: 'user', features: [...manualTools, ...reports] },
        { role: 'admin', features: [...manualTools, ...reports, ...aiFeatures] },
        { role: 'super_admin', features: [...manualTools, ...reports, ...aiFeatures] },
      ];

      for (const { role, features: roleFeatures } of roleAssignments) {
        for (const featureKey of roleFeatures) {
          try {
            const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records`, {
              method: 'POST',
              headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role,
                feature_key: featureKey,
                enabled: true,
              }),
            });

            if (response.ok) {
              results.roleAssignments.push({ role, featureKey, status: 'created' });
            }
          } catch (error) {
            results.roleAssignments.push({ role, featureKey, status: 'error' });
          }
        }
      }

      toast.success('✅ Đã populate NocoDB features!');
      setResults(results);
    } catch (error) {
      toast.error('❌ Lỗi: ' + String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Populate NocoDB Features</h1>
        <p className="mb-4">Click button để insert feature flags vào NocoDB</p>
        
        <Button onClick={populateNocoDB} disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Populate NocoDB'}
        </Button>

        {results && (
          <div className="mt-6">
            <h2 className="font-bold mb-2">Kết quả:</h2>
            <pre className="bg-secondary p-4 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PopulateNocoDBFeatures;
