import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Image, Video, Loader2 } from 'lucide-react';
import * as quickCreativeFacebookService from '@/services/quickCreativeFacebookService';

interface MediaUploaderProps {
  open: boolean;
  onClose: () => void;
  adAccountId: string;
  adsToken: string;
  pageToken: string;
  onUploadSuccess: (result: { type: 'image' | 'video'; hash?: string; id?: string; preview: string; imageUrl?: string }) => void;
}

const MediaUploader = ({
  open,
  onClose,
  adAccountId,
  adsToken,
  pageToken,
  onUploadSuccess,
}: MediaUploaderProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({
        title: 'Lỗi',
        description: 'Chỉ chấp nhận file ảnh hoặc video',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 100MB for video)
    const maxSize = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for image
    if (file.size > maxSize) {
      toast({
        title: 'Lỗi',
        description: `File quá lớn. Tối đa ${isVideo ? '100MB' : '10MB'}`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const isImage = selectedFile.type.startsWith('image/');

      if (isImage) {
        const result = await quickCreativeFacebookService.uploadAdImage(
          adAccountId,
          adsToken,
          selectedFile
        );

        onUploadSuccess({
          type: 'image',
          hash: result.imageHash,
          preview,
          imageUrl: result.imageUrl,
        });

        toast({
          title: '✅ Upload thành công',
          description: 'Ảnh đã được tải lên',
        });
      } else {
        const result = await quickCreativeFacebookService.uploadAdVideo(
          adAccountId,
          adsToken,
          selectedFile,
          (progress) => {
            setUploadProgress(progress);
            if (progress === 100) {
              setIsProcessing(true);
            }
          }
        );
        setIsProcessing(false);

        onUploadSuccess({
          type: 'video',
          id: result.videoId,
          preview,
        });

        toast({
          title: '✅ Upload thành công',
          description: 'Video đã được tải lên',
        });
      }

      // Reset and close
      setSelectedFile(null);
      setPreview('');
      setUploadProgress(0);
      setIsProcessing(false);
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: '❌ Lỗi upload',
        description: error.message || 'Không thể tải lên media',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Tải lên Ảnh / Video
          </DialogTitle>
          <DialogDescription>
            Chọn ảnh hoặc video cho quảng cáo của bạn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ảnh: tối đa 10MB | Video: tối đa 100MB
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="border rounded-lg overflow-hidden bg-muted">
              {selectedFile?.type.startsWith('image/') ? (
                <div className="relative aspect-video flex items-center justify-center">
                  <Image className="w-12 h-12 text-muted-foreground absolute" />
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain relative z-10"
                  />
                </div>
              ) : (
                <div className="relative aspect-video flex items-center justify-center">
                  <Video className="w-12 h-12 text-muted-foreground absolute" />
                  <video
                    src={preview}
                    className="w-full h-full object-contain relative z-10"
                    controls
                  />
                </div>
              )}
              <div className="p-2 text-sm text-center text-muted-foreground">
                {selectedFile?.name} ({(selectedFile!.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-xs text-center text-muted-foreground">
                {isProcessing ? '⏳ Đang xử lý video trên Facebook...' : `Đang tải lên... ${uploadProgress}%`}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex-1"
              size="lg"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Tải lên
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={uploading}
              size="lg"
            >
              Hủy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploader;
