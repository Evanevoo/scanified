import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
  timestamp: number;
}

export const useErrorHandler = () => {
  const [errors, setErrors] = useState<ErrorState[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: any, title = 'Error') => {
    const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
    
    const errorState: ErrorState = {
      message: errorMessage,
      type: 'error',
      timestamp: Date.now(),
    };

    setErrors(prev => [...prev, errorState]);
    
    Alert.alert(title, errorMessage);
    
    // Auto-clear errors after 5 seconds
    setTimeout(() => {
      setErrors(prev => prev.filter(e => e.timestamp !== errorState.timestamp));
    }, 5000);
  }, []);

  const handleWarning = useCallback((message: string, title = 'Warning') => {
    const warningState: ErrorState = {
      message,
      type: 'warning',
      timestamp: Date.now(),
    };

    setErrors(prev => [...prev, warningState]);
    Alert.alert(title, message);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorTitle = 'Operation Failed'
  ): Promise<T | null> => {
    setIsLoading(true);
    try {
      const result = await operation();
      return result;
    } catch (error) {
      handleError(error, errorTitle);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  return {
    errors,
    isLoading,
    handleError,
    handleWarning,
    clearErrors,
    withErrorHandling,
  };
}; 