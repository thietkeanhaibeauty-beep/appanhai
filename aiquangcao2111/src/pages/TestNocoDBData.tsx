import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const NOCODB_BASE_URL = 'https://nocodata.proai.vn';
const NOCODB_API_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';

const TABLES = {
  FEATURE_FLAGS: 'mbctnl9dbktdz9f',
  ROLE_FEATURE_FLAGS: 'mskba16vzzcofe6',
};

export default function TestNocoDBData() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkData = async () => {
    setLoading(true);
    try {
      // Fetch feature flags
      const ffResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`,
        {
          headers: {
            'xc-token': NOCODB_API_TOKEN,
          },
        }
      );
      const ffData = await ffResponse.json();

      // Fetch role feature flags
      const rfResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records`,
        {
          headers: {
            'xc-token': NOCODB_API_TOKEN,
          },
        }
      );
      const rfData = await rfResponse.json();

      // Check for user role specifically
      const userRoleResponse = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records?where=(role,eq,user)`,
        {
          headers: {
            'xc-token': NOCODB_API_TOKEN,
          },
        }
      );
      const userRoleData = await userRoleResponse.json();

      setResult({
        featureFlags: {
          total: ffData.list?.length || 0,
          data: ffData.list || [],
        },
        roleFeatureFlags: {
          total: rfData.list?.length || 0,
          data: rfData.list || [],
        },
        userRoleFeatures: {
          total: userRoleData.list?.length || 0,
          data: userRoleData.list || [],
        },
      });
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">🔍 Kiểm tra dữ liệu NocoDB</h1>

      <Button onClick={checkData} disabled={loading}>
        {loading ? 'Đang kiểm tra...' : 'Kiểm tra dữ liệu'}
      </Button>

      {result && (
        <Card className="mt-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Kết quả:</h2>
          
          {result.error ? (
            <div className="text-red-500">❌ Lỗi: {result.error}</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg">📋 Feature Flags ({result.featureFlags?.total})</h3>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(result.featureFlags?.data, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-lg">🎭 All Role Features ({result.roleFeatureFlags?.total})</h3>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-60">
                  {JSON.stringify(result.roleFeatureFlags?.data, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold text-lg">👤 USER Role Features ({result.userRoleFeatures?.total})</h3>
                <div className="space-y-2">
                  {result.userRoleFeatures?.data?.map((item: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      • {item.feature_key}: <span className={item.enabled ? 'text-green-600' : 'text-red-600'}>
                        {item.enabled ? '✅ Enabled' : '❌ Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
