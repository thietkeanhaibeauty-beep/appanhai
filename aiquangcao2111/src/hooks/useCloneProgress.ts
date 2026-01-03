import { useState, useCallback } from 'react';

export interface CloneProgress {
  isCloning: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  successInfo: {
    name: string;
    id: string;
    type: string;
  } | null;
}

export function useCloneProgress() {
  const [progress, setProgress] = useState<CloneProgress>({
    isCloning: false,
    progress: 0,
    currentStep: '',
    error: null,
    successInfo: null
  });

  const startCloning = useCallback((initialStep: string) => {
    setProgress({
      isCloning: true,
      progress: 0,
      currentStep: initialStep,
      error: null,
      successInfo: null
    });
  }, []);

  const updateProgress = useCallback((percent: number, step: string) => {
    setProgress(prev => ({
      ...prev,
      progress: percent,
      currentStep: step
    }));
  }, []);

  const completeCloning = useCallback((successInfo: { name: string; id: string; type: string }) => {
    setProgress({
      isCloning: false,
      progress: 100,
      currentStep: 'Hoàn thành',
      error: null,
      successInfo
    });
  }, []);

  const setError = useCallback((error: string) => {
    setProgress(prev => ({
      ...prev,
      isCloning: false,
      error
    }));
  }, []);

  const reset = useCallback(() => {
    setProgress({
      isCloning: false,
      progress: 0,
      currentStep: '',
      error: null,
      successInfo: null
    });
  }, []);

  return {
    progress,
    startCloning,
    updateProgress,
    completeCloning,
    setError,
    reset
  };
}
