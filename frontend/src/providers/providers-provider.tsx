import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import type { Provider } from '@/models/provider';

import { useProvidersQuery } from '@/graphql/types';
import { findProviderByName, sortProviders } from '@/models/provider';
import { useUser } from '@/providers/user-provider';

const SELECTED_PROVIDER_KEY = 'selectedProvider';

interface ProvidersContextValue {
    providers: Provider[];
    selectedProvider: null | Provider;
    setSelectedProvider: (provider: Provider) => void;
}

const ProvidersContext = createContext<ProvidersContextValue | undefined>(undefined);

export const resolveSelectedProviderName = (
    providers: readonly Provider[],
    selectedProviderName: null | string,
): null | string => {
    if (providers.length === 0) {
        return null;
    }

    if (selectedProviderName && findProviderByName(selectedProviderName, providers)) {
        return selectedProviderName;
    }

    return providers[0]?.name ?? null;
};

interface ProvidersProviderProps {
    children: React.ReactNode;
}

export function ProvidersProvider({ children }: ProvidersProviderProps) {
    const { isAuthenticated } = useUser();

    const { data: providersData } = useProvidersQuery({
        skip: !isAuthenticated(),
    });

    const providers = sortProviders(providersData?.providers || []);

    const [selectedProviderName, setSelectedProviderName] = useState<null | string>(() => {
        return localStorage.getItem(SELECTED_PROVIDER_KEY);
    });

    const resolvedProviderName = useMemo(
        () => resolveSelectedProviderName(providers, selectedProviderName),
        [providers, selectedProviderName],
    );

    const selectedProvider = useMemo(() => {
        if (!resolvedProviderName) {
            return null;
        }

        return findProviderByName(resolvedProviderName, providers) ?? null;
    }, [providers, resolvedProviderName]);

    useEffect(() => {
        if (resolvedProviderName) {
            localStorage.setItem(SELECTED_PROVIDER_KEY, resolvedProviderName);
        } else {
            localStorage.removeItem(SELECTED_PROVIDER_KEY);
        }
    }, [resolvedProviderName]);

    const setSelectedProvider = (provider: Provider) => {
        setSelectedProviderName(provider.name);
    };

    const value = {
        providers,
        selectedProvider,
        setSelectedProvider,
    };

    return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>;
}

export function useProviders() {
    const context = useContext(ProvidersContext);

    if (context === undefined) {
        throw new Error('useProviders must be used within a ProvidersProvider');
    }

    return context;
}
