import React, { createContext, useContext, useCallback, useRef } from 'react';

interface AvatarSheetContextValue {
  open: () => void;
  close: () => void;
  registerSheet: (handlers: { open: () => void; close: () => void }) => void;
}

const AvatarSheetContext = createContext<AvatarSheetContextValue>({
  open: () => {},
  close: () => {},
  registerSheet: () => {},
});

export function AvatarSheetProvider({ children }: { children: React.ReactNode }) {
  const sheetHandlers = useRef<{ open: () => void; close: () => void } | null>(null);

  const registerSheet = useCallback((handlers: { open: () => void; close: () => void }) => {
    sheetHandlers.current = handlers;
  }, []);

  const open = useCallback(() => {
    sheetHandlers.current?.open();
  }, []);

  const close = useCallback(() => {
    sheetHandlers.current?.close();
  }, []);

  return (
    <AvatarSheetContext.Provider value={{ open, close, registerSheet }}>
      {children}
    </AvatarSheetContext.Provider>
  );
}

export function useAvatarSheet() {
  return useContext(AvatarSheetContext);
}
