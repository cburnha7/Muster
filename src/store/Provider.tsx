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

    // Manually subscribe to persistor instead of using PersistGate
    // PersistGate from redux-persist@6 is incompatible with react-redux@9
    const unsubscribe = persistor.subscribe(() => {
      const { bootstrapped } = persistor.getState();
      if (bootstrapped) {
        markReady();
        unsubscribe();
      }
    });

    // Check if already bootstrapped
    if (persistor.getState().bootstrapped) {
      markReady();
    }

    // Safety timeout — render anyway after 2 seconds
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
