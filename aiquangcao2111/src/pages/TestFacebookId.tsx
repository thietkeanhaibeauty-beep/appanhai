import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FacebookIdResult {
  success: boolean;
  data?: {
    id: string;
    name?: string;
  };
  is_die?: boolean;
  is_public?: boolean;
  time?: string;
  error?: string;
}

export default function TestFacebookId() {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FacebookIdResult | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleTest = async () => {
    if (!inputUrl.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập URL Facebook",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {


      // Get user's pageToken (optional, for private posts)
      const { data: pagesData } = await supabase.functions.invoke('fetch-pages');
      const pageToken = pagesData?.pages?.[0]?.access_token;

      const { data, error } = await supabase.functions.invoke('validate-facebook-post', {
        body: { postUrl: inputUrl, pageToken }
      });

      if (error) {
        throw error;
      }



      setResult(data);

      if (data.success) {
        toast({
          title: "Thành công!",
          description: "Đã lấy được Facebook ID",
        });
      } else {
        toast({
          title: "Không thành công",
          description: data.error || "Không thể lấy ID từ link này",
          variant: "destructive"
        });
      }

    } catch (err: any) {
      console.error('Test error:', err);
      toast({
        title: "Lỗi",
        description: err.message || 'Không thể kiểm tra link',
        variant: "destructive"
      });
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Đã sao chép",
      description: "ID đã được sao chép vào clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/home')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">🔍 Test Facebook ID Extractor</h1>
            <p className="text-muted-foreground">
              Kiểm tra và trích xuất ID từ các loại link Facebook
            </p>
          </div>
        </div>

        {/* Input Card */}
        <Card>
          <CardHeader>
            <CardTitle>Nhập URL Facebook</CardTitle>
            <CardDescription>
              Hỗ trợ: Groups, Personal Profiles, Posts, Videos, Pages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="https://www.facebook.com/..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTest()}
              />
              <Button onClick={handleTest} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang kiểm tra
                  </>
                ) : (
                  'Lấy ID'
                )}
              </Button>
            </div>

            {/* Example Links */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Ví dụ các loại link:</p>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <button
                  onClick={() => setInputUrl('https://www.facebook.com/nqtam6666/')}
                  className="text-left text-primary hover:underline"
                >
                  • Personal Profile: facebook.com/username/
                </button>
                <button
                  onClick={() => setInputUrl('https://www.facebook.com/groups/123456789/')}
                  className="text-left text-primary hover:underline"
                >
                  • Group: facebook.com/groups/GROUP_ID/
                </button>
                <button
                  onClick={() => setInputUrl('https://www.facebook.com/username/posts/123456789')}
                  className="text-left text-primary hover:underline"
                >
                  • Post: facebook.com/username/posts/POST_ID
                </button>
                <button
                  onClick={() => setInputUrl('https://www.facebook.com/username/videos/123456789')}
                  className="text-left text-primary hover:underline"
                >
                  • Video: facebook.com/username/videos/VIDEO_ID
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Kết quả
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Lỗi
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.success && result.data ? (
                <>
                  {/* ID Display */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facebook ID</label>
                    <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg border">
                      <code className="flex-1 text-lg font-mono font-semibold">
                        {result.data.id}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(result.data!.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Name */}
                  {result.data.name && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tên</label>
                      <div className="p-3 bg-muted rounded-lg">
                        {result.data.name}
                      </div>
                    </div>
                  )}

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={result.is_public ? "default" : "secondary"}>
                      {result.is_public ? "🌍 Public" : "🔒 Private"}
                    </Badge>
                    {result.is_die && (
                      <Badge variant="destructive">
                        ⚠️ Tài khoản không còn hoạt động
                      </Badge>
                    )}
                    {result.time && (
                      <Badge variant="outline">
                        ⚡ {result.time}
                      </Badge>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(inputUrl, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Mở link gốc
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-destructive/10 rounded-lg text-destructive">
                  <p className="font-medium">Không thể lấy ID</p>
                  {result.error && (
                    <p className="text-sm mt-1">{result.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* API Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ℹ️ Về API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>API:</strong> nqtam.id.vn
            </p>
            <p>
              <strong>Tính năng:</strong> Trích xuất ID từ URL Facebook (Groups, Profiles, Posts, Videos, Pages)
            </p>
            <p>
              <strong>Phương thức:</strong> Regex parsing + Anonymous checking
            </p>
            <p className="text-xs">
              Liên hệ: <a href="https://t.me/nqtam_26" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Telegram</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
