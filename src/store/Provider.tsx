import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store, persistor } from './store';

interface ReduxProviderProps {
  children: React.ReactNode;
}

export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Manually subscribe to persistor instead of using PersistGate
    // PersistGate from redux-persist@6 is incompatible with react-redux@9
    const unsubscribe = persistor.subscribe(() => {
      const { bootstrapped } = persistor.getState();
      if (bootstrapped) {
        setIsReady(true);
        unsubscribe();
      }
    });

    // Check if already bootstrapped
    if (persistor.getState().bootstrapped) {
      setIsReady(true);
    }

    // Safety timeout — render anyway after 3 seconds
    const timeout = setTimeout(() => {
      if (!isReady) {
        console.warn('Redux persist rehydration timed out, rendering anyway');
        setIsReady(true);
      }
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <Provider store={store}>
      {isReady ? children : null}
    </Provider>
  );
};

export default ReduxProvider;
