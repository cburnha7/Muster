// Test utilities for React Native Testing Library
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react-native';
export { customRender as render };