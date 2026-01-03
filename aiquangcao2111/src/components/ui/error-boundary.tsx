import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <CardTitle>Đã xảy ra lỗi</CardTitle>
              </div>
              <CardDescription>
                Ứng dụng gặp sự cố không mong muốn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <p className="font-mono text-xs break-all">
                  {this.state.error?.message}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="default">
                  Thử lại
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Tải lại trang
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple error fallback component
export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-4 text-center">
      <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Có lỗi xảy ra</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error.message}
      </p>
      <Button onClick={resetError}>Thử lại</Button>
    </div>
  );
}
