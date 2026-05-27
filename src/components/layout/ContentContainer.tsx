import React from 'react';
import { View, ViewProps } from 'react-native';
import {
  useContentWidth,
  CONTENT_MAX_WIDTH,
} from '../../hooks/useContentWidth';

interface ContentContainerProps extends ViewProps {
  /**
   * Max width on wide viewports. Defaults to CONTENT_MAX_WIDTH (1200).
   * Pass a smaller value for narrow contexts like auth forms.
   */
  maxWidth?: number;
  children: React.ReactNode;
}

/**
 * Centers and caps content on wide viewports (web/tablet) while passing through
 * full-width on phone-width viewports. Use as the outermost child of a screen's
 * SafeAreaView / scroll container.
 */
export function ContentContainer({
  maxWidth = CONTENT_MAX_WIDTH,
  style,
  children,
  ...rest
}: ContentContainerProps) {
  const { contentStyle } = useContentWidth(maxWidth);
  return (
    <View style={[{ flex: 1, width: '100%' }, contentStyle, style]} {...rest}>
      {children}
    </View>
  );
}
