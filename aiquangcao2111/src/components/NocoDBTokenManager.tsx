import { useState } from 'react';
import { useNocoDBTokens } from '@/hooks/useNocoDBTokens';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const NocoDBTokenManager = () => {
  const { tokens, loading, loadTokens, addToken, removeToken } = useNocoDBTokens();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTokenData, setNewTokenData] = useState({
    user_id: '',
    token_name: '',
    api_key: '',
  });

  const handleAddToken = async () => {
    try {
      await addToken(newTokenData);
      setIsAddDialogOpen(false);
      setNewTokenData({ user_id: '', token_name: '', api_key: '' });
    } catch (error) {
      console.error('Error adding token:', error);
    }
  };

  const handleDeleteToken = async (recordId: number) => {
    if (window.confirm('Are you sure you want to delete this token?')) {
      try {
        await removeToken(recordId);
      } catch (error) {
        console.error('Error deleting token:', error);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>NocoDB API Tokens</CardTitle>
            <CardDescription>Quản lý API tokens được lưu trữ trên NocoDB</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadTokens}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Token
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New API Token</DialogTitle>
                  <DialogDescription>
                    Thêm token mới vào NocoDB
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="user_id">User ID</Label>
                    <Input
                      id="user_id"
                      value={newTokenData.user_id}
                      onChange={(e) =>
                        setNewTokenData({ ...newTokenData, user_id: e.target.value })
                      }
                      placeholder="Enter user ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token_name">Token Name</Label>
                    <Input
                      id="token_name"
                      value={newTokenData.token_name}
                      onChange={(e) =>
                        setNewTokenData({ ...newTokenData, token_name: e.target.value })
                      }
                      placeholder="Enter token name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api_key">API Key</Label>
                    <Input
                      id="api_key"
                      type="password"
                      value={newTokenData.api_key}
                      onChange={(e) =>
                        setNewTokenData({ ...newTokenData, api_key: e.target.value })
                      }
                      placeholder="Enter API key"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddToken} disabled={loading}>
                    Add Token
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading tokens...
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No tokens found. Click "Add Token" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((token) => (
              <div
                key={token.Id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {token.token_name || 'Unnamed Token'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    User ID: {token.user_id || 'N/A'}
                  </div>
                  {token.api_key && (
                    <div className="text-xs text-muted-foreground mt-1">
                      API Key: {token.api_key.substring(0, 20)}...
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => token.Id && handleDeleteToken(token.Id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
