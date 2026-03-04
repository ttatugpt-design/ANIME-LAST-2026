import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'

import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { queryClient } from './lib/react-query'
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router-dom';
import { routes } from './routes/index'; // Only import routes array, not the browser router


export async function render(url: string, ssrContext?: any) {
    const helmetContext = {}

    // 1. Create a fetch request abstraction for the router
    const { query, dataRoutes } = createStaticHandler(routes);
    const fetchRequest = new Request(`http://localhost${url}`);
    const context = await query(fetchRequest);

    if (context instanceof Response) {
        throw context;
    }

    const router = createStaticRouter(dataRoutes, context);

    const html = ReactDOMServer.renderToString(
        <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                <HelmetProvider context={helmetContext}>
                    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                        <StaticRouterProvider router={router} context={context} />
                        <Toaster />
                    </ThemeProvider>
                </HelmetProvider>
            </QueryClientProvider>
        </React.StrictMode>
    )

    // Extract Helmet data
    const { helmet } = helmetContext as any;

    return { html, helmet };
}
