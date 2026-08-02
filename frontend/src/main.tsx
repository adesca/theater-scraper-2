import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {RouterProvider} from "react-router-dom";
import {router} from "./router.tsx";
import { QueryClient} from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import {versionInfo} from "./components/Versions.tsx";

const HALF_DAY = 1000 * 60 * 60 * 12;
const DAY = HALF_DAY * 2

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: DAY,
            staleTime: HALF_DAY,
            refetchOnWindowFocus: false
        },
    },
})

const asyncStoragePersister = createAsyncStoragePersister({
    storage: window.localStorage,
})


createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <PersistQueryClientProvider client={queryClient} persistOptions={{
          persister: asyncStoragePersister,
          buster: versionInfo[0].version,
          maxAge: DAY * 5
      }}>
        <RouterProvider router={router} />
      </PersistQueryClientProvider>
  </StrictMode>,
)
