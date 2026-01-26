'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';

// Context to track if providers are loaded
const ProvidersLoadedContext = createContext(false);

export const useProvidersLoaded = () => useContext(ProvidersLoadedContext);

interface LazyProvidersProps {
  children: ReactNode;
}

export const LazyProviders = ({ children }: LazyProvidersProps) => {
  const [ProvidersComponent, setProvidersComponent] = useState<React.ComponentType<{ children: ReactNode }> | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Lazy load providers after initial paint
    import('./Providers').then((mod) => {
      setProvidersComponent(() => mod.Providers);
      setLoaded(true);
    });
  }, []);

  // Render children immediately, wrap with providers when loaded
  if (!ProvidersComponent) {
    return (
      <ProvidersLoadedContext.Provider value={false}>
        {children}
      </ProvidersLoadedContext.Provider>
    );
  }

  return (
    <ProvidersLoadedContext.Provider value={loaded}>
      <ProvidersComponent>{children}</ProvidersComponent>
    </ProvidersLoadedContext.Provider>
  );
};
