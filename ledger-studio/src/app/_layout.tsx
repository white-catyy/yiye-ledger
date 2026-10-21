import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { LedgerProvider } from '@/features/ledger/ledger-provider';

export default function TabLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <LedgerProvider>
        <StatusBar style="dark" />
        <AppTabs />
      </LedgerProvider>
    </ThemeProvider>
  );
}
