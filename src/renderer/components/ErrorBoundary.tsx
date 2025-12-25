import React from 'react';
import { useAppStore } from '../store/useAppStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[ErrorBoundary] caught error', error, info);
    // Show toast via store
    try {
      useAppStore.getState().showToast(error?.message || 'An unexpected error occurred', 'error');
    } catch (err) {
      console.error('[ErrorBoundary] failed to show toast', err);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-gray-300">
          <div className="text-lg font-bold mb-2">Something went wrong</div>
          <div className="text-sm text-gray-500">{this.state.message}</div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
