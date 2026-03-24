import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import { UIProvider } from '../../context/UIContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { CountryProvider } from '../../context/CountryContext';
import { trpc } from '../../utils/trpc';
import { httpBatchLink } from '@trpc/client';

interface Props {
    children: React.ReactNode;
}

export const AppProviders: React.FC<Props> = ({ children }) => {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 15_000,
                gcTime: 6 * 60 * 60 * 1000,
                refetchOnWindowFocus: true,
                refetchOnReconnect: true,
                refetchOnMount: false,
                retry: 2,
                retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 8000),
            },
            mutations: {
                retry: 0,
            },
        },
    }));

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: import.meta.env.VITE_TRPC_URL ?? '/trpc',
                    headers() {
                        const token = localStorage.getItem('clarity_token');
                        return {
                            Authorization: token ? `Bearer ${token}` : undefined,
                        };
                    },
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                    <AuthProvider>
                        <CountryProvider>
                            <ToastProvider>
                                <UIProvider>
                                    <BrowserRouter>
                                        {children}
                                    </BrowserRouter>
                                </UIProvider>
                            </ToastProvider>
                        </CountryProvider>
                    </AuthProvider>
                </ThemeProvider>
                <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
            </QueryClientProvider>
        </trpc.Provider>
    );
};
