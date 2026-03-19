import React, { ComponentType, lazy, Suspense } from 'react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

/**
 * Utility for lazy loading React components with a loading fallback
 */
export function lazyLoadScreen<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Utility for lazy loading components with custom fallback
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
): React.ComponentType<React.ComponentProps<T>> {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback || null}>
      <LazyComponent {...props} />
    </Suspense>
  );
}
