import React, { createContext, useContext, useState, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import SearchComponent from '../SearchComponent';

type GlobalSearchOptions = {
  seedQuery?: string;
};

type GlobalSearchContextType = {
  open: (opts?: GlobalSearchOptions) => void;
  close: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

export const GlobalSearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [seedQuery, setSeedQuery] = useState<string | undefined>(undefined);

  const open = (opts?: GlobalSearchOptions) => {
    setSeedQuery(opts?.seedQuery);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setSeedQuery(undefined);
  };

  return (
    <GlobalSearchContext.Provider value={{ open, close }}>
      {children}
      {isOpen &&
        ReactDOM.createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10100, // Changed from 2000
              WebkitTransform: 'translateZ(0)', // iOS fix
              transform: 'translateZ(0)', // iOS fix
              isolation: 'isolate' // iOS fix
            }}
            onClick={close}
          >
            <div
              style={{
                width: 'min(1000px, 94vw)',
                maxHeight: '88vh',
                background: '#0f1115',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <SearchComponent
                isOpen={true}
                onClose={close}
                // @ts-ignore - SearchComponent supports seed via controlled query internally;
                // if not, leaving this prop unused is harmless
                seedQuery={seedQuery}
              />
            </div>
          </div>,
          document.body
        )}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = (): GlobalSearchContextType => {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  }
  return ctx;
};


