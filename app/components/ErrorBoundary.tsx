import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Card, Text, Button } from '@shopify/polaris';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Special handling for React error #185 (Maximum update depth exceeded)
    const isInfiniteLoop = error.message.includes('Maximum update depth exceeded') || 
                          error.message.includes('185');
    
    console.error('🚨 REACT ERROR BOUNDARY CAUGHT:', {
      error: error,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      errorInfo: errorInfo,
      isInfiniteLoop: isInfiniteLoop,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'unknown'
    });

    // Additional logging for infinite loop errors
    if (isInfiniteLoop) {
      console.error('🔄 INFINITE LOOP DETECTED - React Error #185', {
        possibleCauses: [
          'Chart components receiving new object references on every render',
          'Recharts JavascriptAnimate component triggering internal state updates',
          'Missing or incorrect React.memo implementation',
          'Props not properly memoized'
        ],
        debugTips: [
          'Check if chart data props are memoized with useMemo',
          'Verify React.memo is applied to chart components',
          'Look for inline object creation in JSX props',
          'Consider using displayName for better debugging'
        ]
      });
    }

    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <div style={{ padding: '20px' }}>
            <Text variant="headingMd" as="h2" tone="critical">
              Something went wrong with the analytics
            </Text>
            <div style={{ marginTop: '16px' }}>
              <Text as="p">
                Error: {this.state.error?.message}
              </Text>
              {this.state.error?.stack && (
                <details style={{ marginTop: '8px' }}>
                  <summary>Error Stack</summary>
                  <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
              {this.state.errorInfo?.componentStack && (
                <details style={{ marginTop: '8px' }}>
                  <summary>Component Stack</summary>
                  <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
            <div style={{ marginTop: '16px' }}>
              <Button 
                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                tone="success"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}