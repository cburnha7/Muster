/**
 * Test utilities for React Native Testing Library.
 *
 * Provides a custom render() that wraps components in the necessary providers.
 * The ThemeProvider async gate is bypassed via a jest mock of useTheme() in
 * tests/setup.ts, so components get a valid theme synchronously.
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';

// ─── Custom render ───────────────────────────────────────────

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Pass a custom Redux store if the component uses useSelector/useDispatch */
  store?: any;
}

function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { store, ...renderOptions } = options;

  if (store) {
    const { Provider } = require('react-redux');
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    return render(ui, { wrapper: Wrapper, ...renderOptions });
  }

  return render(ui, { ...renderOptions });
}

// Re-export everything from testing library
export * from '@testing-library/react-native';

// Override render with our custom version
export { customRender as render };
