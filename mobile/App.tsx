import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import RootNavigator from '@/navigation/RootNavigator';
import { syncOrchestrator } from '@/services/sync/orchestrator';
import { useSyncStore } from '@/store/syncStore';

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const autoSyncEnabled = useSyncStore((state) => state.autoSyncEnabled);

  useEffect(() => {
    // Initialize sync orchestrator with auto-sync configuration
    if (autoSyncEnabled) {
      syncOrchestrator.initialize({
        autoSyncOnForeground: true,
        autoSyncOnNetworkRecovery: true,
        minSyncInterval: 30000, // 30 seconds
      });

      console.log('[App] Sync orchestrator initialized with auto-sync enabled');
    }

    // Cleanup on unmount
    return () => {
      syncOrchestrator.cleanup();
    };
  }, [autoSyncEnabled]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
