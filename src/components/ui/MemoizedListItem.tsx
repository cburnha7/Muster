import React, { memo } from 'react';
import { ViewProps } from 'react-native';

/**
 * Higher-order component to memoize list items for better FlatList performance
 * Prevents unnecessary re-renders when parent component updates
 */
export function createMemoizedListItem<P extends ViewProps>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.ComponentType<P> {
  return memo(Component, propsAreEqual);
}

/**
 * Default comparison function for list items
 * Compares item IDs to determine if re-render is needed
 */
export function defaultListItemComparison<P extends { item?: { id: string } }>(
  prevProps: Readonly<P>,
  nextProps: Readonly<P>
): boolean {
  // If both have items with IDs, compare IDs
  if (prevProps.item?.id && nextProps.item?.id) {
    return prevProps.item.id === nextProps.item.id;
  }

  // Otherwise, do shallow comparison
  return JSON.stringify(prevProps) === JSON.stringify(nextProps);
}

/**
 * Memoized wrapper for simple list items
 */
export const MemoizedListItem = memo(
  ({ children }: { children: React.ReactNode }) => <>{children}</>,
  (prevProps, nextProps) => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  }
);
