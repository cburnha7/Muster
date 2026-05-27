import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Provider } from 'react-redux';
import { store, persistor } from './store';
import { useTheme } from '../theme';

interface ReduxProviderProps {
  children: React.ReactNode;
}

export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    let settled = false;

    const markReady = () => {
      if (!settled) {
        settled = true;
        setIsReady(true);
      }
    };

    const unsubscribe = persistor.subscribe(() => {
      const { bootstrapped } = persistor.getState();
      if (bootstrapped) {
        markReady();
        unsubscribe();
      }
    });

    if (persistor.getState().bootstrapped) {
      markReady();
    }

    const timeout = setTimeout(markReady, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Provider store={store}>
      {isReady ? (
        children
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      )}
    </Provider>
  );
};

export default ReduxProvider;
